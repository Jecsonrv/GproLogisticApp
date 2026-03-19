from django.db import models
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxValueValidator
import os
import uuid
from decimal import Decimal
from apps.clients.models import Client
from apps.catalogs.models import SubClient, ShipmentType, Provider, Bank, Customs
from apps.validators import validate_document_file
from apps.core.models import SoftDeleteModel
from apps.core.constants import IVA_RATE, RETENCION_RATE, RETENCION_THRESHOLD


def order_document_upload_path(instance, filename):
    """Generate a unique file path per OS to avoid shared/overwritten files across orders."""
    ext = os.path.splitext(filename or "")[1].lower()
    order_id = getattr(instance, 'order_id', None) or 'unknown'
    date_prefix = timezone.now().strftime('%Y/%m/%d')
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return f"orders/docs/os_{order_id}/{date_prefix}/{unique_name}"

class ServiceOrder(SoftDeleteModel):
    order_number = models.CharField(max_length=50, unique=True, blank=True, verbose_name="Número de Orden")
    is_manual_os = models.BooleanField(default=False, verbose_name="OS Manual", help_text="Permite ingresar número de OS manualmente")
    client = models.ForeignKey(Client, on_delete=models.PROTECT, verbose_name="Cliente")
    sub_client = models.ForeignKey(SubClient, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Subcliente")

    shipment_type = models.ForeignKey(ShipmentType, on_delete=models.PROTECT, verbose_name="Tipo de Embarque")
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Proveedor")
    customs_agent = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders_as_customs_agent', verbose_name="Aforador")

    # Información del embarque
    purchase_order = models.CharField(max_length=100, blank=True, verbose_name="PO (Purchase Order)")
    bl_reference = models.CharField(max_length=100, blank=True, verbose_name="BL/Referencia")
    eta = models.DateField(null=True, blank=True, verbose_name="ETA")
    duca = models.CharField(max_length=5000, blank=True, verbose_name="DUCA")
    customs = models.ForeignKey(Customs, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Aduana")

    # Notas / Información adicional
    notes = models.TextField(blank=True, verbose_name="Notas")

    # Estado y facturación
    STATUS_CHOICES = (
        ('pendiente', 'Pendiente'),
        ('en_puerto', 'En Puerto'),
        ('en_transito', 'En Tránsito'),
        ('en_almacen', 'En Almacenadora'),
        ('finalizada', 'Finalizada'),
        ('cerrada', 'Cerrada'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente', verbose_name="Estado")
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
        indexes = [
            models.Index(fields=['order_number']),
            models.Index(fields=['status']),
            models.Index(fields=['client']),
            models.Index(fields=['created_at']),
            models.Index(fields=['facturado']),
            models.Index(fields=['-created_at', 'status']),  # Consulta más común
        ]

    def __str__(self):
        return self.order_number

    def save(self, *args, **kwargs):
        from django.db import transaction
        from django.db.models import Max
        import re

        # Si la orden está marcada como eliminada, permitimos el guardado sin validar formato
        # para que el sufijo de borrado no cause errores
        if self.is_deleted:
            super().save(*args, **kwargs)
            return

        current_year = timezone.now().year

        # Generar o validar número de orden con formato XXX-YYYY
        if not self.order_number:
            # Si es OS manual, debe venir desde el serializer/frontend
            if self.is_manual_os:
                raise ValidationError("Debe proporcionar un número de OS para las OS manuales")

            # Generación automática (código original)
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

        # Validaciones adicionales para OS manuales
        if self.is_manual_os and self.order_number:
            # Validar formato con regex (1 a 4 dígitos para el número)
            if not re.match(r'^\d{1,4}-\d{4}$', self.order_number):
                raise ValidationError("El formato del número de OS debe ser NNN-YYYY (ejemplo: 75-2023, 075-2023, 1550-2023)")

            # Extraer el año del número manual
            try:
                manual_year = int(self.order_number.split('-')[1])
            except (ValueError, IndexError):
                raise ValidationError("Formato de año inválido en el número de OS")

            # Validar que no exista duplicado (solo para nuevas OS)
            if not self.pk:
                if ServiceOrder.all_objects.filter(order_number=self.order_number).exists():
                    raise ValidationError(f"Ya existe una OS con el número {self.order_number}")

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
        """Calcula el total de servicios cobrados (USD)"""
        total = Decimal('0.00')
        for charge in self.charges.all():
            total += charge.total
        return total

    def get_total_third_party(self):
        """
        Calcula el total de gastos facturables al cliente incluyendo margen e IVA.
        """
        total = Decimal('0.00')
        transfers = self.transfers.filter(
            transfer_type__in=['cargos', 'terceros', 'costos'],
            is_deleted=False
        )
        for transfer in transfers:
            amount = transfer.amount or Decimal('0.00')
            # Aplicar margen si existe
            markup = transfer.customer_markup_percentage or Decimal('0.00')
            base_price = amount * (1 + markup / Decimal('100.00'))
            
            # Aplicar IVA si corresponde
            if transfer.customer_applies_iva:
                base_price = base_price * Decimal('1.13')
            
            total += base_price
        return total
    
    def get_total_direct_costs(self):
        """Calcula el total de costos directos (USD)"""
        total = Decimal('0.00')
        
        # 1. Costos vía Transfers (Legacy/Operativos)
        transfers = self.transfers.filter(
            transfer_type__in=['costos', 'propios'],
            is_deleted=False
        )
        for transfer in transfers:
            total += (transfer.amount or Decimal('0.00'))
        
        # 2. Costos vía Facturas de Proveedores (Nuevo Modelo de Asignación)
        # Sumar el cost_amount de todos los cargos que tengan una asignación de costo
        for charge in self.charges.filter(is_deleted=False):
            if hasattr(charge, 'cost_allocation'):
                total += charge.cost_allocation.cost_amount
                
        return total
    
    def get_total_admin_costs(self):
        """Calcula el total de gastos administrativos/operación (USD)"""
        total = Decimal('0.00')
        transfers = self.transfers.filter(
            transfer_type='admin',
            is_deleted=False
        )
        for transfer in transfers:
            total += (transfer.amount or Decimal('0.00'))
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

    def delete(self, using=None, keep_parents=False):
        """
        Sobreescritura de delete para validaciones de negocio antes del soft-delete.
        Libera el número de OS para que pueda ser reutilizado.
        """
        # 1. Validar si tiene facturas de venta asociadas
        if self.invoices.exists():
            raise ValidationError("No se puede eliminar la orden porque tiene facturas de venta asociadas.")
        
        # 2. Validar si tiene cargos a clientes (calculadora de servicios)
        if self.charges.filter(is_deleted=False).exists():
            raise ValidationError("No se puede eliminar la orden porque tiene cargos a clientes (servicios) asociados. Elimine los cargos primero.")

        # 3. Validar si tiene costos directos (ProviderInvoice) asociados
        # Usamos el related_name si existe o la búsqueda inversa
        if hasattr(self, 'provider_invoices') and self.provider_invoices.filter(is_deleted=False).exists():
            raise ValidationError("No se puede eliminar la orden porque tiene costos directos (facturas de proveedores) asociados.")
        
        # 4. Validar si tiene gastos/transferencias asociadas (activas)
        if self.transfers.filter(is_deleted=False).exists():
            raise ValidationError("No se puede eliminar la orden porque tiene transferencias o gastos asociados.")

        # Realizar el borrado lógico y liberar el número
        self.is_deleted = True
        self.deleted_at = timezone.now()
        
        # Guardamos el número original para el log si fuera necesario
        original_number = self.order_number
        # Añadimos sufijo para liberar el número original (ej: 031-2026-DEL-1715456123)
        self.order_number = f"{original_number}-DEL-{int(self.deleted_at.timestamp())}"
        
        self.save()

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
        upload_to=order_document_upload_path,
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
    """
    Cobros/Servicios facturados en una Orden de Servicio (Calculadora de Servicios)

    Tratamiento fiscal según normativa salvadoreña:
    - GRAVADO: Se aplica IVA 13%
    - NO_SUJETO: No se aplica IVA (fuera del ámbito de aplicación de la ley)

    TIPOS DE SERVICIO:
    - Servicios Propios: Sin costo directo asociado, 100% margen
    - Servicios Tercerizados: Vinculados a ProviderInvoice mediante DirectCostAllocation
    """
    # Tipos de tratamiento fiscal
    IVA_TYPE_CHOICES = (
        ('gravado', 'Gravado (13% IVA)'),
        ('exento', 'Exento'),
        ('no_sujeto', 'No Sujeto'),
    )

    # Estado de facturación del item
    BILLING_STATUS_CHOICES = (
        ('disponible', 'Disponible para Facturar'),
        ('facturado', 'Facturado'),
    )

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

    # Tratamiento fiscal
    iva_type = models.CharField(
        max_length=20,
        choices=IVA_TYPE_CHOICES,
        default='gravado',
        verbose_name="Tratamiento Fiscal"
    )

    # Estado de facturación para tracking
    billing_status = models.CharField(
        max_length=20,
        choices=BILLING_STATUS_CHOICES,
        default='disponible',
        verbose_name="Estado de Facturación"
    )

    # Flag para servicios tercerizados (vinculados a ProviderInvoice)
    is_third_party_service = models.BooleanField(
        default=False,
        verbose_name="Servicio Tercerizado",
        help_text="Si es True, este servicio tiene un costo directo asociado (ProviderInvoice)"
    )

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

    quantity = models.IntegerField(default=1, validators=[MinValueValidator(1)], verbose_name="Cantidad")
    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],  # Minimo $0.01
        verbose_name="Precio Unitario (Sin IVA)"
    )
    discount = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('100.00'))  # Maximo 100%
        ],
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
        """
        Calcula automáticamente subtotal, IVA y total.
        Sincroniza el tratamiento fiscal desde el servicio si no está especificado.
        Actualiza el estado de facturación según la vinculación con factura.
        """
        # Permitir bypass de validación para operaciones de facturación
        skip_order_validation = kwargs.pop('skip_order_validation', False)

        # Validación de modificación de cargos:
        # - Nuevos cargos (not self.pk): Solo bloquear si orden está CERRADA
        # - Cargos existentes: Bloquear si orden cerrada O si el cargo ya está facturado
        # EXCEPTO cuando se está vinculando/desvinculando de una factura (skip_order_validation=True)
        # Y EXCEPTO cuando se edita desde la pre-factura (el cargo tiene factura y esta no tiene DTE)
        is_pre_invoice_edit = self.invoice and not self.invoice.is_dte_issued
        is_new_charge = not self.pk

        if not skip_order_validation and not is_pre_invoice_edit:
            # Para nuevos cargos: solo bloquear si la orden está cerrada
            if is_new_charge and self.service_order.status == 'cerrada':
                raise ValidationError("No se pueden agregar cargos a una orden cerrada.")
            # Para cargos existentes: bloquear si orden cerrada O si este cargo específico ya está facturado
            elif not is_new_charge:
                cargo_facturado = self.invoice_id is not None
                if self.service_order.status == 'cerrada':
                    if self.is_deleted:
                        pass  # Permitir borrar cargo de orden cerrada
                    else:
                        raise ValidationError("No se pueden modificar cargos de una orden cerrada.")
                elif cargo_facturado and not self.is_deleted:
                    raise ValidationError("No se puede modificar un cargo que ya ha sido facturado.")

        # Sincronizar estado de facturación
        if self.invoice:
            self.billing_status = 'facturado'
        else:
            self.billing_status = 'disponible'

        # Calcular subtotal con descuento
        base_subtotal = self.quantity * self.unit_price
        discount_amount = base_subtotal * (self.discount / Decimal('100.00'))
        self.subtotal = base_subtotal - discount_amount

        # Calcular IVA segun tratamiento fiscal (usando constante centralizada)
        if self.iva_type == 'gravado':
            self.iva_amount = self.subtotal * IVA_RATE
        else:
            # No Sujeto: no aplica IVA
            self.iva_amount = Decimal('0.00')

        self.total = self.subtotal + self.iva_amount
        super().save(*args, **kwargs)

    def get_iva_type_display_short(self):
        """Retorna etiqueta corta para UI"""
        labels = {
            'gravado': 'IVA 13%',
            'no_sujeto': 'No Sujeto'
        }
        return labels.get(self.iva_type, 'N/A')

    def is_editable(self):
        """Verifica si el cargo puede ser editado"""
        # No editable si está facturado y la factura tiene DTE
        if self.invoice and self.invoice.is_dte_issued:
            return False
        # No editable si la orden está cerrada
        if self.service_order.status == 'cerrada':
            return False
        return True

    def get_cost(self):
        """
        Retorna el costo base si es servicio tercerizado, 0 si es propio.

        Returns:
            Decimal: Costo asignado desde ProviderInvoice o 0
        """
        if self.is_third_party_service and hasattr(self, 'cost_allocation'):
            return self.cost_allocation.cost_amount
        return Decimal('0.00')

    def get_profit(self):
        """
        Calcula la ganancia de este servicio.

        Returns:
            Decimal: Precio de venta - Costo
        """
        return self.subtotal - self.get_cost()

    def get_margin_percentage(self):
        """
        Calcula el margen de ganancia en porcentaje.

        Returns:
            Decimal: Margen porcentual sobre el costo
        """
        cost = self.get_cost()
        if cost > 0:
            return ((self.subtotal - cost) / cost) * Decimal('100.00')
        return Decimal('100.00')  # Si no hay costo, es 100% margen

    def get_cost_allocation_info(self):
        """
        Retorna información de la asignación de costo si existe.

        Returns:
            dict: Información de la factura de proveedor y costo asignado
        """
        if self.is_third_party_service and hasattr(self, 'cost_allocation'):
            alloc = self.cost_allocation
            return {
                'provider_invoice_id': alloc.provider_invoice.id,
                'provider_invoice_number': alloc.provider_invoice.invoice_number,
                'provider_name': alloc.provider_invoice.provider.name,
                'cost_amount': float(alloc.cost_amount),
                'profit': float(self.get_profit()),
                'margin_percentage': float(self.get_margin_percentage())
            }
        return None


