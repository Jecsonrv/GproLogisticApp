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

    # Moneda - SIEMPRE DOLARES
    CURRENCY_CHOICES = (
        ('USD', 'Dólares (USD)'),
        ('GTQ', 'Quetzales (GTQ)'),
    )
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD', verbose_name="Moneda")
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

        # Actualizar estado basado en saldo (con validación estricta)
        # REGLA 1: Si el saldo es 0 o negativo Y el monto original > 0 -> PAGADO
        if self.balance <= 0 and self.amount > 0:
            self.status = 'pagado'
            if not self.payment_date:
                self.payment_date = timezone.now().date()
        # REGLA 2: Si hay monto pagado pero aún queda saldo -> PAGO PARCIAL
        elif self.paid_amount > 0 and self.balance > 0:
            self.status = 'parcial'
        # REGLA 3: Si estaba marcado como pagado pero ahora tiene saldo (por reversión) -> APROBADO
        elif self.status == 'pagado' and self.balance > 0:
            # Si había un pago que se revirtió, volver a estado anterior
            if self.paid_amount > 0:
                self.status = 'parcial'
            else:
                self.status = 'aprobado'
        # REGLA 4: Si NO tiene pagos y estaba en parcial, regresar a pendiente/aprobado
        elif self.paid_amount == 0 and self.status == 'parcial':
            self.status = 'pendiente'

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
        """
        Soft delete del Transfer y todos sus pagos asociados.

        IMPORTANTE: Usamos soft delete consistente para mantener
        integridad del historial de pagos.
        """
        from django.db import transaction

        with transaction.atomic():
            # Soft delete de todos los pagos asociados (no hard delete)
            for payment in self.payments.filter(is_deleted=False):
                payment.delete()
            super().delete(*args, **kwargs)


class TransferPayment(SoftDeleteModel):
    """
    Pagos parciales realizados a una transferencia (gasto).

    IMPORTANTE: Los calculos de paid_amount se realizan de forma atomica
    para prevenir race conditions en escenarios de alta concurrencia.
    """
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

    def clean(self):
        """Validacion de integridad del pago"""
        super().clean()

        if self.transfer:
            # Validar que el gasto esté aprobado antes de pagar
            # Permitimos 'aprobado', 'parcial' (ya tiene pagos) o 'pagado' (ajustes)
            # Bloqueamos 'pendiente' y 'provisionada'
            if self.transfer.status not in ['aprobado', 'parcial', 'pagado']:
                raise ValidationError({
                    'transfer': f'No se puede registrar un pago para un gasto en estado "{self.transfer.get_status_display()}". Debe estar APROBADO.'
                })

            # Validar que el monto no exceda el balance pendiente (solo en creacion)
            if not self.pk:
                if self.amount > self.transfer.balance:
                    raise ValidationError({
                        'amount': f'El monto del pago (${self.amount}) no puede exceder el saldo pendiente (${self.transfer.balance})'
                    })

    def save(self, *args, **kwargs):
        from django.db import transaction
        from django.db.models import Sum

        # Ejecutar validaciones
        self.full_clean()

        with transaction.atomic():
            super().save(*args, **kwargs)
            # Actualizar total pagado en la transferencia con lock para prevenir race conditions
            transfer = Transfer.objects.select_for_update().get(pk=self.transfer_id)
            total_paid = transfer.payments.filter(is_deleted=False).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            transfer.paid_amount = total_paid
            transfer.save()

    def delete(self, *args, **kwargs):
        from django.db import transaction
        from django.db.models import Sum

        with transaction.atomic():
            super().delete(*args, **kwargs)
            # Actualizar total pagado en la transferencia con lock
            transfer = Transfer.objects.select_for_update().get(pk=self.transfer_id)
            total_paid = transfer.payments.filter(is_deleted=False).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')
            transfer.paid_amount = total_paid
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


