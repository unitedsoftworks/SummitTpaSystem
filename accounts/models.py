from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = [
        ('admin', 'Administrator'),
        ('staff', 'Staff'),
        ('association', 'Association User'),
        ('broker', 'Broker User'),
        ('employer', 'Employer User'),
        ('employee', 'Employee'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='staff')
    association = models.ForeignKey(
        'core.Association', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='users',
    )
    employer = models.ForeignKey(
        'core.Employer', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='users',
    )
    employee = models.ForeignKey(
        'core.Employee', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='user_account',
    )
    broker = models.ForeignKey(
        'core.Broker', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='users',
    )
    require_mfa = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=64, blank=True)
    mfa_verified = models.BooleanField(default=False)

    class Meta:
        ordering = ['username']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_role_display()})"

    @property
    def is_admin(self):
        return self.role == 'admin' or self.is_superuser

    @property
    def is_staff_user(self):
        return self.role in ('admin', 'staff') or self.is_superuser

    def get_employer_scope(self):
        if self.is_admin or self.role == 'staff':
            return None
        if self.role == 'association' and self.association:
            from core.models import Employer
            return Employer.objects.filter(association=self.association)
        if self.role == 'broker' and self.broker:
            from core.models import BenefitProduct
            employer_ids = BenefitProduct.objects.filter(
                brokers=self.broker
            ).values_list('employer_id', flat=True).distinct()
            from core.models import Employer
            return Employer.objects.filter(id__in=employer_ids)
        if self.role == 'employer' and self.employer:
            from core.models import Employer
            return Employer.objects.filter(id=self.employer_id)
        if self.role == 'employee' and self.employee:
            from core.models import Employer
            return Employer.objects.filter(id=self.employee.employer_id)
        from core.models import Employer
        return Employer.objects.none()
