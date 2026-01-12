"""
Script de Migración: Corregir Balances de Facturas con Retención

PROBLEMA:
Las facturas con retención tenían un bug en el cálculo del balance:
- Fórmula incorrecta: balance = (total_amount - retencion) - paid_amount - credited_amount
- Fórmula correcta:  balance = total_amount - paid_amount - credited_amount

La retención NO debe restarse del balance porque se paga mediante comprobante F-910
que se registra como un pago normal (payment_method='retencion').

SOLUCIÓN:
Este script recalcula el balance de todas las facturas que tienen retención > 0
usando la fórmula correcta.

USO:
    python manage.py shell < fix_retention_balances.py

O desde el shell de Django:
    python manage.py shell
    >>> exec(open('fix_retention_balances.py').read())
"""

import os
import sys
import django

# Configurar Django
if __name__ == '__main__':
    # Agregar el directorio del proyecto al path
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    django.setup()

from decimal import Decimal
from django.db import transaction
from apps.orders.models import Invoice

def fix_retention_balances(dry_run=True):
    """
    Recalcula los balances de facturas con retención.
    
    Args:
        dry_run (bool): Si es True, solo muestra qué cambiaría sin guardar.
                       Si es False, guarda los cambios en la base de datos.
    """
    print("=" * 80)
    print("SCRIPT DE CORRECCIÓN: Balances de Facturas con Retención")
    print("=" * 80)
    print()
    
    if dry_run:
        print("⚠️  MODO DRY RUN - No se guardarán cambios")
    else:
        print("🔴 MODO PRODUCCIÓN - Se guardarán cambios en la base de datos")
    
    print()
    
    # Obtener todas las facturas con retención > 0
    invoices_with_retention = Invoice.objects.filter(
        retencion__gt=Decimal('0.00')
    ).select_related('service_order__client')
    
    total_invoices = invoices_with_retention.count()
    print(f"📊 Facturas encontradas con retención: {total_invoices}")
    print()
    
    if total_invoices == 0:
        print("✅ No hay facturas con retención para corregir.")
        return
    
    # Contadores
    corrected_count = 0
    already_correct_count = 0
    errors = []
    
    print("-" * 80)
    print(f"{'Factura':<20} {'Cliente':<25} {'Balance Actual':<15} {'Balance Correcto':<15} {'Estado'}")
    print("-" * 80)
    
    for invoice in invoices_with_retention:
        try:
            # Calcular balance actual (con el bug)
            old_balance = invoice.balance
            
            # Calcular balance correcto (sin restar retención)
            correct_balance = invoice.total_amount - invoice.paid_amount - invoice.credited_amount
            
            # Verificar si necesita corrección
            if old_balance != correct_balance:
                status = "❌ NECESITA CORRECCIÓN"
                corrected_count += 1
                
                # Mostrar información
                client_name = invoice.service_order.client.name[:23] if invoice.service_order and invoice.service_order.client else "N/A"
                print(f"{invoice.invoice_number:<20} {client_name:<25} ${old_balance:>12.2f} ${correct_balance:>12.2f} {status}")
                
                # Si no es dry run, guardar el cambio
                if not dry_run:
                    with transaction.atomic():
                        # Actualizar directamente el balance sin triggear el save completo
                        Invoice.objects.filter(pk=invoice.pk).update(balance=correct_balance)
                        
                        # Recalcular el estado basado en el nuevo balance
                        invoice.refresh_from_db()
                        if invoice.balance <= 0:
                            new_status = 'paid'
                        elif invoice.paid_amount > 0 and invoice.balance > 0:
                            new_status = 'partial'
                        elif invoice.credited_amount > 0 and invoice.balance > 0:
                            new_status = 'partial'
                        else:
                            new_status = invoice.status
                        
                        if invoice.status != new_status:
                            Invoice.objects.filter(pk=invoice.pk).update(status=new_status)
            else:
                status = "✅ YA CORRECTO"
                already_correct_count += 1
                
        except Exception as e:
            error_msg = f"Error en factura {invoice.invoice_number}: {str(e)}"
            errors.append(error_msg)
            print(f"{invoice.invoice_number:<20} {'ERROR':<25} {'-':<15} {'-':<15} ❌ ERROR")
    
    print("-" * 80)
    print()
    
    # Resumen
    print("=" * 80)
    print("RESUMEN")
    print("=" * 80)
    print(f"Total de facturas analizadas:     {total_invoices}")
    print(f"Facturas que necesitan corrección: {corrected_count}")
    print(f"Facturas ya correctas:            {already_correct_count}")
    print(f"Errores encontrados:              {len(errors)}")
    print()
    
    if errors:
        print("⚠️  ERRORES:")
        for error in errors:
            print(f"  - {error}")
        print()
    
    if dry_run and corrected_count > 0:
        print("⚠️  Para aplicar los cambios, ejecuta:")
        print("    python manage.py shell")
        print("    >>> from fix_retention_balances import fix_retention_balances")
        print("    >>> fix_retention_balances(dry_run=False)")
    elif not dry_run and corrected_count > 0:
        print("✅ Cambios aplicados exitosamente!")
    elif corrected_count == 0:
        print("✅ Todas las facturas ya tienen el balance correcto.")
    
    print("=" * 80)
    
    return {
        'total': total_invoices,
        'corrected': corrected_count,
        'already_correct': already_correct_count,
        'errors': len(errors)
    }


