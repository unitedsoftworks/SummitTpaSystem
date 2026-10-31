from django.db import models


class ChartOfAccounts(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('asset', 'Asset'),
        ('liability', 'Liability'),
        ('equity', 'Equity'),
        ('revenue', 'Revenue'),
        ('expense', 'Expense'),
    ]
    code = models.CharField(max_length=20, unique=True)
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['code']
        verbose_name_plural = 'chart of accounts'

    def __str__(self):
        return f"{self.code} - {self.name}"


class JournalEntry(models.Model):
    date = models.DateField()
    description = models.TextField()
    reference_type = models.CharField(
        max_length=30, blank=True,
        help_text='invoice, payment, credit_memo, reimbursement, etc.',
    )
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    posted = models.BooleanField(default=False)
    created_by = models.CharField(max_length=150)
    created_at = models.DateTimeField(auto_now_add=True)
    posted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name_plural = 'journal entries'

    def __str__(self):
        return f"JE-{self.pk} {self.date} {'[Posted]' if self.posted else '[Draft]'}"

    @property
    def is_balanced(self):
        totals = self.lines.aggregate(
            total_debit=models.Sum('debit'),
            total_credit=models.Sum('credit'),
        )
        return (totals['total_debit'] or 0) == (totals['total_credit'] or 0)


class JournalLine(models.Model):
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='lines')
    account = models.ForeignKey(ChartOfAccounts, on_delete=models.PROTECT, related_name='journal_lines')
    debit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    employer = models.ForeignKey(
        'core.Employer', on_delete=models.SET_NULL, null=True, blank=True,
        help_text='Subledger: which employer this line pertains to',
    )
    description = models.CharField(max_length=255, blank=True)

    def __str__(self):
        if self.debit:
            return f"DR {self.account.code} ${self.debit}"
        return f"CR {self.account.code} ${self.credit}"


class BankAccount(models.Model):
    ACCOUNT_TYPE_CHOICES = [
        ('operating', 'Operating Account'),
        ('trust', 'Trust Account'),
        ('custodial', 'Custodial Account'),
    ]
    name = models.CharField(max_length=100)
    account_type = models.CharField(max_length=20, choices=ACCOUNT_TYPE_CHOICES)
    bank_name = models.CharField(max_length=100)
    last_four = models.CharField(max_length=4)
    routing_number_last_four = models.CharField(max_length=4, blank=True)
    ledger_account = models.ForeignKey(
        ChartOfAccounts, on_delete=models.SET_NULL, null=True, blank=True,
        help_text='Corresponding GL account',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (****{self.last_four})"


class BankTransaction(models.Model):
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    date = models.DateField()
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    description = models.CharField(max_length=255)
    reference = models.CharField(max_length=100, blank=True)
    reconciled = models.BooleanField(default=False)
    journal_entry = models.ForeignKey(
        JournalEntry, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='bank_transactions',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.date} ${self.amount} - {self.description}"


class Reconciliation(models.Model):
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('exception', 'Exception'),
    ]
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='reconciliations')
    period_start = models.DateField()
    period_end = models.DateField()
    statement_balance = models.DecimalField(max_digits=14, decimal_places=2)
    ledger_balance = models.DecimalField(max_digits=14, decimal_places=2)
    difference = models.DecimalField(max_digits=14, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    unmatched_bank = models.JSONField(default=list, help_text='Bank transactions with no ledger match')
    unmatched_ledger = models.JSONField(default=list, help_text='Ledger entries with no bank match')
    completed_by = models.CharField(max_length=150, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-period_end']

    def __str__(self):
        return f"{self.bank_account} {self.period_start} to {self.period_end}"
