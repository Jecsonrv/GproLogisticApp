from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.core.validators import MinValueValidator
from apps.orders.models import ServiceOrder
from apps.catalogs.models import Provider, Bank
from apps.validators import validate_document_file
from apps.core.models import SoftDeleteModel

# Constantes fiscales El Salvador
IVA_RATE = Decimal('0.13')
RETENCION_RATE = Decimal('0.01')
RETENCION_THRESHOLD = Decimal('100.00')


class Transfer(SoftDeleteModel):
    """
    Pagos a Proveedores - Registro de gastos y costos (Calculadora de Gastos Reembolsables)

    IMPORTANTE: El campo 'amount' (Monto Base) NO es editable una vez creado,
    ya que representa el costo real pagado/por pagar al proveedor.
    Solo se permite editar: customer_markup_percentage y customer_iva_type.

    Tratamiento fiscal según normativa salvadoreña:
    - GRAVADO: Se aplica IVA 13% al cobrar al cliente
    - EXENTO: No se aplica IVA
    - NO_SUJETO: No se aplica IVA (servicios de exportación)
    """
    TYPE_CHOICES = (
        ('costos', 'Costos Directos'),  # Pagos para ejecutar servicio de cliente
        ('cargos', 'Cargos a Clientes'),  # Facturables al cliente
        ('admin', 'Gastos de Operación'),  # No vinculados a OS
        # Mantener compatibilidad
        ('terceros', 'Cargos a Clientes (Legacy)'),
        ('propios', 'Costos Operativos (Legacy)'),
    )
    transfer_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Tipo de Gasto")

    # Tipos de tratamiento fiscal para cobro al cliente
    IVA_TYPE_CHOICES = (
        ('gravado', 'Gravado (13% IVA)'),
        ('no_sujeto', 'No Sujeto (Exportación)'),
    )

    # Estado de facturación del item
    BILLING_STATUS_CHOICES = (
        ('disponible', 'Disponible para Facturar'),
        ('facturado', 'Facturado'),
    )

    STATUS_CHOICES = (
        ('pendiente', 'Pendiente'),  # Registrado, esperando aprobación
        ('aprobado', 'Aprobado'),  # Validado, listo para pagar
        ('parcial', 'Pago Parcial'),
        ('pagado', 'Pagado'),  # Pago ejecutado
        # Mantener compatibilidad
        ('provisionada', 'Provisionada (Legacy)'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente', verbose_name="Estado")

    PAYMENT_METHOD_CHOICES = (
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia Bancaria'),
        ('cheque', 'Cheque'),
        ('tarjeta', 'Tarjeta'),
        ('nota_credito', 'Nota de Crédito'),
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, verbose_name="Método de Pago")

    # Moneda
    CURRENCY_CHOICES = (
        ('GTQ', 'Quetzales (GTQ)'),
        ('USD', 'Dólares (USD)'),
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='GTQ', verbose_name="Moneda")
    exchange_rate = models.DecimalField(
        max_digits=10, 
        decimal_places=4, 
        default=Decimal('1.0000'), 
        validators=[MinValueValidator(Decimal('0.0001'))],
        verbose_name="Tipo de Cambio"
    )

    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Monto Total")
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Monto Pagado")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Saldo Pendiente")
    
    description = models.TextField(verbose_name="Descripción")

    # Relaciones
    service_order = models.ForeignKey(ServiceOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers', verbose_name="Orden de Servicio")
    client = models.ForeignKey('clients.Client', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Cliente")
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Proveedor")

    # Información de pago (Datos de la factura del proveedor)
    beneficiary_name = models.CharField(max_length=255, blank=True, verbose_name="A Nombre De (Beneficiario)")
    bank = models.ForeignKey(Bank, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Banco")
    ccf = models.CharField(max_length=100, blank=True, verbose_name="CCF (Número de Factura)")
    invoice_number = models.CharField(max_length=100, blank=True, verbose_name="Número de Factura/Comprobante")
    invoice_file = models.FileField(
        upload_to='transfers/invoices/',
        blank=True,
        null=True,
        verbose_name="Factura",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Máximo 5MB"
    )

    # Fechas
    transaction_date = models.DateField(default=timezone.now, verbose_name="Fecha de Transacción")
    payment_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Pago (Ultimo)")
    mes = models.CharField(max_length=20, blank=True, verbose_name="Mes")

    # Auditoría
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_transfers', verbose_name="Registrado por")
    updated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='updated_transfers', verbose_name="Actualizado por")
    
    # Configuración de Cobro al Cliente (para Calculadora de Gastos)
    customer_markup_percentage = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00'),
        verbose_name="Margen Cobro Cliente %"
    )
    # Campo legacy para compatibilidad
    customer_applies_iva = models.BooleanField(default=False, verbose_name="Aplica IVA Cliente (Legacy)")

    # Nuevo campo para tratamiento fiscal completo al cobrar al cliente
    customer_iva_type = models.CharField(
        max_length=20,
        choices=IVA_TYPE_CHOICES,
        default='no_sujeto',  # Por defecto no sujeto (exportación/servicios internacionales)
        verbose_name="Tratamiento Fiscal Cliente",
        help_text="Tipo de IVA a aplicar al cobrar este gasto al cliente"
    )

    # Estado de facturación para tracking
    billing_status = models.CharField(
        max_length=20,
        choices=BILLING_STATUS_CHOICES,
        default='disponible',
        verbose_name="Estado de Facturación"
    )

    # Referencia a factura (si ya fue facturado al cliente)
    invoice = models.ForeignKey(
        'orders.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='billed_transfers',
        verbose_name="Factura Asociada",
        help_text="Factura donde se cobró este gasto al cliente"
    )

    # Flag para indicar si el monto base fue bloqueado (desde pago a proveedor)
    amount_locked = models.BooleanField(
        default=False,
        verbose_name="Monto Base Bloqueado",
        help_text="Si True, el monto base no puede editarse (viene del pago a proveedor)"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Transferencia / Gasto"
        verbose_name_plural = "Transferencias y Gastos"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['transfer_type', 'status']),
            models.Index(fields=['transaction_date']),
            models.Index(fields=['service_order']),
        ]

    def __str__(self):
        return f"{self.get_transfer_type_display()} - ${self.amount} - {self.service_order.order_number if self.service_order else 'Sin OS'}"

    def clean(self):
        """Validación de integridad referencial"""
        super().clean()

        # Los cargos a clientes y costos directos DEBEN tener una orden de servicio
        tipos_requieren_os = ['cargos', 'costos', 'terceros', 'propios']
        if self.transfer_type in tipos_requieren_os and not self.service_order:
            raise ValidationError({
                'service_order': f'Los gastos de tipo "{self.get_transfer_type_display()}" requieren una Orden de Servicio asociada.'
            })

        # Validar que el monto sea positivo
        if self.amount and self.amount <= 0:
            raise ValidationError({
                'amount': 'El monto debe ser mayor a cero.'
            })

    def save(self, *args, **kwargs):
        self.full_clean()

        # Establecer el mes automáticamente
        if not self.mes:
            months = {
                1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
                5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
                9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
            }
            month_num = self.transaction_date.month if self.transaction_date else timezone.now().month
            self.mes = months[month_num]

        # Sincronizar campo legacy customer_applies_iva con customer_iva_type
        self.customer_applies_iva = (self.customer_iva_type == 'gravado')

        # Sincronizar estado de facturación
        if self.invoice:
            self.billing_status = 'facturado'
        else:
            self.billing_status = 'disponible'

        # Bloquear monto si ya tiene pagos registrados
        if self.paid_amount > 0:
            self.amount_locked = True

        # Calcular balance
        self.balance = self.amount - self.paid_amount

        # Actualizar estado basado en saldo
        if self.balance <= 0 and self.amount > 0:
            self.status = 'pagado'
            if not self.payment_date:
                self.payment_date = timezone.now().date()
        elif self.paid_amount > 0 and self.balance > 0:
            self.status = 'parcial'
        elif self.status == 'pagado' and self.balance > 0:
            self.status = 'aprobado'

        super().save(*args, **kwargs)

    # Métodos de cálculo para Calculadora de Gastos Reembolsables
    def get_customer_base_price(self):
        """
        Calcula el precio base para cobrar al cliente (costo + margen).

        Returns:
            Decimal: Precio base sin IVA
        """
        cost = self.amount * (self.exchange_rate or Decimal('1.0000'))
        markup = self.customer_markup_percentage or Decimal('0.00')
        return cost * (1 + markup / Decimal('100.00'))

    def get_customer_iva_amount(self):
        """
        Calcula el monto de IVA para cobrar al cliente.

        Returns:
            Decimal: Monto de IVA (0 si exento/no_sujeto)
        """
        base_price = self.get_customer_base_price()
        if self.customer_iva_type == 'gravado':
            return base_price * IVA_RATE
        return Decimal('0.00')

    def get_customer_total(self):
        """
        Calcula el total a cobrar al cliente (base + IVA).

        Returns:
            Decimal: Total con IVA si aplica
        """
        return self.get_customer_base_price() + self.get_customer_iva_amount()

    def get_profit(self):
        """
        Calcula la ganancia sobre este gasto.

        Returns:
            Decimal: Ganancia (precio base - costo original)
        """
        cost = self.amount * (self.exchange_rate or Decimal('1.0000'))
        return self.get_customer_base_price() - cost

    def get_iva_type_display_short(self):
        """Retorna etiqueta corta para UI"""
        labels = {
            'gravado': 'IVA 13%',
            'no_sujeto': 'No Sujeto'
        }
        return labels.get(self.customer_iva_type, 'N/A')

    def is_amount_editable(self):
        """
        Verifica si el monto base puede ser editado.

        El monto base NO es editable si:
        - Tiene pagos registrados (amount_locked=True)
        - Ya fue facturado al cliente
        """
        if self.amount_locked:
            return False
        if self.invoice:
            return False
        return True

    def is_billing_config_editable(self):
        """
        Verifica si la configuración de cobro (margen, IVA) puede ser editada.

        Solo NO es editable si la factura asociada ya tiene DTE emitido.
        """
        if self.invoice and self.invoice.is_dte_issued:
            return False
        return True
        
    def delete(self, *args, **kwargs):
        self.payments.all().delete()
        super().delete(*args, **kwargs)


class TransferPayment(SoftDeleteModel):
    """Pagos parciales realizados a una transferencia (gasto)"""
    transfer = models.ForeignKey(Transfer, on_delete=models.CASCADE, related_name='payments', verbose_name="Transferencia/Gasto")
    batch_payment = models.ForeignKey('BatchPayment', on_delete=models.CASCADE, null=True, blank=True, related_name='transfer_payments', verbose_name="Pago Agrupado")
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Monto Pagado")
    payment_date = models.DateField(default=timezone.now, verbose_name="Fecha de Pago")
    payment_method = models.CharField(max_length=20, choices=Transfer.PAYMENT_METHOD_CHOICES, verbose_name="Método de Pago")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="Referencia")
    notes = models.TextField(blank=True, verbose_name="Notas")
    
    proof_file = models.FileField(
        upload_to='transfers/payments/',
        null=True,
        blank=True,
        verbose_name="Comprobante de Pago",
        validators=[validate_document_file]
    )
    
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Registrado por")
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Pago a Proveedor"
        verbose_name_plural = "Pagos a Proveedores"
        ordering = ['-payment_date']
        
    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Actualizar total pagado en la transferencia
        transfer = self.transfer
        payments = transfer.payments.filter(is_deleted=False)
        transfer.paid_amount = sum(p.amount for p in payments)
        transfer.save()
        
    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        transfer = self.transfer
        payments = transfer.payments.filter(is_deleted=False)
        transfer.paid_amount = sum(p.amount for p in payments)
        transfer.save()


