import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Invoice

def fix_all_decimals():
    print("=== DEEP CLEANING: Rounding ALL monetary fields to 2 decimals ===")
    
    # Campos a limpiar
    MONETARY_FIELDS = [
        'subtotal_services', 'iva_services', 'total_services',
        'subtotal_third_party', 'iva_third_party', 'total_third_party',
        'subtotal_neto', 'iva_total',
        'retencion',
        'total_amount', 'paid_amount', 'credited_amount', 'balance'
    ]
    
    invoices = Invoice.objects.all()
    print(f"Scanning {invoices.count()} invoices...")
    
    fixed_count = 0
    total_fields_fixed = 0
    
    for inv in invoices:
        needs_save = False
        updates = []
        
        for field in MONETARY_FIELDS:
            # Obtener valor, manejar si el campo no existe (aunque deberían estar)
            if not hasattr(inv, field):
                continue
                
            val = getattr(inv, field)
            if val is None:
                continue
                
            # Redondear
            rounded = val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            
            # Comparar
            if val != rounded:
                updates.append(f"{field}: {val} -> {rounded}")
                setattr(inv, field, rounded)
                needs_save = True
                total_fields_fixed += 1
        
        if needs_save:
            print(f"Fixing Invoice {inv.invoice_number} (ID: {inv.id}):")
            for u in updates:
                print(f"  - {u}")
            
            # Recalcular balance matemáticamente para asegurar consistencia
            # Balance = Total - Pagado - Acreditado
            new_balance = inv.total_amount - inv.paid_amount - inv.credited_amount
            # Aplicar retención (se paga aparte, no resta balance directo en lógica GPRO según entendí, 
            # pero el código original decía balance = total - paid - credited)
            
            if inv.balance != new_balance:
                print(f"  - Recalculating Balance Consistency: {inv.balance} -> {new_balance}")
                inv.balance = new_balance
            
            inv.save()
            fixed_count += 1
            print("  [SAVED]")

    print(f"\n=== Summary ===")
    print(f"Invoices scanned: {invoices.count()}")
    print(f"Invoices fixed: {fixed_count}")
    print(f"Total fields corrected: {total_fields_fixed}")

if __name__ == '__main__':
    fix_all_decimals()
