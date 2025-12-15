"""
Script para generar datos de prueba completos para el Dashboard
Ejecutar con: python manage.py shell < create_dashboard_test_data.py
O: python manage.py runscript create_dashboard_test_data (si tienes django-extensions)
"""
import os
import sys
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

from apps.clients.models import Client
from apps.orders.models import ServiceOrder, Invoice
from apps.transfers.models import Transfer
from apps.catalogs.models import ShipmentType, Provider, CustomsAgent, Bank
from apps.users.models import User, Notification
from django.db.models import Sum as DjangoSum

print("=" * 60)
print("GENERADOR DE DATOS DE PRUEBA PARA DASHBOARD")
print("=" * 60)

# Obtener o crear usuario admin
admin_user = User.objects.filter(role='admin').first()
if not admin_user:
    admin_user = User.objects.first()
print(f"✓ Usuario admin: {admin_user.username if admin_user else 'No encontrado'}")

# Verificar/crear catálogos necesarios
print("\n[1/6] Verificando catálogos...")

# Tipos de embarque
shipment_types = list(ShipmentType.objects.all())
if not shipment_types:
    shipment_types = [
        ShipmentType.objects.create(name="Importación Marítima", code="IMP-MAR"),
        ShipmentType.objects.create(name="Importación Aérea", code="IMP-AER"),
        ShipmentType.objects.create(name="Exportación Marítima", code="EXP-MAR"),
        ShipmentType.objects.create(name="Consolidado", code="CONS"),
    ]
    print(f"  ✓ Creados {len(shipment_types)} tipos de embarque")
else:
    print(f"  ✓ Tipos de embarque existentes: {len(shipment_types)}")

# Proveedores
providers = list(Provider.objects.all())
if not providers:
    providers = [
        Provider.objects.create(name="Naviera MSC", code="MSC", contact_name="Juan Pérez", phone="2222-1111"),
        Provider.objects.create(name="Hapag-Lloyd", code="HAPAG", contact_name="María García", phone="2222-2222"),
        Provider.objects.create(name="Maersk Line", code="MAERSK", contact_name="Pedro López", phone="2222-3333"),
        Provider.objects.create(name="CMA CGM", code="CMA", contact_name="Ana Martínez", phone="2222-4444"),
    ]
    print(f"  ✓ Creados {len(providers)} proveedores")
else:
    print(f"  ✓ Proveedores existentes: {len(providers)}")

# Aforadores
customs_agents = list(CustomsAgent.objects.all())
if not customs_agents:
    customs_agents = [
        CustomsAgent.objects.create(name="Aduanas Express S.A.", license_number="AF-001", phone="2555-1234"),
        CustomsAgent.objects.create(name="Global Customs", license_number="AF-002", phone="2555-5678"),
    ]
    print(f"  ✓ Creados {len(customs_agents)} aforadores")
else:
    print(f"  ✓ Aforadores existentes: {len(customs_agents)}")

# Bancos
banks = list(Bank.objects.all())
if not banks:
    banks = [
        Bank.objects.create(name="Banco Agrícola", code="BAGR"),
        Bank.objects.create(name="Banco de América Central", code="BAC"),
        Bank.objects.create(name="Banco Cuscatlán", code="CUSC"),
        Bank.objects.create(name="Banco Davivienda", code="DAVI"),
    ]
    print(f"  ✓ Creados {len(banks)} bancos")
else:
    print(f"  ✓ Bancos existentes: {len(banks)}")

# Clientes
print("\n[2/6] Creando clientes...")
client_data = [
    {"name": "Importadora Central S.A. de C.V.", "nit": "0614-010199-001-1", "payment_condition": "credito", "credit_limit": 50000, "credit_days": 30},
    {"name": "Distribuidora Global", "nit": "0614-020299-002-2", "payment_condition": "credito", "credit_limit": 75000, "credit_days": 45},
    {"name": "Comercial del Pacífico", "nit": "0614-030399-003-3", "payment_condition": "contado", "credit_limit": 0, "credit_days": 0},
    {"name": "Industrias Unidas", "nit": "0614-040499-004-4", "payment_condition": "credito", "credit_limit": 100000, "credit_days": 60},
    {"name": "Exportadora Salvadoreña", "nit": "0614-050599-005-5", "payment_condition": "credito", "credit_limit": 80000, "credit_days": 30},
    {"name": "Tech Solutions S.A.", "nit": "0614-060699-006-6", "payment_condition": "contado", "credit_limit": 0, "credit_days": 0},
]

