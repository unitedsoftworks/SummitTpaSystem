from decimal import Decimal

from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsAuthenticated, IsStaffOrAbove
from .models import (
    AccountBalance,
    Contribution,
    HealthcareAccount,
    HealthcareAccountType,
    HealthcareReimbursement,
    PlanYear,
    SubstantiationRule,
)
from .serializers import (
    ContributionSerializer,
    HealthcareAccountSerializer,
    HealthcareAccountTypeSerializer,
    HealthcareReimbursementSerializer,
    PlanYearSerializer,
    SubstantiationRuleSerializer,
)


class HealthcareAccountTypeViewSet(viewsets.ModelViewSet):
    queryset = HealthcareAccountType.objects.all()
    serializer_class = HealthcareAccountTypeSerializer
    permission_classes = [IsStaffOrAbove]


class PlanYearViewSet(viewsets.ModelViewSet):
    queryset = PlanYear.objects.all()
    serializer_class = PlanYearSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['employer', 'account_type', 'status']

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        plan_year = self.get_object()
        if plan_year.status not in ('active', 'runout'):
            return Response({'detail': 'Can only close active or runout plan years'}, status=400)

        for account in plan_year.accounts.filter(status='active'):
            balance = getattr(account, 'balance', None)
            if balance and plan_year.account_type.has_forfeiture:
                carryover = min(
                    balance.available_balance,
                    plan_year.carryover_limit or Decimal('0'),
                )
                if carryover > 0 and plan_year.carryover_limit:
                    balance.carryover_amount = carryover
                balance.available_balance = carryover
                balance.save()
            account.status = 'closed'
            account.save()

        plan_year.status = 'closed'
        plan_year.save()
        return Response(PlanYearSerializer(plan_year).data)


class HealthcareAccountViewSet(viewsets.ModelViewSet):
    queryset = HealthcareAccount.objects.select_related('balance', 'account_type', 'plan_year')
    serializer_class = HealthcareAccountSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['employee', 'account_type', 'status', 'plan_year']

    def perform_create(self, serializer):
        account = serializer.save()
        AccountBalance.objects.create(account=account)


class ContributionViewSet(viewsets.ModelViewSet):
    queryset = Contribution.objects.all()
    serializer_class = ContributionSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['account', 'source']

    def perform_create(self, serializer):
        contribution = serializer.save()
        balance, _ = AccountBalance.objects.get_or_create(account=contribution.account)
        if contribution.source == 'employer':
            balance.ytd_employer_contributions += contribution.amount
        elif contribution.source == 'employee':
            balance.ytd_employee_contributions += contribution.amount
        balance.available_balance += contribution.amount
        balance.save()


class SubstantiationRuleViewSet(viewsets.ModelViewSet):
    queryset = SubstantiationRule.objects.all()
    serializer_class = SubstantiationRuleSerializer
    permission_classes = [IsStaffOrAbove]
    filterset_fields = ['account_type', 'irs_eligible']


class HealthcareReimbursementViewSet(viewsets.ModelViewSet):
    queryset = HealthcareReimbursement.objects.select_related('account', 'account__account_type')
    serializer_class = HealthcareReimbursementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['account', 'status', 'account__employee', 'payee_type']

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        reimbursement = self.get_object()
        if reimbursement.status not in ('submitted', 'in_review'):
            return Response({'detail': 'Cannot approve in current status'}, status=400)

        valid, msg = reimbursement.validate_against_balance()
        if not valid:
            return Response({'detail': msg}, status=400)

        eligible, emsg = reimbursement.validate_eligible_expense()
        if not eligible:
            return Response({'detail': emsg}, status=400)

        reimbursement.status = 'approved'
        reimbursement.approved_amount = reimbursement.amount
        reimbursement.reviewed_by = request.user.get_full_name() or request.user.username
        reimbursement.reviewed_at = timezone.now()
        reimbursement.save()

        balance = reimbursement.account.balance
        balance.available_balance -= reimbursement.amount
        balance.ytd_disbursements += reimbursement.amount
        balance.save()

        return Response(HealthcareReimbursementSerializer(reimbursement).data)

    @action(detail=True, methods=['post'])
    def deny(self, request, pk=None):
        reimbursement = self.get_object()
        reimbursement.status = 'denied'
        reimbursement.denial_reason = request.data.get('reason', '')
        reimbursement.reviewed_by = request.user.get_full_name() or request.user.username
        reimbursement.reviewed_at = timezone.now()
        reimbursement.save()
        return Response(HealthcareReimbursementSerializer(reimbursement).data)

    @action(detail=True, methods=['post'])
    def request_docs(self, request, pk=None):
        reimbursement = self.get_object()
        reimbursement.status = 'pending_docs'
        reimbursement.save()
        return Response(HealthcareReimbursementSerializer(reimbursement).data)

    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        reimbursement = self.get_object()
        if reimbursement.status != 'approved':
            return Response({'detail': 'Must be approved first'}, status=400)
        reimbursement.status = 'paid'
        reimbursement.paid_date = timezone.now().date()
        reimbursement.save()
        return Response(HealthcareReimbursementSerializer(reimbursement).data)
