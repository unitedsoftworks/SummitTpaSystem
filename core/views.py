import builtins

from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status as http_status
from rest_framework.decorators import api_view, action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from .models import (
    Association, Broker, Carrier, Employer, BenefitProduct, BenefitPlan, Employee,
    Dependent, Enrollment, EnrollmentMember, Claim, PayrollDeduction,
    CarrierInvoice, AuditLog, Message, LifeEvent, Reimbursement, Payment,
    EligibilityRecord, CobraEvent, OpenEnrollmentPeriod, Document, Notification,
    EmployerInvoice, EmployerInvoiceLine, Exception, ExceptionNote,
)
from .serializers import (
    AssociationSerializer, BrokerSerializer,
    CarrierSerializer, EmployerSerializer, BenefitProductSerializer,
    BenefitPlanSerializer, BenefitPlanTierSerializer,
    EmployeeSerializer, DependentSerializer, EnrollmentSerializer,
    EnrollmentMemberSerializer, ClaimSerializer, PayrollDeductionSerializer,
    CarrierInvoiceSerializer, AuditLogSerializer, MessageSerializer,
    LifeEventSerializer, ReimbursementSerializer, PaymentSerializer,
    EligibilityRecordSerializer, CobraEventSerializer,
    OpenEnrollmentPeriodSerializer, DocumentSerializer, NotificationSerializer,
    EmployerInvoiceSerializer, ExceptionSerializer, ExceptionNoteSerializer,
)


class AssociationViewSet(viewsets.ModelViewSet):
    queryset = Association.objects.all()
    serializer_class = AssociationSerializer


class BrokerViewSet(viewsets.ModelViewSet):
    queryset = Broker.objects.all()
    serializer_class = BrokerSerializer


class CarrierViewSet(viewsets.ModelViewSet):
    queryset = Carrier.objects.all()
    serializer_class = CarrierSerializer


class EmployerViewSet(viewsets.ModelViewSet):
    queryset = Employer.objects.select_related('association', 'broker').all()
    serializer_class = EmployerSerializer

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related('employees')
        assoc = self.request.query_params.get('association')
        if assoc:
            qs = qs.filter(association_id=assoc)
        broker = self.request.query_params.get('broker')
        if broker:
            qs = qs.filter(broker_id=broker)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(ein__icontains=search)
            )
        return qs


class BenefitProductViewSet(viewsets.ModelViewSet):
    queryset = BenefitProduct.objects.select_related('carrier', 'employer').prefetch_related('tiers').all()
    serializer_class = BenefitProductSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        plan_type = self.request.query_params.get('plan_type')
        if plan_type:
            qs = qs.filter(plan_type=plan_type)
        return qs

    def create(self, request, *args, **kwargs):
        tiers_data = request.data.pop('tiers', [])
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.save()

        for tier_data in tiers_data:
            BenefitPlan.objects.create(product=product, **tier_data)

        AuditLog.objects.create(
            action='create_product',
            entity_type='BenefitProduct',
            entity_id=product.id,
            description=f"Created benefit product {product.name} with {len(tiers_data)} tiers",
        )
        return Response(
            BenefitProductSerializer(product).data,
            status=http_status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        product = self.get_object()
        tiers_data = request.data.pop('tiers', None)

        serializer = self.get_serializer(product, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if tiers_data is not None:
            existing_tiers = {t.tier: t for t in product.tiers.all()}
            incoming_tier_keys = set()
            for td in tiers_data:
                tier_key = td['tier']
                incoming_tier_keys.add(tier_key)
                if tier_key in existing_tiers:
                    t = existing_tiers[tier_key]
                    t.monthly_premium = td['monthly_premium']
                    t.employer_contribution = td['employer_contribution']
                    t.employee_deduction = td['employee_deduction']
                    t.save()
                else:
                    BenefitPlan.objects.create(product=product, **td)
            for tier_key, t in existing_tiers.items():
                if tier_key not in incoming_tier_keys:
                    if t.enrollments.filter(status__in=['active', 'carrier_confirmed']).exists():
                        return Response(
                            {'error': f'Cannot remove {t.get_tier_display()} — has active enrollments'},
                            status=http_status.HTTP_400_BAD_REQUEST,
                        )
                    t.delete()

        product.refresh_from_db()
        AuditLog.objects.create(
            action='update_product',
            entity_type='BenefitProduct',
            entity_id=product.id,
            description=f"Updated benefit product {product.name}",
        )
        return Response(BenefitProductSerializer(product).data)

    @action(detail=True, methods=['post'])
    def add_tier(self, request, pk=None):
        product = self.get_object()
        tier = request.data.get('tier')
        if product.tiers.filter(tier=tier).exists():
            return Response({'error': 'Tier already exists'}, status=http_status.HTTP_400_BAD_REQUEST)
        BenefitPlan.objects.create(
            product=product,
            tier=tier,
            monthly_premium=request.data.get('monthly_premium', 0),
            employer_contribution=request.data.get('employer_contribution', 0),
            employee_deduction=request.data.get('employee_deduction', 0),
        )
        return Response(BenefitProductSerializer(product).data)


class BenefitPlanViewSet(viewsets.ModelViewSet):
    queryset = BenefitPlan.objects.select_related('product', 'product__carrier', 'product__employer').all()
    serializer_class = BenefitPlanSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(product__employer_id=employer_id)
        return qs


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('employer').all()
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search)
            )
        return qs


