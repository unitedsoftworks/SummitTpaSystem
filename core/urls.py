from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'associations', views.AssociationViewSet)
router.register(r'brokers', views.BrokerViewSet)
router.register(r'carriers', views.CarrierViewSet)
router.register(r'employers', views.EmployerViewSet)
router.register(r'locations', views.LocationViewSet)
router.register(r'products', views.BenefitProductViewSet)
router.register(r'plans', views.BenefitPlanViewSet)
router.register(r'employees', views.EmployeeViewSet)
router.register(r'dependents', views.DependentViewSet)
router.register(r'enrollments', views.EnrollmentViewSet)
router.register(r'enrollment-members', views.EnrollmentMemberViewSet)
router.register(r'claims', views.ClaimViewSet)
router.register(r'deductions', views.PayrollDeductionViewSet)
router.register(r'invoices', views.CarrierInvoiceViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'messages', views.MessageViewSet)
router.register(r'life-events', views.LifeEventViewSet)
router.register(r'reimbursements', views.ReimbursementViewSet)
router.register(r'eligibility', views.EligibilityRecordViewSet)
router.register(r'cobra-events', views.CobraEventViewSet)
router.register(r'open-enrollment', views.OpenEnrollmentPeriodViewSet)
router.register(r'documents', views.DocumentViewSet)
router.register(r'notifications', views.NotificationViewSet)
router.register(r'employer-invoices', views.EmployerInvoiceViewSet)
router.register(r'exceptions', views.ExceptionViewSet)
router.register(r'exception-notes', views.ExceptionNoteViewSet)
router.register(r'audit-log', views.AuditLogViewSet)

urlpatterns = [
    path('dashboard/', views.dashboard),
    path('finance-summary/', views.finance_summary),
    path('carrier-detail/<int:carrier_id>/', views.carrier_detail),
    path('employee-portal/<int:employee_id>/', views.employee_portal),
    path('employer-portal/<int:employer_id>/', views.employer_portal),
    path('broker-portal/<int:broker_id>/', views.broker_portal),
    path('association-portal/<int:association_id>/', views.association_portal),
    path('exceptions/<int:exception_id>/ai-resolve/', views.ai_resolve_exception),
    path('', include(router.urls)),
]
