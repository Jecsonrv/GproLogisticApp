from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProviderViewSet, CustomsAgentViewSet, ShipmentTypeViewSet,
    SubClientViewSet, ServiceViewSet, ClientServicePriceViewSet
)

router = DefaultRouter()
router.register(r'providers', ProviderViewSet, basename='provider')
router.register(r'customs-agents', CustomsAgentViewSet, basename='customs-agent')
router.register(r'shipment-types', ShipmentTypeViewSet, basename='shipment-type')
router.register(r'sub-clients', SubClientViewSet, basename='sub-client')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'client-service-prices', ClientServicePriceViewSet, basename='client-service-price')

urlpatterns = [
    path('', include(router.urls)),
]