class DependentViewSet(viewsets.ModelViewSet):
    queryset = Dependent.objects.select_related('employee', 'employee__employer').all()
    serializer_class = DependentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        return qs


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related(
        'employee', 'employee__employer', 'plan', 'plan__product', 'plan__product__carrier'
    ).prefetch_related('members', 'members__dependent').all()
    serializer_class = EnrollmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = 'carrier_confirmed'
        enrollment.carrier_confirmation_number = f"CONF-{enrollment.id:06d}"
        enrollment.carrier_confirmed_at = timezone.now()
        enrollment.save()
        AuditLog.objects.create(
            action='carrier_confirm',
            entity_type='Enrollment',
            entity_id=enrollment.id,
            description=f"Carrier confirmed enrollment for {enrollment.employee} on {enrollment.plan}",
        )
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = 'active'
        enrollment.save()
        AuditLog.objects.create(
            action='activate',
            entity_type='Enrollment',
            entity_id=enrollment.id,
            description=f"Activated enrollment for {enrollment.employee} on {enrollment.plan}",
        )
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=['post'])
    def terminate(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.status = 'terminated'
        enrollment.termination_date = timezone.now().date()
        enrollment.save()
        AuditLog.objects.create(
            action='terminate',
            entity_type='Enrollment',
            entity_id=enrollment.id,
            description=f"Terminated enrollment for {enrollment.employee} on {enrollment.plan}",
        )
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        enrollment = self.get_object()
        dependent_id = request.data.get('dependent_id')
        is_subscriber = request.data.get('is_subscriber', False)

        if is_subscriber:
            if enrollment.members.filter(is_subscriber=True).exists():
                return Response({'error': 'Subscriber already added'}, status=http_status.HTTP_400_BAD_REQUEST)
            member = EnrollmentMember.objects.create(
                enrollment=enrollment,
                is_subscriber=True,
                effective_date=enrollment.effective_date,
            )
        else:
            if not dependent_id:
                return Response({'error': 'dependent_id required'}, status=http_status.HTTP_400_BAD_REQUEST)
            try:
                dependent = Dependent.objects.get(id=dependent_id, employee=enrollment.employee)
            except Dependent.DoesNotExist:
                return Response({'error': 'Dependent not found or does not belong to this employee'}, status=http_status.HTTP_404_NOT_FOUND)
            if enrollment.members.filter(dependent=dependent).exists():
                return Response({'error': 'Dependent already on this enrollment'}, status=http_status.HTTP_400_BAD_REQUEST)
            member = EnrollmentMember.objects.create(
                enrollment=enrollment,
                dependent=dependent,
                effective_date=enrollment.effective_date,
            )

        AuditLog.objects.create(
            action='add_member',
            entity_type='EnrollmentMember',
            entity_id=member.id,
            description=f"Added {member} to enrollment {enrollment}",
        )
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        enrollment = self.get_object()
        member_id = request.data.get('member_id')
        try:
            member = enrollment.members.get(id=member_id)
        except EnrollmentMember.DoesNotExist:
            return Response({'error': 'Member not found'}, status=http_status.HTTP_404_NOT_FOUND)

        desc = f"Removed {member} from enrollment {enrollment}"
        member.delete()
        AuditLog.objects.create(
            action='remove_member',
            entity_type='EnrollmentMember',
            entity_id=0,
            description=desc,
        )
        return Response(EnrollmentSerializer(enrollment).data)


class EnrollmentMemberViewSet(viewsets.ModelViewSet):
    queryset = EnrollmentMember.objects.select_related(
        'enrollment', 'enrollment__employee', 'dependent'
    ).all()
    serializer_class = EnrollmentMemberSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            qs = qs.filter(enrollment_id=enrollment_id)
        return qs


class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.select_related(
        'employee', 'employee__employer', 'dependent', 'enrollment__plan', 'enrollment__plan__product'
    ).all()
    serializer_class = ClaimSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        claim_type = self.request.query_params.get('claim_type')
        if claim_type:
            qs = qs.filter(claim_type=claim_type)
        assigned = self.request.query_params.get('assigned_to')
        if assigned:
            qs = qs.filter(assigned_to=assigned)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(claim_number__icontains=search) |
                Q(employee__first_name__icontains=search) |
                Q(employee__last_name__icontains=search) |
                Q(provider_name__icontains=search) |
                Q(dependent__first_name__icontains=search) |
                Q(dependent__last_name__icontains=search)
            )
        open_filter = self.request.query_params.get('open')
        if open_filter == 'true':
            qs = qs.filter(status__in=['received', 'in_review', 'pending_info', 'approved'])
        return qs

    @action(detail=False, methods=['get'])
    def stats(self, request):
        all_claims = Claim.objects.all()
        open_statuses = ['received', 'in_review', 'pending_info', 'approved']
        open_claims = all_claims.filter(status__in=open_statuses)
        approved = all_claims.filter(status='approved')
        approved_total = approved.aggregate(total=Sum('billed_amount'))['total'] or 0
        return Response({
            'open': open_claims.count(),
            'unassigned': open_claims.filter(assigned_to='').count(),
            'received': all_claims.filter(status='received').count(),
            'in_review': all_claims.filter(status='in_review').count(),
            'pending_info': all_claims.filter(status='pending_info').count(),
            'approved': approved.count(),
            'approved_total': approved_total,
            'denied': all_claims.filter(status='denied').count(),
            'paid': all_claims.filter(status='paid').count(),
            'total': all_claims.count(),
        })

    @action(detail=True, methods=['post'])
    def transition(self, request, pk=None):
        claim = self.get_object()
        new_status = request.data.get('status')
        valid = ['received', 'in_review', 'pending_info', 'approved', 'denied', 'paid']
        if new_status not in valid:
            return Response({'error': 'Invalid status'}, status=http_status.HTTP_400_BAD_REQUEST)
        old_status = claim.status
        claim.status = new_status
        if new_status == 'denied':
            claim.denial_reason = request.data.get('denial_reason', '')
        if new_status in ('approved', 'paid'):
            claim.allowed_amount = request.data.get('allowed_amount', claim.billed_amount)
            claim.paid_amount = request.data.get('paid_amount', claim.billed_amount)
        if 'assigned_to' in request.data:
            claim.assigned_to = request.data['assigned_to']
        claim.save()
        AuditLog.objects.create(
            action=f'claim_{new_status}',
            entity_type='Claim',
            entity_id=claim.id,
            description=f"Claim {claim.claim_number} transitioned from {old_status} to {new_status}",
        )
        return Response(ClaimSerializer(claim).data)


