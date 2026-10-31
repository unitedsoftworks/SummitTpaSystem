from django.db import models


class Association(models.Model):
    name = models.CharField(max_length=200)
    association_type = models.CharField(max_length=50, choices=[
        ('chamber', 'Chamber of Commerce'),
        ('trade', 'Trade Association'),
        ('professional', 'Professional Association'),
        ('industry', 'Industry Group'),
    ])
    contact_name = models.CharField(max_length=200)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def employer_count(self):
        return self.employers.count()

    @property
    def total_employees(self):
        return Employee.objects.filter(employer__association=self, status='active').count()


class Vendor(models.Model):
    VENDOR_TYPE_CHOICES = [
        ('carrier', 'Insurance Carrier'),
        ('broker', 'Broker'),
        ('tpa', 'TPA Admin'),
        ('other', 'Other'),
    ]
    name = models.CharField(max_length=200)
    vendor_type = models.CharField(max_length=20, choices=VENDOR_TYPE_CHOICES)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    agency = models.CharField(max_length=200, blank=True)
    license_number = models.CharField(max_length=50, blank=True)
    license_state = models.CharField(max_length=2, blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.get_vendor_type_display()})"

    @property
    def employer_count(self):
        return Employer.objects.filter(
            products__tiers__allocations__vendor=self
        ).distinct().count()


class Employer(models.Model):
    name = models.CharField(max_length=200)
    ein = models.CharField(max_length=20, verbose_name="EIN")
    address = models.TextField(blank=True)
    contact_name = models.CharField(max_length=200)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20, blank=True)
    association = models.ForeignKey(Association, on_delete=models.SET_NULL, null=True, blank=True, related_name='employers')
    billing_cycle_day = models.IntegerField(default=1)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    @property
    def employee_count(self):
        return self.employees.count()

    @property
    def active_employee_count(self):
        return self.employees.filter(status='active').count()

    @property
    def all_vendors(self):
        return Vendor.objects.filter(
            allocations__plan__product__employer=self
        ).distinct()

    @property
    def all_brokers(self):
        return Vendor.objects.filter(
            vendor_type='broker',
            allocations__plan__product__employer=self
        ).distinct()


class Location(models.Model):
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=200)
    address_line_1 = models.CharField(max_length=200)
    address_line_2 = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    is_primary = models.BooleanField(default=False)
    employee_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-is_primary', 'name']

    def __str__(self):
        return f"{self.name} - {self.city}, {self.state}"


class BenefitProduct(models.Model):
    PAYMENT_ARRANGEMENT_CHOICES = [
        ('consolidated', 'Consolidated Billing'),
        ('direct_to_vendor', 'Direct to Vendor'),
    ]
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='products')
    plan_type_ref = models.ForeignKey(
        'benefits.PlanType', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='products',
    )
    name = models.CharField(max_length=200)
    plan_type = models.CharField(max_length=50, choices=[
        ('medical', 'Medical'),
        ('dental', 'Dental'),
        ('vision', 'Vision'),
        ('life', 'Life'),
        ('accident', 'Accident'),
        ('disability_short', 'Short-Term Disability'),
        ('disability_long', 'Long-Term Disability'),
        ('telehealth', 'Telehealth'),
        ('critical_illness', 'Critical Illness'),
        ('hospital_indemnity', 'Hospital Indemnity'),
    ])
    payment_arrangement = models.CharField(
        max_length=20, choices=PAYMENT_ARRANGEMENT_CHOICES, default='consolidated',
    )
    effective_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.get_plan_type_display()})"


class BenefitPlan(models.Model):
    product = models.ForeignKey(BenefitProduct, on_delete=models.CASCADE, related_name='tiers')
    tier = models.CharField(max_length=50, choices=[
        ('employee_only', 'Employee Only'),
        ('employee_spouse', 'Employee + Spouse'),
        ('employee_children', 'Employee + Children'),
        ('family', 'Family'),
    ])
    monthly_premium = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employer_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employee_deduction = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        unique_together = ['product', 'tier']

    def __str__(self):
        return f"{self.product.name} - {self.get_tier_display()}"

    def update_premium_from_allocations(self):
        from django.db.models import Sum
        total = self.allocations.aggregate(total=Sum('amount'))['total'] or 0
        if self.monthly_premium != total:
            self.monthly_premium = total
            self.save(update_fields=['monthly_premium'])

    @property
    def name(self):
        return self.product.name

    @property
    def plan_type(self):
        return self.product.plan_type

    @property
    def employer(self):
        return self.product.employer

    @property
    def effective_date(self):
        return self.product.effective_date

    @property
    def active(self):
        return self.product.active


