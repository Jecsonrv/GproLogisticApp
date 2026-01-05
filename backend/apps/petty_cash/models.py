from django.db import models
from django.conf import settings
from decimal import Decimal

class PettyCashTransaction(models.Model):
    TRANSACTION_TYPES = (
        ('INCOME', 'Ingreso / Reembolso'),
        ('EXPENSE', 'Egreso / Gasto'),
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='petty_cash_transactions')
    
    transaction_date = models.DateField(verbose_name="Fecha de Transacción")
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, default='EXPENSE')
    
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Monto")
    
    # Details from Excel
    concept = models.CharField(max_length=255, verbose_name="Concepto / Detalle del Pago")
    beneficiary = models.CharField(max_length=255, blank=True, null=True, verbose_name="Beneficiario")
    
    # Reference fields (optional/informative)
    reference_number = models.CharField(max_length=50, blank=True, null=True, verbose_name="No. Comprobante / Factura")
    service_order_ref = models.CharField(max_length=50, blank=True, null=True, verbose_name="Orden de Servicio (Ref)")
    
    # Expense categorization
    category_code = models.CharField(max_length=10, blank=True, null=True, verbose_name="Código de Gasto")
    
    # Tax info (optional)
    nit = models.CharField(max_length=20, blank=True, null=True, verbose_name="NIT")
    dui = models.CharField(max_length=20, blank=True, null=True, verbose_name="DUI")

    class Meta:
        ordering = ['-transaction_date', '-created_at']
        verbose_name = "Movimiento de Caja Chica"
        verbose_name_plural = "Movimientos de Caja Chica"

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.amount} - {self.concept}"


class CashCount(models.Model):
    """
    To store the 'Cuadre' or physical count of money.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    date = models.DateField(auto_now_add=True)
    
    # Totals
    calculated_balance = models.DecimalField(max_digits=10, decimal_places=2, help_text="Saldo que debería haber según sistema")
    actual_balance = models.DecimalField(max_digits=10, decimal_places=2, help_text="Saldo contado físicamente")
    difference = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Arqueo de Caja"
        verbose_name_plural = "Arqueos de Caja"

class CashCountDetail(models.Model):
    """
    Stores the count of specific denominations for a CashCount.
    e.g., 5 bills of $20.
    """
    cash_count = models.ForeignKey(CashCount, on_delete=models.CASCADE, related_name='details')
    denomination = models.DecimalField(max_digits=6, decimal_places=2, verbose_name="Denominación")
    quantity = models.IntegerField(default=0, verbose_name="Cantidad")
    total = models.DecimalField(max_digits=10, decimal_places=2, verbose_name="Total por denominación")
    
    def save(self, *args, **kwargs):
        self.total = self.denomination * Decimal(self.quantity)
        super().save(*args, **kwargs)
