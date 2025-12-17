from rest_framework import serializers
from django.db.models import Sum
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
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        return float(credit_used)

class ClientListSerializer(serializers.ModelSerializer):
    """Serializer para listados con todos los campos necesarios"""
    credit_available = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'legal_name', 'nit', 'iva_registration',
            'address', 'phone', 'secondary_phone', 'email', 'contact_person',
            'payment_condition', 'credit_days', 'credit_limit', 'credit_available',
            'is_gran_contribuyente', 'is_active', 'notes',
            'created_at', 'updated_at'
        ]

    def get_credit_available(self, obj):
        return obj.get_credit_available()
