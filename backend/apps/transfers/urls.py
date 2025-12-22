from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransferViewSet, BatchPaymentViewSet

router = DefaultRouter()
router.register(r'transfers', TransferViewSet, basename='transfer')
router.register(r'batch-payments', BatchPaymentViewSet, basename='batch-payment')

urlpatterns = [
    path('', include(router.urls)),
]
