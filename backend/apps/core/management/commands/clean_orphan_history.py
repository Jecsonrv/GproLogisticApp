from django.core.management.base import BaseCommand
from apps.orders.models import OrderHistory, ServiceOrder

class Command(BaseCommand):
    help = 'Limpia registros huérfanos de OrderHistory'

    def handle(self, *args, **options):
        # Obtener todos los IDs válidos de ServiceOrder
        valid_ids = set(ServiceOrder.all_objects.values_list('id', flat=True))

        # Obtener todos los OrderHistory
        all_history = OrderHistory.objects.all()

        # Encontrar huérfanos
        orphans_count = 0
        for history in all_history:
            if history.service_order_id not in valid_ids:
                self.stdout.write(f'Eliminando huérfano: OrderHistory ID={history.id}, service_order_id={history.service_order_id}')
                history.delete()
                orphans_count += 1

        self.stdout.write(self.style.SUCCESS(f'Se eliminaron {orphans_count} registros huérfanos'))
