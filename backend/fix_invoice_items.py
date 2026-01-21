import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Invoice, OrderCharge, PaymentItemAllocation

def fix_invoice_items():
    print("=== FIXING INVOICE ITEMS (OS 1541) ===")
    
    # Buscar la factura específica
    invoice = Invoice.objects.filter(service_order__order_number__contains="1541").first()
    
    if not invoice:
        print("Invoice not found")
        return

    print(f"Invoice: {invoice.invoice_number}")
    
    # 1. Clean Charges (Servicios)
    print("\n--- Cleaning Services (Charges) ---")
    charges = invoice.charges.all()
    for c in charges:
        old_total = c.total
        # Round everything
        c.unit_price = c.unit_price.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        c.subtotal = c.subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        c.iva_amount = c.iva_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        c.total = c.total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        if c.total != old_total:
            print(f"  Fixing Charge {c.service.name}: {old_total} -> {c.total}")
            c.save()
        else:
            print(f"  Charge {c.service.name} OK: {c.total}")

    # 2. Clean Allocations (Pagos por item ya hechos)
    print("\n--- Cleaning Payment Allocations ---")
    allocations = PaymentItemAllocation.objects.filter(payment__invoice=invoice)
    for a in allocations:
        old_amount = a.amount
        a.amount = a.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        if a.amount != old_amount:
            print(f"  Fixing Allocation {a.id}: {old_amount:.20f} -> {a.amount}")
            a.save()
        else:
            # Check hidden decimals
            if abs(a.amount - old_amount) > 0:
                 print(f"  Fixing HIDDEN decimals in Allocation {a.id}")
                 a.save()

    print("\nDone. Please try the payment again.")

if __name__ == '__main__':
    fix_invoice_items()