class BatchPayment(SoftDeleteModel):
    """
    Pago agrupado que distribuye un monto entre múltiples transferencias.
    Permite pagar varias facturas de un mismo proveedor en una sola transacción.
    """
    # Número de lote autoincrementable
    batch_number = models.CharField(
        max_length=20,
        unique=True,
        editable=False,
        verbose_name="Número de Lote"
    )

    # Proveedor (todas las facturas deben ser del mismo proveedor)
    provider = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        verbose_name="Proveedor"
    )

    # Información del pago
    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Monto Total del Pago"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Transfer.PAYMENT_METHOD_CHOICES,
        verbose_name="Método de Pago"
    )
    payment_date = models.DateField(
        default=timezone.now,
        verbose_name="Fecha de Pago"
    )

    # Banco (solo si aplica por el método de pago)
    bank = models.ForeignKey(
        Bank,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Banco"
    )

    # Referencia bancaria (número de transferencia, cheque, etc.)
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Número de Referencia"
    )

    # Comprobante único compartido
    proof_file = models.FileField(
        upload_to='transfers/batch_payments/',
        null=True,
        blank=True,
        verbose_name="Comprobante de Pago",
        validators=[validate_document_file],
        help_text="Este comprobante se asociará a todas las facturas incluidas en el lote"
    )

    # Notas
    notes = models.TextField(blank=True, verbose_name="Observaciones")

    # Auditoría
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Registrado por"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pago Agrupado"
        verbose_name_plural = "Pagos Agrupados"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['provider', 'payment_date']),
            models.Index(fields=['batch_number']),
        ]

    def __str__(self):
        return f"Lote {self.batch_number} - {self.provider.name} - ${self.total_amount}"

    def save(self, *args, **kwargs):
        # Generar número de lote automático: BP-YYYY-NNNN
        if not self.batch_number:
            from django.db import transaction
            from django.db.models import Max
            import re

            current_year = timezone.now().year

            with transaction.atomic():
                # Buscar el máximo número del año actual
                result = BatchPayment.all_objects.select_for_update().filter(
                    batch_number__regex=rf'^BP-{current_year}-\d{{4}}$'
                ).aggregate(
                    max_num=Max('batch_number')
                )

                if result['max_num']:
                    try:
                        last_num = int(result['max_num'].split('-')[-1])
                        new_num = last_num + 1
                    except (ValueError, IndexError):
                        new_num = 1
                else:
                    new_num = 1

                self.batch_number = f'BP-{current_year}-{new_num:04d}'

        super().save(*args, **kwargs)

    def get_transfers_count(self):
        """Retorna el número de facturas incluidas en este pago"""
        return self.transfer_payments.filter(is_deleted=False).count()

    def get_service_orders(self):
        """Retorna lista de OS únicas afectadas por este pago"""
        from apps.orders.models import ServiceOrder
        return ServiceOrder.objects.filter(
            transfers__payments__batch_payment=self,
            transfers__payments__is_deleted=False
        ).distinct()