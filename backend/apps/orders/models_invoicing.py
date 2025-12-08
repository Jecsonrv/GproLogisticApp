"""
Modelos para Sistema de Facturación y Cuentas por Cobrar (CXC)
"""
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta


class OrderCharge(models.Model):
    """
    Cobros/Servicios facturados en una Orden de Servicio
    Equivalente a las líneas de factura
    """
    service_order = models.ForeignKey(
        'orders.ServiceOrder',
        on_delete=models.CASCADE,
        related_name='charges',
        verbose_name="Orden de Servicio"
    )
    service = models.ForeignKey(
        'catalogs.Service',
        on_delete=models.PROTECT,
        verbose_name="Servicio"
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Descripción"
    )
    quantity = models.IntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Cantidad"
    )
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Precio Unitario (Sin IVA)"
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Subtotal"
    )
    iva_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Monto IVA"
    )
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Total"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Cobro de OS"
        verbose_name_plural = "Cobros de OS"
        ordering = ['service_order', 'id']

    def __str__(self):
        return f"{self.service_order.order_number} - {self.service.name}"

    def save(self, *args, **kwargs):
        """Calcula automáticamente subtotal, IVA y total"""
        self.subtotal = self.quantity * self.unit_price
        if self.service.applies_iva:
            self.iva_amount = self.subtotal * Decimal('0.13')
        else:
            self.iva_amount = Decimal('0.00')
        self.total = self.subtotal + self.iva_amount
        super().save(*args, **kwargs)


class Invoice(models.Model):
    """
    Factura emitida al cliente
    Representa cuentas por cobrar (CXC)
    """
    INVOICE_TYPE_CHOICES = (
        ('DTE', 'DTE (Documento Tributario Electrónico)'),
        ('FEX', 'FEX (Factura de Exportación)'),
        ('CCF', 'CCF (Comprobante de Crédito Fiscal)'),
    )

    STATUS_CHOICES = (
        ('pending', 'Pendiente'),
        ('partial', 'Pago Parcial'),
        ('paid', 'Pagada'),
        ('cancelled', 'Anulada'),
        ('overdue', 'Vencida'),
    )

    PAYMENT_METHOD_CHOICES = (
        ('contado', 'Contado'),
        ('credito', 'Crédito'),
    )

    service_order = models.ForeignKey(
        'orders.ServiceOrder',
        on_delete=models.PROTECT,
        related_name='invoices',
        verbose_name="Orden de Servicio"
    )
    invoice_number = models.CharField(
        max_length=50,
        unique=True,
        blank=True,
        verbose_name="Número de Factura"
    )
    invoice_type = models.CharField(
        max_length=10,
        choices=INVOICE_TYPE_CHOICES,
        default='DTE',
        verbose_name="Tipo de Factura"
    )
    issue_date = models.DateField(
        default=timezone.now,
        verbose_name="Fecha de Emisión"
    )
    due_date = models.DateField(
        null=True,
        blank=True,
        verbose_name="Fecha de Vencimiento"
    )

    # Montos
    subtotal_services = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Subtotal Servicios"
    )
    iva_services = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="IVA Servicios"
    )
    total_services = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total Servicios (con IVA)"
    )

    subtotal_third_party = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Subtotal Gastos a Terceros"
    )

    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Total Factura"
    )
    paid_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Monto Pagado"
    )
    balance = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Saldo Pendiente"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Estado"
    )
    payment_condition = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        default='credito',
        verbose_name="Condición de Pago"
    )

    # Archivos adjuntos
    dte_file = models.FileField(
        upload_to='invoices/dte/',
        null=True,
        blank=True,
        verbose_name="Archivo DTE"
    )
    pdf_file = models.FileField(
        upload_to='invoices/pdf/',
        null=True,
        blank=True,
        verbose_name="PDF de Factura"
    )

    notes = models.TextField(
        blank=True,
        verbose_name="Observaciones"
    )
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        verbose_name="Creado por"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Factura"
        verbose_name_plural = "Facturas (CXC)"
        ordering = ['-issue_date', '-id']
        indexes = [
            models.Index(fields=['invoice_number']),
            models.Index(fields=['status']),
            models.Index(fields=['service_order']),
            models.Index(fields=['issue_date']),
        ]

    def __str__(self):
        return f"{self.invoice_number or 'SIN-NUM'} - {self.service_order.order_number}"

    def save(self, *args, **kwargs):
        """Genera número de factura automático y calcula saldos"""
        if not self.invoice_number:
            # Generar número de factura automático
            year = timezone.now().year
            last = Invoice.objects.filter(
                invoice_number__contains=f"-{year}"
            ).order_by('-id').first()

            if last and '-' in last.invoice_number:
                try:
                    last_num = int(last.invoice_number.split('-')[0])
                    new_num = last_num + 1
                except:
                    new_num = 1
            else:
                new_num = 1

            self.invoice_number = f"{new_num:05d}-{year}"

        # Calcular balance
        self.balance = self.total_amount - self.paid_amount

        # Actualizar estado según balance
        if self.balance <= 0 and self.status != 'cancelled':
            self.status = 'paid'
        elif self.paid_amount > 0 and self.balance > 0:
            self.status = 'partial'
        elif self.due_date and self.due_date < timezone.now().date() and self.balance > 0:
            self.status = 'overdue'

        # Calcular fecha de vencimiento si es crédito
        if self.payment_condition == 'credito' and not self.due_date:
            client = self.service_order.client
            credit_days = getattr(client, 'credit_days', 30)
            self.due_date = self.issue_date + timedelta(days=credit_days)

        super().save(*args, **kwargs)

    def calculate_totals(self):
        """Calcula los totales de servicios y gastos a terceros"""
        # Servicios
        charges = self.service_order.charges.all()
        self.subtotal_services = sum(c.subtotal for c in charges)
        self.iva_services = sum(c.iva_amount for c in charges)
        self.total_services = sum(c.total for c in charges)

        # Gastos a terceros
        third_party_transfers = self.service_order.transfers.filter(
            transfer_type='terceros'
        )
        self.subtotal_third_party = sum(t.amount for t in third_party_transfers)

        # Total
        self.total_amount = self.total_services + self.subtotal_third_party

        self.save()

    def days_overdue(self):
        """Calcula cuántos días lleva vencida la factura"""
        if not self.due_date or self.status == 'paid':
            return 0
        today = timezone.now().date()
        if today > self.due_date:
            return (today - self.due_date).days
        return 0


