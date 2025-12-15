from rest_framework import serializers
from .models import Transfer

class TransferSerializer(serializers.ModelSerializer):
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True, allow_null=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True, allow_null=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    created_by_name = serializers.SerializerMethodField()
    invoice_file = serializers.FileField(required=False, allow_null=True)
    
    class Meta:
        model = Transfer
        fields = '__all__'
    
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

    class Meta:
        model = Transfer
        fields = ['id', 'transfer_type', 'transfer_type_display', 'status', 'status_display',
                  'amount', 'paid_amount', 'balance', 'description', 'service_order', 'service_order_number',
                  'provider', 'provider_name', 'bank', 'bank_name', 'beneficiary_name',
                  'payment_method', 'invoice_number', 'ccf', 'invoice_file',
                  'transaction_date', 'payment_date', 'notes', 'created_at', 'created_by', 'created_by_username', 'created_by_name']
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            full_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip()
            return full_name if full_name else obj.created_by.username
        return None
