"""
Comando de gestión para generar notificaciones automáticas del sistema.
Analiza facturas vencidas, límites de crédito y otras alertas.

Uso:
    python manage.py generate_notifications
    python manage.py generate_notifications --user admin  # Solo para un usuario
    python manage.py generate_notifications --dry-run     # Solo mostrar, no crear
"""
from django.core.management.base import BaseCommand
from django.db.models import Sum, Q
from django.utils import timezone
from datetime import timedelta
from apps.users.models import User, Notification
from apps.orders.models import Invoice
from apps.clients.models import Client
from apps.transfers.models import Transfer


class Command(BaseCommand):
    help = 'Genera notificaciones automáticas basadas en el estado del sistema'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username específico para generar notificaciones (por defecto: todos los admins)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostrar notificaciones que se crearían sin crearlas realmente'
        )
        parser.add_argument(
            '--clear-old',
            action='store_true',
            help='Eliminar notificaciones leídas con más de 30 días'
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        clear_old = options['clear_old']
        username = options.get('user')

        self.stdout.write(self.style.NOTICE('Analizando estado del sistema...'))
        
        # Limpiar notificaciones antiguas si se solicita
        if clear_old:
            old_date = timezone.now() - timedelta(days=30)
            deleted, _ = Notification.objects.filter(
                is_read=True,
                created_at__lt=old_date
            ).delete()
            self.stdout.write(self.style.SUCCESS(f'✓ Eliminadas {deleted} notificaciones antiguas'))

        # Determinar usuarios objetivo
        if username:
            users = User.objects.filter(username=username, is_active=True)
            if not users.exists():
                self.stdout.write(self.style.ERROR(f'Usuario "{username}" no encontrado'))
                return
        else:
            # Por defecto, notificar a administradores
            users = User.objects.filter(role='admin', is_active=True)
        
        if not users.exists():
            self.stdout.write(self.style.WARNING('No hay usuarios para notificar'))
            return

        today = timezone.now().date()
        notifications_created = 0

        # 1. Facturas vencidas
        self.stdout.write('  → Verificando facturas vencidas...')
        overdue_invoices = Invoice.objects.filter(
            due_date__lt=today,
            balance__gt=0
        ).exclude(status='paid')

        for invoice in overdue_invoices:
            days_overdue = (today - invoice.due_date).days
            client_name = invoice.service_order.client.name if invoice.service_order and invoice.service_order.client else 'N/A'
            
            # Evitar duplicados - verificar si ya existe notificación similar reciente
            existing = Notification.objects.filter(
                notification_type='error',
                category='invoice',
                metadata__invoice_id=invoice.id,
                created_at__gte=timezone.now() - timedelta(days=1)
            ).exists()
            
            if existing:
                continue

            severity = 'error' if days_overdue > 15 else 'warning'
            
            for user in users:
                if dry_run:
                    self.stdout.write(f'    [DRY-RUN] Factura {invoice.invoice_number} vencida ({days_overdue} días) - {client_name}')
                else:
                    Notification.create_notification(
                        user=user,
                        title=f'Factura Vencida: {invoice.invoice_number}',
                        message=f'La factura {invoice.invoice_number} del cliente {client_name} tiene {days_overdue} días de vencida. Saldo pendiente: ${invoice.balance:.2f}',
                        notification_type=severity,
                        category='invoice',
                        related_object=invoice,
                        metadata={
                            'invoice_id': invoice.id,
                            'invoice_number': invoice.invoice_number,
                            'days_overdue': days_overdue,
                            'balance': float(invoice.balance),
                            'client_name': client_name
                        }
                    )
                    notifications_created += 1

        # 2. Facturas próximas a vencer (7 días)
        self.stdout.write('  → Verificando facturas por vencer...')
        upcoming_invoices = Invoice.objects.filter(
            due_date__gte=today,
            due_date__lte=today + timedelta(days=7),
            balance__gt=0
        ).exclude(status='paid')

        for invoice in upcoming_invoices:
            days_until_due = (invoice.due_date - today).days
            client_name = invoice.service_order.client.name if invoice.service_order and invoice.service_order.client else 'N/A'
            
            existing = Notification.objects.filter(
                notification_type='warning',
                category='invoice',
                metadata__invoice_id=invoice.id,
                metadata__alert_type='upcoming',
                created_at__gte=timezone.now() - timedelta(days=3)
            ).exists()
            
            if existing:
                continue

            for user in users:
                if dry_run:
                    self.stdout.write(f'    [DRY-RUN] Factura {invoice.invoice_number} vence en {days_until_due} días - {client_name}')
                else:
                    Notification.create_notification(
                        user=user,
                        title=f'Factura por Vencer: {invoice.invoice_number}',
                        message=f'La factura {invoice.invoice_number} del cliente {client_name} vence en {days_until_due} días. Saldo: ${invoice.balance:.2f}',
                        notification_type='warning',
                        category='invoice',
                        related_object=invoice,
                        metadata={
                            'invoice_id': invoice.id,
                            'invoice_number': invoice.invoice_number,
                            'days_until_due': days_until_due,
                            'balance': float(invoice.balance),
                            'client_name': client_name,
                            'alert_type': 'upcoming'
                        }
                    )
                    notifications_created += 1

        # 3. Clientes cerca del límite de crédito
        self.stdout.write('  → Verificando límites de crédito...')
        for client in Client.objects.filter(payment_condition='credito', is_active=True, credit_limit__gt=0):
            credit_used = Invoice.objects.filter(
                service_order__client=client,
                balance__gt=0
            ).exclude(status='paid').aggregate(Sum('balance'))['balance__sum'] or 0

            if client.credit_limit > 0:
                credit_percentage = (float(credit_used) / float(client.credit_limit)) * 100

                if credit_percentage >= 80:
                    existing = Notification.objects.filter(
                        notification_type__in=['warning', 'error'],
                        category='client',
                        metadata__client_id=client.id,
                        metadata__alert_type='credit_limit',
                        created_at__gte=timezone.now() - timedelta(days=7)
                    ).exists()
                    
                    if existing:
                        continue

                    severity = 'error' if credit_percentage >= 95 else 'warning'
                    
                    for user in users:
                        if dry_run:
                            self.stdout.write(f'    [DRY-RUN] Cliente {client.name} al {credit_percentage:.0f}% de crédito')
                        else:
                            Notification.create_notification(
                                user=user,
                                title=f'Límite de Crédito: {client.name}',
                                message=f'El cliente {client.name} ha utilizado el {credit_percentage:.0f}% de su límite de crédito (${credit_used:.2f} de ${client.credit_limit:.2f})',
                                notification_type=severity,
                                category='client',
                                related_object=client,
                                metadata={
                                    'client_id': client.id,
                                    'client_name': client.name,
                                    'credit_used': float(credit_used),
                                    'credit_limit': float(client.credit_limit),
                                    'credit_percentage': round(credit_percentage, 1),
                                    'alert_type': 'credit_limit'
                                }
                            )
                            notifications_created += 1

        # 4. Transferencias pendientes de pago
        self.stdout.write('  → Verificando transferencias pendientes...')
        pending_count = Transfer.objects.filter(status='provisionada').count()
        pending_amount = Transfer.objects.filter(status='provisionada').aggregate(Sum('amount'))['amount__sum'] or 0

        if pending_count > 0:
            existing = Notification.objects.filter(
                notification_type='info',
                category='payment',
                metadata__alert_type='pending_transfers',
                created_at__gte=timezone.now() - timedelta(days=1)
            ).exists()
            
            if not existing:
                for user in users:
                    if dry_run:
                        self.stdout.write(f'    [DRY-RUN] {pending_count} transferencias pendientes por ${pending_amount:.2f}')
                    else:
                        Notification.create_notification(
                            user=user,
                            title=f'Pagos Pendientes a Proveedores',
                            message=f'Hay {pending_count} transferencias pendientes de pago por un total de ${pending_amount:.2f}',
                            notification_type='info',
                            category='payment',
                            metadata={
                                'pending_count': pending_count,
                                'pending_amount': float(pending_amount),
                                'alert_type': 'pending_transfers'
                            }
                        )
                        notifications_created += 1

        # Resumen
        if dry_run:
            self.stdout.write(self.style.WARNING(f'\n[DRY-RUN] Se habrían creado notificaciones para {users.count()} usuario(s)'))
        else:
            self.stdout.write(self.style.SUCCESS(f'\n✓ Se crearon {notifications_created} notificaciones'))
