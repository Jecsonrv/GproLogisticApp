from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from django.core.validators import MinValueValidator
from apps.orders.models import ServiceOrder
from apps.catalogs.models import Provider, Bank
from apps.validators import validate_document_file
from apps.core.models import SoftDeleteModel

class Transfer(SoftDeleteModel):
    """Pagos a Proveedores - Registro de gastos y costos"""
    TYPE_CHOICES = (
        ('costos', 'Costos Directos'),  # Pagos para ejecutar servicio de cliente
        ('cargos', 'Cargos a Clientes'),  # Facturables al cliente
        ('admin', 'Gastos de Operación'),  # No vinculados a OS
        # Mantener compatibilidad
        ('terceros', 'Cargos a Clientes (Legacy)'),
        ('propios', 'Costos Operativos (Legacy)'),
    )
    transfer_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Tipo de Gasto")

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
    customer_applies_iva = models.BooleanField(default=False, verbose_name="Aplica IVA Cliente")

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
            self.status = 'aprobado' # Revertir a aprobado si el saldo vuelve a ser positivo

        super().save(*args, **kwargs)
        
    def delete(self, *args, **kwargs):
        self.payments.all().delete()
        super().delete(*args, **kwargs)


class TransferPayment(SoftDeleteModel):
    """Pagos parciales realizados a una transferencia (gasto)"""
    transfer = models.ForeignKey(Transfer, on_delete=models.CASCADE, related_name='payments', verbose_name="Transferencia/Gasto")
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