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
        
        # CORREGIDO: 'abierta' no es un estado valido. Filtrar ordenes que no estan cerradas
        pending_orders = ServiceOrder.objects.filter(client=obj).exclude(status='cerrada')
        credit_used = Transfer.objects.filter(
            service_order__in=pending_orders,
            transfer_type='terceros',
            status='provisionada'
        ).aggregate(Sum('amount'))['amount__sum'] or 0
        
        return float(credit_used)

    def validate_name(self, value):
        """
        Validar nombre permitiendo duplicados si el cliente anterior está inactivo.
        """
        if not value or not value.strip():
            raise serializers.ValidationError("El nombre es obligatorio")

        # Normalizar valor (eliminar espacios extras y convertir a mayúsculas para comparación)
        normalized_value = ' '.join(value.strip().split()).upper()

        # En actualización, permitir el mismo nombre
        if self.instance and self.instance.name.upper() == normalized_value:
            return value

        # Verificar si existe otro cliente con este nombre (case-insensitive)
        existing = Client.objects.filter(name__iexact=value.strip()).exclude(
            id=self.instance.id if self.instance else None
        ).first()

        if existing:
            # Si existe pero está inactivo, permitir (se puede crear duplicado de inactivo)
            if not existing.is_active:
                return value
            # Si está activo, rechazar
            raise serializers.ValidationError(
                f"Ya existe un cliente activo con el nombre '{existing.name}'"
            )

        return value

    def validate_nit(self, value):
        """
        Validar NIT permitiendo duplicados si el cliente anterior está inactivo.
        Convertir cadenas vacías a None para evitar error de unicidad.
        """
        if value == "" or value is None:
            return None

        # En actualización, permitir el mismo NIT
        if self.instance and self.instance.nit == value:
            return value

        # Verificar si existe otro cliente con este NIT
        existing = Client.objects.filter(nit=value).exclude(
            id=self.instance.id if self.instance else None
        ).first()

        if existing:
            # Si existe pero está inactivo, permitir (se puede crear duplicado de inactivo)
            if not existing.is_active:
                return value
            # Si está activo, rechazar
            raise serializers.ValidationError(
                f"Ya existe un cliente activo con el NIT '{value}': {existing.name}"
            )

        return value

class ClientListSerializer(serializers.ModelSerializer):
    """Serializer para listados con todos los campos necesarios"""
    credit_available = serializers.SerializerMethodField()
    taxpayer_type_display = serializers.CharField(source='get_taxpayer_type_display', read_only=True)
    taxpayer_type_short = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id', 'client_type', 'name', 'legal_name', 'nit', 'iva_registration',
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
