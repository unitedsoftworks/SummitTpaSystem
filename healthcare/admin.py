from django.contrib import admin

from .models import (
    HealthcareAccountType, PlanYear, HealthcareAccount, AccountBalance,
    Contribution, SubstantiationRule, HealthcareReimbursement,
)


@admin.register(HealthcareAccountType)
class HealthcareAccountTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_employer_owned', 'is_portable', 'has_forfeiture']
    list_filter = ['code', 'is_employer_owned']


@admin.register(PlanYear)
class PlanYearAdmin(admin.ModelAdmin):
    list_display = ['employer', 'account_type', 'start_date', 'end_date', 'status']
    list_filter = ['status']


@admin.register(HealthcareAccount)
class HealthcareAccountAdmin(admin.ModelAdmin):
    list_display = ['employee', 'account_type', 'plan_year', 'status']
    list_filter = ['status', 'account_type']


@admin.register(AccountBalance)
class AccountBalanceAdmin(admin.ModelAdmin):
    list_display = ['account', 'available_balance', 'ytd_employer_contributions', 'ytd_disbursements']


@admin.register(Contribution)
class ContributionAdmin(admin.ModelAdmin):
    list_display = ['account', 'amount', 'source', 'date']
    list_filter = ['source']


@admin.register(SubstantiationRule)
class SubstantiationRuleAdmin(admin.ModelAdmin):
    list_display = ['account_type', 'expense_category', 'auto_approve', 'irs_eligible']


@admin.register(HealthcareReimbursement)
class HealthcareReimbursementAdmin(admin.ModelAdmin):
    list_display = ['account', 'amount', 'status', 'created_at']
    list_filter = ['status', 'payee_type']