class ProviderCreditNote(SoftDeleteModel):
    """
    Notas de Crédito de Proveedores - Sistema ERP Profesional

    Representa una nota de crédito emitida por un proveedor que reduce
    parcial o totalmente el saldo de una o más facturas (Transfers).

    CASOS DE USO:
    1. Devolución de mercancía
    2. Descuento post-venta
    3. Corrección de errores en factura original
    4. Bonificaciones comerciales

    FLUJO:
    1. Se registra la NC con número, monto y motivo
    2. Se aplica a uno o más Transfers del mismo proveedor
    3. El sistema actualiza automáticamente los saldos
    4. Si la NC excede el saldo de un Transfer, el excedente queda como saldo a favor

    VALIDACIONES:
    - Solo puede aplicarse a Transfers del mismo proveedor
    - No puede aplicarse a Transfers ya pagados completamente (a menos que genere saldo a favor)
    - El monto aplicado no puede exceder el monto de la NC
    - Una NC anulada no puede modificarse
    """

    STATUS_CHOICES = (
        ('pendiente', 'Pendiente de Aplicar'),
        ('parcial', 'Aplicada Parcialmente'),
        ('aplicada', 'Aplicada Totalmente'),
        ('anulada', 'Anulada'),
    )

    REASON_CHOICES = (
        ('devolucion', 'Devolución de Mercancía'),
        ('descuento', 'Descuento Comercial'),
        ('error_factura', 'Error en Factura Original'),
        ('bonificacion', 'Bonificación'),
        ('ajuste_precio', 'Ajuste de Precio'),
        ('garantia', 'Reclamo por Garantía'),
        ('otro', 'Otro'),
    )

    # Identificación
    note_number = models.CharField(
        max_length=100,
        verbose_name="Número de Nota de Crédito",
        help_text="Número fiscal de la NC emitida por el proveedor"
    )

    # Proveedor emisor
    provider = models.ForeignKey(
        Provider,
        on_delete=models.PROTECT,
        related_name='credit_notes',
        verbose_name="Proveedor"
    )

    # Factura original a la que aplica
    original_transfer = models.ForeignKey(
        'Transfer',
        on_delete=models.PROTECT,
        related_name='credit_notes',
        verbose_name="Factura Original",
        help_text="Factura del proveedor a la que aplica esta NC",
        null=True,
        blank=True
    )

    # Montos
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Monto Total NC"
    )
    applied_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Monto Aplicado",
        help_text="Suma de montos aplicados a facturas"
    )
    available_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Saldo Disponible",
        help_text="Monto pendiente de aplicar"
    )

    # Fechas
    issue_date = models.DateField(
        verbose_name="Fecha de Emisión",
        help_text="Fecha en que el proveedor emitió la NC"
    )
    received_date = models.DateField(
        default=timezone.now,
        verbose_name="Fecha de Recepción",
        help_text="Fecha en que se recibió la NC"
    )

    # Clasificación
    reason = models.CharField(
        max_length=20,
        choices=REASON_CHOICES,
        default='otro',
        verbose_name="Motivo"
    )
    reason_detail = models.TextField(
        blank=True,
        verbose_name="Detalle del Motivo"
    )

    # Estado
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pendiente',
        verbose_name="Estado"
    )

    # Documento adjunto
    pdf_file = models.FileField(
        upload_to='transfers/credit_notes/',
        null=True,
        blank=True,
        verbose_name="Documento PDF",
        validators=[validate_document_file]
    )

    # Auditoría
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='provider_credit_notes_created',
        verbose_name="Registrado por"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Campos para anulación
    voided_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Anulación")
    voided_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='provider_credit_notes_voided',
        verbose_name="Anulado por"
    )
    void_reason = models.TextField(blank=True, verbose_name="Motivo de Anulación")

    class Meta:
        verbose_name = "Nota de Crédito de Proveedor"
        verbose_name_plural = "Notas de Crédito de Proveedores"
        ordering = ['-issue_date', '-created_at']
        unique_together = [['provider', 'note_number']]  # No duplicar NC del mismo proveedor

    def __str__(self):
        return f"NC-{self.note_number} - {self.provider.name} - ${self.amount}"

    def save(self, *args, **kwargs):
        # Calcular saldo disponible
        self.available_amount = self.amount - self.applied_amount

        # Actualizar estado automáticamente
        if self.status != 'anulada':
            if self.applied_amount == 0:
                self.status = 'pendiente'
            elif self.applied_amount < self.amount:
                self.status = 'parcial'
            else:
                self.status = 'aplicada'

        super().save(*args, **kwargs)

    def can_apply(self):
        """Verifica si la NC puede aplicarse a facturas"""
        return self.status in ['pendiente', 'parcial'] and self.available_amount > 0

    def void(self, user, reason):
        """
        Anula la nota de crédito y revierte todas las aplicaciones.

        Args:
            user: Usuario que anula
            reason: Motivo de anulación
        """
        if self.status == 'anulada':
            raise ValidationError("Esta nota de crédito ya está anulada")

        # Revertir todas las aplicaciones
        for application in self.applications.filter(is_deleted=False):
            application.revert()

        # Marcar como anulada
        self.status = 'anulada'
        self.voided_at = timezone.now()
        self.voided_by = user
        self.void_reason = reason
        self.applied_amount = Decimal('0.00')
        self.save()

    def get_affected_transfers(self):
        """Retorna los Transfers afectados por esta NC"""
        return Transfer.objects.filter(
            credit_note_applications__credit_note=self,
            credit_note_applications__is_deleted=False
        ).distinct()


