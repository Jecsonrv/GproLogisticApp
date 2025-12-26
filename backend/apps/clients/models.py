from django.db import models
from django.core.validators import EmailValidator

class Client(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre / Razón Social")
    legal_name = models.CharField(max_length=255, blank=True, verbose_name="Nombre Jurídico Completo")
    nit = models.CharField(max_length=50, unique=True, blank=True, null=True, verbose_name="NIT")
    iva_registration = models.CharField(max_length=50, blank=True, verbose_name="Registro IVA")
    address = models.TextField(blank=True, verbose_name="Dirección")
    phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono")
    secondary_phone = models.CharField(max_length=20, blank=True, verbose_name="Teléfono Secundario")
    email = models.EmailField(validators=[EmailValidator()], blank=True, verbose_name="Email")
    contact_person = models.CharField(max_length=255, blank=True, verbose_name="Persona de Contacto")
    
    PAYMENT_CONDITIONS = (
        ('contado', 'Contado'),
        ('credito', 'Crédito'),
    )
    payment_condition = models.CharField(max_length=20, choices=PAYMENT_CONDITIONS, verbose_name="Condición de Pago")
    credit_days = models.IntegerField(default=0, verbose_name="Días de Crédito")
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, default=0, verbose_name="Límite de Crédito")

    # Clasificación fiscal de contribuyentes (El Salvador)
    TAXPAYER_TYPE_CHOICES = (
        ('grande', 'Gran Contribuyente'),
        ('mediano', 'Mediano Contribuyente'),
        ('pequeno', 'Pequeño Contribuyente'),
    )
    taxpayer_type = models.CharField(
        max_length=20,
        choices=TAXPAYER_TYPE_CHOICES,
        default='pequeno',
        verbose_name="Clasificación de Contribuyente",
        help_text="Clasificación según la Dirección General de Impuestos Internos de El Salvador"
    )

    # Campo legacy para compatibilidad - se sincroniza automáticamente con taxpayer_type
    is_gran_contribuyente = models.BooleanField(default=False, verbose_name="Gran Contribuyente (Legacy)")

    is_active = models.BooleanField(default=True, verbose_name="Activo")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Creación")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")
    notes = models.TextField(blank=True, verbose_name="Notas")

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        """Sincroniza campo legacy is_gran_contribuyente con taxpayer_type"""
        self.is_gran_contribuyente = (self.taxpayer_type == 'grande')
        super().save(*args, **kwargs)

    def get_taxpayer_type_display_short(self):
        """Retorna etiqueta corta para UI"""
        labels = {
            'grande': 'GC',
            'mediano': 'MC',
            'pequeno': 'PC'
        }
        return labels.get(self.taxpayer_type, 'N/A')

    def get_retention_rate(self):
        """
        Retorna la tasa de retención según clasificación de contribuyente.

        Según normativa salvadoreña:
        - Gran Contribuyente: Retiene 1% sobre servicios > $100
        - Mediano/Pequeño: No retienen
        """
        from decimal import Decimal
        if self.taxpayer_type == 'grande':
            return Decimal('0.01')
        return Decimal('0.00')

    def applies_retention(self, subtotal_services):
        """
        Determina si aplica retención según el tipo de contribuyente y monto.

        Args:
            subtotal_services: Subtotal de servicios (sin IVA)

        Returns:
            bool: True si aplica retención
        """
        from decimal import Decimal
        RETENCION_THRESHOLD = Decimal('100.00')

        if self.taxpayer_type != 'grande':
            return False

        return subtotal_services > RETENCION_THRESHOLD

    def calculate_retention(self, subtotal_services):
        """
        Calcula el monto de retención sobre servicios.

        Args:
            subtotal_services: Subtotal de servicios (sin IVA)

        Returns:
            Decimal: Monto de retención (0 si no aplica)
        """
        from decimal import Decimal
        if not self.applies_retention(subtotal_services):
            return Decimal('0.00')

        return subtotal_services * self.get_retention_rate()

    def get_credit_available(self):
        """Calcula el crédito disponible del cliente basado en facturas pendientes"""
        from apps.orders.models import Invoice
        from decimal import Decimal

        if self.payment_condition != 'credito':
            return Decimal('0.00')

        # El crédito usado es la suma de saldos pendientes de facturas no pagadas
        pending_invoices = Invoice.objects.filter(
            service_order__client=self,
            status__in=['pending', 'partial', 'overdue']
        )
        credit_used = pending_invoices.aggregate(
            total=models.Sum('balance')
        )['total'] or Decimal('0.00')

        return max(Decimal('0.00'), self.credit_limit - credit_used)

    def get_credit_used(self):
        """Retorna el crédito actualmente utilizado"""
        from apps.orders.models import Invoice
        from decimal import Decimal

        pending_invoices = Invoice.objects.filter(
            service_order__client=self,
            status__in=['pending', 'partial', 'overdue']
        )
        return pending_invoices.aggregate(
            total=models.Sum('balance')
        )['total'] or Decimal('0.00')