class PayrollDeductionViewSet(viewsets.ModelViewSet):
    queryset = PayrollDeduction.objects.select_related(
        'enrollment__employee', 'enrollment__plan'
    ).all()
    serializer_class = PayrollDeductionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(enrollment__employee__employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs

    @action(detail=False, methods=['post'])
    def generate(self, request):
        from datetime import date
        employer_id = request.data.get('employer_id')
        if not employer_id:
            return Response({'error': 'employer_id required'}, status=400)

        today = date.today()
        period_start = today.replace(day=1)
        if today.month == 12:
            period_end = today.replace(year=today.year + 1, month=1, day=1)
        else:
            period_end = today.replace(month=today.month + 1, day=1)

        active_enrollments = Enrollment.objects.filter(
            employee__employer_id=employer_id,
            status__in=['active', 'carrier_confirmed'],
        )

        created = []
        for enrollment in active_enrollments:
            existing = PayrollDeduction.objects.filter(
                enrollment=enrollment,
                period_start=period_start,
            ).exists()
            if not existing:
                d = PayrollDeduction.objects.create(
                    enrollment=enrollment,
                    period_start=period_start,
                    period_end=period_end,
                    amount=enrollment.plan.employee_deduction,
                )
                created.append(d)

        AuditLog.objects.create(
            action='generate_deductions',
            entity_type='PayrollDeduction',
            entity_id=0,
            description=f"Generated {len(created)} deductions for employer #{employer_id}",
        )
        return Response({
            'created': len(created),
            'deductions': PayrollDeductionSerializer(created, many=True).data,
        })


class CarrierInvoiceViewSet(viewsets.ModelViewSet):
    queryset = CarrierInvoice.objects.select_related('carrier', 'employer').all()
    serializer_class = CarrierInvoiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        return qs

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'resolved'
        invoice.notes = request.data.get('notes', invoice.notes)
        invoice.save()
        AuditLog.objects.create(
            action='resolve_invoice',
            entity_type='CarrierInvoice',
            entity_id=invoice.id,
            description=f"Resolved invoice {invoice.invoice_number} discrepancy",
        )
        return Response(CarrierInvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        invoice = self.get_object()
        invoice.status = 'paid'
        invoice.save()
        AuditLog.objects.create(
            action='pay_invoice',
            entity_type='CarrierInvoice',
            entity_id=invoice.id,
            description=f"Marked invoice {invoice.invoice_number} as paid",
        )
        return Response(CarrierInvoiceSerializer(invoice).data)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('employer').all()
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        return qs


class MessageViewSet(viewsets.ModelViewSet):
    queryset = Message.objects.select_related('employee', 'employee__employer').all()
    serializer_class = MessageSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        return qs


class LifeEventViewSet(viewsets.ModelViewSet):
    queryset = LifeEvent.objects.select_related('employee', 'employee__employer').all()
    serializer_class = LifeEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        event_type = self.request.query_params.get('event_type')
        if event_type:
            qs = qs.filter(event_type=event_type)
        return qs


class ReimbursementViewSet(viewsets.ModelViewSet):
    queryset = Reimbursement.objects.select_related('employee', 'employee__employer').all()
    serializer_class = ReimbursementSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        rtype = self.request.query_params.get('reimbursement_type')
        if rtype:
            qs = qs.filter(reimbursement_type=rtype)
        return qs


class EligibilityRecordViewSet(viewsets.ModelViewSet):
    queryset = EligibilityRecord.objects.select_related(
        'employee', 'employee__employer', 'carrier', 'plan', 'plan__product'
    ).all()
    serializer_class = EligibilityRecordSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        carrier_id = self.request.query_params.get('carrier')
        if carrier_id:
            qs = qs.filter(carrier_id=carrier_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        file_type = self.request.query_params.get('file_type')
        if file_type:
            qs = qs.filter(file_type=file_type)
        direction = self.request.query_params.get('direction')
        if direction:
            qs = qs.filter(direction=direction)
        return qs


class CobraEventViewSet(viewsets.ModelViewSet):
    queryset = CobraEvent.objects.select_related('employee', 'employer').all()
    serializer_class = CobraEventSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        election_status = self.request.query_params.get('election_status')
        if election_status:
            qs = qs.filter(election_status=election_status)
        qualifying_event = self.request.query_params.get('qualifying_event')
        if qualifying_event:
            qs = qs.filter(qualifying_event=qualifying_event)
        payment_status = self.request.query_params.get('payment_status')
        if payment_status:
            qs = qs.filter(payment_status=payment_status)
        return qs


class OpenEnrollmentPeriodViewSet(viewsets.ModelViewSet):
    queryset = OpenEnrollmentPeriod.objects.select_related('employer').all()
    serializer_class = OpenEnrollmentPeriodSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related('employer', 'carrier', 'employee').all()
    serializer_class = DocumentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        doc_type = self.request.query_params.get('document_type')
        if doc_type:
            qs = qs.filter(document_type=doc_type)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(title__icontains=search) |
                Q(file_name__icontains=search)
            )
        return qs


class NotificationViewSet(viewsets.ModelViewSet):
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        is_read = self.request.query_params.get('is_read')
        if is_read is not None:
            qs = qs.filter(is_read=is_read == 'true')
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        ntype = self.request.query_params.get('notification_type')
        if ntype:
            qs = qs.filter(notification_type=ntype)
        return qs

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response(NotificationSerializer(notification).data)

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Notification.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': 'ok'})


class EmployerInvoiceViewSet(viewsets.ModelViewSet):
    queryset = EmployerInvoice.objects.select_related('employer').prefetch_related(
        'lines__employee', 'lines__plan', 'lines__plan__product', 'lines__plan__product__carrier'
    ).all()
    serializer_class = EmployerInvoiceSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        employer = self.request.query_params.get('employer')
        if employer:
            qs = qs.filter(employer_id=employer)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs


class ExceptionViewSet(viewsets.ModelViewSet):
    queryset = Exception.objects.select_related('employer', 'employee', 'carrier').prefetch_related('notes').all()
    serializer_class = ExceptionSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category=category)
        priority = self.request.query_params.get('priority')
        if priority:
            qs = qs.filter(priority=priority)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        employer = self.request.query_params.get('employer')
        if employer:
            qs = qs.filter(employer_id=employer)
        return qs


class ExceptionNoteViewSet(viewsets.ModelViewSet):
    queryset = ExceptionNote.objects.all()
    serializer_class = ExceptionNoteSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        qs = super().get_queryset()
        exception = self.request.query_params.get('exception')
        if exception:
            qs = qs.filter(exception_id=exception)
        return qs

    def perform_create(self, serializer):
        attachment = self.request.FILES.get('attachment')
        if attachment:
            serializer.save(attachment_name=attachment.name)
        else:
            serializer.save()


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        action = self.request.query_params.get('action')
        if action:
            qs = qs.filter(action=action)
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            qs = qs.filter(entity_type=entity_type)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(description__icontains=search) |
                Q(entity_type__icontains=search) |
                Q(performed_by__icontains=search)
            )
        return qs