class Invoice(models.Model):
    """
    Factura emitida al cliente (CXC)

    Cumplimiento fiscal El Salvador:
    - Retención 1%: Aplica para Grandes Contribuyentes con CCF cuando
      el subtotal (sin IVA) supera $100.00
    - El IVA se desglosa separadamente para cuadre con facturación electrónica
    - Una vez marcada como DTE emitido, solo permite notas de crédito
    """
    INVOICE_TYPE_CHOICES = (
        ('DTE', 'DTE (Documento Tributario Electrónico)'),
        ('FEX', 'FEX (Factura de Exportación)'),
        ('INTL', 'Factura Internacional'),
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

    # Montos - Desglose para cuadre con facturación electrónica
    # Servicios (OrderCharge)
    subtotal_services = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Subtotal Servicios (Neto)")
    iva_services = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="IVA Servicios")
    total_services = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Total Servicios")

    # Gastos a Terceros (Transfer) - Desglose completo para DTE
    subtotal_third_party = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Subtotal Gastos (Neto)")
    iva_third_party = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="IVA Gastos")
    total_third_party = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Total Gastos")

    # Totales consolidados
    subtotal_neto = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Subtotal Neto (Sin IVA)")
    iva_total = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="IVA Total")

    # Fiscalidad El Salvador - Retención Gran Contribuyente (1% sobre subtotal > $100)
    retencion = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Retención 1% (Gran Contribuyente)")

    total_amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.00'))], verbose_name="Total Factura")
    paid_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Monto Pagado")
    credited_amount = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Monto Acreditado (NC)")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'), verbose_name="Saldo Pendiente")

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', verbose_name="Estado")
    payment_condition = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='credito', verbose_name="Condición de Pago")

    # Estado de facturación
    is_dte_issued = models.BooleanField(default=False, verbose_name="DTE Emitido", 
        help_text="Marcar cuando se emita la factura real en el sistema fiscal. Una vez marcado, solo se pueden hacer notas de crédito.")
    dte_issued_at = models.DateTimeField(null=True, blank=True, verbose_name="Fecha de Emisión DTE",
        help_text="Fecha y hora en que se marcó como DTE emitido. Permite eliminación durante 24 horas.")
    dte_number = models.CharField(max_length=100, blank=True, verbose_name="Número DTE Real",
        help_text="Número de factura emitida en el sistema fiscal externo")
    
    # Campos DTE El Salvador (Requerimiento MH)
    generation_code = models.CharField(
        max_length=150, 
        blank=True, 
        verbose_name="Código de Generación",
        help_text="Código único de generación del DTE (MH)"
    )
    reception_stamp = models.CharField(
        max_length=150, 
        blank=True, 
        verbose_name="Sello de Recepción",
        help_text="Sello de recepción otorgado por Hacienda"
    )

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
        """
        Genera número de factura automático y calcula saldos.
        Aplica retención 1% para Grandes Contribuyentes con CCF si subtotal > $100.
        """
        if not self.invoice_number:
            from django.db import transaction
            from django.db.models import Max

            year = timezone.now().year

            with transaction.atomic():
                result = Invoice.objects.select_for_update().filter(
                    invoice_number__regex=rf'^PRE-\d{{5}}-{year}$'
                ).aggregate(max_num=Max('invoice_number'))

                if result['max_num']:
                    try:
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

        # Auto-bloquear DTE cuando se sube el PDF de la factura
        if self.pdf_file and not self.is_dte_issued:
            self.is_dte_issued = True
            if not self.dte_issued_at:
                self.dte_issued_at = timezone.now()

        # Calcular totales consolidados
        self.subtotal_neto = self.subtotal_services + self.subtotal_third_party
        self.iva_total = self.iva_services + (self.iva_third_party if hasattr(self, 'iva_third_party') else Decimal('0.00'))

        # Calcular retención del 1% para Grandes Contribuyentes con DTE
        # IMPORTANTE: La retención se aplica SOLO sobre la BASE GRAVADA de servicios
        # Los montos 'exento' y 'no_sujeto' NO deben considerarse para el cálculo de retención
        # Aplica solo si la base gravada supera $100.00 (Art. 162 Código Tributario El Salvador)
        client = self.service_order.client

        # Calcular base gravada: solo cargos de servicios con iva_type='gravado'
        # NOTA: Si es nueva factura (sin pk), los cargos aún no están asignados,
        # la retención correcta se calculará en calculate_totals() o recalculate_retention()
        if self.pk:
            base_gravada_servicios = sum(
                c.subtotal for c in self.charges.filter(is_deleted=False, iva_type='gravado')
            ) or Decimal('0.00')
        else:
            # Factura nueva: intentar calcular desde la orden de servicio si existe
            if self.service_order:
                # Calcular base gravada desde los cargos de la orden que se van a facturar
                # Solo consideramos los cargos NO facturados (invoice__isnull=True)
                # y que sean gravados (iva_type='gravado')
                base_gravada_servicios = sum(
                    c.subtotal for c in self.service_order.charges.filter(
                        is_deleted=False, 
                        iva_type='gravado',
                        invoice__isnull=True
                    )
                ) or Decimal('0.00')
            else:
                base_gravada_servicios = Decimal('0.00')

        # Usar los métodos del modelo Client para cálculo de retención sobre BASE GRAVADA
        if self.invoice_type == 'DTE' and client.applies_retention(base_gravada_servicios):
            self.retencion = client.calculate_retention(base_gravada_servicios)
        else:
            self.retencion = Decimal('0.00')

        # El saldo a pagar se reduce por los pagos y las notas de crédito
        # NOTA: La retención NO se resta aquí porque se paga mediante un comprobante F-910
        # que se registra como un pago normal (payment_method='retencion')
        self.balance = self.total_amount - self.paid_amount - self.credited_amount

        # FIX DE PRECISIÓN: Forzar redondeo antes de guardar
        from decimal import ROUND_HALF_UP
        if self.retencion:
            self.retencion = self.retencion.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if self.total_amount:
            self.total_amount = self.total_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        if self.balance:
            self.balance = self.balance.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)

        # Actualizar estado
        today = timezone.localdate()
        
        # PARCHE DE SEGURIDAD: Si está anulada, el balance debe ser 0 para liberar crédito
        if self.status == 'cancelled':
            self.balance = Decimal('0.00')
        elif self.balance <= 0:
            self.status = 'paid'
        elif self.paid_amount > 0 and self.balance > 0:
            self.status = 'partial'
        elif self.credited_amount > 0 and self.balance > 0:
            self.status = 'partial'
        elif self.due_date and self.due_date < today and self.balance > 0:
            self.status = 'overdue'
        elif self.status != 'cancelled':
            self.status = 'pending'

        if self.payment_condition == 'credito' and not self.due_date:
            credit_days = getattr(client, 'credit_days', 30)
            self.due_date = self.issue_date + timedelta(days=credit_days)

        super().save(*args, **kwargs)

    def can_delete_without_credit_note(self):
        """
        Verifica si la factura puede eliminarse sin nota de crédito.
        Retorna True si:
        - No está emitida como DTE, O
        - Está emitida pero han pasado menos de 24 horas desde la emisión
        """
        if not self.is_dte_issued:
            return True
        
        if not self.dte_issued_at:
            # Si está marcado como emitido pero no tiene fecha, no permitir eliminación
            return False
        
        from datetime import timedelta
        time_limit = self.dte_issued_at + timedelta(hours=24)
        return timezone.now() < time_limit

    def get_hours_until_locked(self):
        """
        Retorna las horas restantes hasta que se bloquee permanentemente.
        Retorna None si ya está bloqueado o no aplica.
        """
        if not self.is_dte_issued or not self.dte_issued_at:
            return None
        
        from datetime import timedelta
        time_limit = self.dte_issued_at + timedelta(hours=24)
        now = timezone.now()
        
        if now >= time_limit:
            return 0  # Ya está bloqueado
        
        remaining = time_limit - now
        return remaining.total_seconds() / 3600  # Convertir a horas

    def calculate_totals(self):
        """
        Calcula los totales de servicios y gastos a terceros con desglose de IVA.
        Asegura coherencia entre OS y CXC mediante cálculo atómico.

        AUDITORÍA #6: Ahora también recalcula la retención del 1% cuando
        cambian los cargos gravados.
        """
        from decimal import Decimal
        from django.db import transaction

        with transaction.atomic():
            # 1. Sumar cargos de servicios (OrderCharge) asignados a esta factura
            charges = self.charges.filter(is_deleted=False)
            self.subtotal_services = sum(c.subtotal for c in charges) or Decimal('0.00')
            self.iva_services = sum(c.iva_amount for c in charges) or Decimal('0.00')
            self.total_services = self.subtotal_services + self.iva_services

            # 2. Sumar gastos (Transfers) facturados con desglose de IVA
            subtotal_expenses = Decimal('0.00')
            iva_expenses = Decimal('0.00')

            for transfer in self.billed_transfers.filter(is_deleted=False):
                # Usar los métodos del modelo Transfer para cálculos consistentes
                base_price = transfer.get_customer_base_price()
                iva = transfer.get_customer_iva_amount()

                subtotal_expenses += base_price
                iva_expenses += iva

            self.subtotal_third_party = subtotal_expenses
            self.iva_third_party = iva_expenses
            self.total_third_party = subtotal_expenses + iva_expenses

            # 3. Totales consolidados para cuadre con DTE
            self.subtotal_neto = self.subtotal_services + self.subtotal_third_party
            self.iva_total = self.iva_services + self.iva_third_party

            # 4. Total general (Neto + IVA)
            self.total_amount = self.subtotal_neto + self.iva_total

            # AUDITORÍA #6: Recalcular retención del 1% sobre base gravada
            # La retención aplica solo a servicios gravados (iva_type='gravado')
            client = self.service_order.client
            base_gravada_servicios = sum(
                c.subtotal for c in charges if c.iva_type == 'gravado'
            ) or Decimal('0.00')

            if self.invoice_type == 'DTE' and client.applies_retention(base_gravada_servicios):
                self.retencion = client.calculate_retention(base_gravada_servicios)
            else:
                self.retencion = Decimal('0.00')

            # 5. Recalcular balance
            # NOTA: La retención NO se resta del balance porque se paga mediante comprobante F-910
            self.balance = self.total_amount - self.paid_amount - self.credited_amount

            self.save()

    def get_billing_summary(self):
        """
        Retorna resumen de facturación para UI con desglose completo.
        Útil para mostrar la "pre-factura" antes de emitir DTE.
        """
        return {
            'servicios': {
                'subtotal': float(self.subtotal_services),
                'iva': float(self.iva_services),
                'total': float(self.total_services),
                'items_count': self.charges.filter(is_deleted=False).count()
            },
            'gastos': {
                'subtotal': float(self.subtotal_third_party),
                'iva': float(getattr(self, 'iva_third_party', 0) or 0),
                'total': float(getattr(self, 'total_third_party', 0) or self.subtotal_third_party),
                'items_count': self.billed_transfers.filter(is_deleted=False).count()
            },
            'consolidado': {
                'subtotal_neto': float(getattr(self, 'subtotal_neto', 0) or (self.subtotal_services + self.subtotal_third_party)),
                'iva_total': float(getattr(self, 'iva_total', 0) or self.iva_services),
                'total_bruto': float(self.total_amount),
                'retencion': float(self.retencion),
                'total_a_cobrar': float(self.total_amount - self.retencion)
            },
            'estado': {
                'is_dte_issued': self.is_dte_issued,
                'is_editable': not self.is_dte_issued,
                'status': self.status
            }
        }

    def days_overdue(self):
        """Calcula cuántos días lleva vencida la factura"""
        if not self.due_date or self.status == 'paid':
            return 0
        today = timezone.localdate()
        if today > self.due_date:
            return (today - self.due_date).days
        return 0


