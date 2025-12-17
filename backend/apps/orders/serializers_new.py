"""
Serializers completos para Órdenes de Servicio, Cobros y Facturación
"""
from rest_framework import serializers
from django.db.models import Sum
from decimal import Decimal
from .models import (
    ServiceOrder, OrderDocument, OrderCharge,
    Invoice, InvoicePayment, OrderHistory
)
from apps.transfers.models import Transfer
from apps.catalogs.models import Service
from apps.clients.models import Client


class OrderDocumentSerializer(serializers.ModelSerializer):
    """Serializer para documentos adjuntos a OS"""
    file_url = serializers.SerializerMethodField()
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True, allow_null=True)

    class Meta:
        model = OrderDocument
        fields = [
            'id', 'order', 'document_type', 'document_type_display', 'file', 'file_url', 'file_name',
            'file_size', 'description', 'uploaded_by', 'uploaded_by_username', 'uploaded_at'
        ]
        read_only_fields = ['id', 'uploaded_at', 'file_url', 'file_name', 'file_size', 'document_type_display', 'uploaded_by_username']
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['uploaded_by'] = request.user
        return super().create(validated_data)

    def get_file_url(self, obj):
        if obj.file:
            return obj.file.url
        return None

    def get_file_name(self, obj):
        if obj.file:
            return obj.file.name.split('/')[-1]
        return None

    def get_file_size(self, obj):
        if obj.file:
            return obj.file.size
        return 0


class OrderChargeSerializer(serializers.ModelSerializer):
    """Serializer para cobros de una OS"""
    service_name = serializers.CharField(source='service.name', read_only=True)

    class Meta:
        model = OrderCharge
        fields = [
            'id', 'service_order', 'service', 'service_name',
            'description', 'quantity', 'unit_price',
            'subtotal', 'iva_amount', 'total',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'subtotal', 'iva_amount', 'total',
            'created_at', 'updated_at', 'service_name'
        ]


class ServiceOrderListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados de OS"""
    client_name = serializers.CharField(source='client.name', read_only=True)
    customs_agent_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    def get_customs_agent_name(self, obj):
        if obj.customs_agent:
            return obj.customs_agent.get_full_name() or obj.customs_agent.username
        return None
    total_amount = serializers.SerializerMethodField()
    total_services = serializers.SerializerMethodField()
    total_third_party = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            'id', 'order_number', 'client', 'client_name',
            'customs_agent_name', 'duca', 'bl_reference',
            'eta', 'mes', 'status', 'status_display', 'facturado',
            'total_services', 'total_third_party', 'total_amount',
            'created_at'
        ]

    def get_total_services(self, obj):
        return float(obj.get_total_services())

    def get_total_third_party(self, obj):
        return float(obj.get_total_third_party())

    def get_total_amount(self, obj):
        return float(obj.get_total_amount())


class ServiceOrderDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de OS"""
    # Información relacionada
    documents = OrderDocumentSerializer(many=True, read_only=True)
    charges = OrderChargeSerializer(many=True, read_only=True)

    # Nombres de relaciones
    client_name = serializers.CharField(source='client.name', read_only=True)
    sub_client_name = serializers.CharField(source='sub_client.name', read_only=True, allow_null=True)
    shipment_type_name = serializers.CharField(source='shipment_type.name', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    customs_agent_name = serializers.SerializerMethodField()
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    
    def get_customs_agent_name(self, obj):
        if obj.customs_agent:
            return obj.customs_agent.get_full_name() or obj.customs_agent.username
        return None
    closed_by_username = serializers.CharField(source='closed_by.username', read_only=True, allow_null=True)

    # Displays
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Totales calculados
    total_services = serializers.SerializerMethodField()
    total_third_party = serializers.SerializerMethodField()
    total_direct_costs = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    total_transfers = serializers.SerializerMethodField()

    # Métricas de rentabilidad
    profit = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()

    # Información de transferencias
    transfers_summary = serializers.SerializerMethodField()

    class Meta:
        model = ServiceOrder
        fields = [
            'id', 'order_number', 'client', 'client_name',
            'sub_client', 'sub_client_name',
            'shipment_type', 'shipment_type_name',
            'provider', 'provider_name',
            'customs_agent', 'customs_agent_name',
            'purchase_order', 'bl_reference', 'eta', 'duca',
            'status', 'status_display', 'facturado', 'mes',
            'created_by', 'created_by_username',
            'closed_by', 'closed_by_username', 'closed_at',
            'created_at', 'updated_at',
            'documents', 'charges',
            'total_services', 'total_third_party', 'total_direct_costs', 'total_amount',
            'total_transfers', 'transfers_summary',
            'profit', 'profit_margin'
        ]
        read_only_fields = [
            'id', 'order_number', 'mes', 'created_at', 'updated_at',
            'closed_at', 'documents', 'charges',
            'client_name', 'sub_client_name', 'shipment_type_name',
            'provider_name', 'customs_agent_name',
            'created_by_username', 'closed_by_username', 'status_display',
            'total_services', 'total_third_party', 'total_direct_costs', 'total_amount',
            'total_transfers', 'transfers_summary',
            'profit', 'profit_margin'
        ]

    def get_total_services(self, obj):
        return float(obj.get_total_services())

    def get_total_third_party(self, obj):
        return float(obj.get_total_third_party())

    def get_total_direct_costs(self, obj):
        """Total de costos directos (no facturables al cliente)"""
        return float(obj.get_total_direct_costs())

    def get_total_amount(self, obj):
        return float(obj.get_total_amount())

    def get_total_transfers(self, obj):
        return obj.transfers.aggregate(Sum('amount'))['amount__sum'] or 0

    def get_profit(self, obj):
        """Ganancia bruta de la OS (Ingresos por Servicios - Costos Directos)"""
        return float(obj.get_profit())

    def get_profit_margin(self, obj):
        """Margen de ganancia como porcentaje"""
        return float(obj.get_profit_margin())

    def get_transfers_summary(self, obj):
        """Resumen de transferencias por tipo (incluye valores actuales y legacy)"""
        return {
            'cargos_cliente': obj.transfers.filter(transfer_type__in=['cargos', 'terceros']).aggregate(Sum('amount'))['amount__sum'] or 0,
            'costos_directos': obj.transfers.filter(transfer_type__in=['costos', 'propios']).aggregate(Sum('amount'))['amount__sum'] or 0,
            'admin': obj.transfers.filter(transfer_type='admin').aggregate(Sum('amount'))['amount__sum'] or 0,
        }


class ServiceOrderCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear OS"""

    class Meta:
        model = ServiceOrder
        fields = [
            'client', 'sub_client', 'shipment_type', 'provider',
            'customs_agent', 'purchase_order', 'bl_reference',
            'eta', 'duca'
        ]

    def validate_client(self, value):
        """Validar límite de crédito del cliente"""
        client = value
        if client.payment_condition == 'credito':
            credit_available = client.get_credit_available()
            if credit_available <= 0:
                raise serializers.ValidationError(
                    f"El cliente {client.name} ha excedido su límite de crédito."
                )
        return value

    def validate_duca(self, value):
        """Validar que el DUCA no esté duplicado"""
        if ServiceOrder.objects.filter(duca=value).exists():
            raise serializers.ValidationError(
                f"Ya existe una OS con el DUCA {value}"
            )
        return value

    def create(self, validated_data):
        """Crear OS y asignar usuario creador"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos/abonos de facturas"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    class Meta:
        model = InvoicePayment
        fields = [
            'id', 'invoice', 'payment_date', 'amount',
            'payment_method', 'payment_method_display',
            'reference_number', 'bank', 'notes', 'receipt_file',
            'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'created_by_username', 'payment_method_display'
        ]

    def create(self, validated_data):
        """Crear pago y asignar usuario"""
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class InvoiceListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listado de facturas"""
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    days_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'service_order_number', 'client_name',
            'invoice_type', 'invoice_type_display',
            'issue_date', 'due_date', 'total_amount',
            'paid_amount', 'balance', 'status', 'status_display',
            'days_overdue'
        ]

    def get_days_overdue(self, obj):
        return obj.days_overdue()


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalle de factura"""
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True)
    service_order_data = ServiceOrderListSerializer(source='service_order', read_only=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    invoice_type_display = serializers.CharField(source='get_invoice_type_display', read_only=True)
    payment_condition_display = serializers.CharField(source='get_payment_condition_display', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    days_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'service_order', 'service_order_number', 'service_order_data',
            'client_name', 'invoice_number', 'invoice_type', 'invoice_type_display',
            'issue_date', 'due_date',
            'subtotal_services', 'iva_services', 'total_services',
            'subtotal_third_party', 'total_amount',
            'paid_amount', 'balance',
            'status', 'status_display',
            'payment_condition', 'payment_condition_display',
            'dte_file', 'pdf_file', 'notes',
            'payments', 'days_overdue',
            'created_by', 'created_by_username',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'invoice_number', 'balance',
            'service_order_number', 'service_order_data', 'client_name',
            'status_display', 'invoice_type_display', 'payment_condition_display',
            'created_by_username', 'days_overdue', 'payments',
            'created_at', 'updated_at'
        ]

    def get_days_overdue(self, obj):
        return obj.days_overdue()


class InvoiceCreateSerializer(serializers.ModelSerializer):
    """Serializer para crear facturas"""
    calculate_from_os = serializers.BooleanField(write_only=True, default=True)

    class Meta:
        model = Invoice
        fields = [
            'service_order', 'invoice_type', 'issue_date',
            'payment_condition', 'notes', 'calculate_from_os'
        ]

    def create(self, validated_data):
        """Crear factura y calcular totales automáticamente"""
        calculate_from_os = validated_data.pop('calculate_from_os', True)
        request = self.context.get('request')

        if request and request.user:
            validated_data['created_by'] = request.user

        invoice = super().create(validated_data)

        if calculate_from_os:
            invoice.calculate_totals()

        return invoice


class OrderHistorySerializer(serializers.ModelSerializer):
    """Serializer para el historial de una Orden de Servicio"""
    event_type_display = serializers.CharField(source='get_event_type_display', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True, allow_null=True)
    user_username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    
    class Meta:
        model = OrderHistory
        fields = [
            'id', 'service_order', 'event_type', 'event_type_display',
            'description', 'user', 'user_name', 'user_username',
            'created_at', 'metadata'
        ]
        read_only_fields = ['id', 'created_at', 'event_type_display', 'user_name', 'user_username']