@api_view(['GET'])
def carrier_detail(request, carrier_id):
    try:
        carrier = Carrier.objects.get(id=carrier_id)
    except Carrier.DoesNotExist:
        return Response({'error': 'Carrier not found'}, status=404)

    products = BenefitProduct.objects.filter(carrier=carrier).select_related('employer').prefetch_related('tiers')
    invoices = CarrierInvoice.objects.filter(carrier=carrier).select_related('employer').order_by('-received_date')
    claims = Claim.objects.filter(enrollment__plan__product__carrier=carrier)

    active_products = products.filter(active=True)
    total_monthly_premium = sum(
        t.monthly_premium for p in active_products for t in p.tiers.all()
    )
    active_enrollments = Enrollment.objects.filter(
        plan__product__carrier=carrier, status__in=['active', 'carrier_confirmed']
    ).count()
    total_members = EnrollmentMember.objects.filter(
        enrollment__plan__product__carrier=carrier,
        enrollment__status__in=['active', 'carrier_confirmed'],
    ).count()

    claims_paid = claims.filter(status='paid').aggregate(total=Sum('paid_amount'))['total'] or 0
    claims_pending = claims.filter(status__in=['received', 'in_review', 'pending_info']).count()

    total_billed = invoices.aggregate(total=Sum('billed_amount'))['total'] or 0
    total_discrepancies = invoices.filter(status='discrepancy').count()

    employers_served = products.values('employer').distinct().count()

    return Response({
        'carrier': CarrierSerializer(carrier).data,
        'products': BenefitProductSerializer(active_products, many=True).data,
        'invoices': CarrierInvoiceSerializer(invoices[:10], many=True).data,
        'summary': {
            'active_products': active_products.count(),
            'active_enrollments': active_enrollments,
            'total_members': total_members,
            'total_monthly_premium': total_monthly_premium,
            'employers_served': employers_served,
            'claims_paid': claims_paid,
            'claims_pending': claims_pending,
            'total_billed': total_billed,
            'total_discrepancies': total_discrepancies,
        },
    })