class PremiumAllocation(models.Model):
    plan = models.ForeignKey(BenefitPlan, on_delete=models.CASCADE, related_name='allocations')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='allocations')
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ['plan', 'vendor']
        ordering = ['-amount']

    def __str__(self):
        return f"{self.vendor.name} - {self.label}: ${self.amount}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.plan.update_premium_from_allocations()

    def delete(self, *args, **kwargs):
        plan = self.plan
        super().delete(*args, **kwargs)
        plan.update_premium_from_allocations()


class AbstractPerson(models.Model):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    ssn_last_four = models.CharField(max_length=4, blank=True)
    gender = models.CharField(max_length=10, choices=[
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ], blank=True)

    class Meta:
        abstract = True

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def __str__(self):
        return self.full_name


class Employee(AbstractPerson):
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='employees')
    email = models.EmailField()
    hire_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('terminated', 'Terminated'),
        ('cobra', 'COBRA'),
        ('on_leave', 'On Leave'),
        ('retired', 'Retired'),
    ], default='active')
    employment_class = models.CharField(max_length=30, choices=[
        ('full_time', 'Full-time'),
        ('part_time', 'Part-time'),
        ('seasonal', 'Seasonal'),
        ('temporary', 'Temporary'),
    ], default='full_time')
    job_title = models.CharField(max_length=100, blank=True)
    department = models.CharField(max_length=100, blank=True)
    work_location = models.CharField(max_length=100, blank=True)
    annual_salary = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    hours_per_week = models.IntegerField(null=True, blank=True)
    waive_medical = models.BooleanField(default=False)
    cobra_start_date = models.DateField(null=True, blank=True)
    cobra_end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Dependent(AbstractPerson):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='dependents')
    relationship = models.CharField(max_length=30, choices=[
        ('spouse', 'Spouse'),
        ('child', 'Child'),
        ('domestic_partner', 'Domestic Partner'),
    ])
    created_at = models.DateTimeField(auto_now_add=True)


class Enrollment(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='enrollments')
    plan = models.ForeignKey(BenefitPlan, on_delete=models.CASCADE, related_name='enrollments')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('active', 'Active'),
        ('terminated', 'Terminated'),
        ('carrier_confirmed', 'Carrier Confirmed'),
    ], default='pending')
    effective_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    carrier_confirmation_number = models.CharField(max_length=100, blank=True)
    carrier_confirmed_at = models.DateTimeField(null=True, blank=True)
    monthly_premium = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    employer_contribution = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    employee_deduction = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.employee} - {self.plan}"

    def snapshot_rates(self):
        self.monthly_premium = self.plan.monthly_premium
        self.employer_contribution = self.plan.employer_contribution
        self.employee_deduction = self.plan.employee_deduction
        self.save(update_fields=['monthly_premium', 'employer_contribution', 'employee_deduction'])
        self.allocations.all().delete()
        for alloc in self.plan.allocations.all():
            EnrollmentAllocation.objects.create(
                enrollment=self,
                vendor=alloc.vendor,
                label=alloc.label,
                amount=alloc.amount,
            )

    def update_premium_from_allocations(self):
        from django.db.models import Sum
        total = self.allocations.aggregate(total=Sum('amount'))['total'] or 0
        if self.monthly_premium != total:
            self.monthly_premium = total
            self.employee_deduction = total - (self.employer_contribution or 0)
            self.save(update_fields=['monthly_premium', 'employee_deduction'])


class EnrollmentAllocation(models.Model):
    enrollment = models.ForeignKey('Enrollment', on_delete=models.CASCADE, related_name='allocations')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='enrollment_allocations')
    label = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['-amount']

    def __str__(self):
        return f"{self.vendor.name} - {self.label}: ${self.amount}"


