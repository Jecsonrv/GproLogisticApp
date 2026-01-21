import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import ServiceOrder, Invoice

def analyze_1541():
    print("=== FORENSIC ANALYSIS OF OS 1541-2025 ===")
    
    # Try multiple patterns to find it
    orders = ServiceOrder.objects.filter(order_number__icontains="1541")
    
    if not orders.exists():
        print("!! No Service Order found with '1541' !!")
        # List recent orders to see format
        print("Recent orders:", list(ServiceOrder.objects.all().order_by('-id')[:5]))
        return

    for order in orders:
        print(f"\nORDER: {order.order_number} (ID: {order.id})")
        
        invoices = order.invoices.all()
        for inv in invoices:
            print(f"  INVOICE: {inv.invoice_number} (ID: {inv.id})")
            
            # Helper to print field details
            def dump_field(name, val):
                print(f"    {name:15}: {val} (Type: {type(val)})")
                if isinstance(val, Decimal):
                    print(f"       -> Exact: {val:.20f}")
            
            dump_field("Total Amount", inv.total_amount)
            dump_field("Paid Amount", inv.paid_amount)
            dump_field("Retencion", inv.retencion)
            dump_field("Balance", inv.balance)
            
            # Calculate manual balance
            manual_balance = inv.total_amount - inv.paid_amount - inv.credited_amount
            print(f"    Calculated Bal : {manual_balance:.20f}")
            
            if manual_balance != inv.balance:
                print("    [MISMATCH] Database Balance != Calculated Balance")
            else:
                print("    [MATCH] Database Balance is mathematically consistent")

            # Check charges sum
            charges_sum = sum(c.total for c in inv.charges.all())
            print(f"    Sum Charges    : {charges_sum:.20f}")
            
            if charges_sum != inv.total_amount:
                 print("    [MISMATCH] Invoice Total != Sum of Charges")

if __name__ == '__main__':
    analyze_1541()