class CreditNote(SoftDeleteModel):
    """
    Nota de Credito aplicada a una factura.

    VALIDACIONES ATOMICAS:
    - La suma de todas las NC no puede exceder el total_amount de la factura
    - Se usa transaccion atomica para prevenir race conditions
    """
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='credit_notes', verbose_name="Factura")
    note_number = models.CharField(max_length=50, verbose_name="Numero de NC")
    issue_date = models.DateField(default=timezone.localdate, verbose_name="Fecha de Emision")
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Monto Acreditado")
    reason = models.CharField(max_length=255, verbose_name="Motivo")

    pdf_file = models.FileField(
        upload_to='invoices/credit_notes/',
        null=True,
        blank=True,
        verbose_name="PDF Nota Credito",
        validators=[validate_document_file],
        help_text="Solo PDF, JPG, PNG. Maximo 5MB"
    )

    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Registrado por")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nota de Credito"
        verbose_name_plural = "Notas de Credito"
        ordering = ['-issue_date', '-id']

    def __str__(self):
        return f"NC {self.note_number} - {self.invoice.invoice_number}"

    def clean(self):
        """Validacion de integridad de la nota de credito"""
        super().clean()

        if self.invoice:
            # Calcular suma de NC existentes (excluyendo esta si es update)
            existing_nc_amount = self.invoice.credit_notes.filter(
                is_deleted=False
            ).exclude(pk=self.pk).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')

            total_after_this = existing_nc_amount + self.amount

            # Validar que la suma total no exceda el monto facturado
            if total_after_this > self.invoice.total_amount:
                max_allowed = self.invoice.total_amount - existing_nc_amount
                raise ValidationError({
                    'amount': f'El monto de la NC (${self.amount}) excede el maximo permitido (${max_allowed}). '
                              f'Total facturado: ${self.invoice.total_amount}, NC existentes: ${existing_nc_amount}'
                })

    def save(self, *args, **kwargs):
        """Actualiza el monto acreditado de la factura con transaccion atomica"""
        # Ejecutar validaciones
        self.full_clean()

        with transaction.atomic():
            # Obtener lock sobre la factura para prevenir race conditions
            invoice = Invoice.objects.select_for_update().get(pk=self.invoice_id)

            super().save(*args, **kwargs)

            # Recalcular credited_amount usando agregacion
            total_credited = invoice.credit_notes.filter(is_deleted=False).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')

            invoice.credited_amount = total_credited
            invoice.save()

    def delete(self, *args, **kwargs):
        """Al borrar (soft delete), recalcular saldo de factura con transaccion atomica"""
        with transaction.atomic():
            invoice = Invoice.objects.select_for_update().get(pk=self.invoice_id)

            super().delete(*args, **kwargs)

            # Recalcular credited_amount
            total_credited = invoice.credit_notes.filter(is_deleted=False).aggregate(
                total=Sum('amount')
            )['total'] or Decimal('0.00')

            invoice.credited_amount = total_credited
            invoice.save()


