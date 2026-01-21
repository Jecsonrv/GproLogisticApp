import os
import sys
import django

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Invoice

def force_save_invoices():
    print("=== Forcing SAVE on all invoices to trigger rounding logic ===")
    
    invoices = Invoice.objects.all()
    count = invoices.count()
    print(f"Processing {count} invoices...")
    
    processed = 0
    for inv in invoices:
        try:
            # Calling save() triggers the new rounding logic in models.py
            # We don't need to change values manually, save() does it.
            inv.save()
            processed += 1
            if processed % 50 == 0:
                print(f"  Processed {processed}/{count}...")
        except Exception as e:
            print(f"Error saving invoice {inv.invoice_number} (ID {inv.id}): {e}")
            
    print(f"\nDone. Successfully saved {processed} invoices.")

if __name__ == '__main__':
    force_save_invoices()
