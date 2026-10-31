from django.db import models


class HealthcareAccountType(models.Model):
    CODE_CHOICES = [
        ('hra', 'Health Reimbursement Arrangement'),
        ('fsa', 'Flexible Spending Account'),
        ('hsa', 'Health Savings Account'),
        ('pha', 'Personal Health Account'),
        ('lpfsa', 'Limited Purpose FSA'),
        ('dcfsa', 'Dependent Care FSA'),
    ]
    code = models.CharField(max_length=10, choices=CODE_CHOICES, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    is_employer_owned = models.BooleanField(
        default=True, help_text='HRA=True (employer owns), HSA=False (participant owns)',
    )
    is_portable = models.BooleanField(
        default=False, help_text='HSA=True (travels with participant)',
    )
    has_forfeiture = models.BooleanField(
        default=False, help_text='FSA=True (use-it-or-lose-it)',
    )
    requires_custodian = models.BooleanField(
        default=False, help_text='HSA=True (must be held by qualified custodian)',
    )
    irs_annual_limit_individual = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    irs_annual_limit_family = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']

    def __str__(self):
        return f"{self.code.upper()} - {self.name}"


class PlanYear(models.Model):
    STATUS_CHOICES = [
        ('upcoming', 'Upcoming'),
        ('active', 'Active'),
        ('runout', 'Runout Period'),
        ('closed', 'Closed'),
    ]
    employer = models.ForeignKey('core.Employer', on_delete=models.CASCADE, related_name='plan_years')
    account_type = models.ForeignKey(HealthcareAccountType, on_delete=models.CASCADE, related_name='plan_years')
    name = models.CharField(max_length=100, blank=True)
    start_date = models.DateField()
    end_date = models.DateField()
    runout_end_date = models.DateField(null=True, blank=True)
    carryover_limit = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Max amount that can carry over (FSA $640 rule, HRA varies)',
    )
    grace_period_end = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_date']
        unique_together = ['employer', 'account_type', 'start_date']

    def __str__(self):
        return f"{self.employer} {self.account_type.code.upper()} {self.start_date.year}"


class HealthcareAccount(models.Model):
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('frozen', 'Frozen'),
        ('terminated', 'Terminated'),
        ('closed', 'Closed'),
    ]
    employee = models.ForeignKey('core.Employee', on_delete=models.CASCADE, related_name='healthcare_accounts')
    account_type = models.ForeignKey(HealthcareAccountType, on_delete=models.CASCADE, related_name='accounts')
    plan_year = models.ForeignKey(PlanYear, on_delete=models.CASCADE, related_name='accounts')
    employer_annual_contribution = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    employee_annual_election = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    effective_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ['employee', 'plan_year']

    def __str__(self):
        return f"{self.employee} - {self.account_type.code.upper()} ({self.plan_year})"


class AccountBalance(models.Model):
    account = models.OneToOneField(HealthcareAccount, on_delete=models.CASCADE, related_name='balance')
    available_balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ytd_employer_contributions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ytd_employee_contributions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ytd_disbursements = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ytd_pending_claims = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    carryover_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.account} - ${self.available_balance}"


class Contribution(models.Model):
    SOURCE_CHOICES = [
        ('employer', 'Employer'),
        ('employee', 'Employee'),
        ('rollover', 'Rollover/Carryover'),
    ]
    account = models.ForeignKey(HealthcareAccount, on_delete=models.CASCADE, related_name='contributions')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.get_source_display()} ${self.amount} on {self.date}"


class SubstantiationRule(models.Model):
    account_type = models.ForeignKey(HealthcareAccountType, on_delete=models.CASCADE, related_name='rules')
    expense_category = models.CharField(max_length=100)
    requires_receipt_above = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Receipts required for amounts above this threshold',
    )
    auto_approve = models.BooleanField(default=False)
    irs_eligible = models.BooleanField(default=True)
    description = models.TextField(blank=True)

    class Meta:
        ordering = ['expense_category']
        unique_together = ['account_type', 'expense_category']

    def __str__(self):
        return f"{self.expense_category} ({self.account_type.code.upper()})"


class HealthcareReimbursement(models.Model):
    STATUS_CHOICES = [
        ('submitted', 'Submitted'),
        ('pending_docs', 'Pending Documentation'),
        ('in_review', 'In Review'),
        ('approved', 'Approved'),
        ('denied', 'Denied'),
        ('paid', 'Paid'),
        ('voided', 'Voided'),
    ]
    PAYEE_CHOICES = [
        ('participant', 'Participant'),
        ('provider', 'Provider'),
    ]
    account = models.ForeignKey(HealthcareAccount, on_delete=models.CASCADE, related_name='reimbursements')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField()
    expense_category = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    provider_name = models.CharField(max_length=200, blank=True)
    payee_type = models.CharField(max_length=20, choices=PAYEE_CHOICES, default='participant')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='submitted')
    receipt_received = models.BooleanField(default=False)
    receipt_file = models.FileField(upload_to='healthcare/receipts/', null=True, blank=True)
    denial_reason = models.TextField(blank=True)
    approved_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    reviewed_by = models.CharField(max_length=150, blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.account.employee} - ${self.amount} ({self.get_status_display()})"

    def check_duplicate(self):
        return HealthcareReimbursement.objects.filter(
            account=self.account,
            amount=self.amount,
            expense_date=self.expense_date,
            provider_name=self.provider_name,
        ).exclude(pk=self.pk).exclude(status__in=['denied', 'voided']).exists()

    def validate_against_balance(self):
        balance = getattr(self.account, 'balance', None)
        if balance is None:
            return False, 'No balance record found'
        if self.amount > balance.available_balance:
            return False, f'Requested ${self.amount} exceeds available balance ${balance.available_balance}'
        return True, ''

    def validate_eligible_expense(self):
        rules = SubstantiationRule.objects.filter(
            account_type=self.account.account_type,
            expense_category=self.expense_category,
        )
        if not rules.exists():
            return True, 'No specific rule — manual review required'
        rule = rules.first()
        if not rule.irs_eligible:
            return False, 'Expense category not IRS-eligible'
        if rule.requires_receipt_above and self.amount > rule.requires_receipt_above and not self.receipt_received:
            return False, f'Receipt required for amounts above ${rule.requires_receipt_above}'
        return True, ''
