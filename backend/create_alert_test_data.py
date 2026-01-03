
"""
Script para generar datos de prueba específicos para el sistema de alertas del Dashboard.
"""
import os
import django
from datetime import timedelta
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.clients.models import Client
from apps.catalogs.models import Provider, ShipmentType
from apps.orders.models import ServiceOrder, Invoice
from apps.transfers.models import Transfer
from django.utils import timezone

def create_alert_data():
    print("=" * 60)
    print("GENERANDO DATOS DE PRUEBA PARA ALERTAS")
    print("=" * 60)

    # 1. Setup Base Data
    admin_user = User.objects.filter(role='admin').first()
    if not admin_user:
        admin_user = User.objects.create_superuser('admin_test', 'admin@test.com', 'admin123')

    client, _ = Client.objects.get_or_create(
        name="Cliente Alertas S.A.",
        defaults={
            'nit': '9999-999999-999-9',
            'email': 'alertas@cliente.com',
            'credit_days': 30,
            'payment_condition': 'credito'
        }
    )

    provider, _ = Provider.objects.get_or_create(
        name="Proveedor Alertas Inc.",
        defaults={'email': 'prov@alertas.com'}
    )

    ship_type, _ = ShipmentType.objects.get_or_create(name="Aéreo", code="AIR")

    today = timezone.now().date()

    # ==========================================
    # 2. OPERATIONAL ALERTS (Logistics)
    # ==========================================
    
    # 2.1 ETA Soon (Llega mañana)
    os_soon = ServiceOrder.objects.create(
        order_number=f"OS-SOON-{today.strftime('%m%d')}",
        client=client,
        shipment_type=ship_type,
        status='en_transito',
        eta=today + timedelta(days=1),
        created_by=admin_user,
        duca="DUCA-SOON",
        notes="Esta orden debería aparecer como 'Llega mañana'"
    )
    print(f"✓ Creada Alerta ETA Próximo: {os_soon.order_number}")

    # 2.2 ETA Missed (Venció ayer)
    os_missed = ServiceOrder.objects.create(
        order_number=f"OS-LATE-{today.strftime('%m%d')}",
        client=client,
        shipment_type=ship_type,
        status='en_transito',
        eta=today - timedelta(days=5),
        created_by=admin_user,
        duca="DUCA-LATE",
        notes="Esta orden debería aparecer como 'ETA Vencido'"
    )
    print(f"✓ Creada Alerta ETA Vencido: {os_missed.order_number}")

    # ==========================================
    # 3. ADMINISTRATIVE ALERTS
    # ==========================================

    # 3.1 Closure Pending (Finalizada hace 10 días pero no cerrada)
    old_date = timezone.now() - timedelta(days=10)
    os_closure = ServiceOrder.objects.create(
        order_number=f"OS-CLOSE-{today.strftime('%m%d')}",
        client=client,
        shipment_type=ship_type,
        status='finalizada',
        eta=old_date.date(),
        created_by=admin_user,
        duca="DUCA-CLOSE"
    )
    # Forzar fechas antiguas
    os_closure.updated_at = old_date
    os_closure.save() # Note: auto_now=True might reset updated_at on save, requires careful handling or raw update if strict
    
    # Hack to force updated_at in Django with auto_now
    ServiceOrder.objects.filter(id=os_closure.id).update(updated_at=old_date)
    
    print(f"✓ Creada Alerta Cierre Pendiente: {os_closure.order_number}")

    # ==========================================
    # 4. FINANCIAL ALERTS (CXC)
    # ==========================================

    # 4.1 Overdue Invoice
    # Create an invoice associated with an OS
    inv_overdue = Invoice.objects.create(
        service_order=os_missed, # Reuse an order
        invoice_number=f"INV-OLD-{today.strftime('%m%d')}",
        invoice_type='DTE',
        issue_date=today - timedelta(days=45),
        due_date=today - timedelta(days=15),
        total_amount=Decimal('1500.00'),
        balance=Decimal('1500.00'),
        status='overdue',
        created_by=admin_user
    )
    print(f"✓ Creada Alerta Factura Vencida: {inv_overdue.invoice_number}")

    # ==========================================
    # 5. PAYABLE ALERTS (CXP)
    # ==========================================

    # 5.1 Stale Payment (Approved > 20 days ago)
    transfer_stale = Transfer.objects.create(
        service_order=os_soon,
        transfer_type='cargos',
        amount=Decimal('500.00'),
        balance=Decimal('500.00'),
        status='aprobado',
        provider=provider,
        transaction_date=today - timedelta(days=20),
        description="Pago antiguo aprobado sin ejecutar",
        created_by=admin_user
    )
    print(f"✓ Creada Alerta Pago Pendiente Antiguo: {transfer_stale.id}")

    print("\n" + "=" * 60)
    print("PROCESO COMPLETADO")
    print("Verifique el Dashboard para ver las alertas generadas.")
    print("=" * 60)

if __name__ == '__main__':
    create_alert_data()
