from datetime import date

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from accounts.permissions import IsAuthenticated, IsStaffOrAbove
from .models import (
    BillingPeriod,
    CreditMemo,
    CreditMemoLine,
    InvoiceSnapshot,
    PaymentBatch,
    PaymentBatchItem,
)
from .serializers import (
    BillingPeriodSerializer,
    CreditMemoSerializer,
    InvoiceSnapshotSerializer,
    PaymentBatchSerializer,
)
from .services import generate_employer_invoice


class BillingPeriodViewSet(viewsets.ModelViewSet):
    queryset = BillingPeriod.objects.all()
    serializer_class = BillingPeriodSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['employer', 'status']


class InvoiceSnapshotViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InvoiceSnapshot.objects.all()
    serializer_class = InvoiceSnapshotSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['employer_invoice']


class CreditMemoViewSet(viewsets.ModelViewSet):
    queryset = CreditMemo.objects.all()
    serializer_class = CreditMemoSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['employer', 'type', 'status']

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        memo = self.get_object()
        if memo.status != 'draft':
            return Response({'detail': 'Can only issue draft memos'}, status=400)
        memo.status = 'issued'
        memo.issued_at = timezone.now()
        memo.save()
        return Response(CreditMemoSerializer(memo).data)

    @action(detail=True, methods=['post'])
    def apply_to_invoice(self, request, pk=None):
        memo = self.get_object()
        invoice_id = request.data.get('invoice_id')
        if not invoice_id:
            return Response({'detail': 'invoice_id required'}, status=400)
        from core.models import EmployerInvoice
        invoice = EmployerInvoice.objects.get(pk=invoice_id)
        memo.applied_to_invoice = invoice
        memo.status = 'applied'
        memo.applied_at = timezone.now()
        memo.save()
        return Response(CreditMemoSerializer(memo).data)

    @action(detail=True, methods=['post'])
    def void(self, request, pk=None):
        memo = self.get_object()
        memo.status = 'voided'
        memo.save()
        return Response(CreditMemoSerializer(memo).data)


class PaymentBatchViewSet(viewsets.ModelViewSet):
    queryset = PaymentBatch.objects.all()
    serializer_class = PaymentBatchSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['status']

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        batch = self.get_object()
        if batch.status != 'draft':
            return Response({'detail': 'Can only submit draft batches'}, status=400)
        batch.status = 'pending_approval'
        batch.submitted_by = request.user.get_full_name() or request.user.username
        batch.submitted_at = timezone.now()
        batch.recalculate_total()
        batch.save()
        return Response(PaymentBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        batch = self.get_object()
        if batch.status != 'pending_approval':
            return Response({'detail': 'Can only approve pending batches'}, status=400)
        batch.status = 'approved'
        batch.approved_by = request.user.get_full_name() or request.user.username
        batch.approved_at = timezone.now()
        batch.save()
        return Response(PaymentBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        batch = self.get_object()
        batch.status = 'rejected'
        batch.save()
        return Response(PaymentBatchSerializer(batch).data)

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        batch = self.get_object()
        if batch.status != 'draft':
            return Response({'detail': 'Can only modify draft batches'}, status=400)
        item = PaymentBatchItem.objects.create(
            batch=batch,
            vendor_id=request.data.get('vendor_id'),
            amount=request.data.get('amount'),
            reference=request.data.get('reference', ''),
            description=request.data.get('description', ''),
        )
        batch.recalculate_total()
        return Response(PaymentBatchSerializer(batch).data, status=201)


@api_view(['POST'])
@permission_classes([IsStaffOrAbove])
def generate_invoice_view(request):
    employer_id = request.data.get('employer_id')
    period_start = request.data.get('period_start')
    period_end = request.data.get('period_end')
    if not all([employer_id, period_start, period_end]):
        return Response(
            {'detail': 'employer_id, period_start, and period_end required'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    from core.models import Employer
    try:
        employer = Employer.objects.get(pk=employer_id)
    except Employer.DoesNotExist:
        return Response({'detail': 'Employer not found'}, status=404)

    period_start = date.fromisoformat(period_start)
    period_end = date.fromisoformat(period_end)
    invoice, created = generate_employer_invoice(employer, period_start, period_end)

    if invoice is None:
        return Response({'detail': 'No active enrollments for this period'}, status=404)

    from core.serializers import EmployerInvoiceSerializer
    return Response({
        'created': created,
        'invoice': EmployerInvoiceSerializer(invoice).data,
    }, status=201 if created else 200)


@api_view(['POST'])
@permission_classes([IsStaffOrAbove])
def generate_all_invoices_view(request):
    period_start = request.data.get('period_start')
    period_end = request.data.get('period_end')
    if not all([period_start, period_end]):
        return Response({'detail': 'period_start and period_end required'}, status=400)

    from core.models import Employer
    period_start = date.fromisoformat(period_start)
    period_end = date.fromisoformat(period_end)

    results = []
    for employer in Employer.objects.filter(active=True):
        invoice, created = generate_employer_invoice(employer, period_start, period_end)
        if invoice:
            results.append({
                'employer': employer.name,
                'invoice_number': invoice.invoice_number,
                'total_due': str(invoice.total_due),
                'created': created,
            })

    return Response({'generated': len([r for r in results if r['created']]), 'results': results})
