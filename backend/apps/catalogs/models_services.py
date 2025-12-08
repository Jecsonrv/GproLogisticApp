"""
Modelos para Servicios y Tarifario
Sistema de precios personalizados por cliente
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


class Service(models.Model):
    """
    Catálogo de servicios que ofrece la agencia aduanal
    Ej: ASESORÍA Y GESTIÓN ADUANAL, GESTIÓN DE PERMISO DE SALUD, etc.
    """
    code = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Código"
    )
    name = models.CharField(
        max_length=255,
        verbose_name="Nombre del Servicio"
    )
    description = models.TextField(
        blank=True,
        verbose_name="Descripción"
    )
    default_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Precio por Defecto (Sin IVA)"
    )
    applies_iva = models.BooleanField(
        default=True,
        verbose_name="Aplica IVA"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )

    class Meta:
        verbose_name = "Servicio"
        verbose_name_plural = "Servicios"
        ordering = ['code', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.code} - {self.name}"

    def get_price_with_iva(self):
        """Calcula el precio con IVA (13% en El Salvador)"""
        if self.applies_iva:
            return self.default_price * Decimal('1.13')
        return self.default_price


class ClientServicePrice(models.Model):
    """
    Tarifario personalizado por cliente
    Permite tener precios especiales para clientes específicos
    """
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.CASCADE,
        related_name='custom_prices',
        verbose_name="Cliente"
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='client_prices',
        verbose_name="Servicio"
    )
    custom_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Precio Personalizado (Sin IVA)"
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Activo"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notas"
    )
    effective_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de Vigencia"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )

    class Meta:
        verbose_name = "Precio Personalizado"
        verbose_name_plural = "Tarifario de Clientes"
        unique_together = ['client', 'service']
        ordering = ['client__name', 'service__code']
        indexes = [
            models.Index(fields=['client', 'service']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"{self.client.name} - {self.service.name}: ${self.custom_price}"

    def get_price_with_iva(self):
        """Calcula el precio personalizado con IVA"""
        if self.service.applies_iva:
            return self.custom_price * Decimal('1.13')
        return self.custom_price
