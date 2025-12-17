from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from apps.clients.models import Client
from apps.catalogs.models import SubClient, ShipmentType, Provider, Bank
from apps.validators import validate_document_file
from apps.core.models import SoftDeleteModel

class ServiceOrder(SoftDeleteModel):
    order_number = models.CharField(max_length=20, unique=True, editable=False, verbose_name="Número de Orden")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, verbose_name="Cliente")
    sub_client = models.ForeignKey(SubClient, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Subcliente")

    shipment_type = models.ForeignKey(ShipmentType, on_delete=models.PROTECT, verbose_name="Tipo de Embarque")
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Proveedor")
    customs_agent = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders_as_customs_agent', verbose_name="Aforador")

    # Información del embarque
    purchase_order = models.CharField(max_length=100, blank=True, verbose_name="PO (Purchase Order)")
    bl_reference = models.CharField(max_length=100, blank=True, verbose_name="BL/Referencia")
    eta = models.DateField(verbose_name="ETA")
    duca = models.CharField(max_length=100, verbose_name="DUCA")

    # Estado y facturación
    STATUS_CHOICES = (
        ('abierta', 'Abierta'),
        ('cerrada', 'Cerrada'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='abierta', verbose_name="Estado")
    facturado = models.BooleanField(default=False, verbose_name="Facturado")
    mes = models.CharField(max_length=20, blank=True, verbose_name="Mes")

    # Auditoría
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_orders', verbose_name="Creado por")
    closed_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='closed_orders', verbose_name="Cerrado por")
    closed_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Cierre")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Orden de Servicio"
        verbose_name_plural = "Órdenes de Servicio"
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        # Generar número de orden con formato XXX-YYYY
        if not self.order_number:
            from django.db import transaction
            from django.db.models import Max
            import re

            current_year = timezone.now().year

            # Usar select_for_update con transacción para evitar race conditions
            with transaction.atomic():
                # Buscar el máximo número del año actual con bloqueo
                result = ServiceOrder.all_objects.select_for_update().filter(
                    order_number__regex=rf'^\d{{3}}-{current_year}$'
                ).aggregate(
                    max_num=Max('order_number')
                )

                if result['max_num']:
                    try:
                        last_num = int(result['max_num'].split('-')[0])
                        new_num = last_num + 1
                    except (ValueError, IndexError):
                        new_num = 1
                else:
                    new_num = 1

                self.order_number = f'{new_num:03d}-{current_year}'

        # Establecer el mes automáticamente
        if not self.mes:
            months = {
                1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
                5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
                9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
            }
            self.mes = months[timezone.now().month]

        # Actualizar fecha de cierre si se cierra la OS
        if self.status == 'cerrada' and not self.closed_at:
            self.closed_at = timezone.now()

        super().save(*args, **kwargs)

    def get_total_services(self):
        """Calcula el total de servicios cobrados (en moneda base GTQ)"""
        total = Decimal('0.00')
        for charge in self.charges.all():
            amount = charge.total
            # Normalizar a moneda base si tiene tipo de cambio
            if hasattr(charge, 'exchange_rate') and charge.exchange_rate:
                amount = amount * charge.exchange_rate
            total += amount
        return total

    def get_total_third_party(self):
        """Calcula el total de gastos facturables al cliente (cargos + terceros legacy) en GTQ"""
        total = Decimal('0.00')
        transfers = self.transfers.filter(transfer_type__in=['cargos', 'terceros'])
        for transfer in transfers:
            amount = transfer.amount
            if hasattr(transfer, 'exchange_rate') and transfer.exchange_rate:
                amount = amount * transfer.exchange_rate
            total += amount
        return total
    
    def get_total_direct_costs(self):
        """Calcula el total de costos directos (costos + propios legacy) en GTQ"""
        total = Decimal('0.00')
        transfers = self.transfers.filter(transfer_type__in=['costos', 'propios'])
        for transfer in transfers:
            amount = transfer.amount
            if hasattr(transfer, 'exchange_rate') and transfer.exchange_rate:
                amount = amount * transfer.exchange_rate
            total += amount
        return total
    
    def get_total_admin_costs(self):
        """Calcula el total de gastos administrativos/operación en GTQ"""
        total = Decimal('0.00')
        transfers = self.transfers.filter(transfer_type='admin')
        for transfer in transfers:
            amount = transfer.amount
            if hasattr(transfer, 'exchange_rate') and transfer.exchange_rate:
                amount = amount * transfer.exchange_rate
            total += amount
        return total

    def get_total_amount(self):
        """Calcula el monto total de la OS (servicios + terceros)"""
        return self.get_total_services() + self.get_total_third_party()

    def get_profit(self):
        """
        Calcula la ganancia bruta de la Orden de Servicio.

        Profit = Ingresos por Servicios - Costos Directos

        Nota: Los cargos a terceros (cargos/terceros) son pass-through y no afectan
        la ganancia ya que se facturan al cliente al mismo monto que se pagan.
        Los gastos administrativos (admin) no se incluyen aquí porque no están
        vinculados directamente a esta OS específica.
        """
        from decimal import Decimal
        total_services = self.get_total_services() or Decimal('0.00')
        direct_costs = self.get_total_direct_costs() or Decimal('0.00')
        return total_services - direct_costs

    def get_profit_margin(self):
        """
        Calcula el margen de ganancia como porcentaje.

        Margen = (Profit / Ingresos por Servicios) * 100
        """
        from decimal import Decimal
        total_services = self.get_total_services() or Decimal('0.00')
        if total_services <= 0:
            return Decimal('0.00')
        profit = self.get_profit()
        return (profit / total_services) * Decimal('100')

class OrderDocument(models.Model):
    """Documentos asociados a una Orden de Servicio"""
    DOCUMENT_TYPE_CHOICES = (
        ('tramite', 'Documentos del Trámite'),  # DUCA, BL, Levante, Manifiestos
        ('factura_venta', 'Facturas de Venta'),  # Facturas emitidas al cliente
        ('factura_costo', 'Facturas de Costo / Comprobantes'),  # Facturas de proveedores
        ('otros', 'Otros Documentos / Evidencias'),
    )
    
    order = models.ForeignKey(ServiceOrder, related_name='documents', on_delete=models.CASCADE)
    document_type = models.CharField(
        max_length=20, 
        choices=DOCUMENT_TYPE_CHOICES, 
        default='tramite',
        verbose_name="Tipo de Documento"
    )
    file = models.FileField(
        upload_to='orders/docs/',
        verbose_name="Archivo",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Máximo 5MB"
    )
    description = models.CharField(max_length=255, blank=True, verbose_name="Descripción")
    uploaded_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        verbose_name="Subido por"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Documento de Orden"
        verbose_name_plural = "Documentos de Ordenes"
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.get_document_type_display()} - {self.order.order_number}"


