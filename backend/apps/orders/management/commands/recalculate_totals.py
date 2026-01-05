from django.core.management.base import BaseCommand
from apps.orders.models import Invoice
from django.db import transaction

class Command(BaseCommand):
    help = 'Recalculate totals for all invoices'

    def handle(self, *args, **options):
        invoices = Invoice.objects.all()
        count = invoices.count()
        
        self.stdout.write(f'Found {count} invoices. Starting recalculation...')
        
        updated = 0
        for invoice in invoices:
            try:
                # Calculate totals using the model method which saves the instance
                invoice.calculate_totals()
                updated += 1
                if updated % 100 == 0:
                    self.stdout.write(f'Processed {updated}/{count} invoices...')
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error processing invoice {invoice.id}: {str(e)}'))

        self.stdout.write(self.style.SUCCESS(f'Successfully recalculated totals for {updated} invoices.'))
