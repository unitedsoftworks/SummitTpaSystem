from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'plan-types', views.PlanTypeViewSet)
router.register(r'rate-schedules', views.RateScheduleViewSet)
router.register(r'fee-schedules', views.FeeScheduleViewSet)
router.register(r'waiting-periods', views.WaitingPeriodViewSet)
router.register(r'renewal-versions', views.RenewalVersionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