clients = []
for cd in client_data:
    client, created = Client.objects.get_or_create(
        nit=cd["nit"],
        defaults={
            "name": cd["name"],
            "payment_condition": cd["payment_condition"],
            "credit_limit": cd["credit_limit"],
            "credit_days": cd["credit_days"],
            "is_active": True,
            "email": f"contacto@{cd['name'].lower().replace(' ', '').replace('.', '')[:10]}.com",
            "phone": f"2{random.randint(100,999)}-{random.randint(1000,9999)}",
            "address": f"Col. Escalón, Calle #{random.randint(1,100)}, San Salvador"
        }
    )
    clients.append(client)
    if created:
        print(f"  ✓ Cliente creado: {client.name}")
    else:
        print(f"  → Cliente existente: {client.name}")

# Órdenes de Servicio
print("\n[3/6] Creando órdenes de servicio...")
now = timezone.now()
orders_created = 0
orders_data = []

# Crear órdenes para el mes actual y anterior
for days_ago in [0, 2, 5, 8, 12, 18, 25, 35, 42, 50]:
    order_date = now - timedelta(days=days_ago)
    client = random.choice(clients)
    shipment = random.choice(shipment_types)
    provider = random.choice(providers) if providers else None
    customs_agent = random.choice(customs_agents) if customs_agents else None
    
    # Verificar si ya existe una orden para esta combinación
    existing = ServiceOrder.objects.filter(
        client=client,
        created_at__date=order_date.date()
    ).first()
    
    if existing:
        orders_data.append(existing)
        continue
    
    status = 'cerrada' if days_ago > 15 else 'abierta'
    
    order = ServiceOrder.objects.create(
        client=client,
        shipment_type=shipment,
        provider=provider,
        customs_agent=customs_agent,
        purchase_order=f"PO-{random.randint(10000, 99999)}",
        bl_reference=f"BL-{random.randint(100000, 999999)}",
        eta=order_date.date() + timedelta(days=random.randint(5, 20)),
        duca=f"DUCA-{random.randint(10000, 99999)}",
        status=status,
        created_by=admin_user,
    )
    # Ajustar fecha de creación
    ServiceOrder.objects.filter(id=order.id).update(created_at=order_date)
    order.refresh_from_db()
    
    if status == 'cerrada':
        order.closed_by = admin_user
        order.closed_at = order_date + timedelta(days=random.randint(3, 10))
        order.save()
    
    orders_data.append(order)
    orders_created += 1
    print(f"  ✓ Orden creada: {order.order_number} - {client.name} ({status})")

print(f"  Total: {orders_created} órdenes nuevas")

# Transferencias (Ingresos y Gastos)
print("\n[4/6] Creando transferencias financieras...")
transfers_created = 0

for order in orders_data:
    # Verificar si ya tiene transferencias
    existing_transfers = Transfer.objects.filter(service_order=order).count()
    if existing_transfers > 0:
        print(f"  → Orden {order.order_number} ya tiene {existing_transfers} transferencias")
        continue
    
    provider = random.choice(providers) if providers else None
    bank = random.choice(banks) if banks else None
    
    # Crear transferencia de ingresos (terceros/cargos - cobro al cliente)
    base_amount = Decimal(random.randint(2000, 15000))
    
    Transfer.objects.create(
        service_order=order,
        transfer_type='terceros',
        provider=provider,
        description=f"Flete y servicios de importación - {order.order_number}",
        amount=base_amount,
        balance=Decimal('0') if order.status == 'cerrada' else base_amount,
        status='pagado' if order.status == 'cerrada' else 'provisionada',
        transaction_date=order.created_at.date() + timedelta(days=random.randint(1, 5)),
        payment_method='transferencia' if order.status == 'cerrada' else '',
        bank=bank if order.status == 'cerrada' else None,
        created_by=admin_user,
    )
    transfers_created += 1
    
    # Crear gastos operativos (propios/costos)
    cost_amount = base_amount * Decimal('0.65')
    Transfer.objects.create(
        service_order=order,
        transfer_type='propios',
        provider=provider,
        description=f"Costos operativos - {order.order_number}",
        amount=cost_amount,
        balance=Decimal('0') if order.status == 'cerrada' else cost_amount,
        status='pagado' if order.status == 'cerrada' else 'provisionada',
        transaction_date=order.created_at.date() + timedelta(days=random.randint(2, 7)),
        payment_method='transferencia' if order.status == 'cerrada' else '',
        bank=bank if order.status == 'cerrada' else None,
        created_by=admin_user,
    )
    transfers_created += 1
    
    # Gastos administrativos ocasionales
    if random.random() > 0.5:
        admin_amount = Decimal(random.randint(100, 500))
        Transfer.objects.create(
            service_order=order,
            transfer_type='admin',
            provider=provider,
            description=f"Gastos administrativos - {order.order_number}",
            amount=admin_amount,
            balance=Decimal('0'),
            status='pagado',
            transaction_date=order.created_at.date() + timedelta(days=random.randint(3, 10)),
            payment_method='efectivo',
            created_by=admin_user,
        )
        transfers_created += 1

print(f"  Total: {transfers_created} transferencias creadas")

