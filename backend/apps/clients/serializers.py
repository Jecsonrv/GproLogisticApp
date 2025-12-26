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

    def validate_nit(self, value):
        """Convertir cadenas vacías a None para evitar error de unicidad"""
        if value == "" or value is None:
            return None
        return value

class ClientListSerializer(serializers.ModelSerializer):
    """Serializer para listados con todos los campos necesarios"""
    credit_available = serializers.SerializerMethodField()
    taxpayer_type_display = serializers.CharField(source='get_taxpayer_type_display', read_only=True)
    taxpayer_type_short = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'legal_name', 'nit', 'iva_registration',
            'address', 'phone', 'secondary_phone', 'email', 'contact_person',
            'payment_condition', 'credit_days', 'credit_limit', 'credit_available',
            'taxpayer_type', 'taxpayer_type_display', 'taxpayer_type_short',
            'is_gran_contribuyente',  # Legacy field for compatibility
            'is_active', 'notes',
            'created_at', 'updated_at'
        ]

    def get_credit_available(self, obj):
        return obj.get_credit_available()

    def get_taxpayer_type_short(self, obj):
        return obj.get_taxpayer_type_display_short()