# Importar modelos de facturación
from decimal import Decimal
from django.core.validators import MinValueValidator
from datetime import timedelta


class OrderCharge(SoftDeleteModel):
    """Cobros/Servicios facturados en una Orden de Servicio"""
    service_order = models.ForeignKey(
        ServiceOrder,
        on_delete=models.CASCADE,
        related_name='charges',
        verbose_name="Orden de Servicio"
    )
    invoice = models.ForeignKey(
        'Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='charges',
        verbose_name="Factura Asignada"
    )
    service = models.ForeignKey(
        'catalogs.Service',
        on_delete=models.PROTECT,
        verbose_name="Servicio"
    )
    description = models.CharField(max_length=255, blank=True, verbose_name="Descripción")
    
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

    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)], verbose_name="Cantidad")
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Precio Unitario (Sin IVA)"
    )
    discount = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name="Descuento (%)"
    )
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Subtotal")
    iva_amount = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal('0.00'), verbose_name="Monto IVA")
    total = models.DecimalField(max_digits=12, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Total")
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
        # Validación: No permitir modificar cargos de órdenes cerradas o facturadas
        # Excepción: Si se está marcando como eliminado (is_deleted=True) por un administrador (lógica a manejar en vista/serializer)
        # Aquí validamos el estado de la orden
        if self.service_order.status == 'cerrada' or self.service_order.facturado:
            # Permitir solo si es un soft delete y la orden NO está facturada (una cerrada se puede reabrir, una facturada NO se debe tocar)
            if self.is_deleted and not self.service_order.facturado:
                pass # Permitir borrar cargo de orden cerrada (implica reapertura lógica)
            elif not self.is_deleted:
                 raise ValidationError("No se pueden modificar cargos de una orden cerrada o facturada.")

        # Calcular subtotal con descuento
        base_subtotal = self.quantity * self.unit_price
        discount_amount = base_subtotal * (self.discount / Decimal('100.00'))
        self.subtotal = base_subtotal - discount_amount

        if self.service.applies_iva:
            self.iva_amount = self.subtotal * Decimal('0.13')
        else:
            self.iva_amount = Decimal('0.00')
        self.total = self.subtotal + self.iva_amount
        super().save(*args, **kwargs)


class Invoice(models.Model):
    """Factura emitida al cliente (CXC)"""
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

    service_order = models.ForeignKey(ServiceOrder, on_delete=models.PROTECT, related_name='invoices', verbose_name="Orden de Servicio")
    invoice_number = models.CharField(max_length=50, unique=True, blank=True, verbose_name="Número de Factura")
    ccf = models.CharField(max_length=100, blank=True, verbose_name="CCF (Comprobante de Crédito Fiscal)")
    invoice_type = models.CharField(max_length=10, choices=INVOICE_TYPE_CHOICES, default='DTE', verbose_name="Tipo de Factura")
    issue_date = models.DateField(default=timezone.localdate, verbose_name="Fecha de Emisión")
    due_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Vencimiento")

    # Montos
    subtotal_services = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Subtotal Servicios")
    iva_services = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="IVA Servicios")
    total_services = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Total Servicios (con IVA)")
    subtotal_third_party = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Subtotal Gastos a Terceros")

    # Fiscalidad El Salvador - Retención Gran Contribuyente
    retencion = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Retención 1% (Gran Contribuyente)")

    total_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Total Factura")
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Monto Pagado")
    credited_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Monto Acreditado (NC)")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Saldo Pendiente")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Estado")
    payment_condition = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='credito', verbose_name="Condición de Pago")

    # Archivos
    dte_file = models.FileField(
        upload_to='invoices/dte/',
        null=True,
        blank=True,
        verbose_name="Archivo DTE",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Máximo 5MB"
    )
    pdf_file = models.FileField(
        upload_to='invoices/pdf/',
        null=True,
        blank=True,
        verbose_name="PDF de Factura",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Máximo 5MB"
    )

    notes = models.TextField(blank=True, verbose_name="Observaciones")
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Creado por")
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
            from django.db import transaction
            from django.db.models import Max

            year = timezone.now().year

            # Usar transacción atómica para evitar race conditions
            with transaction.atomic():
                # Buscar el máximo número del año actual que sea PRE-FACTURA (o DTE si ya se editó, pero el auto es PRE)
                # El formato automático será: PRE-XXXXX-YYYY
                result = Invoice.objects.select_for_update().filter(
                    invoice_number__regex=rf'^PRE-\d{{5}}-{year}$'
                ).aggregate(max_num=Max('invoice_number'))

                if result['max_num']:
                    try:
                        # Extraer el número de en medio: PRE-00001-2025 -> 00001
                        parts = result['max_num'].split('-')
                        if len(parts) >= 2:
                            last_num = int(parts[1])
                            new_num = last_num + 1
                        else:
                            new_num = 1
                    except (ValueError, IndexError):
                        new_num = 1
                else:
                    new_num = 1

                self.invoice_number = f"PRE-{new_num:05d}-{year}"

        # Calcular retención del 1% para Grandes Contribuyentes con CCF
        client = self.service_order.client
        if client.is_gran_contribuyente and self.invoice_type == 'CCF':
            # Retención del 1% sobre el subtotal de servicios
            self.retencion = (self.subtotal_services + self.subtotal_third_party) * Decimal('0.01')
        else:
            self.retencion = Decimal('0.00')

        # El saldo a pagar se reduce por la retención, los pagos y las notas de crédito
        self.balance = (self.total_amount - self.retencion) - self.paid_amount - self.credited_amount

        if self.balance <= 0 and self.status != 'cancelled':
            self.status = 'paid'
        elif self.paid_amount > 0 and self.balance > 0:
            self.status = 'partial'
        elif self.credited_amount > 0 and self.balance > 0:
            self.status = 'partial'
        elif self.due_date and self.due_date < timezone.now().date() and self.balance > 0:
            self.status = 'overdue'
        elif self.status != 'cancelled':
            # Si hay saldo, no hay pagos parciales ni creditos, y no esta vencida ni cancelada -> Pendiente
            self.status = 'pending'

        if self.payment_condition == 'credito' and not self.due_date:
            credit_days = getattr(client, 'credit_days', 30)
            self.due_date = self.issue_date + timedelta(days=credit_days)

        super().save(*args, **kwargs)

    def calculate_totals(self):
        """Calcula los totales de servicios y gastos a terceros"""
        # Sumar solo los cargos asignados a esta factura
        charges = self.charges.all()
        self.subtotal_services = sum(c.subtotal for c in charges)
        self.iva_services = sum(c.iva_amount for c in charges)
        self.total_services = sum(c.total for c in charges)

        # TODO: Manejar gastos a terceros si se vinculan directamente (por ahora usa lógica legacy o requiere link)
        # Si los 'transfers' (gastos terceros) no tienen FK a Invoice, este cálculo podría ser incorrecto para parciales.
        # Por ahora, asumimos que los 'charges' cubren todo lo facturable.
        # Si se usa el modelo híbrido donde 'transfers' se facturan directamente, necesitaríamos FK en Transfer también.
        # Pero el nuevo flujo convierte gastos -> charges, así que usar 'charges' es lo correcto.
        
        # Retrocompatibilidad: Si no hay cargos asignados explícitamente, intentar tomar todos los de la OS?
        # No, para parciales esto rompería. Asumimos que el proceso de facturación ASIGNA los cargos.
        
        # Pero para facturas viejas? 
        # Si charges es vacío y la factura ya existe, tal vez deberíamos mantener el comportamiento anterior?
        # O mejor, migrar datos. Asumiremos que el flujo "nuevo" es el mandatorio.
        
        self.subtotal_third_party = Decimal('0.00') # Los terceros ahora se convierten en charges tipo "Reembolso"

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


