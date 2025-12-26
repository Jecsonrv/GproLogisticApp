from django.core.management.base import BaseCommand
from apps.transfers.models import Transfer
from decimal import Decimal


class Command(BaseCommand):
    help = 'Sincroniza el estado de todos los transfers según su balance y paid_amount'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Iniciando sincronización de estados de transfers...'))

        transfers = Transfer.objects.all()
        total = transfers.count()
        fixed = 0
        errors = 0

        for transfer in transfers:
            try:
                old_status = transfer.status
                old_balance = transfer.balance
                old_paid = transfer.paid_amount

                # Recalcular balance
                transfer.balance = transfer.amount - transfer.paid_amount

                # Aplicar lógica de estado
                if transfer.balance <= 0 and transfer.amount > 0:
                    transfer.status = 'pagado'
                elif transfer.paid_amount > 0 and transfer.balance > 0:
                    transfer.status = 'parcial'
                elif transfer.status == 'pagado' and transfer.balance > 0:
                    if transfer.paid_amount > 0:
                        transfer.status = 'parcial'
                    else:
                        transfer.status = 'aprobado'
                elif transfer.paid_amount == 0 and transfer.status == 'parcial':
                    transfer.status = 'pendiente'

                # Guardar solo si hubo cambios
                if (old_status != transfer.status or
                    old_balance != transfer.balance or
                    old_paid != transfer.paid_amount):

                    # Evitar el save() completo que dispara validaciones
                    Transfer.objects.filter(pk=transfer.pk).update(
                        status=transfer.status,
                        balance=transfer.balance
                    )

                    fixed += 1
                    self.stdout.write(
                        f'  Transfer #{transfer.id}: {old_status} -> {transfer.status} '
                        f'(Pagado: ${old_paid}, Balance: ${old_balance} -> ${transfer.balance})'
                    )

            except Exception as e:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f'  Error en Transfer #{transfer.id}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(
                f'\nSincronización completada:\n'
                f'  Total: {total}\n'
                f'  Corregidos: {fixed}\n'
                f'  Errores: {errors}'
            )
        )
