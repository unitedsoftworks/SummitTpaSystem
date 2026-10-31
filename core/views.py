import builtins

from django.db.models import Sum, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status as http_status
from rest_framework.decorators import api_view, action, permission_classes as perm_classes_decorator
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response

from accounts.permissions import IsAdmin, IsStaffOrAbove, IsAssociationOrAbove, IsBrokerOrAbove, IsEmployerOrAbove
from .models import (
    Association, Vendor, Employer, Location, BenefitProduct, BenefitPlan,
    PremiumAllocation, Employee,
    Dependent, Enrollment, EnrollmentAllocation, EnrollmentMember, Claim,
    PayrollDeduction,
    CarrierInvoice, AuditLog, Message, LifeEvent, Reimbursement, Payment,
    EligibilityRecord, CobraEvent, OpenEnrollmentPeriod, Document, Notification,
    EmployerInvoice, EmployerInvoiceLine, Exception, ExceptionNote,
)
from .serializers import (
    AssociationSerializer, VendorSerializer,
    EmployerSerializer, LocationSerializer,
    BenefitProductSerializer, PremiumAllocationSerializer,
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
    permission_classes = [IsStaffOrAbove]


class VendorViewSet(viewsets.ModelViewSet):
    queryset = Vendor.objects.all()
    serializer_class = VendorSerializer
    permission_classes = [IsStaffOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        vendor_type = self.request.query_params.get('vendor_type')
        if vendor_type:
            qs = qs.filter(vendor_type=vendor_type)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_name__icontains=search)
            )
        return qs


class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.select_related('employer').all()
    serializer_class = LocationSerializer
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employer__in=self.request.tenant_employers)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        return qs


class EmployerViewSet(viewsets.ModelViewSet):
    queryset = Employer.objects.select_related('association').all()
    serializer_class = EmployerSerializer
    permission_classes = [IsAssociationOrAbove]

    def get_queryset(self):
        qs = super().get_queryset().prefetch_related('employees')
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(pk__in=self.request.tenant_employers)
        assoc = self.request.query_params.get('association')
        if assoc:
            qs = qs.filter(association_id=assoc)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(name__icontains=search) |
                Q(contact_name__icontains=search) |
                Q(ein__icontains=search)
            )
        return qs


class BenefitProductViewSet(viewsets.ModelViewSet):
    queryset = BenefitProduct.objects.select_related('employer').prefetch_related(
        'tiers', 'tiers__allocations', 'tiers__allocations__vendor'
    ).all()
    serializer_class = BenefitProductSerializer
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employer__in=self.request.tenant_employers)
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
            allocations = tier_data.pop('allocations', [])
            plan = BenefitPlan.objects.create(product=product, **tier_data)
            for alloc_data in allocations:
                if 'vendor' in alloc_data and not isinstance(alloc_data['vendor'], Vendor):
                    alloc_data['vendor_id'] = alloc_data.pop('vendor')
                PremiumAllocation.objects.create(plan=plan, **alloc_data)

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
                allocations = td.pop('allocations', None)
                if tier_key in existing_tiers:
                    t = existing_tiers[tier_key]
                    t.employer_contribution = td.get('employer_contribution', t.employer_contribution)
                    t.employee_deduction = td.get('employee_deduction', t.employee_deduction)
                    t.save()
                else:
                    t = BenefitPlan.objects.create(product=product, **td)
                if allocations is not None:
                    t.allocations.all().delete()
                    for alloc_data in allocations:
                        if 'vendor' in alloc_data and not isinstance(alloc_data['vendor'], Vendor):
                            alloc_data['vendor_id'] = alloc_data.pop('vendor')
                        PremiumAllocation.objects.create(plan=t, **alloc_data)
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
    def push_rates(self, request, pk=None):
        product = self.get_object()
        statuses = request.data.get('statuses', ['active', 'carrier_confirmed', 'pending'])
        enrollments = Enrollment.objects.filter(
            plan__product=product,
            status__in=statuses,
        )
        count = enrollments.count()
        for enrollment in enrollments:
            enrollment.snapshot_rates()
        AuditLog.objects.create(
            action='push_rates',
            entity_type='BenefitProduct',
            entity_id=product.id,
            description=f"Pushed current rates to {count} enrollments on {product.name}",
        )
        return Response({'updated': count, 'product': product.name})

    @action(detail=True, methods=['post'])
    def add_tier(self, request, pk=None):
        product = self.get_object()
        tier = request.data.get('tier')
        if product.tiers.filter(tier=tier).exists():
            return Response({'error': 'Tier already exists'}, status=http_status.HTTP_400_BAD_REQUEST)
        plan = BenefitPlan.objects.create(
            product=product,
            tier=tier,
            employer_contribution=request.data.get('employer_contribution', 0),
            employee_deduction=request.data.get('employee_deduction', 0),
        )
        allocations = request.data.get('allocations', [])
        for alloc_data in allocations:
            PremiumAllocation.objects.create(plan=plan, **alloc_data)
        return Response(BenefitProductSerializer(product).data)