class InvoicePayment(models.Model):
    """
    Abonos/Pagos realizados a una factura
    Permite pagos parciales
    """
    PAYMENT_METHOD_CHOICES = (
        ('transferencia', 'Transferencia Bancaria'),
        ('efectivo', 'Efectivo'),
        ('cheque', 'Cheque'),
        ('tarjeta', 'Tarjeta'),
        ('deposito', 'Depósito Bancario'),
    )

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name="Factura"
    )
    payment_date = models.DateField(
        default=timezone.now,
        verbose_name="Fecha de Pago"
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Monto"
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PAYMENT_METHOD_CHOICES,
        verbose_name="Método de Pago"
    )
    reference_number = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Número de Referencia/Cheque"
    )
    bank = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Banco"
    )
    notes = models.TextField(
        blank=True,
        verbose_name="Notas"
    )
    receipt_file = models.FileField(
        upload_to='invoices/payments/',
        null=True,
        blank=True,
        verbose_name="Comprobante de Pago"
    )
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
        verbose_name = "Abono/Pago"
        verbose_name_plural = "Abonos/Pagos de Facturas"
        ordering = ['-payment_date', '-id']

    def __str__(self):
        return f"Pago {self.invoice.invoice_number} - ${self.amount} - {self.payment_date}"

    def save(self, *args, **kwargs):
        """Actualiza el monto pagado de la factura"""
        super().save(*args, **kwargs)
        # Recalcular totales de la factura
        invoice = self.invoice
        invoice.paid_amount = sum(
            payment.amount for payment in invoice.payments.all()
        )
        invoice.save()
