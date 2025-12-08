from django.db import models
from django.utils import timezone
from apps.orders.models import ServiceOrder
from apps.catalogs.models import Provider

class Transfer(models.Model):
    TYPE_CHOICES = (
        ('terceros', 'Cargos a Clientes (Terceros)'),
        ('propios', 'Costos Operativos (Propios)'),
        ('admin', 'Gastos Administrativos'),
    )
    transfer_type = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name="Tipo de Gasto")

    STATUS_CHOICES = (
        ('provisionada', 'Provisionada'),
        ('pagada', 'Pagada'),
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='provisionada', verbose_name="Estado")

    PAYMENT_METHOD_CHOICES = (
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia Bancaria'),
        ('cheque', 'Cheque'),
        ('tarjeta', 'Tarjeta'),
    )
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, verbose_name="Método de Pago")

    amount = models.DecimalField(max_digits=15, decimal_places=2, verbose_name="Monto")
    description = models.TextField(verbose_name="Descripción")

    # Relaciones
    service_order = models.ForeignKey(ServiceOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='transfers', verbose_name="Orden de Servicio")
    client = models.ForeignKey('clients.Client', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Cliente")
    provider = models.ForeignKey(Provider, on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Proveedor")

    # Información de pago
    beneficiary_name = models.CharField(max_length=255, blank=True, verbose_name="A Nombre De (Beneficiario)")
    bank = models.CharField(max_length=100, blank=True, verbose_name="Banco")
    ccf = models.CharField(max_length=100, blank=True, verbose_name="CCF (Número de Factura)")
    invoice_number = models.CharField(max_length=100, blank=True, verbose_name="Número de Factura/Comprobante")
    invoice_file = models.FileField(upload_to='transfers/invoices/', blank=True, null=True, verbose_name="Factura")

    # Fechas
    transaction_date = models.DateField(default=timezone.now, verbose_name="Fecha de Transacción")
    payment_date = models.DateField(null=True, blank=True, verbose_name="Fecha de Pago")
    mes = models.CharField(max_length=20, blank=True, verbose_name="Mes")

    # Auditoría
    notes = models.TextField(blank=True, verbose_name="Notas Adicionales")
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, verbose_name="Creado por")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Fecha de Registro")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="Última Actualización")

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

    def save(self, *args, **kwargs):
        # Establecer el mes automáticamente
        if not self.mes:
            months = {
                1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL',
                5: 'MAYO', 6: 'JUNIO', 7: 'JULIO', 8: 'AGOSTO',
                9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
            }
            month_num = self.transaction_date.month if self.transaction_date else timezone.now().month
            self.mes = months[month_num]

        # Si se marca como pagada, registrar fecha de pago
        if self.status == 'pagada' and not self.payment_date:
            self.payment_date = timezone.now().date()

        super().save(*args, **kwargs)