class PremiumAllocationViewSet(viewsets.ModelViewSet):
    queryset = PremiumAllocation.objects.select_related('plan', 'vendor', 'plan__product').all()
    serializer_class = PremiumAllocationSerializer
    permission_classes = [IsStaffOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        plan_id = self.request.query_params.get('plan')
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
        product_id = self.request.query_params.get('product')
        if product_id:
            qs = qs.filter(plan__product_id=product_id)
        return qs


class BenefitPlanViewSet(viewsets.ModelViewSet):
    queryset = BenefitPlan.objects.select_related('product', 'product__employer').prefetch_related(
        'allocations', 'allocations__vendor'
    ).all()
    serializer_class = BenefitPlanSerializer
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(product__employer__in=self.request.tenant_employers)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(product__employer_id=employer_id)
        return qs


class EmployeeViewSet(viewsets.ModelViewSet):
    queryset = Employee.objects.select_related('employer').all()
    serializer_class = EmployeeSerializer
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employer__in=self.request.tenant_employers)
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
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employee__employer__in=self.request.tenant_employers)
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            qs = qs.filter(employee_id=employee_id)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employee__employer_id=employer_id)
        return qs


class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related(
        'employee', 'employee__employer', 'plan', 'plan__product'
    ).prefetch_related('members', 'members__dependent', 'plan__allocations__vendor', 'allocations__vendor').all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employee__employer__in=self.request.tenant_employers)
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

    def perform_create(self, serializer):
        enrollment = serializer.save()
        enrollment.snapshot_rates()

    @action(detail=True, methods=['put'])
    def rates(self, request, pk=None):
        from decimal import Decimal
        enrollment = self.get_object()
        data = request.data
        if 'employer_contribution' in data:
            enrollment.employer_contribution = Decimal(str(data['employer_contribution']))
        if 'employee_deduction' in data:
            enrollment.employee_deduction = Decimal(str(data['employee_deduction']))
        allocations = data.get('allocations')
        if allocations is not None:
            enrollment.allocations.all().delete()
            for alloc_data in allocations:
                if 'vendor' in alloc_data and not isinstance(alloc_data['vendor'], Vendor):
                    alloc_data['vendor_id'] = alloc_data.pop('vendor')
                EnrollmentAllocation.objects.create(enrollment=enrollment, **alloc_data)
            from django.db.models import Sum
            total = enrollment.allocations.aggregate(total=Sum('amount'))['total'] or 0
            enrollment.monthly_premium = total
            enrollment.employee_deduction = total - (enrollment.employer_contribution or 0)
        enrollment.save()
        enrollment = Enrollment.objects.select_related(
            'employee', 'employee__employer', 'plan', 'plan__product'
        ).prefetch_related('members', 'members__dependent', 'allocations__vendor').get(pk=enrollment.pk)
        return Response(EnrollmentSerializer(enrollment).data)

    @action(detail=True, methods=['post'])
    def resnapshot(self, request, pk=None):
        enrollment = self.get_object()
        enrollment.snapshot_rates()
        enrollment = Enrollment.objects.select_related(
            'employee', 'employee__employer', 'plan', 'plan__product'
        ).prefetch_related('members', 'members__dependent', 'allocations__vendor').get(pk=enrollment.pk)
        return Response(EnrollmentSerializer(enrollment).data)

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
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(enrollment__employee__employer__in=self.request.tenant_employers)
        enrollment_id = self.request.query_params.get('enrollment')
        if enrollment_id:
            qs = qs.filter(enrollment_id=enrollment_id)
        return qs