class EnrollmentMember(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='members')
    dependent = models.ForeignKey(Dependent, on_delete=models.CASCADE, related_name='enrollment_members', null=True, blank=True)
    is_subscriber = models.BooleanField(default=False)
    effective_date = models.DateField(null=True, blank=True)
    termination_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['enrollment', 'dependent'],
                condition=models.Q(dependent__isnull=False),
                name='unique_enrollment_dependent',
            ),
            models.UniqueConstraint(
                fields=['enrollment'],
                condition=models.Q(is_subscriber=True),
                name='unique_enrollment_subscriber',
            ),
        ]

    def __str__(self):
        if self.is_subscriber:
            return f"{self.enrollment.employee.full_name} (Subscriber)"
        return f"{self.dependent.full_name} ({self.dependent.get_relationship_display()})"

    @property
    def person_name(self):
        if self.is_subscriber:
            return self.enrollment.employee.full_name
        return self.dependent.full_name if self.dependent else ''

    @property
    def relationship(self):
        if self.is_subscriber:
            return 'Self'
        return self.dependent.get_relationship_display() if self.dependent else ''


class Claim(models.Model):
    claim_number = models.CharField(max_length=20, unique=True)
    claim_type = models.CharField(max_length=20, choices=[
        ('medical', 'Medical'),
        ('dental', 'Dental'),
        ('vision', 'Vision'),
    ])
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='claims')
    dependent = models.ForeignKey(Dependent, on_delete=models.CASCADE, related_name='claims', null=True, blank=True)
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='claims', null=True, blank=True)
    provider_name = models.CharField(max_length=200)
    service_description = models.CharField(max_length=300, blank=True)
    service_date = models.DateField()
    received_date = models.DateField()
    procedure_codes = models.CharField(max_length=200, blank=True)
    diagnosis_codes = models.CharField(max_length=200, blank=True)
    npi = models.CharField(max_length=20, blank=True, verbose_name="NPI")
    member_id = models.CharField(max_length=30, blank=True)
    received_method = models.CharField(max_length=30, choices=[
        ('electronic', 'Electronic (EDI)'),
        ('paper', 'Paper'),
        ('portal', 'Portal'),
    ], default='electronic')
    billed_amount = models.DecimalField(max_digits=10, decimal_places=2)
    allowed_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    plan_pays = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    member_owes = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    deductible_applied = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=[
        ('received', 'Received'),
        ('in_review', 'In Review'),
        ('pending_info', 'Pending Info'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('paid', 'Paid'),
    ], default='received')
    pending_reason = models.CharField(max_length=200, blank=True)
    assigned_to = models.CharField(max_length=100, blank=True)
    denial_reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['received_date']

    def __str__(self):
        return f"{self.claim_number} - {self.employee.full_name}"

    @property
    def patient_name(self):
        if self.dependent:
            return self.dependent.full_name
        return self.employee.full_name

    @property
    def patient_relationship(self):
        if self.dependent:
            return self.dependent.get_relationship_display()
        return 'Employee'


class PayrollDeduction(models.Model):
    enrollment = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name='deductions')
    period_start = models.DateField()
    period_end = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processed', 'Processed'),
        ('sent_to_employer', 'Sent to Employer'),
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.enrollment.employee} - ${self.amount} ({self.period_start})"


class CarrierInvoice(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='invoices')
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=100)
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()
    billed_amount = models.DecimalField(max_digits=12, decimal_places=2)
    expected_amount = models.DecimalField(max_digits=12, decimal_places=2)
    discrepancy = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending Review'),
        ('matched', 'Matched'),
        ('discrepancy', 'Discrepancy Found'),
        ('resolved', 'Resolved'),
        ('paid', 'Paid'),
    ], default='pending')
    notes = models.TextField(blank=True)
    received_date = models.DateField()
    due_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.vendor.name}"

    def save(self, *args, **kwargs):
        self.discrepancy = self.billed_amount - self.expected_amount
        if self.discrepancy == 0 and self.status == 'pending':
            self.status = 'matched'
        elif self.discrepancy != 0 and self.status == 'pending':
            self.status = 'discrepancy'
        super().save(*args, **kwargs)


