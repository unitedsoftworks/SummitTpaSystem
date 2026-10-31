from rest_framework import serializers
from .models import (
    Association, Vendor, Employer, Location, BenefitProduct, BenefitPlan,
    PremiumAllocation, Employee,
    Dependent, Enrollment, EnrollmentAllocation, EnrollmentMember, Claim,
    PayrollDeduction,
    CarrierInvoice, AuditLog, Message, LifeEvent, Reimbursement, Payment,
    EligibilityRecord, CobraEvent, OpenEnrollmentPeriod, Document, Notification,
    EmployerInvoice, EmployerInvoiceLine, Exception, ExceptionNote,
)


class AssociationSerializer(serializers.ModelSerializer):
    employer_count = serializers.IntegerField(read_only=True)
    total_employees = serializers.IntegerField(read_only=True)

    class Meta:
        model = Association
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    vendor_type_display = serializers.CharField(source='get_vendor_type_display', read_only=True)
    employer_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Vendor
        fields = '__all__'


class LocationSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True)

    class Meta:
        model = Location
        fields = '__all__'


class EmployerSerializer(serializers.ModelSerializer):
    employee_count = serializers.IntegerField(read_only=True)
    active_employee_count = serializers.IntegerField(read_only=True)
    association_name = serializers.CharField(source='association.name', read_only=True, default=None)
    all_brokers = VendorSerializer(many=True, read_only=True)
    locations = LocationSerializer(many=True, read_only=True)

    class Meta:
        model = Employer
        fields = '__all__'


class PremiumAllocationSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_type = serializers.CharField(source='vendor.vendor_type', read_only=True)

    class Meta:
        model = PremiumAllocation
        fields = '__all__'


class BenefitPlanTierSerializer(serializers.ModelSerializer):
    enrollment_count = serializers.SerializerMethodField()
    allocations = PremiumAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = BenefitPlan
        fields = ['id', 'tier', 'monthly_premium', 'employer_contribution',
                  'employee_deduction', 'enrollment_count', 'allocations']

    def get_enrollment_count(self, obj):
        return obj.enrollments.filter(status__in=['active', 'carrier_confirmed']).count()


class BenefitProductSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    tiers = BenefitPlanTierSerializer(many=True, read_only=True)
    payment_arrangement_display = serializers.CharField(source='get_payment_arrangement_display', read_only=True)
    total_enrolled = serializers.SerializerMethodField()
    vendor_names = serializers.SerializerMethodField()
    carrier_name = serializers.SerializerMethodField()

    class Meta:
        model = BenefitProduct
        fields = '__all__'

    def get_total_enrolled(self, obj):
        return sum(
            t.enrollments.filter(status__in=['active', 'carrier_confirmed']).count()
            for t in obj.tiers.all()
        )

    def get_vendor_names(self, obj):
        return list(
            Vendor.objects.filter(
                allocations__plan__product=obj
            ).values_list('name', flat=True).distinct()
        )

    def get_carrier_name(self, obj):
        alloc = PremiumAllocation.objects.filter(
            plan__product=obj, vendor__vendor_type='carrier'
        ).first()
        return alloc.vendor.name if alloc else None


class BenefitPlanSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='product.employer.name', read_only=True)
    name = serializers.CharField(source='product.name', read_only=True)
    plan_type = serializers.CharField(source='product.plan_type', read_only=True)
    effective_date = serializers.DateField(source='product.effective_date', read_only=True)
    active = serializers.BooleanField(source='product.active', read_only=True)
    enrollment_count = serializers.SerializerMethodField()
    allocations = PremiumAllocationSerializer(many=True, read_only=True)
    carrier_name = serializers.SerializerMethodField()

    class Meta:
        model = BenefitPlan
        fields = ['id', 'product', 'tier', 'monthly_premium', 'employer_contribution',
                  'employee_deduction', 'carrier_name', 'employer_name', 'name',
                  'plan_type', 'effective_date', 'active', 'enrollment_count', 'allocations']

    def get_enrollment_count(self, obj):
        return obj.enrollments.filter(status__in=['active', 'carrier_confirmed']).count()

    def get_carrier_name(self, obj):
        alloc = obj.allocations.filter(vendor__vendor_type='carrier').first()
        return alloc.vendor.name if alloc else None


class DependentSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    relationship_display = serializers.CharField(source='get_relationship_display', read_only=True)

    class Meta:
        model = Dependent
        fields = '__all__'


class EmployeeSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    dependent_count = serializers.SerializerMethodField()

    class Meta:
        model = Employee
        fields = '__all__'

    def get_dependent_count(self, obj):
        return obj.dependents.count()


class EnrollmentMemberSerializer(serializers.ModelSerializer):
    person_name = serializers.CharField(read_only=True)
    relationship = serializers.CharField(read_only=True)
    dependent_name = serializers.CharField(source='dependent.full_name', read_only=True, default=None)
    dependent_dob = serializers.DateField(source='dependent.date_of_birth', read_only=True, default=None)

    class Meta:
        model = EnrollmentMember
        fields = '__all__'


class EnrollmentAllocationSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    vendor_type = serializers.CharField(source='vendor.vendor_type', read_only=True)

    class Meta:
        model = EnrollmentAllocation
        fields = '__all__'


class EnrollmentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employee.employer.name', read_only=True)
    plan_name = serializers.CharField(source='plan.product.name', read_only=True)
    plan_type = serializers.CharField(source='plan.product.plan_type', read_only=True)
    carrier_name = serializers.SerializerMethodField()
    plan_monthly_premium = serializers.DecimalField(
        source='plan.monthly_premium', max_digits=10, decimal_places=2, read_only=True
    )
    tier = serializers.CharField(source='plan.tier', read_only=True)
    tier_display = serializers.CharField(source='plan.get_tier_display', read_only=True)
    member_count = serializers.SerializerMethodField()
    members = EnrollmentMemberSerializer(many=True, read_only=True)
    allocations = EnrollmentAllocationSerializer(many=True, read_only=True)

    class Meta:
        model = Enrollment
        fields = '__all__'

    def get_member_count(self, obj):
        return obj.members.count()

    def get_carrier_name(self, obj):
        alloc = obj.allocations.filter(vendor__vendor_type='carrier').first()
        if alloc:
            return alloc.vendor.name
        alloc = obj.plan.allocations.filter(vendor__vendor_type='carrier').first()
        return alloc.vendor.name if alloc else None


class ClaimSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employee.employer.name', read_only=True)
    patient_name = serializers.CharField(read_only=True)
    patient_relationship = serializers.CharField(read_only=True)

    class Meta:
        model = Claim
        fields = '__all__'


class PayrollDeductionSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    plan_name = serializers.CharField(source='enrollment.plan.product.name', read_only=True)

    class Meta:
        model = PayrollDeduction
        fields = '__all__'

    def get_employee_name(self, obj):
        return obj.enrollment.employee.full_name


class CarrierInvoiceSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    carrier_name = serializers.CharField(source='vendor.name', read_only=True)

    class Meta:
        model = CarrierInvoice
        fields = '__all__'


class PaymentSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True, default=None)

    class Meta:
        model = Payment
        fields = '__all__'


class MessageSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employee.employer.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)

    class Meta:
        model = Message
        fields = '__all__'


class LifeEventSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employee.employer.name', read_only=True)
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)

    class Meta:
        model = LifeEvent
        fields = '__all__'


class ReimbursementSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employee.employer.name', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    type_display = serializers.CharField(source='get_reimbursement_type_display', read_only=True)

    class Meta:
        model = Reimbursement
        fields = '__all__'


class EligibilityRecordSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employee.employer.name', read_only=True)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True)
    carrier_name = serializers.CharField(source='vendor.name', read_only=True)
    plan_name = serializers.CharField(source='plan.product.name', read_only=True)
    file_type_display = serializers.CharField(source='get_file_type_display', read_only=True)

    class Meta:
        model = EligibilityRecord
        fields = '__all__'


class CobraEventSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    qualifying_event_display = serializers.CharField(source='get_qualifying_event_display', read_only=True)
    election_status_display = serializers.CharField(source='get_election_status_display', read_only=True)
    total_monthly_cost = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = CobraEvent
        fields = '__all__'


class OpenEnrollmentPeriodSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    completion_pct = serializers.IntegerField(read_only=True)

    class Meta:
        model = OpenEnrollmentPeriod
        fields = '__all__'


class DocumentSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True, default=None)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, default=None)
    carrier_name = serializers.CharField(source='vendor.name', read_only=True, default=None)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True, default=None)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    file_size_display = serializers.CharField(read_only=True)

    class Meta:
        model = Document
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'


class EmployerInvoiceLineSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    plan_name = serializers.CharField(source='plan.product.name', read_only=True)
    plan_type = serializers.CharField(source='plan.product.plan_type', read_only=True)

    class Meta:
        model = EmployerInvoiceLine
        fields = '__all__'


class EmployerInvoiceSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True)
    lines = EmployerInvoiceLineSerializer(many=True, read_only=True)
    line_count = serializers.SerializerMethodField()

    class Meta:
        model = EmployerInvoice
        fields = '__all__'

    def get_line_count(self, obj):
        return obj.lines.count()


class ExceptionNoteSerializer(serializers.ModelSerializer):
    note_type_display = serializers.CharField(source='get_note_type_display', read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = ExceptionNote
        fields = '__all__'

    def get_attachment_url(self, obj):
        if obj.attachment:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.attachment.url)
            return obj.attachment.url
        return None


class ExceptionSerializer(serializers.ModelSerializer):
    employer_name = serializers.CharField(source='employer.name', read_only=True, default=None)
    employee_name = serializers.CharField(source='employee.full_name', read_only=True, default=None)
    vendor_name = serializers.CharField(source='vendor.name', read_only=True, default=None)
    carrier_name = serializers.CharField(source='vendor.name', read_only=True, default=None)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    notes = ExceptionNoteSerializer(many=True, read_only=True)
    note_count = serializers.SerializerMethodField()

    class Meta:
        model = Exception
        fields = '__all__'

    def get_note_count(self, obj):
        return obj.notes.count()


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'
