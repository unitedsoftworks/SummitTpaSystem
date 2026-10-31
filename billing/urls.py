from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register(r'billing-periods', views.BillingPeriodViewSet)
router.register(r'invoice-snapshots', views.InvoiceSnapshotViewSet)
router.register(r'credit-memos', views.CreditMemoViewSet)
router.register(r'payment-batches', views.PaymentBatchViewSet)

urlpatterns = [
    path('generate-invoice/', views.generate_invoice_view),
    path('generate-all-invoices/', views.generate_all_invoices_view),
    path('', include(router.urls)),
]