@api_view(['GET'])
def finance_summary(request):
    from decimal import Decimal

    active_enrollments = Enrollment.objects.filter(status__in=['active', 'carrier_confirmed'])
    total_monthly_premiums = sum(e.plan.monthly_premium for e in active_enrollments.select_related('plan'))
    total_employer_contributions = sum(e.plan.employer_contribution for e in active_enrollments.select_related('plan'))
    total_employee_deductions = sum(e.plan.employee_deduction for e in active_enrollments.select_related('plan'))

    invoices = CarrierInvoice.objects.all()
    total_billed = invoices.aggregate(total=Sum('billed_amount'))['total'] or 0
    total_expected = invoices.aggregate(total=Sum('expected_amount'))['total'] or 0
    unpaid_invoices = invoices.exclude(status='paid')
    outstanding_amount = unpaid_invoices.aggregate(total=Sum('billed_amount'))['total'] or 0

    payments = Payment.objects.all()
    total_received = payments.filter(status__in=['received', 'applied']).aggregate(total=Sum('amount'))['total'] or 0
    pending_payments = payments.filter(status='pending').aggregate(total=Sum('amount'))['total'] or 0

    claims = Claim.objects.all()
    total_claims_paid = claims.filter(status='paid').aggregate(total=Sum('paid_amount'))['total'] or 0
    total_claims_pending = claims.filter(status__in=['received', 'in_review', 'pending_info', 'approved']).aggregate(total=Sum('billed_amount'))['total'] or 0

    reimbursements = Reimbursement.objects.all()
    total_reimbursed = reimbursements.filter(status='paid').aggregate(total=Sum('amount_approved'))['total'] or 0
    pending_reimbursements = reimbursements.filter(status__in=['submitted', 'in_review']).aggregate(total=Sum('amount_requested'))['total'] or 0

    employers = Employer.objects.filter(active=True)
    employer_financials = []
    for emp in employers:
        emp_enrollments = active_enrollments.filter(employee__employer=emp).select_related('plan')
        emp_premiums = sum(e.plan.monthly_premium for e in emp_enrollments)
        emp_er_share = sum(e.plan.employer_contribution for e in emp_enrollments)
        emp_ee_share = sum(e.plan.employee_deduction for e in emp_enrollments)
        emp_payments = payments.filter(employer=emp, status__in=['received', 'applied']).aggregate(total=Sum('amount'))['total'] or 0
        employer_financials.append({
            'id': emp.id,
            'name': emp.name,
            'monthly_premiums': emp_premiums,
            'employer_share': emp_er_share,
            'employee_share': emp_ee_share,
            'payments_received': emp_payments,
            'active_employees': emp.employees.filter(status='active').count(),
        })

    recent_payments = PaymentSerializer(payments[:10], many=True).data
    recent_invoices = CarrierInvoiceSerializer(invoices.order_by('-received_date')[:10], many=True).data

    return Response({
        'monthly_premiums': total_monthly_premiums,
        'employer_contributions': total_employer_contributions,
        'employee_deductions': total_employee_deductions,
        'total_billed': total_billed,
        'total_expected': total_expected,
        'outstanding_invoices': outstanding_amount,
        'unpaid_invoice_count': unpaid_invoices.count(),
        'total_payments_received': total_received,
        'pending_payments': pending_payments,
        'total_claims_paid': total_claims_paid,
        'total_claims_pending': total_claims_pending,
        'total_reimbursed': total_reimbursed,
        'pending_reimbursements': pending_reimbursements,
        'employer_financials': employer_financials,
        'recent_payments': recent_payments,
        'recent_invoices': recent_invoices,
    })


