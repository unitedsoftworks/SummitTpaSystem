from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'account-types', views.HealthcareAccountTypeViewSet)
router.register(r'plan-years', views.PlanYearViewSet)
router.register(r'accounts', views.HealthcareAccountViewSet)
router.register(r'contributions', views.ContributionViewSet)
router.register(r'substantiation-rules', views.SubstantiationRuleViewSet)
router.register(r'reimbursements', views.HealthcareReimbursementViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