class InvoicePayment(SoftDeleteModel):
    """Abonos/Pagos realizados a una factura"""
    PAYMENT_METHOD_CHOICES = (
        ('transferencia', 'Transferencia Bancaria'),
        ('efectivo', 'Efectivo'),
        ('cheque', 'Cheque'),
        ('tarjeta', 'Tarjeta'),
        ('deposito', 'Depósito Bancario'),
        ('retencion', 'Comprobante de Retención F-910'),
    )

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments', verbose_name="Factura")
    payment_date = models.DateField(default=timezone.now, verbose_name="Fecha de Pago")
    amount = models.DecimalField(max_digits=15, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], verbose_name="Monto")
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, verbose_name="Método de Pago")
    reference_number = models.CharField(max_length=100, blank=True, verbose_name="Número de Referencia/Cheque")
    
    # Campo específico para comprobantes de retención F-910
    numero_comprobante_retencion = models.CharField(
        max_length=50,
        blank=True,
        verbose_name="Número Comprobante de Retención",
        help_text="Número del comprobante de retención emitido por el Gran Contribuyente"
    )
    
    # Nuevos campos para cumplimiento fiscal de retenciones
    retention_generation_code = models.CharField(
        max_length=150, 
        blank=True, 
        verbose_name="Código Generación Retención"
    )
    retention_reception_stamp = models.CharField(
        max_length=150, 
        blank=True, 
        verbose_name="Sello Recepción Retención"
    )
    
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
    
    def get_item_allocations_summary(self):
        """
        Retorna un resumen de las asignaciones de pago por item.
        """
        allocations = self.item_allocations.filter(is_deleted=False)
        return {
            'total_allocated': sum(a.amount for a in allocations),
            'charges': [{
                'charge_id': a.charge_id,
                'amount': float(a.amount)
            } for a in allocations if a.charge_id],
            'expenses': [{
                'expense_id': a.expense_id,
                'amount': float(a.amount)
            } for a in allocations if a.expense_id]
        }


