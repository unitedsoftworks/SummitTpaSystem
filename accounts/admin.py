from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['username', 'email', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active', 'require_mfa']
    fieldsets = BaseUserAdmin.fieldsets + (
        ('SummitTPA', {'fields': ('role', 'association', 'employer', 'employee', 'vendor', 'require_mfa', 'mfa_verified')}),
    )
