import os
import sys
import django
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import ServiceOrder, Invoice, InvoicePayment

def analyze_1541_payments():
    print("=== PAYMENT ANALYSIS FOR OS 1541 ===")
    
    orders = ServiceOrder.objects.filter(order_number__icontains="1541")
    for order in orders:
        invoices = order.invoices.all()
        for inv in invoices:
            print(f"\nINVOICE: {inv.invoice_number}")
            print(f"  Total: {inv.total_amount}")
            print(f"  Paid (Header): {inv.paid_amount}")
            
            print("  --- PAYMENTS DETAILS ---")
            payments = InvoicePayment.objects.filter(invoice=inv) # Include deleted? .all_objects?
            # Let's check active payments first
            sum_payments = Decimal(0)
            for p in payments:
                print(f"    ID: {p.id} | Method: {p.payment_method} | Amount: {p.amount:.20f}")
                sum_payments += p.amount
            
            print(f"  Sum of Active Payments: {sum_payments:.20f}")
            
            diff = inv.paid_amount - sum_payments
            if diff != 0:
                print(f"  [CRITICAL] Header Paid ({inv.paid_amount}) != Sum Payments ({sum_payments})")
                print(f"  Difference: {diff}")
                print("  -> Running fix...")
                inv.paid_amount = sum_payments
                inv.save()
                print("  -> Fixed.")

if __name__ == '__main__':
    analyze_1541_payments()