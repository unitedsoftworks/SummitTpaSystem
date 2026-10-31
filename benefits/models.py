from django.db import models


class PlanType(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=30, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class RateSchedule(models.Model):
    benefit_plan = models.ForeignKey(
        'core.BenefitPlan', on_delete=models.CASCADE, related_name='rate_schedules',
    )
    effective_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    monthly_premium = models.DecimalField(max_digits=10, decimal_places=2)
    employer_contribution = models.DecimalField(max_digits=10, decimal_places=2)
    employee_deduction = models.DecimalField(max_digits=10, decimal_places=2)
    admin_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    broker_commission = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    carrier_premium = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    ga_override = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_date']
        unique_together = ['benefit_plan', 'effective_date']

    def __str__(self):
        return f"{self.benefit_plan} - {self.effective_date}"

    @property
    def total_allocation(self):
        return self.admin_fee + self.broker_commission + self.carrier_premium + self.ga_override

    @property
    def allocation_balanced(self):
        return self.total_allocation == self.monthly_premium


class FeeSchedule(models.Model):
    benefit_product = models.ForeignKey(
        'core.BenefitProduct', on_delete=models.CASCADE, related_name='fee_schedules',
    )
    effective_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    admin_fee_pepm = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Per employee per month admin fee',
    )
    broker_commission_pct = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    ga_override_pct = models.DecimalField(max_digits=5, decimal_places=4, default=0)
    carrier_net_pct = models.DecimalField(max_digits=5, decimal_places=4, default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-effective_date']

    def __str__(self):
        return f"{self.benefit_product} fees - {self.effective_date}"


class WaitingPeriod(models.Model):
    TYPE_CHOICES = [
        ('calendar', 'Calendar Days'),
        ('first_of_month', 'First of Month After'),
        ('first_of_month_plus', 'First of Month After + Days'),
    ]
    benefit_product = models.ForeignKey(
        'core.BenefitProduct', on_delete=models.CASCADE, related_name='waiting_periods',
    )
    employment_class = models.CharField(max_length=50, blank=True)
    days = models.PositiveIntegerField(default=0)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='first_of_month')

    def __str__(self):
        label = f"{self.days} days ({self.get_type_display()})"
        if self.employment_class:
            label += f" - {self.employment_class}"
        return label

    def calculate_eligible_date(self, hire_date):
        from datetime import timedelta
        from dateutil.relativedelta import relativedelta

        if self.type == 'calendar':
            return hire_date + timedelta(days=self.days)
        if self.type == 'first_of_month':
            after = hire_date + timedelta(days=self.days)
            if after.day == 1:
                return after
            return (after + relativedelta(months=1)).replace(day=1)
        if self.type == 'first_of_month_plus':
            first = hire_date + timedelta(days=1)
            if first.day != 1:
                first = (first + relativedelta(months=1)).replace(day=1)
            return first + timedelta(days=self.days)
        return hire_date


class RenewalVersion(models.Model):
    benefit_product = models.ForeignKey(
        'core.BenefitProduct', on_delete=models.CASCADE, related_name='renewal_versions',
    )
    version_number = models.PositiveIntegerField()
    effective_date = models.DateField()
    termination_date = models.DateField(null=True, blank=True)
    plan_data = models.JSONField(help_text='Snapshot of all plan/tier/rate data at renewal')
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=150, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        unique_together = ['benefit_product', 'version_number']
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.benefit_product} v{self.version_number}"