@api_view(['GET'])
def employee_portal(request, employee_id):
    try:
        employee = Employee.objects.select_related('employer').get(id=employee_id)
    except Employee.DoesNotExist:
        return Response({'error': 'Employee not found'}, status=404)

    enrollments = Enrollment.objects.filter(employee=employee).select_related(
        'plan', 'plan__carrier'
    ).prefetch_related('members', 'members__dependent')
    deductions = PayrollDeduction.objects.filter(
        enrollment__employee=employee
    ).select_related('enrollment__plan').order_by('-period_start')
    dependents = Dependent.objects.filter(employee=employee)

    active_enrollments = enrollments.filter(status__in=['active', 'carrier_confirmed'])
    total_monthly_deduction = sum(e.plan.employee_deduction for e in active_enrollments)

    claims = Claim.objects.filter(employee=employee).order_by('-service_date')[:20]

    data = {
        'employee': EmployeeSerializer(employee).data,
        'enrollments': EnrollmentSerializer(enrollments, many=True).data,
        'deductions': PayrollDeductionSerializer(deductions[:12], many=True).data,
        'dependents': DependentSerializer(dependents, many=True).data,
        'claims': ClaimSerializer(claims, many=True).data,
        'summary': {
            'total_plans': active_enrollments.count(),
            'total_monthly_deduction': total_monthly_deduction,
            'total_monthly_premium': sum(e.plan.monthly_premium for e in active_enrollments),
            'employer_contribution': sum(e.plan.employer_contribution for e in active_enrollments),
            'total_claims': claims.count(),
        },
    }
    return Response(data)