class ClaimViewSet(viewsets.ModelViewSet):
    queryset = Claim.objects.select_related(
        'employee', 'employee__employer', 'dependent', 'enrollment__plan', 'enrollment__plan__product'
    ).all()
    serializer_class = ClaimSerializer
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employee__employer__in=self.request.tenant_employers)
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
    permission_classes = [IsEmployerOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(enrollment__employee__employer__in=self.request.tenant_employers)
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
    queryset = CarrierInvoice.objects.select_related('vendor', 'employer').all()
    serializer_class = CarrierInvoiceSerializer
    permission_classes = [IsStaffOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employer__in=self.request.tenant_employers)
        s = self.request.query_params.get('status')
        if s:
            qs = qs.filter(status=s)
        employer_id = self.request.query_params.get('employer')
        if employer_id:
            qs = qs.filter(employer_id=employer_id)
        vendor_id = self.request.query_params.get('vendor')
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
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
    queryset = Payment.objects.select_related('employer', 'invoice').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsStaffOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employer__in=self.request.tenant_employers)
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
    permission_classes = [IsEmployerOrAbove]

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
    permission_classes = [IsEmployerOrAbove]

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
    permission_classes = [IsEmployerOrAbove]

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
        'employee', 'employee__employer', 'vendor', 'plan', 'plan__product'
    ).all()
    serializer_class = EligibilityRecordSerializer
    permission_classes = [IsStaffOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        vendor_id = self.request.query_params.get('vendor') or self.request.query_params.get('carrier')
        if vendor_id:
            qs = qs.filter(vendor_id=vendor_id)
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
    permission_classes = [IsStaffOrAbove]

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
    permission_classes = [IsEmployerOrAbove]

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
    queryset = Document.objects.select_related('employer', 'vendor', 'employee').all()
    serializer_class = DocumentSerializer
    permission_classes = [IsEmployerOrAbove]

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
    permission_classes = [IsEmployerOrAbove]

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
        'lines__employee', 'lines__plan', 'lines__plan__product'
    ).all()
    serializer_class = EmployerInvoiceSerializer
    permission_classes = [IsStaffOrAbove]

    def get_queryset(self):
        qs = super().get_queryset()
        if hasattr(self.request, 'tenant_employers'):
            qs = qs.filter(employer__in=self.request.tenant_employers)
        employer = self.request.query_params.get('employer')
        if employer:
            qs = qs.filter(employer_id=employer)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        return qs


