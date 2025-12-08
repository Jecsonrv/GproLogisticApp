from rest_framework import serializers
from .models import Transfer

class TransferSerializer(serializers.ModelSerializer):
    service_order_number = serializers.CharField(source='service_order.order_number', read_only=True, allow_null=True)
    client_name = serializers.CharField(source='service_order.client.name', read_only=True, allow_null=True)
    provider_name = serializers.CharField(source='provider.name', read_only=True, allow_null=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = Transfer
        fields = '__all__'
    
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
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Transfer
        fields = ['id', 'transfer_type', 'transfer_type_display', 'status', 'status_display', 
                  'amount', 'description', 'service_order_number', 'provider_name', 
                  'payment_method', 'invoice_number', 'transaction_date', 'payment_date']