@api_view(['GET'])
def employer_portal(request, employer_id):
    try:
        employer = Employer.objects.get(id=employer_id)
    except Employer.DoesNotExist:
        return Response({'error': 'Employer not found'}, status=404)

    employees = Employee.objects.filter(employer=employer)
    enrollments = Enrollment.objects.filter(employee__employer=employer).select_related(
        'employee', 'plan', 'plan__carrier'
    ).prefetch_related('members', 'members__dependent')
    invoices = CarrierInvoice.objects.filter(employer=employer).select_related('carrier')
    deductions = PayrollDeduction.objects.filter(
        enrollment__employee__employer=employer
    ).select_related('enrollment__employee', 'enrollment__plan')

    active_enrollments = enrollments.filter(status__in=['active', 'carrier_confirmed'])
    total_premiums = sum(e.plan.monthly_premium for e in active_enrollments)
    total_deductions = sum(e.plan.employee_deduction for e in active_enrollments)
    total_er_contribution = sum(e.plan.employer_contribution for e in active_enrollments)

    data = {
        'employer': EmployerSerializer(employer).data,
        'employees': EmployeeSerializer(employees, many=True).data,
        'enrollments': EnrollmentSerializer(enrollments, many=True).data,
        'invoices': CarrierInvoiceSerializer(invoices, many=True).data,
        'deductions': PayrollDeductionSerializer(deductions.order_by('-period_start')[:50], many=True).data,
        'summary': {
            'total_employees': employees.filter(status='active').count(),
            'active_enrollments': active_enrollments.count(),
            'pending_enrollments': enrollments.filter(status='pending').count(),
            'total_monthly_premiums': total_premiums,
            'total_monthly_deductions': total_deductions,
            'employer_contribution': total_er_contribution,
            'outstanding_invoices': invoices.filter(status__in=['pending', 'discrepancy']).count(),
        },
    }
    return Response(data)


@api_view(['GET'])
def broker_portal(request, broker_id):
    try:
        broker = Broker.objects.get(id=broker_id)
    except Broker.DoesNotExist:
        return Response({'error': 'Broker not found'}, status=404)

    employers = Employer.objects.filter(broker=broker)
    employer_data = []
    total_premium_volume = 0
    total_employees = 0

    for emp in employers:
        active_enrollments = Enrollment.objects.filter(
            employee__employer=emp,
            status__in=['active', 'carrier_confirmed'],
        ).select_related('plan')
        monthly_premium = sum(e.plan.monthly_premium for e in active_enrollments)
        emp_employees = emp.employees.filter(status='active').count()
        total_premium_volume += monthly_premium
        total_employees += emp_employees

        employer_data.append({
            'id': emp.id,
            'name': emp.name,
            'contact_name': emp.contact_name,
            'active_employees': emp_employees,
            'active_enrollments': active_enrollments.count(),
            'monthly_premium': monthly_premium,
            'commission': monthly_premium * broker.commission_rate / 100,
        })

    data = {
        'broker': BrokerSerializer(broker).data,
        'employers': employer_data,
        'summary': {
            'total_employers': employers.count(),
            'total_employees': total_employees,
            'total_premium_volume': total_premium_volume,
            'total_monthly_commission': total_premium_volume * broker.commission_rate / 100,
        },
    }
    return Response(data)