class ExceptionViewSet(viewsets.ModelViewSet):
    queryset = Exception.objects.select_related('employer', 'employee', 'vendor').prefetch_related('notes').all()
    serializer_class = ExceptionSerializer
    permission_classes = [IsStaffOrAbove]

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
    permission_classes = [IsStaffOrAbove]
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
    permission_classes = [IsStaffOrAbove]

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
def vendor_detail(request, vendor_id):
    try:
        vendor = Vendor.objects.get(id=vendor_id)
    except Vendor.DoesNotExist:
        return Response({'error': 'Vendor not found'}, status=404)

    allocations = PremiumAllocation.objects.filter(vendor=vendor).select_related(
        'plan', 'plan__product', 'plan__product__employer'
    )
    invoices = CarrierInvoice.objects.filter(vendor=vendor).select_related('employer').order_by('-received_date')

    active_products = BenefitProduct.objects.filter(
        tiers__allocations__vendor=vendor, active=True
    ).distinct()
    active_enrollments = Enrollment.objects.filter(
        plan__allocations__vendor=vendor, status__in=['active', 'carrier_confirmed']
    ).count()
    total_members = EnrollmentMember.objects.filter(
        enrollment__plan__allocations__vendor=vendor,
        enrollment__status__in=['active', 'carrier_confirmed'],
    ).count()
    total_allocation = allocations.aggregate(total=Sum('amount'))['total'] or 0

    if vendor.vendor_type == 'carrier':
        claims = Claim.objects.filter(enrollment__plan__allocations__vendor=vendor)
        claims_paid = claims.filter(status='paid').aggregate(total=Sum('paid_amount'))['total'] or 0
        claims_pending = claims.filter(status__in=['received', 'in_review', 'pending_info']).count()
    else:
        claims_paid = 0
        claims_pending = 0

    total_billed = invoices.aggregate(total=Sum('billed_amount'))['total'] or 0
    total_discrepancies = invoices.filter(status='discrepancy').count()
    employers_served = allocations.values('plan__product__employer').distinct().count()

    return Response({
        'vendor': VendorSerializer(vendor).data,
        'products': BenefitProductSerializer(active_products, many=True).data,
        'invoices': CarrierInvoiceSerializer(invoices[:10], many=True).data,
        'summary': {
            'active_products': active_products.count(),
            'active_enrollments': active_enrollments,
            'total_members': total_members,
            'total_monthly_allocation': total_allocation,
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
        'plan', 'plan__product'
    ).prefetch_related('members', 'members__dependent', 'plan__allocations__vendor')
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
        'employee', 'plan', 'plan__product'
    ).prefetch_related('members', 'members__dependent', 'plan__allocations__vendor')
    invoices = CarrierInvoice.objects.filter(employer=employer).select_related('vendor')
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
def broker_portal(request, vendor_id):
    try:
        vendor = Vendor.objects.get(id=vendor_id, vendor_type='broker')
    except Vendor.DoesNotExist:
        return Response({'error': 'Broker not found'}, status=404)

    employer_ids = PremiumAllocation.objects.filter(
        vendor=vendor
    ).values_list('plan__product__employer_id', flat=True).distinct()
    employers = Employer.objects.filter(id__in=employer_ids)

    employer_data = []
    total_premium_volume = 0
    total_employees = 0
    total_commission = 0

    for emp in employers:
        active_enrollments = Enrollment.objects.filter(
            employee__employer=emp,
            status__in=['active', 'carrier_confirmed'],
        ).select_related('plan')
        monthly_premium = sum(e.plan.monthly_premium for e in active_enrollments)
        emp_employees = emp.employees.filter(status='active').count()
        broker_alloc = PremiumAllocation.objects.filter(
            vendor=vendor, plan__product__employer=emp
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_premium_volume += monthly_premium
        total_employees += emp_employees
        total_commission += float(broker_alloc)

        employer_data.append({
            'id': emp.id,
            'name': emp.name,
            'contact_name': emp.contact_name,
            'active_employees': emp_employees,
            'active_enrollments': active_enrollments.count(),
            'monthly_premium': monthly_premium,
            'commission': broker_alloc,
        })

    data = {
        'vendor': VendorSerializer(vendor).data,
        'employers': employer_data,
        'summary': {
            'total_employers': employers.count(),
            'total_employees': total_employees,
            'total_premium_volume': total_premium_volume,
            'total_monthly_commission': total_commission,
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
        'total_brokers': Vendor.objects.filter(vendor_type='broker', active=True).count(),
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
