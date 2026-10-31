from rest_framework import serializers
from .models import (
    AccountBalance,
    Contribution,
    HealthcareAccount,
    HealthcareAccountType,
    HealthcareReimbursement,
    PlanYear,
    SubstantiationRule,
)


class HealthcareAccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = HealthcareAccountType
        fields = '__all__'


class PlanYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanYear
        fields = '__all__'


class AccountBalanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountBalance
        fields = '__all__'


class HealthcareAccountSerializer(serializers.ModelSerializer):
    balance = AccountBalanceSerializer(read_only=True)
    account_type_display = serializers.CharField(source='account_type.name', read_only=True)

    class Meta:
        model = HealthcareAccount
        fields = '__all__'


class ContributionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contribution
        fields = '__all__'


class SubstantiationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubstantiationRule
        fields = '__all__'


class HealthcareReimbursementSerializer(serializers.ModelSerializer):
    duplicate_warning = serializers.SerializerMethodField()
    balance_check = serializers.SerializerMethodField()

    class Meta:
        model = HealthcareReimbursement
        fields = '__all__'

    def get_duplicate_warning(self, obj):
        return obj.check_duplicate()

    def get_balance_check(self, obj):
        valid, msg = obj.validate_against_balance()
        return {'valid': valid, 'message': msg}
