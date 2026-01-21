import os
import sys
import django
from decimal import Decimal, ROUND_HALF_UP

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import OrderCharge, Invoice
from apps.transfers.models import Transfer

def fix_root_decimals():
    print("=== ROOT CAUSE CLEANING: Rounding Charges & Transfers ===")
    
    # 1. Clean Charges
    print("\n--- Scanning Order Charges ---")
    charges = OrderCharge.objects.filter(is_deleted=False)
    charge_count = 0
    for c in charges:
        dirty = False
        # Check subtotal
        if c.subtotal != c.subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):
            c.subtotal = c.subtotal.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            dirty = True
        # Check IVA
        if c.iva_amount != c.iva_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):
            c.iva_amount = c.iva_amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            dirty = True
        # Check Total
        if c.total != c.total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):
            c.total = c.total.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            dirty = True
            
        if dirty:
            # Use update_fields to avoid triggering full save logic that might revert calculations
            c.save(update_fields=['subtotal', 'iva_amount', 'total'])
            charge_count += 1
            
    print(f"Fixed {charge_count} charges.")

    # 2. Clean Transfers (Expenses)
    print("\n--- Scanning Transfers (Expenses) ---")
    transfers = Transfer.objects.filter(is_deleted=False)
    transfer_count = 0
    for t in transfers:
        dirty = False
        if t.amount != t.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP):
            t.amount = t.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            dirty = True
            
        if dirty:
            t.save(update_fields=['amount'])
            transfer_count += 1
            
    print(f"Fixed {transfer_count} transfers.")

    # 3. Recalculate Invoices (The Grand Fix)
    print("\n--- Recalculating All Invoices ---")
    invoices = Invoice.objects.all()
    inv_count = 0
    
    for inv in invoices:
        # Force recalculation of totals from the now-clean items
        # calculate_totals() sums the items and saves
        try:
            old_balance = inv.balance
            inv.calculate_totals()
            
            # Check if balance changed (indicates fix)
            if inv.balance != old_balance:
                print(f"Invoice {inv.invoice_number}: Balance corrected {old_balance} -> {inv.balance}")
                inv_count += 1
        except Exception as e:
            print(f"Error recalculating invoice {inv.id}: {e}")

    print(f"\n=== FINAL SUMMARY ===")
    print(f"Charges cleaned: {charge_count}")
    print(f"Transfers cleaned: {transfer_count}")
    print(f"Invoices corrected: {inv_count}")

if __name__ == '__main__':
    fix_root_decimals()
