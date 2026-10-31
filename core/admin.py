from django.contrib import admin
from .models import (
    Association, Broker, Carrier, Employer, Location, BenefitProduct, BenefitPlan,
    Employee, Dependent, Enrollment, EnrollmentMember, Claim, PayrollDeduction,
    CarrierInvoice, AuditLog, Payment, EmployerInvoice,
)

admin.site.register(Association)
admin.site.register(Broker)
admin.site.register(Carrier)
admin.site.register(Employer)
admin.site.register(Location)
admin.site.register(BenefitProduct)
admin.site.register(BenefitPlan)
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
