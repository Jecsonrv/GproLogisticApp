from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TransferViewSet, BatchPaymentViewSet, ProviderCreditNoteViewSet,
    TransferPaymentViewSet, ProviderInvoiceViewSet, DirectCostAllocationViewSet
)

router = DefaultRouter()
router.register(r'transfers', TransferViewSet, basename='transfer')
router.register(r'transfer-payments', TransferPaymentViewSet, basename='transfer-payment')
router.register(r'batch-payments', BatchPaymentViewSet, basename='batch-payment')
router.register(r'provider-credit-notes', ProviderCreditNoteViewSet, basename='provider-credit-note')
# Nuevos endpoints para Costos Directos
router.register(r'provider-invoices', ProviderInvoiceViewSet, basename='provider-invoice')
router.register(r'cost-allocations', DirectCostAllocationViewSet, basename='cost-allocation')

urlpatterns = [
    path('', include(router.urls)),
]
