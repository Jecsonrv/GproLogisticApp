from django.db import models
from django.core.validators import EmailValidator

class Client(models.Model):
    # Tipo de cliente (Nacional/Internacional)
    CLIENT_TYPE_CHOICES = (
        ('nacional', 'Nacional'),
        ('internacional', 'Internacional'),
    )
    client_type = models.CharField(
        max_length=20,
        choices=CLIENT_TYPE_CHOICES,
        default='nacional',
        verbose_name="Tipo de Cliente",
        help_text="Nacional: Cliente local de El Salvador. Internacional: Cliente extranjero."
    )

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
        - Gran Contribuyente: Retiene 1% sobre servicios >= $100
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

        return subtotal_services >= RETENCION_THRESHOLD

    def calculate_retention(self, subtotal_services):
        """
        Calcula el monto de retención sobre servicios.
        
        CORRECCIÓN PRECISIÓN: Se fuerza el redondeo a 2 decimales para evitar
        problemas de comparación exacta en pagos y validaciones.

        Args:
            subtotal_services: Subtotal de servicios (sin IVA)

        Returns:
            Decimal: Monto de retención (0 si no aplica) redondeado a 2 decimales.
        """
        from decimal import Decimal, ROUND_HALF_UP
        if not self.applies_retention(subtotal_services):
            return Decimal('0.00')

        raw_retention = subtotal_services * self.get_retention_rate()
        
        # Redondear a 2 decimales usando ROUND_HALF_UP (estándar contable)
        return raw_retention.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

    def get_credit_available(self):
        """
        Calcula el crédito disponible del cliente basado en facturas pendientes.

        AUDITORÍA #3: Unificado con get_credit_used() para usar la misma lógica:
        - Filtra por balance > 0 (facturas con saldo pendiente)
        - Excluye facturas anuladas (status='cancelled')
        """
        from apps.orders.models import Invoice
        from decimal import Decimal

        if self.payment_condition != 'credito':
            return Decimal('0.00')

        # CORREGIDO: Usar misma lógica que get_credit_used()
        # Facturas con saldo pendiente, excluyendo anuladas
        credit_used = Invoice.objects.filter(
            service_order__client=self,
            balance__gt=0
        ).exclude(
            status='cancelled'
        ).aggregate(
            total=models.Sum('balance')
        )['total'] or Decimal('0.00')

        return max(Decimal('0.00'), self.credit_limit - credit_used)

    def get_credit_used(self):
        """
        Retorna el crédito actualmente utilizado.

        AUDITORÍA #3: Sincronizado con get_credit_available()
        - Cuenta facturas con saldo pendiente (balance > 0)
        - Excluye facturas anuladas (status='cancelled')
        """
        from apps.orders.models import Invoice
        from decimal import Decimal

        # Facturas con saldo pendiente, excluyendo anuladas
        return Invoice.objects.filter(
            service_order__client=self,
            balance__gt=0
        ).exclude(
            status='cancelled'
        ).aggregate(
            total=models.Sum('balance')
        )['total'] or Decimal('0.00')

    def validate_credit_for_invoice(self, invoice_amount):
        """
        AUDITORÍA #7: Validación atómica de crédito para facturación.

        Usa select_for_update() para prevenir race conditions cuando
        múltiples usuarios intentan facturar al mismo cliente simultáneamente.

        Args:
            invoice_amount: Monto de la nueva factura a validar

        Returns:
            tuple: (is_valid: bool, message: str, available_credit: Decimal)

        Usage:
            with transaction.atomic():
                is_valid, msg, available = client.validate_credit_for_invoice(1000)
                if not is_valid:
                    raise ValidationError(msg)
                # Proceder con la facturación...
        """
        from apps.orders.models import Invoice
        from decimal import Decimal
        from django.db import transaction

        if self.payment_condition != 'credito':
            return True, "Cliente de contado, no requiere validación de crédito", Decimal('0.00')

        # Obtener lock sobre las facturas del cliente para prevenir race condition
        with transaction.atomic():
            # Sumar saldos pendientes con lock
            pending_balance = Invoice.objects.select_for_update().filter(
                service_order__client=self,
                balance__gt=0
            ).exclude(
                status='cancelled'
            ).aggregate(
                total=models.Sum('balance')
            )['total'] or Decimal('0.00')

            credit_available = self.credit_limit - pending_balance
            new_balance_after = pending_balance + Decimal(str(invoice_amount))

            if new_balance_after > self.credit_limit:
                return (
                    False,
                    f"El cliente excedería su límite de crédito. "
                    f"Límite: ${self.credit_limit}, Usado: ${pending_balance}, "
                    f"Disponible: ${credit_available}, Monto solicitado: ${invoice_amount}",
                    credit_available
                )

            return True, "Crédito disponible", credit_available