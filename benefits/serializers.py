from rest_framework import serializers
from .models import FeeSchedule, PlanType, RateSchedule, RenewalVersion, WaitingPeriod


class PlanTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlanType
        fields = '__all__'


class RateScheduleSerializer(serializers.ModelSerializer):
    allocation_balanced = serializers.BooleanField(read_only=True)

    class Meta:
        model = RateSchedule
        fields = '__all__'


class FeeScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeSchedule
        fields = '__all__'


class WaitingPeriodSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaitingPeriod
        fields = '__all__'


class RenewalVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = RenewalVersion
        fields = '__all__'
