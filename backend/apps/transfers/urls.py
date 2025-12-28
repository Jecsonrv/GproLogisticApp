from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransferViewSet, BatchPaymentViewSet, ProviderCreditNoteViewSet

router = DefaultRouter()
router.register(r'transfers', TransferViewSet, basename='transfer')
router.register(r'batch-payments', BatchPaymentViewSet, basename='batch-payment')
router.register(r'provider-credit-notes', ProviderCreditNoteViewSet, basename='provider-credit-note')

urlpatterns = [
    path('', include(router.urls)),
]
