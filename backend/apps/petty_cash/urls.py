from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PettyCashTransactionViewSet, CashCountViewSet

router = DefaultRouter()
router.register(r'transactions', PettyCashTransactionViewSet)
router.register(r'cash-counts', CashCountViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