class Payment(models.Model):
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='payments')
    invoice = models.ForeignKey(
        'EmployerInvoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='payments',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=[
        ('ach', 'ACH Transfer'),
        ('check', 'Check'),
        ('wire', 'Wire Transfer'),
    ], default='ach')
    reference_number = models.CharField(max_length=100, blank=True)
    period_start = models.DateField()
    period_end = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('received', 'Received'),
        ('applied', 'Applied'),
        ('returned', 'Returned'),
    ], default='pending')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"{self.employer.name} - ${self.amount} ({self.payment_date})"


class Message(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='messages')
    direction = models.CharField(max_length=10, choices=[
        ('inbound', 'Inbound'),
        ('outbound', 'Outbound'),
    ])
    channel = models.CharField(max_length=20, choices=[
        ('portal', 'Portal'),
        ('email', 'Email'),
        ('phone', 'Phone'),
    ], default='portal')
    subject = models.CharField(max_length=200)
    body = models.TextField()
    sender_name = models.CharField(max_length=200)
    status = models.CharField(max_length=20, choices=[
        ('unread', 'Unread'),
        ('read', 'Read'),
        ('replied', 'Replied'),
        ('closed', 'Closed'),
    ], default='unread')
    category = models.CharField(max_length=30, choices=[
        ('benefits', 'Benefits Question'),
        ('claims', 'Claims Inquiry'),
        ('enrollment', 'Enrollment'),
        ('billing', 'Billing'),
        ('general', 'General'),
        ('complaint', 'Complaint'),
    ], default='general')
    assigned_to = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} - {self.employee.full_name}"


class LifeEvent(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='life_events')
    event_type = models.CharField(max_length=30, choices=[
        ('marriage', 'Marriage'),
        ('divorce', 'Divorce'),
        ('birth', 'Birth / Adoption'),
        ('death', 'Death of Dependent'),
        ('loss_coverage', 'Loss of Other Coverage'),
        ('gain_coverage', 'Gain of Other Coverage'),
        ('address_change', 'Address Change'),
        ('job_change', 'Job Status Change'),
        ('other', 'Other'),
    ])
    event_date = models.DateField()
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('completed', 'Completed'),
    ], default='pending')
    documentation_received = models.BooleanField(default=False)
    effective_date = models.DateField(null=True, blank=True)
    reviewed_by = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_event_type_display()} - {self.employee.full_name}"


class Reimbursement(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reimbursements')
    reimbursement_type = models.CharField(max_length=20, choices=[
        ('hra', 'HRA'),
        ('fsa', 'FSA'),
        ('hsa', 'HSA'),
        ('other', 'Other'),
    ])
    amount_requested = models.DecimalField(max_digits=10, decimal_places=2)
    amount_approved = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expense_date = models.DateField()
    description = models.CharField(max_length=300)
    category = models.CharField(max_length=30, choices=[
        ('medical', 'Medical'),
        ('dental', 'Dental'),
        ('vision', 'Vision'),
        ('prescription', 'Prescription'),
        ('mental_health', 'Mental Health'),
        ('other', 'Other'),
    ], default='medical')
    receipt_received = models.BooleanField(default=False)
    status = models.CharField(max_length=20, choices=[
        ('submitted', 'Submitted'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('paid', 'Paid'),
    ], default='submitted')
    denial_reason = models.CharField(max_length=300, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    reviewed_by = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_reimbursement_type_display()} ${self.amount_requested} - {self.employee.full_name}"


class EligibilityRecord(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='eligibility_records')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='eligibility_records')
    plan = models.ForeignKey(BenefitPlan, on_delete=models.CASCADE, related_name='eligibility_records')
    file_type = models.CharField(max_length=20, choices=[
        ('834_initial', '834 Initial'),
        ('834_change', '834 Change'),
        ('834_term', '834 Termination'),
        ('manual', 'Manual Verification'),
    ])
    direction = models.CharField(max_length=10, choices=[
        ('outbound', 'Outbound'),
        ('inbound', 'Inbound'),
    ], default='outbound')
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('acknowledged', 'Acknowledged'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('error', 'Error'),
    ], default='pending')
    transaction_id = models.CharField(max_length=100, blank=True)
    error_message = models.TextField(blank=True)
    member_count = models.IntegerField(default=1)
    effective_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_file_type_display()} - {self.employee.full_name} ({self.vendor.name})"