@api_view(['GET'])
def association_portal(request, association_id):
    try:
        assoc = Association.objects.get(id=association_id)
    except Association.DoesNotExist:
        return Response({'error': 'Association not found'}, status=404)

    employers = Employer.objects.filter(association=assoc)
    employer_data = []
    total_employees = 0
    total_premium = 0

    for emp in employers:
        emp_count = emp.employees.filter(status='active').count()
        active_enrollments = Enrollment.objects.filter(
            employee__employer=emp,
            status__in=['active', 'carrier_confirmed'],
        ).select_related('plan')
        monthly = sum(e.plan.monthly_premium for e in active_enrollments)
        total_employees += emp_count
        total_premium += monthly
        employer_data.append({
            'id': emp.id,
            'name': emp.name,
            'contact_name': emp.contact_name,
            'contact_email': emp.contact_email,
            'active_employees': emp_count,
            'active_enrollments': active_enrollments.count(),
            'monthly_premium': monthly,
        })

    data = {
        'association': AssociationSerializer(assoc).data,
        'employers': employer_data,
        'summary': {
            'total_employers': employers.count(),
            'total_employees': total_employees,
            'total_monthly_premium': total_premium,
        },
    }
    return Response(data)


@api_view(['GET'])
def dashboard(request):
    active_enrollments = Enrollment.objects.filter(
        status__in=['active', 'carrier_confirmed']
    )
    total_premiums = active_enrollments.aggregate(
        total=Sum('plan__monthly_premium')
    )['total'] or 0
    total_deductions = active_enrollments.aggregate(
        total=Sum('plan__employee_deduction')
    )['total'] or 0

    open_claims = Claim.objects.filter(status__in=['received', 'in_review', 'pending_info', 'approved'])
    unread_messages = Message.objects.filter(status='unread')
    pending_life_events = LifeEvent.objects.filter(status='pending')
    pending_reimbursements = Reimbursement.objects.filter(status__in=['submitted', 'in_review'])
    unpaid_invoices = CarrierInvoice.objects.exclude(status='paid')

    employers = Employer.objects.filter(active=True)
    employer_summary = []
    for emp in employers:
        emp_enrollments = active_enrollments.filter(employee__employer=emp)
        employer_summary.append({
            'id': emp.id,
            'name': emp.name,
            'employees': emp.employees.filter(status='active').count(),
            'enrollments': emp_enrollments.count(),
            'monthly_premium': sum(e.plan.monthly_premium for e in emp_enrollments.select_related('plan')),
        })

    data = {
        'total_employers': employers.count(),
        'total_employees': Employee.objects.filter(status='active').count(),
        'total_associations': Association.objects.filter(active=True).count(),
        'total_brokers': Broker.objects.filter(active=True).count(),
        'active_enrollments': active_enrollments.count(),
        'pending_enrollments': Enrollment.objects.filter(status='pending').count(),
        'pending_invoices': CarrierInvoice.objects.filter(status='pending').count(),
        'invoice_discrepancies': CarrierInvoice.objects.filter(status='discrepancy').count(),
        'total_monthly_premiums': total_premiums,
        'total_monthly_deductions': total_deductions,
        'open_claims': open_claims.count(),
        'unread_messages': unread_messages.count(),
        'pending_life_events': pending_life_events.count(),
        'pending_reimbursements': pending_reimbursements.count(),
        'outstanding_invoice_amount': unpaid_invoices.aggregate(total=Sum('billed_amount'))['total'] or 0,
        'employer_summary': employer_summary,
        'recent_activity': AuditLogSerializer(
            AuditLog.objects.all()[:10], many=True
        ).data,
        'recent_claims': ClaimSerializer(
            Claim.objects.order_by('-received_date')[:5], many=True
        ).data,
    }
    return Response(data)


@api_view(['POST'])
def ai_resolve_exception(request, exception_id):
    try:
        exc = Exception.objects.get(id=exception_id)
    except Exception.DoesNotExist:
        return Response({'error': 'Exception not found'}, status=http_status.HTTP_404_NOT_FOUND)

    try:
        from core.ai_resolver import resolve_exception
        resolution = resolve_exception(exception_id)

        ExceptionNote.objects.create(
            exception=exc,
            note_type='update',
            content=resolution,
            author='AI Assistant',
        )

        return Response({'resolution': resolution})
    except builtins.Exception as e:
        return Response(
            {'error': f'AI resolution failed: {str(e)}'},
            status=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
