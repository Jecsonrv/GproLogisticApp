"""
Management command to clear all development data except users.
Usage: python manage.py clear_dev_data
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from apps.orders.models import ServiceOrder, Invoice, InvoicePayment, CreditNote
from apps.transfers.models import Transfer
from apps.clients.models import Client
from apps.catalogs.models import (
    Service, Provider, CustomsAgent, Bank, 
    ShipmentType, SubClient, ClientServicePrice
)


class Command(BaseCommand):
    help = 'Clear all development data except users (for testing purposes)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Skip confirmation prompt',
        )

    def handle(self, *args, **options):
        if not options['yes']:
            self.stdout.write(self.style.WARNING(
                '\n⚠️  ADVERTENCIA: Esta operación eliminará TODOS los datos excepto usuarios.\n'
            ))
            self.stdout.write('Se eliminarán:')
            self.stdout.write('  - Facturas y pagos')
            self.stdout.write('  - Órdenes de servicio')
            self.stdout.write('  - Transferencias')
            self.stdout.write('  - Clientes')
            self.stdout.write('  - Catálogos (servicios, proveedores, agentes, bancos, etc.)')
            self.stdout.write('\nSe CONSERVARÁN:')
            self.stdout.write('  - Usuarios\n')
            
            confirm = input('¿Está seguro que desea continuar? (escriba "SI" para confirmar): ')
            if confirm != 'SI':
                self.stdout.write(self.style.ERROR('Operación cancelada.'))
                return

        self.stdout.write('\n🔄 Iniciando limpieza de datos...\n')

        try:
            from django.db import connection
            
            # Contar antes de eliminar
            credit_notes_count = CreditNote.objects.count()
            payments_count = InvoicePayment.objects.count()
            invoices_count = Invoice.objects.count()
            transfers_count = Transfer.objects.count()
            orders_count = ServiceOrder.objects.count()
            clients_count = Client.objects.count()
            prices_count = ClientServicePrice.objects.count()
            services_count = Service.objects.count()
            subclients_count = SubClient.objects.count()
            shipment_types_count = ShipmentType.objects.count()
            banks_count = Bank.objects.count()
            agents_count = CustomsAgent.objects.count()
            providers_count = Provider.objects.count()
            
            # Disable FKs before transaction for SQLite
            if connection.vendor == 'sqlite':
                cursor = connection.cursor()
                cursor.execute('PRAGMA foreign_keys = OFF;')

            try:
                with transaction.atomic():
                    # 1. Facturas y pagos (debe ir primero por foreign keys)
                    CreditNote.objects.all().delete()
                    self.stdout.write(f'  ✓ Notas de crédito eliminadas: {credit_notes_count}')

                    InvoicePayment.objects.all().delete()
                    self.stdout.write(f'  ✓ Pagos eliminados: {payments_count}')

                    Invoice.objects.all().delete()
                    self.stdout.write(f'  ✓ Facturas eliminadas: {invoices_count}')

                    # 2. Transferencias
                    Transfer.objects.all().delete()
                    self.stdout.write(f'  ✓ Transferencias eliminadas: {transfers_count}')

                    # 3. Órdenes de servicio
                    ServiceOrder.objects.all().delete()
                    self.stdout.write(f'  ✓ Órdenes de servicio eliminadas: {orders_count}')

                    # 4. Dependencias de Clientes
                    ClientServicePrice.objects.all().delete()
                    self.stdout.write(f'  ✓ Precios personalizados eliminados: {prices_count}')

                    SubClient.objects.all().delete()
                    self.stdout.write(f'  ✓ Sub-clientes eliminados: {subclients_count}')
                    
                    # 5. Clientes
                    Client.objects.all().delete()
                    self.stdout.write(f'  ✓ Clientes eliminados: {clients_count}')

                    # 6. Catálogos
                    Service.objects.all().delete()
                    self.stdout.write(f'  ✓ Servicios eliminados: {services_count}')

                    ShipmentType.objects.all().delete()
                    self.stdout.write(f'  ✓ Tipos de embarque eliminados: {shipment_types_count}')

                    Bank.objects.all().delete()
                    self.stdout.write(f'  ✓ Bancos eliminados: {banks_count}')

                    CustomsAgent.objects.all().delete()
                    self.stdout.write(f'  ✓ Agentes aduanales eliminados: {agents_count}')

                    Provider.objects.all().delete()
                    self.stdout.write(f'  ✓ Proveedores eliminados: {providers_count}')
            
            finally:
                # Re-enable FKs
                if connection.vendor == 'sqlite':
                    cursor.execute('PRAGMA foreign_keys = ON;')

            self.stdout.write(self.style.SUCCESS(
                f'\n✅ Limpieza completada exitosamente.\n'
            ))
            
            total_deleted = (
                credit_notes_count + payments_count + invoices_count + 
                transfers_count + orders_count + clients_count + prices_count +
                services_count + subclients_count + shipment_types_count + 
                banks_count + agents_count + providers_count
            )
            self.stdout.write(f'Total de registros eliminados: {total_deleted}')

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n❌ Error durante la limpieza: {e}\n'))
            raise
