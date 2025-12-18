"""
Modelos para Servicios y Tarifario
Sistema de precios personalizados por cliente

Cumplimiento fiscal El Salvador (Ministerio de Hacienda):
- GRAVADO: Servicios sujetos a IVA 13%
- EXENTO: Servicios exentos por ley (ej: educación, salud básica)
- NO_SUJETO: Servicios no sujetos a IVA (ej: exportaciones de servicios)
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal


# Constantes fiscales El Salvador
IVA_RATE = Decimal('0.13')  # 13% IVA
RETENCION_RATE = Decimal('0.01')  # 1% retención Gran Contribuyente
RETENCION_THRESHOLD = Decimal('100.00')  # Umbral para retención (sin IVA)


class Service(models.Model):
    """
    Catálogo de servicios que ofrece la agencia aduanal
    Ej: ASESORÍA Y GESTIÓN ADUANAL, GESTIÓN DE PERMISO DE SALUD, etc.

    Tratamiento fiscal según normativa salvadoreña:
    - GRAVADO: Se aplica IVA 13% (default)
    - EXENTO: No se aplica IVA por exención legal específica
    - NO_SUJETO: No se aplica IVA (exportaciones, servicios internacionales)
    """

    # Tipos de tratamiento fiscal según Ministerio de Hacienda de El Salvador
    IVA_TYPE_CHOICES = (
        ('gravado', 'Gravado (13% IVA)'),
        ('exento', 'Exento'),
        ('no_sujeto', 'No Sujeto'),
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
    # Campo legacy para compatibilidad
    applies_iva = models.BooleanField(
        default=True,
        verbose_name="Aplica IVA (Legacy)"
    )
    # Nuevo campo para tratamiento fiscal completo
    iva_type = models.CharField(
        max_length=20,
        choices=IVA_TYPE_CHOICES,
        default='gravado',
        verbose_name="Tratamiento Fiscal",
        help_text="Tipo de IVA según normativa salvadoreña"
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
        ordering = ['name']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return f"#{self.id} - {self.name}"

    def save(self, *args, **kwargs):
        """Sincronizar campo legacy applies_iva con iva_type"""
        # Sincronizar: si iva_type es 'gravado', applies_iva debe ser True
        self.applies_iva = (self.iva_type == 'gravado')
        super().save(*args, **kwargs)

    def get_iva_rate(self):
        """
        Retorna la tasa de IVA aplicable según el tratamiento fiscal.

        Returns:
            Decimal: Tasa de IVA (0.13 para gravado, 0 para exento/no_sujeto)
        """
        if self.iva_type == 'gravado':
            return IVA_RATE
        return Decimal('0.00')

    def get_price_with_iva(self):
        """
        Calcula el precio con IVA según el tratamiento fiscal.

        Returns:
            Decimal: Precio con IVA si es gravado, precio sin IVA si es exento/no_sujeto
        """
        iva_rate = self.get_iva_rate()
        if iva_rate > 0:
            return self.default_price * (1 + iva_rate)
        return self.default_price

    def get_iva_type_display_short(self):
        """Retorna etiqueta corta para UI"""
        labels = {
            'gravado': 'IVA 13%',
            'exento': 'Exento',
            'no_sujeto': 'No Sujeto'
        }
        return labels.get(self.iva_type, 'N/A')


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
        ordering = ['client__name', 'service__name']
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