class PaymentItemAllocation(SoftDeleteModel):
    """
    Asignación de un pago a items específicos de la factura.
    
    Permite registrar qué parte de un pago corresponde a cada item facturado,
    ya sea un servicio (OrderCharge) o un gasto (Transfer).
    
    Esto facilita:
    - Pagos parciales por item específico
    - Tracking detallado de qué se ha pagado
    - Conciliación con clientes que pagan por concepto
    """
    payment = models.ForeignKey(
        InvoicePayment,
        on_delete=models.CASCADE,
        related_name='item_allocations',
        verbose_name="Pago"
    )
    
    # Un allocation puede ser para un cargo (servicio) O un gasto (expense)
    charge = models.ForeignKey(
        'OrderCharge',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_allocations',
        verbose_name="Servicio"
    )
    expense = models.ForeignKey(
        'transfers.Transfer',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_allocations',
        verbose_name="Gasto"
    )
    
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        verbose_name="Monto Asignado"
    )
    
    notes = models.CharField(max_length=255, blank=True, verbose_name="Notas")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Asignación de Pago por Item"
        verbose_name_plural = "Asignaciones de Pago por Item"
        ordering = ['payment', 'id']
        constraints = [
            models.CheckConstraint(
                check=(
                    models.Q(charge__isnull=False, expense__isnull=True) |
                    models.Q(charge__isnull=True, expense__isnull=False)
                ),
                name='payment_allocation_one_item_type'
            )
        ]

    def __str__(self):
        item_desc = ""
        if self.charge:
            item_desc = f"Servicio: {self.charge.service.name}"
        elif self.expense:
            item_desc = f"Gasto: {self.expense.description[:30]}"
        return f"Pago #{self.payment_id} - {item_desc} - ${self.amount}"

    def clean(self):
        """Validaciones de integridad"""
        super().clean()
        
        # Validar que tenga exactamente un item
        if not self.charge and not self.expense:
            raise ValidationError("Debe especificar un servicio o un gasto")
        
        if self.charge and self.expense:
            raise ValidationError("Solo puede especificar un servicio O un gasto, no ambos")
        
        # Validar que el item pertenezca a la misma factura que el pago
        invoice = self.payment.invoice
        
        if self.charge and self.charge.invoice_id != invoice.id:
            raise ValidationError("El servicio no pertenece a la factura de este pago")
        
        if self.expense and self.expense.invoice_id != invoice.id:
            raise ValidationError("El gasto no pertenece a la factura de este pago")
        
        # Validar que el monto no exceda el pendiente del item
        # FIX: Redondear a 2 decimales para evitar errores de punto flotante
        from decimal import ROUND_HALF_UP
        item_total = self.get_item_total()
        item_paid = self.get_item_paid_amount(exclude_self=True)
        item_pending = (item_total - item_paid).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        amount_rounded = self.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        if amount_rounded > item_pending:
            raise ValidationError({
                'amount': f'El monto (${amount_rounded}) excede el pendiente del item (${item_pending})'
            })

    def get_item_total(self):
        """Retorna el total del item asociado"""
        if self.charge:
            return self.charge.total
        elif self.expense:
            return self.expense.get_customer_total()
        return Decimal('0.00')

    def get_item_paid_amount(self, exclude_self=False):
        """
        Calcula el monto ya pagado para este item específico.
        
        Args:
            exclude_self: Si es True, excluye esta asignación del cálculo
        """
        if self.charge:
            qs = PaymentItemAllocation.objects.filter(
                charge=self.charge,
                payment__is_deleted=False,
                is_deleted=False
            )
        elif self.expense:
            qs = PaymentItemAllocation.objects.filter(
                expense=self.expense,
                payment__is_deleted=False,
                is_deleted=False
            )
        else:
            return Decimal('0.00')
        
        if exclude_self and self.pk:
            qs = qs.exclude(pk=self.pk)
        
        return qs.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')

    def get_item_pending_amount(self):
        """Retorna el monto pendiente del item"""
        return self.get_item_total() - self.get_item_paid_amount()

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)


