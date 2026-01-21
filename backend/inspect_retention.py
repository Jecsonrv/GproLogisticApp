import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import ServiceOrder, Invoice

def inspect_retention_issue():
    # Orden reportada por el usuario
    os_number_partial = "1541" 
    print(f"--- INSPECTING ORDER {os_number_partial} ---")
    
    # Buscar la orden
    orders = ServiceOrder.objects.filter(order_number__contains=os_number_partial)
    
    if not orders.exists():
        print(f"No order found containing '{os_number_partial}'")
        return

    for order in orders:
        print(f"\n> ORDER: {order.order_number} (ID: {order.id})")
        
        invoices = order.invoices.all()
        if not invoices.exists():
            print("  No invoices found.")
            continue
            
        for inv in invoices:
            print(f"  > INVOICE: {inv.invoice_number} (ID: {inv.id})")
            print(f"    Total Amount: {inv.total_amount}")
            print(f"    Paid Amount:  {inv.paid_amount}")
            print(f"    Balance:      {inv.balance}")
            
            # Inspect Retention with FULL precision
            # Formatear con muchos decimales para ver basura oculta
            ret_val = inv.retencion
            print(f"    RETENCION (DB): {ret_val}  <-- Valor actual")
            print(f"    RETENCION (Repr): {repr(ret_val)}")
            print(f"    RETENCION (Format .10f): {ret_val:.10f}")
            
            # Recalcular teórica
            base_gravada = sum(c.subtotal for c in inv.charges.filter(is_deleted=False, iva_type='gravado'))
            calc_ret = base_gravada * Decimal('0.01')
            
            print(f"    Base Gravada: {base_gravada}")
            print(f"    Calculada (1%): {calc_ret:.10f}")
            
            diff = ret_val - calc_ret
            if diff != 0:
                print(f"    DIFERENCIA DB vs CALC: {diff}")
            
            # Ver Pagos
            print("    Pagos registrados:")
            for p in inv.payments.filter(is_deleted=False):
                print(f"      - ID: {p.id} | Tipo: {p.payment_method} | Monto: {p.amount}")
                if p.payment_method == 'retencion':
                    print(f"        -> Comprobante Retención: {p.numero_comprobante_retencion}")

if __name__ == '__main__':
    inspect_retention_issue()
