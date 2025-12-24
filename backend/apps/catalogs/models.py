from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from apps.core.models import SoftDeleteModel

class ProviderCategory(models.Model):
    """Categorías de proveedores (Naviera, Agencia de Carga, etc.)"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre")
    description = models.TextField(blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        verbose_name = "Categoría de Proveedor"
        verbose_name_plural = "Categorías de Proveedores"
        ordering = ['name']

    def __str__(self):
        return self.name

class Provider(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre")
    category = models.ForeignKey(
        ProviderCategory,
        on_delete=models.PROTECT,
        related_name='providers',
        null=True,
        blank=True,
        verbose_name="Categoría"
    )
    nit = models.CharField(max_length=50, blank=True, verbose_name="NIT")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    email = models.EmailField(blank=True, verbose_name="Email")
    address = models.TextField(blank=True, verbose_name="Dirección")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ['name']

    def __str__(self):
        return self.name

class CustomsAgent(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    email = models.EmailField(blank=True, verbose_name="Email")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        verbose_name = "Aforador"
        verbose_name_plural = "Aforadores"
        ordering = ['name']

    def __str__(self):
        return self.name

class Bank(models.Model):
    """Catálogo de bancos para transferencias y pagos"""
    name = models.CharField(max_length=100, unique=True, verbose_name="Nombre del Banco")
    contact_phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono de Contacto")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        verbose_name = "Banco"
        verbose_name_plural = "Bancos"
        ordering = ['name']
        indexes = [
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name

class ShipmentType(models.Model):
    name = models.CharField(max_length=255, unique=True, verbose_name="Nombre")
    code = models.CharField(max_length=10, blank=True, verbose_name="Código")
    description = models.TextField(blank=True, verbose_name="Descripción")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        verbose_name = "Tipo de Embarque"
        verbose_name_plural = "Tipos de Embarque"
        ordering = ['name']

    def __str__(self):
        return self.name

class SubClient(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre")
    parent_client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='subclients', null=True, blank=True, verbose_name="Cliente Principal")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")

    class Meta:
        verbose_name = "Subcliente"
        verbose_name_plural = "Subclientes"
        ordering = ['name']

    def __str__(self):
        return self.name


class Service(SoftDeleteModel):
    """Catálogo de servicios que ofrece la agencia aduanal"""
    name = models.CharField(max_length=255, verbose_name="Nombre del Servicio")
    description = models.TextField(blank=True, verbose_name="Descripción")
    default_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Precio por Defecto (Sin IVA)"
    )
    iva_type = models.CharField(
        max_length=20,
        choices=(
            ('gravado', 'Gravado (13% IVA)'),
            ('exento', 'Exento'),
            ('no_sujeto', 'No Sujeto')
        ),
        default='gravado',
        verbose_name="Tratamiento Fiscal"
    )
    applies_iva = models.BooleanField(default=True, verbose_name="Aplica IVA")
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

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
        # Sincronizar applies_iva con iva_type
        if not self.applies_iva and self.iva_type == 'gravado':
            self.iva_type = 'no_sujeto'
        elif self.iva_type != 'gravado':
            self.applies_iva = False
        else:
            self.applies_iva = True
            
        super().save(*args, **kwargs)

    def get_price_with_iva(self):
        """Calcula el precio con IVA (13% en El Salvador)"""
        if self.applies_iva:
            return self.default_price * Decimal('1.13')
        return self.default_price


class ClientServicePrice(models.Model):
    """Tarifario personalizado por cliente"""
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
    iva_type = models.CharField(
        max_length=20,
        choices=(
            ('gravado', 'Gravado (13% IVA)'),
            ('exento', 'Exento'),
            ('no_sujeto', 'No Sujeto')
        ),
        null=True,
        blank=True,
        verbose_name="Tratamiento Fiscal Personalizado",
        help_text="Si se deja vacío, se usará la configuración del servicio general."
    )
    is_active = models.BooleanField(default=True, verbose_name="Activo")
    notes = models.TextField(blank=True, verbose_name="Notas")
    effective_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Vigencia")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

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