def show_detailed_invoice(invoice_number):
    """
    Muestra información detallada de una factura específica.
    Útil para debugging.
    """
    try:
        invoice = Invoice.objects.get(invoice_number=invoice_number)
        
        print("=" * 80)
        print(f"DETALLE DE FACTURA: {invoice.invoice_number}")
        print("=" * 80)
        print(f"Cliente:              {invoice.service_order.client.name if invoice.service_order else 'N/A'}")
        print(f"Fecha de emisión:     {invoice.issue_date}")
        print(f"Estado:               {invoice.get_status_display()}")
        print()
        print("MONTOS:")
        print(f"  Total factura:      ${invoice.total_amount:>12.2f}")
        print(f"  Retención (1%):     ${invoice.retencion:>12.2f}")
        print(f"  Pagado:             ${invoice.paid_amount:>12.2f}")
        print(f"  Acreditado (NC):    ${invoice.credited_amount:>12.2f}")
        print(f"  Balance actual:     ${invoice.balance:>12.2f}")
        print()
        
        # Calcular balance correcto
        correct_balance = invoice.total_amount - invoice.paid_amount - invoice.credited_amount
        print(f"  Balance correcto:   ${correct_balance:>12.2f}")
        
        if invoice.balance != correct_balance:
            print(f"  ❌ DIFERENCIA:      ${abs(invoice.balance - correct_balance):>12.2f}")
        else:
            print("  ✅ Balance correcto")
        
        print()
        print("PAGOS REGISTRADOS:")
        payments = invoice.payments.filter(is_deleted=False)
        if payments.exists():
            for payment in payments:
                method = payment.get_payment_method_display()
                if payment.payment_method == 'retencion':
                    ref = payment.numero_comprobante_retencion or 'N/A'
                else:
                    ref = payment.reference_number or 'N/A'
                print(f"  - {payment.payment_date} | {method:<25} | ${payment.amount:>10.2f} | Ref: {ref}")
        else:
            print("  (Sin pagos registrados)")
        
        print("=" * 80)
        
    except Invoice.DoesNotExist:
        print(f"❌ No se encontró la factura: {invoice_number}")


# Ejecutar automáticamente en modo dry run si se ejecuta directamente
if __name__ == '__main__':
    print()
    print("Ejecutando en modo DRY RUN (sin guardar cambios)...")
    print()
    fix_retention_balances(dry_run=True)
    print()
    print("Para aplicar los cambios, ejecuta:")
    print("  python manage.py shell")
    print("  >>> from fix_retention_balances import fix_retention_balances")
    print("  >>> fix_retention_balances(dry_run=False)")
    print()