class CreditNote(SoftDeleteModel):
    """Nota de Crédito aplicada a una factura"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='credit_notes', verbose_name="Factura")
    note_number = models.CharField(max_length=50, verbose_name="Número de NC")
    issue_date = models.DateField(default=timezone.localdate, verbose_name="Fecha de Emisión")
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Monto Acreditado")
    reason = models.CharField(max_length=255, verbose_name="Motivo")
    
    pdf_file = models.FileField(
        upload_to='invoices/credit_notes/',
        null=True,
        blank=True,
        verbose_name="PDF Nota Crédito",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Máximo 5MB"
    )
    
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Registrado por")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nota de Crédito"
        verbose_name_plural = "Notas de Crédito"
        ordering = ['-issue_date', '-id']

    def __str__(self):
        return f"NC {self.note_number} - {self.invoice.invoice_number}"

    def save(self, *args, **kwargs):
        """Actualiza el monto acreditado de la factura"""
        super().save(*args, **kwargs)
        invoice = self.invoice
        # Sumar solo NC activas (SoftDeleteModel filtra automáticamente, pero usaremos manager normal para seguridad)
        notes = invoice.credit_notes.filter(is_deleted=False)
        invoice.credited_amount = sum(n.amount for n in notes)
        invoice.save()

    def delete(self, *args, **kwargs):
        """Al borrar (soft delete), recalcular saldo de factura"""
        super().delete(*args, **kwargs)
        invoice = self.invoice
        notes = invoice.credit_notes.filter(is_deleted=False)
        invoice.credited_amount = sum(n.amount for n in notes)
        invoice.save()


class InvoicePayment(SoftDeleteModel):
    """Abonos/Pagos realizados a una factura"""
    PAYMENT_METHOD_CHOICES = (
        ('transferencia', 'Transferencia Bancaria'),
        ('efectivo', 'Efectivo'),
        ('cheque', 'Cheque'),
        ('tarjeta', 'Tarjeta'),
        ('deposito', 'Depósito Bancario'),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments', verbose_name="Factura")
    payment_date = models.DateField(default=timezone.now, verbose_name="Fecha de Pago")
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Monto")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, verbose_name="Método de Pago")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="Número de Referencia/Cheque")
    bank = models.ForeignKey(Bank, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Banco")
    notes = models.TextField(blank=True, verbose_name="Notas")
    receipt_file = models.FileField(
        upload_to='invoices/payments/',
        null=True,
        blank=True,
        verbose_name="Comprobante de Pago",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Máximo 5MB"
    )
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Registrado por")
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
        invoice = self.invoice
        # Sumar solo pagos activos
        payments = invoice.payments.filter(is_deleted=False)
        invoice.paid_amount = sum(payment.amount for payment in payments)
        invoice.save()
    
    def delete(self, *args, **kwargs):
        """Al borrar (soft), recalcular saldo factura"""
        super().delete(*args, **kwargs)
        invoice = self.invoice
        payments = invoice.payments.filter(is_deleted=False)
        invoice.paid_amount = sum(payment.amount for payment in payments)
        invoice.save()


class OrderHistory(models.Model):
    """Historial de cambios y eventos en una Orden de Servicio"""
    EVENT_TYPE_CHOICES = (
        ('created', 'Orden Creada'),
        ('updated', 'Orden Actualizada'),
        ('status_changed', 'Cambio de Estado'),
        ('charge_added', 'Cobro Agregado'),
        ('charge_deleted', 'Cobro Eliminado'),
        ('payment_added', 'Pago a Proveedor Agregado'),
        ('payment_updated', 'Pago a Proveedor Actualizado'),
        ('payment_approved', 'Pago a Proveedor Aprobado'),
        ('payment_paid', 'Pago a Proveedor Ejecutado'),
        ('payment_deleted', 'Pago a Proveedor Eliminado'),
        ('document_uploaded', 'Documento Subido'),
        ('document_deleted', 'Documento Eliminado'),
        ('invoice_generated', 'Factura Generada'),
        ('invoice_payment', 'Pago de Cliente Recibido'),
        ('closed', 'Orden Cerrada'),
        ('reopened', 'Orden Reabierta'),
    )
    
    service_order = models.ForeignKey(
        ServiceOrder, 
        on_delete=models.CASCADE, 
        related_name='history',
        verbose_name="Orden de Servicio"
    )
    event_type = models.CharField(
        max_length=30, 
        choices=EVENT_TYPE_CHOICES,
        verbose_name="Tipo de Evento"
    )
    description = models.TextField(verbose_name="Descripción")
    user = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True,
        verbose_name="Usuario"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")
    
    # Datos adicionales en JSON (opcional)
    metadata = models.JSONField(null=True, blank=True, verbose_name="Metadatos")
    
    class Meta:
        verbose_name = "Historial de Orden"
        verbose_name_plural = "Historial de Ordenes"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['service_order', '-created_at']),
            models.Index(fields=['event_type']),
        ]
    
    def __str__(self):
        return f"{self.service_order.order_number} - {self.get_event_type_display()} - {self.created_at}"