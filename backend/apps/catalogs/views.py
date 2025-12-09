from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from .models import (
    Provider, CustomsAgent, Bank, ShipmentType, SubClient,
    Service, ClientServicePrice
)
from .serializers import (
    ProviderSerializer, CustomsAgentSerializer, BankSerializer,
    ShipmentTypeSerializer, SubClientSerializer,
    ServiceSerializer, ClientServicePriceSerializer
)
from .permissions import IsAdminOrReadOnly
from apps.users.permissions import IsAdminUser, IsOperativo

class ProviderViewSet(viewsets.ModelViewSet):
    queryset = Provider.objects.all()
    serializer_class = ProviderSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'nit', 'email']
    filterset_fields = ['is_active']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos en listados
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class CustomsAgentViewSet(viewsets.ModelViewSet):
    queryset = CustomsAgent.objects.all()
    serializer_class = CustomsAgentSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code']
    filterset_fields = ['is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class BankViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de bancos"""
    queryset = Bank.objects.all()
    serializer_class = BankSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code', 'swift_code']
    filterset_fields = ['is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos en listados
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class ShipmentTypeViewSet(viewsets.ModelViewSet):
    queryset = ShipmentType.objects.all()
    serializer_class = ShipmentTypeSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'code']
    filterset_fields = ['is_active']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')

class SubClientViewSet(viewsets.ModelViewSet):
    queryset = SubClient.objects.all()
    serializer_class = SubClientSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name']
    filterset_fields = ['is_active', 'parent_client']

    def get_queryset(self):
        queryset = super().get_queryset()
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset.order_by('name')


class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de servicios"""
    queryset = Service.objects.all()
    serializer_class = ServiceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'name', 'description']
    filterset_fields = ['is_active', 'applies_iva']
    ordering_fields = ['code', 'name', 'default_price']
    ordering = ['code']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Endpoint para obtener solo servicios activos (para dropdowns)"""
        services = self.queryset.filter(is_active=True).order_by('code')
        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)


class ClientServicePriceViewSet(viewsets.ModelViewSet):
    """ViewSet para tarifario personalizado de clientes"""
    queryset = ClientServicePrice.objects.select_related('client', 'service').all()
    serializer_class = ClientServicePriceSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['client__name', 'service__name', 'service__code']
    filterset_fields = ['client', 'service', 'is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'], url_path='by-client/(?P<client_id>[^/.]+)')
    def by_client(self, request, client_id=None):
        """Obtener todos los precios personalizados de un cliente específico"""
        prices = self.queryset.filter(client_id=client_id, is_active=True)
        serializer = self.get_serializer(prices, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """Crear múltiples precios personalizados a la vez"""
        items = request.data.get('items', [])
        created = []
        errors = []

        for item in items:
            serializer = self.get_serializer(data=item)
            if serializer.is_valid():
                serializer.save()
                created.append(serializer.data)
            else:
                errors.append({
                    'item': item,
                    'errors': serializer.errors
                })

        return Response({
            'created': created,
            'errors': errors,
            'total_created': len(created),
            'total_errors': len(errors)
        })