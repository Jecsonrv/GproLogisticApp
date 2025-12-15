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

    @action(detail=True, methods=['get'], permission_classes=[IsOperativo])
    def account_statement(self, request, pk=None):
        from apps.transfers.models import Transfer
        from django.db.models import Sum
        from datetime import datetime

        provider = self.get_object()
        
        # Filtros
        year = request.query_params.get('year', datetime.now().year)
        
        # Transfers pendientes de pago (deuda total)
        unpaid_transfers = Transfer.objects.filter(
            provider=provider,
            status__in=['pendiente', 'aprobado', 'provisionada', 'parcial']
        ).order_by('transaction_date')
        
        total_debt = unpaid_transfers.aggregate(Sum('balance'))['balance__sum'] or 0
        
        # Historial del año seleccionado (pagados y pendientes)
        history = Transfer.objects.filter(
            provider=provider,
            transaction_date__year=year
        ).select_related('service_order').order_by('-transaction_date')
        
        # Aging Analysis
        aging = {
            'current': 0.0,  # 0-30 días
            '1-30': 0.0,     # 31-60 días (1-30 vencido)
            '31-60': 0.0,    # 61-90 días
            '61-90': 0.0,    # 91-120 días
            '90+': 0.0       # > 120 días
        }
        
        today = datetime.now().date()
        
        for transfer in unpaid_transfers:
            # Antigüedad desde la fecha de factura/transacción
            age_days = (today - transfer.transaction_date).days
            amount = float(transfer.balance)
            
            if age_days <= 30:
                aging['current'] += amount
            elif age_days <= 60:
                aging['1-30'] += amount
            elif age_days <= 90:
                aging['31-60'] += amount
            elif age_days <= 120:
                aging['61-90'] += amount
            else:
                aging['90+'] += amount
                
        transfers_data = [{
            'id': t.id,
            'transaction_date': t.transaction_date,
            'service_order': t.service_order.order_number if t.service_order else 'Gastos Admin',
            'service_order_id': t.service_order.id if t.service_order else None,
            'type': t.get_transfer_type_display(),
            'amount': float(t.amount),
            'balance': float(t.balance),
            'paid_amount': float(t.paid_amount),
            'status': t.status,
            'status_display': t.get_status_display(),
            'description': t.description,
            'invoice_number': t.invoice_number or 'S/N',
            'invoice_file': t.invoice_file.url if t.invoice_file else None
        } for t in history]
        
        return Response({
            'provider': {
                'id': provider.id,
                'name': provider.name,
                'nit': provider.nit
            },
            'total_debt': float(total_debt),
            'aging': aging,
            'transfers': transfers_data,
            'year': year
        })

class CustomsAgentViewSet(viewsets.ModelViewSet):
    queryset = CustomsAgent.objects.all()
    serializer_class = CustomsAgentSerializer
    permission_classes = [IsAdminOrReadOnly]
    search_fields = ['name', 'email']
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
    search_fields = ['name']
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
    search_fields = ['name', 'description']
    filterset_fields = ['is_active', 'applies_iva']
    ordering_fields = ['id', 'name', 'default_price']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        # Por defecto mostrar solo activos
        if self.action == 'list' and self.request.query_params.get('is_active') is None:
            queryset = queryset.filter(is_active=True)
        return queryset

    @action(detail=False, methods=['get'])
    def activos(self, request):
        """Endpoint para obtener solo servicios activos (para dropdowns)"""
        services = self.queryset.filter(is_active=True).order_by('name')
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