from django.db import models
from django.core.validators import EmailValidator

class Client(models.Model):
    name = models.CharField(max_length=255, verbose_name="Nombre / Razón Social")
    legal_name = models.CharField(max_length=255, blank=True, verbose_name="Nombre Jurídico Completo")
    nit = models.CharField(max_length=50, unique=True, verbose_name="NIT")
    iva_registration = models.CharField(max_length=50, verbose_name="Registro IVA")
    address = models.TextField(verbose_name="Dirección")
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

    # Configuración fiscal (El Salvador)
    is_gran_contribuyente = models.BooleanField(default=False, verbose_name="Gran Contribuyente")

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