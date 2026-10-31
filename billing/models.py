from django.db import models


class BillingPeriod(models.Model):
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('invoiced', 'Invoiced'),
    ]
    employer = models.ForeignKey('core.Employer', on_delete=models.CASCADE, related_name='billing_periods')
    period_start = models.DateField()
    period_end = models.DateField()
    cutoff_date = models.DateField(help_text='Last date changes are included in this period')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-period_start']
        unique_together = ['employer', 'period_start']

    def __str__(self):
        return f"{self.employer} {self.period_start} - {self.period_end}"


class InvoiceSnapshot(models.Model):
    employer_invoice = models.OneToOneField(
        'core.EmployerInvoice', on_delete=models.CASCADE, related_name='snapshot',
    )
    snapshot_data = models.JSONField(help_text='Full invoice data at time of issuance')
    line_items_data = models.JSONField(help_text='All line items at time of issuance')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Snapshot - {self.employer_invoice}"


class CreditMemo(models.Model):
    TYPE_CHOICES = [
        ('credit', 'Credit'),
        ('adjustment', 'Adjustment'),
        ('refund', 'Refund'),
    ]
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('issued', 'Issued'),
        ('applied', 'Applied'),
        ('voided', 'Voided'),
    ]
    employer = models.ForeignKey('core.Employer', on_delete=models.CASCADE, related_name='credit_memos')
    memo_number = models.CharField(max_length=30, unique=True)
    original_invoice = models.ForeignKey(
        'core.EmployerInvoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='credit_memos',
    )
    applied_to_invoice = models.ForeignKey(
        'core.EmployerInvoice', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='applied_credits',
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    effective_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=150, blank=True)
    issued_at = models.DateTimeField(null=True, blank=True)
    applied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.memo_number} - {self.get_type_display()} ${self.amount}"


class CreditMemoLine(models.Model):
    credit_memo = models.ForeignKey(CreditMemo, on_delete=models.CASCADE, related_name='lines')
    employee = models.ForeignKey('core.Employee', on_delete=models.SET_NULL, null=True, blank=True)
    benefit_plan = models.ForeignKey('core.BenefitPlan', on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    period_start = models.DateField(null=True, blank=True)
    period_end = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.description} ${self.amount}"


class PaymentBatch(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected'),
    ]
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    submitted_by = models.CharField(max_length=150, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.CharField(max_length=150, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = 'payment batches'

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    def recalculate_total(self):
        self.total_amount = self.items.aggregate(total=models.Sum('amount'))['total'] or 0
        self.save(update_fields=['total_amount'])


class PaymentBatchItem(models.Model):
    batch = models.ForeignKey(PaymentBatch, on_delete=models.CASCADE, related_name='items')
    vendor = models.ForeignKey('core.Vendor', on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    reference = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.vendor} - ${self.amount}" if self.vendor else f"${self.amount}"
