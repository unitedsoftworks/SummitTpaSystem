from rest_framework import serializers
from .models import (
    BillingPeriod,
    CreditMemo,
    CreditMemoLine,
    InvoiceSnapshot,
    PaymentBatch,
    PaymentBatchItem,
)


class BillingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingPeriod
        fields = '__all__'


class InvoiceSnapshotSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceSnapshot
        fields = '__all__'


class CreditMemoLineSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditMemoLine
        fields = '__all__'


class CreditMemoSerializer(serializers.ModelSerializer):
    lines = CreditMemoLineSerializer(many=True, read_only=True)

    class Meta:
        model = CreditMemo
        fields = '__all__'


class PaymentBatchItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentBatchItem
        fields = '__all__'


class PaymentBatchSerializer(serializers.ModelSerializer):
    items = PaymentBatchItemSerializer(many=True, read_only=True)

    class Meta:
        model = PaymentBatch
        fields = '__all__'