class CobraEvent(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='cobra_events')
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='cobra_events')
    qualifying_event = models.CharField(max_length=30, choices=[
        ('termination', 'Termination'),
        ('hours_reduction', 'Reduction in Hours'),
        ('divorce', 'Divorce / Legal Separation'),
        ('death', 'Death of Employee'),
        ('medicare', 'Medicare Entitlement'),
        ('dependent_age', 'Dependent Aging Out'),
    ])
    event_date = models.DateField()
    notification_sent_date = models.DateField(null=True, blank=True)
    election_deadline = models.DateField(null=True, blank=True)
    election_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('elected', 'Elected'),
        ('declined', 'Declined'),
        ('expired', 'Expired'),
    ], default='pending')
    coverage_start = models.DateField(null=True, blank=True)
    coverage_end = models.DateField(null=True, blank=True)
    monthly_premium = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    admin_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=2.00)
    payment_status = models.CharField(max_length=20, choices=[
        ('na', 'N/A'),
        ('current', 'Current'),
        ('late', 'Late'),
        ('lapsed', 'Lapsed'),
    ], default='na')
    qualified_beneficiaries = models.IntegerField(default=1)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-event_date']

    def __str__(self):
        return f"COBRA {self.get_qualifying_event_display()} - {self.employee.full_name}"

    @property
    def total_monthly_cost(self):
        return self.monthly_premium * (1 + self.admin_fee_pct / 100)


class OpenEnrollmentPeriod(models.Model):
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='enrollment_periods')
    name = models.CharField(max_length=200)
    plan_year_start = models.DateField()
    plan_year_end = models.DateField()
    enrollment_start = models.DateField()
    enrollment_end = models.DateField()
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('upcoming', 'Upcoming'),
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('completed', 'Completed'),
    ], default='draft')
    eligible_employees = models.IntegerField(default=0)
    enrolled_employees = models.IntegerField(default=0)
    waived_employees = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-plan_year_start']

    def __str__(self):
        return f"{self.name} - {self.employer.name}"

    @property
    def completion_pct(self):
        if self.eligible_employees == 0:
            return 0
        return round((self.enrolled_employees + self.waived_employees) / self.eligible_employees * 100)


class Document(models.Model):
    title = models.CharField(max_length=200)
    document_type = models.CharField(max_length=30, choices=[
        ('plan_document', 'Plan Document'),
        ('spd', 'Summary Plan Description'),
        ('sbc', 'Summary of Benefits & Coverage'),
        ('enrollment_form', 'Enrollment Form'),
        ('cobra_notice', 'COBRA Notice'),
        ('compliance', 'Compliance Filing'),
        ('invoice', 'Invoice'),
        ('census', 'Census File'),
        ('id_card', 'ID Card Template'),
        ('other', 'Other'),
    ])
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    file_name = models.CharField(max_length=300)
    file_size = models.IntegerField(default=0)
    uploaded_by = models.CharField(max_length=200, default='System')
    status = models.CharField(max_length=20, choices=[
        ('active', 'Active'),
        ('archived', 'Archived'),
        ('pending_review', 'Pending Review'),
    ], default='active')
    effective_date = models.DateField(null=True, blank=True)
    expiration_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    @property
    def file_size_display(self):
        if self.file_size < 1024:
            return f"{self.file_size} B"
        elif self.file_size < 1024 * 1024:
            return f"{self.file_size / 1024:.1f} KB"
        return f"{self.file_size / (1024 * 1024):.1f} MB"