class OrderHistory(models.Model):
    """Historial de cambios y eventos en una Orden de Servicio"""
    EVENT_TYPE_CHOICES = (
        ('created', 'Orden Creada'),
        ('updated', 'Orden Actualizada'),
        ('status_changed', 'Cambio de Estado'),
        ('charge_added', 'Cobro Agregado'),
        ('charge_updated', 'Cobro Actualizado'),  # AUDITORÍA #9
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
        ('invoice_payment_deleted', 'Pago de Cliente Eliminado'),  # AUDITORÍA #9
        ('invoice_voided', 'Factura Anulada'),  # AUDITORÍA #9
        ('credit_note_added', 'Nota de Crédito Aplicada'),  # AUDITORÍA #9
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


class InvoiceEditHistory(models.Model):
    """
    Historial de ediciones en pre-facturas (antes de emitir DTE)

    Audit Trail completo para cumplimiento contable y fiscal.
    Registra quién, cuándo y qué cambió para trazabilidad.
    """
    EDIT_TYPE_CHOICES = (
        # Ediciones de líneas
        ('charge_added', 'Línea de Servicio Agregada'),
        ('charge_edited', 'Línea de Servicio Editada'),
        ('charge_removed', 'Línea de Servicio Removida'),
        ('expense_added', 'Gasto Agregado'),
        ('expense_edited', 'Gasto Editado'),
        ('expense_removed', 'Gasto Removido'),
        # Ediciones de configuración de cobro
        ('markup_changed', 'Margen de Utilidad Modificado'),
        ('iva_type_changed', 'Tipo de IVA Modificado'),
        ('iva_toggle_changed', 'Aplicación de IVA Modificada'),
        # Totales y DTE
        ('totals_recalculated', 'Totales Recalculados'),
        ('dte_marked', 'Marcada como DTE Emitido'),
        # Sincronización
        ('synced_from_os', 'Sincronizado desde OS'),
        ('synced_to_os', 'Sincronizado hacia OS'),
    )
    
    invoice = models.ForeignKey(
        Invoice, 
        on_delete=models.CASCADE, 
        related_name='edit_history',
        verbose_name="Factura"
    )
    edit_type = models.CharField(
        max_length=30, 
        choices=EDIT_TYPE_CHOICES,
        verbose_name="Tipo de Edición"
    )
    description = models.TextField(verbose_name="Descripción del Cambio")
    
    # Valores anteriores y nuevos (para auditoría)
    previous_values = models.JSONField(null=True, blank=True, verbose_name="Valores Anteriores")
    new_values = models.JSONField(null=True, blank=True, verbose_name="Valores Nuevos")
    
    user = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        null=True,
        verbose_name="Usuario"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha y Hora")
    
    class Meta:
        verbose_name = "Historial de Edición de Factura"
        verbose_name_plural = "Historial de Ediciones de Facturas"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['invoice', '-created_at']),
        ]
    
    def __str__(self):
        return f"{self.invoice.invoice_number} - {self.get_edit_type_display()} - {self.created_at}"