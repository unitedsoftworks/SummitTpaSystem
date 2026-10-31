from django.contrib import admin

from .models import BillingPeriod, InvoiceSnapshot, CreditMemo, CreditMemoLine, PaymentBatch, PaymentBatchItem


@admin.register(BillingPeriod)
class BillingPeriodAdmin(admin.ModelAdmin):
    list_display = ['employer', 'period_start', 'period_end', 'status']
    list_filter = ['status']


@admin.register(InvoiceSnapshot)
class InvoiceSnapshotAdmin(admin.ModelAdmin):
    list_display = ['employer_invoice', 'created_at']


@admin.register(CreditMemo)
class CreditMemoAdmin(admin.ModelAdmin):
    list_display = ['memo_number', 'employer', 'type', 'amount', 'status']
    list_filter = ['status', 'type']


@admin.register(CreditMemoLine)
class CreditMemoLineAdmin(admin.ModelAdmin):
    list_display = ['credit_memo', 'employee', 'amount']


@admin.register(PaymentBatch)
class PaymentBatchAdmin(admin.ModelAdmin):
    list_display = ['name', 'status', 'total_amount', 'created_at']
    list_filter = ['status']


@admin.register(PaymentBatchItem)
class PaymentBatchItemAdmin(admin.ModelAdmin):
    list_display = ['batch', 'payee_type', 'amount']
