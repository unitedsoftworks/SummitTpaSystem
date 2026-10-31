from django.contrib import admin
from .models import (
    Association, Vendor, PremiumAllocation, Employer, Location, BenefitProduct,
    BenefitPlan, Employee, Dependent, Enrollment, EnrollmentMember, Claim,
    PayrollDeduction, CarrierInvoice, AuditLog, Payment, EmployerInvoice,
)


class PremiumAllocationInline(admin.TabularInline):
    model = PremiumAllocation
    extra = 1


@admin.register(BenefitPlan)
class BenefitPlanAdmin(admin.ModelAdmin):
    list_display = ['product', 'tier', 'monthly_premium']
    inlines = [PremiumAllocationInline]


admin.site.register(Association)
admin.site.register(Vendor)
admin.site.register(Employer)
admin.site.register(Location)
admin.site.register(BenefitProduct)
admin.site.register(Employee)
admin.site.register(Dependent)
admin.site.register(Enrollment)
admin.site.register(EnrollmentMember)
admin.site.register(Claim)
admin.site.register(PayrollDeduction)
admin.site.register(CarrierInvoice)
admin.site.register(Payment)
admin.site.register(EmployerInvoice)
admin.site.register(AuditLog)
