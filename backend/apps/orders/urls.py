from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ServiceOrderViewSet, OrderDocumentViewSet, OrderChargeViewSet, OrderHistoryViewSet
from .views_invoices import InvoiceViewSet, InvoicePaymentViewSet, CreditNoteViewSet

router = DefaultRouter()
router.register(r'service-orders', ServiceOrderViewSet, basename='service-order')
router.register(r'documents', OrderDocumentViewSet)
router.register(r'charges', OrderChargeViewSet, basename='charge')
router.register(r'history', OrderHistoryViewSet, basename='history')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'invoice-payments', InvoicePaymentViewSet, basename='invoice-payment')
router.register(r'credit-notes', CreditNoteViewSet, basename='credit-note')

urlpatterns = [
    path('', include(router.urls)),
]
