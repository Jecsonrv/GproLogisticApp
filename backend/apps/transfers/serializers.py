from rest_framework import serializers
from .models import Transfer, TransferPayment, BatchPayment

class TransferSerializer(serializers.ModelSerializer):
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True, allow_null=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True, allow_null=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    invoice_file = serializers.FileField(required=False, allow_null=True)

    # Campos display para choices
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    # Campo relacionado
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)

    class Meta:
        model = Transfer
        fields = [
            'id', 'service_order', 'service_order_number', 'client_name',
            'provider', 'provider_name', 'beneficiary_name',
            'transfer_type', 'transfer_type_display',
            'amount', 'currency', 'exchange_rate',
            'description', 'status', 'status_display',
            'bank', 'bank_name', 'transaction_date', 'payment_date',
            'payment_method', 'invoice_number', 'ccf',
            'invoice_file', 'balance', 'paid_amount',
            'customer_markup_percentage', 'customer_applies_iva', 'customer_iva_type',
            'created_by', 'created_by_username', 'created_by_name',
            'created_at', 'updated_at'
        ]
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None
    
    def create(self, validated_data):
        # Asignar el usuario que crea la transferencia
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)

class TransferListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True, allow_null=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Info de facturación al cliente
    invoice_id = serializers.IntegerField(source='invoice.id', read_only=True, allow_null=True)
    invoice_number_client = serializers.CharField(source='invoice.invoice_number', read_only=True, allow_null=True)
    is_billed = serializers.SerializerMethodField()

    class Meta:
        model = Transfer
        fields = ['id', 'transfer_type', 'transfer_type_display', 'status', 'status_display',
                  'amount', 'paid_amount', 'balance', 'description', 'service_order', 'service_order_number',
                  'provider', 'provider_name', 'bank', 'bank_name', 'beneficiary_name',
                  'payment_method', 'invoice_number', 'ccf', 'invoice_file',
                  'customer_markup_percentage', 'customer_applies_iva',
                  'invoice_id', 'invoice_number_client', 'is_billed',
                  'transaction_date', 'payment_date', 'created_at', 'created_by', 'created_by_username', 'created_by_name']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None
    
    def get_is_billed(self, obj):
        """Indica si este gasto ya fue facturado al cliente"""
        return obj.invoice_id is not None


class TransferPaymentSerializer(serializers.ModelSerializer):
    """Serializer para pagos individuales (actualizado con batch_payment)"""
    transfer_description = serializers.CharField(source='transfer.description', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    batch_payment_number = serializers.CharField(source='batch_payment.batch_number', read_only=True, allow_null=True)

    class Meta:
        model = TransferPayment
        fields = [
            'id', 'transfer', 'transfer_description', 'amount',
            'payment_date', 'payment_method', 'payment_method_display',
            'reference_number', 'notes', 'proof_file',
            'batch_payment', 'batch_payment_number',
            'created_by', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_at']


class BatchPaymentSerializer(serializers.ModelSerializer):
    """Serializer básico para listar BatchPayments"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)
    transfers_count = serializers.SerializerMethodField()
    service_orders = serializers.SerializerMethodField()

    class Meta:
        model = BatchPayment
        fields = [
            'id', 'batch_number', 'provider', 'provider_name',
            'total_amount', 'payment_method', 'payment_method_display',
            'payment_date', 'bank', 'bank_name', 'reference_number',
            'proof_file', 'notes', 'transfers_count', 'service_orders',
            'created_by', 'created_by_username', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['batch_number', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_transfers_count(self, obj):
        return obj.get_transfers_count()

    def get_service_orders(self, obj):
        """Retorna lista de números de OS afectadas"""
        orders = obj.get_service_orders()
        return [os.order_number for os in orders]


class BatchPaymentDetailSerializer(serializers.ModelSerializer):
    """Serializer con detalles completos incluyendo pagos individuales"""
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    bank_name = serializers.CharField(source='bank.name', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    payment_method_display = serializers.CharField(source='get_payment_method_display', read_only=True)

    # Pagos individuales incluidos en este lote
    payments = serializers.SerializerMethodField()

    class Meta:
        model = BatchPayment
        fields = [
            'id', 'batch_number', 'provider', 'provider_name',
            'total_amount', 'payment_method', 'payment_method_display',
            'payment_date', 'bank', 'bank_name', 'reference_number',
            'proof_file', 'notes', 'payments',
            'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None

    def get_payments(self, obj):
        """Retorna lista de pagos individuales con información del Transfer"""
        payments = TransferPayment.objects.filter(
            batch_payment=obj,
            is_deleted=False
        ).select_related('transfer', 'transfer__service_order', 'transfer__provider').order_by('id')

        return [{
            'id': p.id,
            'transfer_id': p.transfer.id,
            'transfer_description': p.transfer.description,
            'transfer_invoice_number': p.transfer.invoice_number,
            'transfer_amount': str(p.transfer.amount),
            'amount_paid': str(p.amount),
            'service_order': p.transfer.service_order.order_number if p.transfer.service_order else None,
            'service_order_id': p.transfer.service_order.id if p.transfer.service_order else None,
        } for p in payments]
