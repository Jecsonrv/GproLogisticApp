"""
Serializers para Catálogos (Proveedores, Aforadores, Servicios, etc.)
"""
from rest_framework import serializers
from .models import (
    ProviderCategory, Provider, CustomsAgent, Bank, ShipmentType, Customs, SubClient,
    Service, ClientServicePrice
)
from decimal import Decimal


class ProviderCategorySerializer(serializers.ModelSerializer):
    """Serializer para Categorías de Proveedores"""

    class Meta:
        model = ProviderCategory
        fields = ['id', 'name', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class ProviderSerializer(serializers.ModelSerializer):
    """Serializer para Proveedores"""
    total_debt = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, allow_null=True)

    class Meta:
        model = Provider
        fields = [
            'id', 'name', 'category', 'category_name', 'nit', 'phone',
            'email', 'address', 'is_active', 'created_at', 'total_debt'
        ]
        read_only_fields = ['id', 'created_at', 'category_name']

    def get_total_debt(self, obj):
        """Calcula la deuda total pendiente del proveedor"""
        from apps.transfers.models import Transfer
        from django.db.models import Sum

        debt = Transfer.objects.filter(
            provider=obj,
            status__in=['pendiente', 'aprobado', 'provisionada', 'parcial']
        ).aggregate(Sum('balance'))['balance__sum'] or 0

        return float(debt)


class CustomsAgentSerializer(serializers.ModelSerializer):
    """Serializer para Aforadores"""

    class Meta:
        model = CustomsAgent
        fields = [
            'id', 'name', 'phone', 'email',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class BankSerializer(serializers.ModelSerializer):
    """Serializer para Bancos"""

    class Meta:
        model = Bank
        fields = [
            'id', 'name', 'contact_phone',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ShipmentTypeSerializer(serializers.ModelSerializer):
    """Serializer para Tipos de Embarque"""

    class Meta:
        model = ShipmentType
        fields = [
            'id', 'name', 'code', 'description',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CustomsSerializer(serializers.ModelSerializer):
    """Serializer para Aduanas"""

    class Meta:
        model = Customs
        fields = [
            'id', 'name', 'code', 'location',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SubClientSerializer(serializers.ModelSerializer):
    """Serializer para Subclientes"""
    parent_client_name = serializers.CharField(
        source='parent_client.name',
        read_only=True,
        allow_null=True
    )

    class Meta:
        model = SubClient
        fields = [
            'id', 'name', 'parent_client', 'parent_client_name',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'parent_client_name']

    def validate_parent_client(self, value):
        """Validar que se proporcione un cliente padre"""
        if not value:
            raise serializers.ValidationError("Debes seleccionar un cliente principal para el subcliente.")
        return value


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer para Servicios"""
    price_with_iva = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description',
            'default_price', 'price_with_iva', 'applies_iva', 'iva_type',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'price_with_iva']

    def get_price_with_iva(self, obj):
        """Retorna el precio con IVA calculado"""
        return float(obj.get_price_with_iva())


class ClientServicePriceSerializer(serializers.ModelSerializer):
    """Serializer para Tarifario de Clientes"""
    client_name = serializers.CharField(source='client.name', read_only=True)
    service_name = serializers.CharField(source='service.name', read_only=True)
    service_id = serializers.IntegerField(source='service.id', read_only=True)
    price_with_iva = serializers.SerializerMethodField()

    class Meta:
        model = ClientServicePrice
        fields = [
            'id', 'client', 'client_name', 'service', 'service_name',
            'service_id', 'custom_price', 'iva_type', 'price_with_iva',
            'is_active', 'notes', 'effective_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'client_name', 'service_name', 'service_id', 'price_with_iva'
        ]

    def get_price_with_iva(self, obj):
        """Retorna el precio personalizado con IVA"""
        return float(obj.get_price_with_iva())

    def validate(self, data):
        """Validar que no exista ya un precio para este cliente+servicio"""
        client = data.get('client')
        service = data.get('service')

        # Solo validar en creación, no en actualización
        if not self.instance:
            existing = ClientServicePrice.objects.filter(
                client=client,
                service=service
            ).exists()

            if existing:
                raise serializers.ValidationError(
                    "Ya existe un precio personalizado para este cliente y servicio."
                )

        return data