# Facturas
print("\n[5/6] Creando facturas...")
invoices_created = 0

for order in orders_data:
    # Verificar si ya tiene factura
    existing_invoice = Invoice.objects.filter(service_order=order).first()
    if existing_invoice:
        print(f"  → Orden {order.order_number} ya tiene factura: {existing_invoice.invoice_number}")
        continue
    
    if order.status == 'cerrada' or random.random() > 0.3:
        # Calcular monto total de transferencias terceros
        total_terceros = Transfer.objects.filter(
            service_order=order,
            transfer_type='terceros'
        ).aggregate(total=DjangoSum('amount'))['total'] or Decimal('0')
        
        if total_terceros > 0:
            # Determinar estado de la factura
            days_since_order = (now - order.created_at).days
            
            if days_since_order > 30:
                status = 'paid'
                balance = Decimal('0')
            elif days_since_order > 15:
                status = 'partial'
                balance = total_terceros * Decimal('0.4')
            else:
                status = 'pending'
                balance = total_terceros
            
            due_date = order.created_at.date() + timedelta(days=30)
            
            from django.db.models import Sum as DjangoSum
            invoice = Invoice.objects.create(
                service_order=order,
                invoice_number=f"DTE-{random.randint(10000000, 99999999)}",
                invoice_type='DTE',
                total_amount=total_terceros,
                balance=balance,
                status=status,
                issue_date=order.created_at.date() + timedelta(days=random.randint(1, 5)),
                due_date=due_date,
            )
            invoices_created += 1
            print(f"  ✓ Factura creada: {invoice.invoice_number} - ${total_terceros} ({status})")

print(f"  Total: {invoices_created} facturas creadas")

# Notificaciones
print("\n[6/6] Generando notificaciones del sistema...")
if admin_user:
    # Limpiar notificaciones antiguas de prueba
    Notification.objects.filter(user=admin_user).delete()
    
    # Crear notificaciones variadas
    notifications_data = [
        {
            'title': 'Bienvenido al Sistema',
            'message': 'El sistema GPRO Logistic está funcionando correctamente. Todos los módulos están operativos.',
            'notification_type': 'success',
            'category': 'system'
        },
        {
            'title': 'Factura Vencida Detectada',
            'message': 'Se ha detectado una factura vencida que requiere atención. Revise el módulo de Cuentas por Cobrar.',
            'notification_type': 'error',
            'category': 'invoice'
        },
        {
            'title': 'Nueva Orden de Servicio',
            'message': 'Se ha registrado una nueva orden de servicio en el sistema.',
            'notification_type': 'info',
            'category': 'order'
        },
        {
            'title': 'Límite de Crédito Cercano',
            'message': 'Un cliente está cerca de alcanzar su límite de crédito asignado.',
            'notification_type': 'warning',
            'category': 'client'
        },
        {
            'title': 'Pago Registrado',
            'message': 'Se ha registrado un pago exitosamente en el sistema.',
            'notification_type': 'success',
            'category': 'payment'
        },
    ]
    
    for i, notif in enumerate(notifications_data):
        Notification.create_notification(
            user=admin_user,
            title=notif['title'],
            message=notif['message'],
            notification_type=notif['notification_type'],
            category=notif['category']
        )
        # Marcar algunas como leídas
        if i > 2:
            n = Notification.objects.filter(user=admin_user, title=notif['title']).first()
            if n:
                n.mark_as_read()
    
    print(f"  ✓ Creadas {len(notifications_data)} notificaciones")
else:
    print("  ⚠ No se encontró usuario admin para notificaciones")

# Resumen Final
print("\n" + "=" * 60)
print("RESUMEN DE DATOS")
print("=" * 60)
print(f"  • Clientes activos: {Client.objects.filter(is_active=True).count()}")
print(f"  • Órdenes de servicio: {ServiceOrder.objects.count()}")
print(f"    - Abiertas: {ServiceOrder.objects.filter(status='abierta').count()}")
print(f"    - Cerradas: {ServiceOrder.objects.filter(status='cerrada').count()}")
print(f"  • Transferencias: {Transfer.objects.count()}")
print(f"    - Terceros (ingresos): {Transfer.objects.filter(transfer_type='terceros').count()}")
print(f"    - Propios (costos): {Transfer.objects.filter(transfer_type='propios').count()}")
print(f"  • Facturas: {Invoice.objects.count()}")
print(f"    - Pendientes: {Invoice.objects.filter(status='pending').count()}")
print(f"    - Parciales: {Invoice.objects.filter(status='partial').count()}")
print(f"    - Pagadas: {Invoice.objects.filter(status='paid').count()}")
print(f"  • Notificaciones: {Notification.objects.count()}")
print("=" * 60)
print("✅ Datos de prueba generados exitosamente!")
print("   Actualiza el Dashboard para ver los cambios.")
print("=" * 60)
