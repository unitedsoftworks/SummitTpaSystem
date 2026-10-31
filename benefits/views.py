from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAuthenticated, IsStaffOrAbove
from .models import FeeSchedule, PlanType, RateSchedule, RenewalVersion, WaitingPeriod
from .serializers import (
    FeeScheduleSerializer,
    PlanTypeSerializer,
    RateScheduleSerializer,
    RenewalVersionSerializer,
    WaitingPeriodSerializer,
)


class PlanTypeViewSet(viewsets.ModelViewSet):
    queryset = PlanType.objects.all()
    serializer_class = PlanTypeSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_active']


class RateScheduleViewSet(viewsets.ModelViewSet):
    queryset = RateSchedule.objects.all()
    serializer_class = RateScheduleSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['benefit_plan', 'benefit_plan__product__employer']


class FeeScheduleViewSet(viewsets.ModelViewSet):
    queryset = FeeSchedule.objects.all()
    serializer_class = FeeScheduleSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['benefit_product', 'benefit_product__employer']


class WaitingPeriodViewSet(viewsets.ModelViewSet):
    queryset = WaitingPeriod.objects.all()
    serializer_class = WaitingPeriodSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['benefit_product']


class RenewalVersionViewSet(viewsets.ModelViewSet):
    queryset = RenewalVersion.objects.all()
    serializer_class = RenewalVersionSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['benefit_product']

    @action(detail=False, methods=['post'])
    def create_snapshot(self, request):
        from core.models import BenefitProduct
        product_id = request.data.get('benefit_product')
        product = BenefitProduct.objects.get(pk=product_id)
        tiers = []
        for plan in product.tiers.all():
            tiers.append({
                'tier': plan.tier,
                'monthly_premium': str(plan.monthly_premium),
                'employer_contribution': str(plan.employer_contribution),
                'employee_deduction': str(plan.employee_deduction),
            })
            for rs in plan.rate_schedules.all():
                tiers[-1].setdefault('rate_schedules', []).append({
                    'effective_date': str(rs.effective_date),
                    'monthly_premium': str(rs.monthly_premium),
                    'employer_contribution': str(rs.employer_contribution),
                    'employee_deduction': str(rs.employee_deduction),
                    'admin_fee': str(rs.admin_fee),
                    'broker_commission': str(rs.broker_commission),
                })

        last_version = RenewalVersion.objects.filter(benefit_product=product).order_by('-version_number').first()
        next_version = (last_version.version_number + 1) if last_version else 1

        version = RenewalVersion.objects.create(
            benefit_product=product,
            version_number=next_version,
            effective_date=product.effective_date,
            termination_date=product.termination_date,
            plan_data={'product_name': product.name, 'tiers': tiers},
            created_by=request.user.get_full_name() or request.user.username,
            notes=request.data.get('notes', ''),
        )
        return Response(RenewalVersionSerializer(version).data, status=201)
