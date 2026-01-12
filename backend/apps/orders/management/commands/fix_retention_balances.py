"""
Django Management Command: Corregir Balances de Facturas con Retención

USO:
    # Ver qué cambiaría (dry run):
    python manage.py fix_retention_balances

    # Aplicar los cambios:
    python manage.py fix_retention_balances --apply

    # Ver detalle de una factura específica:
    python manage.py fix_retention_balances --detail PRE-00123-2025
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal
from apps.orders.models import Invoice


class Command(BaseCommand):
    help = 'Corrige los balances de facturas con retención (bug de doble resta)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Aplicar los cambios (por defecto solo muestra qué cambiaría)',
        )
        parser.add_argument(
            '--detail',
            type=str,
            help='Mostrar detalle de una factura específica',
        )

    def handle(self, *args, **options):
        # Si se solicita detalle de una factura
        if options['detail']:
            self.show_invoice_detail(options['detail'])
            return

        dry_run = not options['apply']
        
        self.stdout.write("=" * 80)
        self.stdout.write(self.style.SUCCESS("CORRECCIÓN: Balances de Facturas con Retención"))
        self.stdout.write("=" * 80)
        self.stdout.write("")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("⚠️  MODO DRY RUN - No se guardarán cambios"))
            self.stdout.write(self.style.WARNING("    Para aplicar cambios, usa: --apply"))
        else:
            self.stdout.write(self.style.ERROR("🔴 MODO PRODUCCIÓN - Se guardarán cambios"))
        
        self.stdout.write("")
        
        # Obtener facturas con retención
        invoices_with_retention = Invoice.objects.filter(
            retencion__gt=Decimal('0.00')
        ).select_related('service_order__client')
        
        total_invoices = invoices_with_retention.count()
        self.stdout.write(f"📊 Facturas con retención: {total_invoices}")
        self.stdout.write("")
        
        if total_invoices == 0:
            self.stdout.write(self.style.SUCCESS("✅ No hay facturas con retención"))
            return
        
        # Contadores
        corrected_count = 0
        already_correct_count = 0
        errors = []
        
        self.stdout.write("-" * 80)
        self.stdout.write(f"{'Factura':<20} {'Cliente':<25} {'Balance Viejo':<15} {'Balance Nuevo':<15} {'Estado'}")
        self.stdout.write("-" * 80)
        
        for invoice in invoices_with_retention:
            try:
                old_balance = invoice.balance
                correct_balance = invoice.total_amount - invoice.paid_amount - invoice.credited_amount
                
                if old_balance != correct_balance:
                    corrected_count += 1
                    client_name = invoice.service_order.client.name[:23] if invoice.service_order and invoice.service_order.client else "N/A"
                    
                    self.stdout.write(
                        f"{invoice.invoice_number:<20} "
                        f"{client_name:<25} "
                        f"${old_balance:>12.2f} "
                        f"${correct_balance:>12.2f} "
                        f"{self.style.ERROR('❌ CORREGIR')}"
                    )
                    
                    if not dry_run:
                        with transaction.atomic():
                            # Actualizar balance
                            Invoice.objects.filter(pk=invoice.pk).update(balance=correct_balance)
                            
                            # Recalcular estado
                            invoice.refresh_from_db()
                            if invoice.balance <= 0:
                                new_status = 'paid'
                            elif invoice.paid_amount > 0 and invoice.balance > 0:
                                new_status = 'partial'
                            elif invoice.credited_amount > 0 and invoice.balance > 0:
                                new_status = 'partial'
                            else:
                                new_status = invoice.status
                            
                            if invoice.status != new_status:
                                Invoice.objects.filter(pk=invoice.pk).update(status=new_status)
                else:
                    already_correct_count += 1
                    
            except Exception as e:
                error_msg = f"Error en {invoice.invoice_number}: {str(e)}"
                errors.append(error_msg)
                self.stdout.write(
                    f"{invoice.invoice_number:<20} "
                    f"{'ERROR':<25} "
                    f"{'-':<15} {'-':<15} "
                    f"{self.style.ERROR('❌ ERROR')}"
                )
        
        self.stdout.write("-" * 80)
        self.stdout.write("")
        
        # Resumen
        self.stdout.write("=" * 80)
        self.stdout.write("RESUMEN")
        self.stdout.write("=" * 80)
        self.stdout.write(f"Total analizadas:     {total_invoices}")
        self.stdout.write(f"Necesitan corrección:  {corrected_count}")
        self.stdout.write(f"Ya correctas:         {already_correct_count}")
        self.stdout.write(f"Errores:              {len(errors)}")
        self.stdout.write("")
        
        if errors:
            self.stdout.write(self.style.ERROR("⚠️  ERRORES:"))
            for error in errors:
                self.stdout.write(f"  - {error}")
            self.stdout.write("")
        
        if dry_run and corrected_count > 0:
            self.stdout.write(self.style.WARNING("⚠️  Para aplicar los cambios:"))
            self.stdout.write(self.style.WARNING("    python manage.py fix_retention_balances --apply"))
        elif not dry_run and corrected_count > 0:
            self.stdout.write(self.style.SUCCESS("✅ Cambios aplicados exitosamente!"))
        elif corrected_count == 0:
            self.stdout.write(self.style.SUCCESS("✅ Todas las facturas correctas"))
        
        self.stdout.write("=" * 80)

    def show_invoice_detail(self, invoice_number):
        """Muestra detalle de una factura específica"""
        try:
            invoice = Invoice.objects.get(invoice_number=invoice_number)
            
            self.stdout.write("=" * 80)
            self.stdout.write(self.style.SUCCESS(f"DETALLE: {invoice.invoice_number}"))
            self.stdout.write("=" * 80)
            self.stdout.write(f"Cliente:          {invoice.service_order.client.name if invoice.service_order else 'N/A'}")
            self.stdout.write(f"Fecha:            {invoice.issue_date}")
            self.stdout.write(f"Estado:           {invoice.get_status_display()}")
            self.stdout.write("")
            self.stdout.write("MONTOS:")
            self.stdout.write(f"  Total:          ${invoice.total_amount:>12.2f}")
            self.stdout.write(f"  Retención:      ${invoice.retencion:>12.2f}")
            self.stdout.write(f"  Pagado:         ${invoice.paid_amount:>12.2f}")
            self.stdout.write(f"  Acreditado:     ${invoice.credited_amount:>12.2f}")
            self.stdout.write(f"  Balance actual: ${invoice.balance:>12.2f}")
            self.stdout.write("")
            
            correct_balance = invoice.total_amount - invoice.paid_amount - invoice.credited_amount
            self.stdout.write(f"  Balance correcto: ${correct_balance:>12.2f}")
            
            if invoice.balance != correct_balance:
                diff = abs(invoice.balance - correct_balance)
                self.stdout.write(self.style.ERROR(f"  ❌ DIFERENCIA:    ${diff:>12.2f}"))
            else:
                self.stdout.write(self.style.SUCCESS("  ✅ Balance correcto"))
            
            self.stdout.write("")
            self.stdout.write("PAGOS:")
            payments = invoice.payments.filter(is_deleted=False)
            if payments.exists():
                for p in payments:
                    method = p.get_payment_method_display()
                    ref = p.numero_comprobante_retencion if p.payment_method == 'retencion' else p.reference_number
                    self.stdout.write(f"  - {p.payment_date} | {method:<20} | ${p.amount:>10.2f} | {ref or 'N/A'}")
            else:
                self.stdout.write("  (Sin pagos)")
            
            self.stdout.write("=" * 80)
            
        except Invoice.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Factura no encontrada: {invoice_number}"))
