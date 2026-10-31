from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'chart-of-accounts', views.ChartOfAccountsViewSet)
router.register(r'journal-entries', views.JournalEntryViewSet)
router.register(r'bank-accounts', views.BankAccountViewSet)
router.register(r'bank-transactions', views.BankTransactionViewSet)
router.register(r'reconciliations', views.ReconciliationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