class CreditNoteApplication(SoftDeleteModel):
    """
    Aplicación de Nota de Crédito a un Transfer específico.

    Permite aplicar una NC a múltiples facturas del proveedor,
    distribuyendo el monto según necesidad.
    """

    credit_note = models.ForeignKey(
        ProviderCreditNote,
        on_delete=models.CASCADE,
        related_name='applications',
        verbose_name="Nota de Crédito"
    )

    transfer = models.ForeignKey(
        Transfer,
        on_delete=models.PROTECT,
        related_name='credit_note_applications',
        verbose_name="Factura/Gasto"
    )

    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Monto Aplicado"
    )

    applied_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Aplicación")
    applied_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name="Aplicado por"
    )

    notes = models.TextField(blank=True, verbose_name="Notas")

    class Meta:
        verbose_name = "Aplicación de NC"
        verbose_name_plural = "Aplicaciones de NC"
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.credit_note.note_number} -> {self.transfer.invoice_number or self.transfer.id} (${self.amount})"

    def clean(self):
        """Validaciones de integridad"""
        # Validar que el proveedor coincida
        if self.credit_note.provider != self.transfer.provider:
            raise ValidationError(
                "La nota de crédito solo puede aplicarse a facturas del mismo proveedor"
            )

        # Validar que la NC tenga saldo disponible
        if self.pk is None:  # Solo en creación
            if self.amount > self.credit_note.available_amount:
                raise ValidationError(
                    f"El monto excede el saldo disponible de la NC (${self.credit_note.available_amount})"
                )

        # Validar que no exceda el saldo del Transfer
        if self.amount > self.transfer.balance:
            raise ValidationError(
                f"El monto excede el saldo pendiente de la factura (${self.transfer.balance})"
            )

    def save(self, *args, **kwargs):
        self.clean()

        is_new = self.pk is None
        super().save(*args, **kwargs)

        if is_new:
            # Actualizar monto aplicado en la NC
            self.credit_note.applied_amount += self.amount
            self.credit_note.save()

            # Crear un TransferPayment para reflejar la reducción de saldo
            TransferPayment.objects.create(
                transfer=self.transfer,
                amount=self.amount,
                payment_date=self.credit_note.issue_date,
                payment_method='nota_credito',
                reference_number=self.credit_note.note_number,
                notes=f"Aplicación de NC: {self.credit_note.note_number}",
                created_by=self.applied_by
            )

    def revert(self):
        """Revierte esta aplicación"""
        # Buscar y eliminar el TransferPayment asociado
        TransferPayment.objects.filter(
            transfer=self.transfer,
            payment_method='nota_credito',
            reference_number=self.credit_note.note_number,
            amount=self.amount,
            is_deleted=False
        ).update(is_deleted=True, deleted_at=timezone.now())

        # Actualizar el Transfer
        self.transfer.refresh_from_db()
        payments = self.transfer.payments.filter(is_deleted=False)
        self.transfer.paid_amount = sum(p.amount for p in payments)
        self.transfer.save()

        # Actualizar la NC
        self.credit_note.applied_amount -= self.amount
        self.credit_note.save()

        # Marcar como eliminada
        self.is_deleted = True
        self.deleted_at = timezone.now()
        super(SoftDeleteModel, self).save(update_fields=['is_deleted', 'deleted_at'])