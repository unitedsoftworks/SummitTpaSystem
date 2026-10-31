from django.contrib import admin

from .models import PlanType, RateSchedule, FeeSchedule, WaitingPeriod, RenewalVersion


@admin.register(PlanType)
class PlanTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']


@admin.register(RateSchedule)
class RateScheduleAdmin(admin.ModelAdmin):
    list_display = ['benefit_plan', 'effective_date', 'version']
    list_filter = ['effective_date']


@admin.register(FeeSchedule)
class FeeScheduleAdmin(admin.ModelAdmin):
    list_display = ['benefit_product', 'admin_fee_pepm', 'effective_date']


@admin.register(WaitingPeriod)
class WaitingPeriodAdmin(admin.ModelAdmin):
    list_display = ['benefit_product', 'employment_class', 'days', 'type']


@admin.register(RenewalVersion)
class RenewalVersionAdmin(admin.ModelAdmin):
    list_display = ['benefit_product', 'version_number', 'created_at']
