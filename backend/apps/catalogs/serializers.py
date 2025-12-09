"""
Serializers para Catálogos (Proveedores, Aforadores, Servicios, etc.)
"""
from rest_framework import serializers
from .models import (
    Provider, CustomsAgent, Bank, ShipmentType, SubClient,
    Service, ClientServicePrice
)
from decimal import Decimal


class ProviderSerializer(serializers.ModelSerializer):
    """Serializer para Proveedores"""

    class Meta:
        model = Provider
        fields = [
            'id', 'name', 'nit', 'phone', 'email', 'address',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class CustomsAgentSerializer(serializers.ModelSerializer):
    """Serializer para Aforadores"""

    class Meta:
        model = CustomsAgent
        fields = [
            'id', 'name', 'code', 'phone', 'email',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class BankSerializer(serializers.ModelSerializer):
    """Serializer para Bancos"""

    class Meta:
        model = Bank
        fields = [
            'id', 'name', 'code', 'swift_code', 'contact_phone',
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


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer para Servicios"""
    price_with_iva = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id', 'code', 'name', 'description',
            'default_price', 'price_with_iva', 'applies_iva',
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
    service_code = serializers.CharField(source='service.code', read_only=True)
    price_with_iva = serializers.SerializerMethodField()

    class Meta:
        model = ClientServicePrice
        fields = [
            'id', 'client', 'client_name', 'service', 'service_name',
            'service_code', 'custom_price', 'price_with_iva',
            'is_active', 'notes', 'effective_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at',
            'client_name', 'service_name', 'service_code', 'price_with_iva'
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
