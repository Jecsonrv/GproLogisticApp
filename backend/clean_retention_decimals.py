import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Invoice

def clean_retention_decimals():
    print("=== Cleaning Retention Decimals ===")
    
    # Buscar facturas con retención
    invoices = Invoice.objects.filter(retencion__gt=0)
    print(f"Checking {invoices.count()} invoices with retention...")
    
    fixed_count = 0
    
    for inv in invoices:
        current_val = inv.retencion
        rounded_val = current_val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        if current_val != rounded_val:
            print(f"Fixing Invoice {inv.invoice_number}: {current_val} -> {rounded_val}")
            inv.retencion = rounded_val
            # Usamos update_fields para ser eficientes y evitar efectos secundarios
            inv.save(update_fields=['retencion'])
            fixed_count += 1
            
    print(f"\nDone. Fixed {fixed_count} invoices.")

if __name__ == '__main__':
    clean_retention_decimals()
