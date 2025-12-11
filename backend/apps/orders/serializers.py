from rest_framework import serializers
from django.db.models import Sum
from .models import ServiceOrder, OrderDocument, Invoice, InvoicePayment, OrderCharge
from apps.transfers.models import Transfer

class OrderDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderDocument
        fields = '__all__'

class ServiceOrderSerializer(serializers.ModelSerializer):
    documents = OrderDocumentSerializer(many=True, read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    sub_client_name = serializers.CharField(source='sub_client.name', read_only=True, allow_null=True)
    shipment_type_name = serializers.CharField(source='shipment_type.name', read_only=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Información de costos
    total_transfers = serializers.SerializerMethodField()
    total_terceros = serializers.SerializerMethodField()
    total_propios = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceOrder
        fields = '__all__'
        read_only_fields = ('order_number', 'created_at', 'updated_at')

    def get_total_transfers(self, obj):
        """Total de todas las transferencias de esta OS"""
        return obj.transfers.aggregate(Sum('amount'))['amount__sum'] or 0
    
    def get_total_terceros(self, obj):
        """Total de cargos a terceros"""
        return obj.transfers.filter(transfer_type='terceros').aggregate(Sum('amount'))['amount__sum'] or 0
    
    def get_total_propios(self, obj):
        """Total de costos propios"""
        return obj.transfers.filter(transfer_type='propios').aggregate(Sum('amount'))['amount__sum'] or 0

    def validate_client(self, value):
        # Check credit limit
        client = value
        if client.payment_condition == 'credito':
            # Calculate used credit
            pending_orders = ServiceOrder.objects.filter(client=client, status='abierta')
            credit_used = Transfer.objects.filter(
                service_order__in=pending_orders,
                transfer_type='terceros',
                status='provisionada'
            ).aggregate(Sum('amount'))['amount__sum'] or 0
            
            if credit_used >= client.credit_limit:
                raise serializers.ValidationError(
                    f"El cliente ha excedido su límite de crédito de Q{client.credit_limit}. "
                    f"Crédito usado: Q{credit_used}"
                )
        return value

class ServiceOrderListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    client_name = serializers.CharField(source='client.name', read_only=True)
    shipment_type_name = serializers.CharField(source='shipment_type.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ServiceOrder
        fields = ['id', 'order_number', 'client_name', 'shipment_type_name',
                  'purchase_order', 'eta', 'duca', 'status', 'status_display', 'created_at']


class InvoicePaymentSerializer(serializers.ModelSerializer):
    """Serializer for invoice payments"""
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = InvoicePayment
        fields = '__all__'
        read_only_fields = ('created_at', 'created_by')


class InvoiceSerializer(serializers.ModelSerializer):
    """Serializer for invoices"""
    client_name = serializers.SerializerMethodField()
    client_id = serializers.SerializerMethodField()
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    days_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_type', 'service_order', 'service_order_number',
            'client_id', 'client_name', 'issue_date', 'due_date',
            'subtotal_services', 'iva_services', 'total_services',
            'subtotal_third_party', 'total_amount', 'paid_amount', 'balance',
            'status', 'status_display', 'payment_condition',
            'notes', 'payments', 'days_overdue',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ('invoice_number', 'paid_amount', 'balance', 'created_at', 'updated_at')

    def get_client_name(self, obj):
        if obj.service_order and obj.service_order.client:
            return obj.service_order.client.name
        return None

    def get_client_id(self, obj):
        if obj.service_order and obj.service_order.client:
            return obj.service_order.client.id
        return None

    def get_days_overdue(self, obj):
        from django.utils import timezone
        if obj.due_date and obj.balance > 0:
            days = (timezone.now().date() - obj.due_date).days
            return days if days > 0 else 0
        return 0


class InvoiceListSerializer(serializers.ModelSerializer):
    """Simplified serializer for invoice lists"""
    client_name = serializers.SerializerMethodField()
    client_id = serializers.SerializerMethodField()
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_overdue = serializers.SerializerMethodField()
    payments = InvoicePaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'invoice_type', 'service_order_number',
            'client_id', 'client_name', 'issue_date', 'due_date',
            'total_amount', 'paid_amount', 'balance', 'status',
            'status_display', 'days_overdue', 'payments'
        ]

    def get_client_name(self, obj):
        if obj.service_order and obj.service_order.client:
            return obj.service_order.client.name
        return None

    def get_client_id(self, obj):
        if obj.service_order and obj.service_order.client:
            return obj.service_order.client.id
        return None

    def get_days_overdue(self, obj):
        from django.utils import timezone
        if obj.due_date and obj.balance > 0:
            days = (timezone.now().date() - obj.due_date).days
            return days if days > 0 else 0
        return 0