class Notification(models.Model):
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(max_length=30, choices=[
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('urgent', 'Urgent'),
        ('success', 'Success'),
        ('reminder', 'Reminder'),
    ])
    category = models.CharField(max_length=30, choices=[
        ('enrollment', 'Enrollment'),
        ('claims', 'Claims'),
        ('billing', 'Billing'),
        ('compliance', 'Compliance'),
        ('cobra', 'COBRA'),
        ('eligibility', 'Eligibility'),
        ('system', 'System'),
    ], default='system')
    entity_type = models.CharField(max_length=50, blank=True)
    entity_id = models.IntegerField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    is_actionable = models.BooleanField(default=False)
    action_label = models.CharField(max_length=50, blank=True)
    action_url = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class EmployerInvoice(models.Model):
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, related_name='employer_invoices')
    invoice_number = models.CharField(max_length=100, unique=True)
    billing_period_start = models.DateField()
    billing_period_end = models.DateField()
    premium_total = models.DecimalField(max_digits=12, decimal_places=2)
    employer_share = models.DecimalField(max_digits=12, decimal_places=2)
    employee_share = models.DecimalField(max_digits=12, decimal_places=2)
    admin_fee = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_due = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
        ('overdue', 'Overdue'),
    ], default='draft')
    issued_date = models.DateField()
    due_date = models.DateField()
    paid_date = models.DateField(null=True, blank=True)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-billing_period_start']

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.employer.name}"


class EmployerInvoiceLine(models.Model):
    invoice = models.ForeignKey(EmployerInvoice, on_delete=models.CASCADE, related_name='lines')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='invoice_lines')
    plan = models.ForeignKey(BenefitPlan, on_delete=models.CASCADE, related_name='invoice_lines')
    tier_display = models.CharField(max_length=100)
    monthly_premium = models.DecimalField(max_digits=10, decimal_places=2)
    employer_contribution = models.DecimalField(max_digits=10, decimal_places=2)
    employee_deduction = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        ordering = ['employee__last_name', 'employee__first_name', 'plan__product__plan_type']

    def __str__(self):
        return f"{self.employee.full_name} - {self.plan.product.name}"


class Exception(models.Model):
    CATEGORY_CHOICES = [
        ('aging_out', 'Dependent Aging Out'),
        ('invoice_discrepancy', 'Invoice Discrepancy'),
        ('missing_info', 'Missing Information'),
        ('enrollment_gap', 'Enrollment Gap'),
        ('payment_overdue', 'Payment Overdue'),
        ('cobra_deadline', 'COBRA Deadline'),
        ('eligibility_error', 'Eligibility File Error'),
        ('term_pending', 'Termination Pending'),
        ('rate_change', 'Rate Change Notice'),
        ('compliance', 'Compliance Alert'),
        ('claim_issue', 'Claim Issue'),
        ('other', 'Other'),
    ]
    PRIORITY_CHOICES = [
        ('critical', 'Critical'),
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

    title = models.CharField(max_length=200)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='open')
    description = models.TextField()
    resolution_notes = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    employer = models.ForeignKey(Employer, on_delete=models.CASCADE, null=True, blank=True, related_name='exceptions')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, null=True, blank=True, related_name='exceptions')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, null=True, blank=True, related_name='exceptions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.get_priority_display()}] {self.title}"


class ExceptionNote(models.Model):
    NOTE_TYPE_CHOICES = [
        ('note', 'Note'),
        ('memo', 'Memo'),
        ('proof', 'Proof / Evidence'),
        ('update', 'Status Update'),
        ('correspondence', 'Correspondence'),
    ]

    exception = models.ForeignKey(Exception, on_delete=models.CASCADE, related_name='notes')
    note_type = models.CharField(max_length=20, choices=NOTE_TYPE_CHOICES, default='note')
    content = models.TextField()
    author = models.CharField(max_length=200, default='Staff')
    attachment = models.FileField(upload_to='exception_attachments/', blank=True, null=True)
    attachment_name = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_note_type_display()} on {self.exception.title}"


class AuditLog(models.Model):
    action = models.CharField(max_length=50)
    entity_type = models.CharField(max_length=50)
    entity_id = models.IntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    details = models.TextField(blank=True)
    performed_by = models.CharField(max_length=200, default='System')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} - {self.entity_type} #{self.entity_id}"
