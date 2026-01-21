import os
import sys
import django
from django.core.files.base import ContentFile
from django.conf import settings

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.orders.models import Invoice
from apps.orders.pdf_generator import generate_invoice_pdf

def fix_missing_pdfs():
    print("=== Invoice PDF Integrity Check & Fix Tool ===")
    print(f"Database: {settings.DATABASES['default']['ENGINE']}")
    print(f"Storage: {settings.DEFAULT_FILE_STORAGE if hasattr(settings, 'DEFAULT_FILE_STORAGE') else 'Default (Local)'}")
    
    # Get all invoices that supposedly have a PDF
    invoices = Invoice.objects.exclude(pdf_file='').exclude(pdf_file__isnull=True)
    total = invoices.count()
    print(f"Checking {total} invoices...")
    
    fixed_count = 0
    error_count = 0
    
    for invoice in invoices:
        try:
            # Check if file exists in storage
            if not invoice.pdf_file.storage.exists(invoice.pdf_file.name):
                print(f"[MISSING] Invoice {invoice.invoice_number} | File: {invoice.pdf_file.name}")
                
                print(f"   -> Regenerating PDF...")
                pdf_buffer = generate_invoice_pdf(invoice)
                
                # Keep original filename if possible, looking at the basename
                filename = os.path.basename(invoice.pdf_file.name)
                if not filename:
                    filename = f"Invoice_{invoice.invoice_number}.pdf"
                
                # Save (this uploads to S3)
                # We use save=True to commit to DB, although path shouldn't change much
                invoice.pdf_file.save(filename, ContentFile(pdf_buffer.getvalue()), save=True)
                print(f"   -> [FIXED] Uploaded new PDF as {invoice.pdf_file.name}")
                fixed_count += 1
            else:
                # print(f"[OK] Invoice {invoice.invoice_number}")
                pass
                
        except Exception as e:
            print(f"   -> [ERROR] Failed to fix Invoice {invoice.invoice_number}: {e}")
            error_count += 1

    print("\n=== Summary ===")
    print(f"Total checked: {total}")
    print(f"Fixed: {fixed_count}")
    print(f"Errors: {error_count}")

if __name__ == '__main__':
    fix_missing_pdfs()