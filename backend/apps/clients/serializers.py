from rest_framework import serializers
from .models import Client

class ClientSerializer(serializers.ModelSerializer):
    credit_available = serializers.SerializerMethodField()
    credit_used = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = '__all__'
    
    def get_credit_available(self, obj):
        """Retorna el crédito disponible del cliente"""
        return obj.get_credit_available()
    
    def get_credit_used(self, obj):
        """Retorna el crédito usado del cliente"""
        from apps.transfers.models import Transfer
        from apps.orders.models import ServiceOrder
        
        if obj.payment_condition != 'credito':
            return 0
        
        pending_orders = ServiceOrder.objects.filter(client=obj, status='abierta')
        credit_used = Transfer.objects.filter(
            service_order__in=pending_orders,
            transfer_type='terceros',
            status='provisionada'
        ).aggregate(serializers.models.Sum('amount'))['amount__sum'] or 0
        
        return float(credit_used)

class ClientListSerializer(serializers.ModelSerializer):
    """Serializer simplificado para listados"""
    credit_available = serializers.SerializerMethodField()
    
    class Meta:
        model = Client
        fields = ['id', 'name', 'nit', 'phone', 'email', 'payment_condition', 'credit_limit', 'credit_available', 'is_active']
    
    def get_credit_available(self, obj):
        return obj.get_credit_available()
