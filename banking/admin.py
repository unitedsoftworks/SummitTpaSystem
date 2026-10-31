from django.contrib import admin

from .models import ChartOfAccounts, JournalEntry, JournalLine, BankAccount, BankTransaction, Reconciliation


@admin.register(ChartOfAccounts)
class ChartOfAccountsAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'account_type', 'is_active']
    list_filter = ['account_type', 'is_active']


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ['date', 'description', 'reference_type', 'posted']
    list_filter = ['posted', 'reference_type']


@admin.register(JournalLine)
class JournalLineAdmin(admin.ModelAdmin):
    list_display = ['entry', 'account', 'debit', 'credit']


@admin.register(BankAccount)
class BankAccountAdmin(admin.ModelAdmin):
    list_display = ['name', 'account_type', 'bank_name', 'last_four']
    list_filter = ['account_type']


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ['bank_account', 'date', 'amount', 'description', 'reconciled']
    list_filter = ['reconciled']


@admin.register(Reconciliation)
class ReconciliationAdmin(admin.ModelAdmin):
    list_display = ['bank_account', 'period_start', 'period_end', 'status']
    list_filter = ['status']
