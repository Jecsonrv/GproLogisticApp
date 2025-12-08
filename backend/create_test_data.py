"""
Script para crear datos de prueba en el sistema GPRO Logistic
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.clients.models import Client
from apps.catalogs.models import Provider, CustomsAgent, ShipmentType, SubClient
from apps.orders.models import ServiceOrder
from apps.transfers.models import Transfer
from datetime import datetime, timedelta
from decimal import Decimal

def create_users():
    print("Creando usuarios...")
    
    # Admin
    if not User.objects.filter(username='admin').exists():
        admin = User.objects.create_superuser(
            username='admin',
            email='admin@gproLogistic.com',
            password='admin123',
            role='admin',
            first_name='Administrador',
            last_name='Sistema'
        )
        print(f"✓ Usuario admin creado")
    
    # Operativo
    if not User.objects.filter(username='operativo').exists():
        operativo = User.objects.create_user(
            username='operativo',
            email='operativo@gproLogistic.com',
            password='operativo123',
            role='operativo',
            first_name='Juan',
            last_name='Operador'
        )
        print(f"✓ Usuario operativo creado")
    
    # Operativo 2
    if not User.objects.filter(username='operativo2').exists():
        operativo2 = User.objects.create_user(
            username='operativo2',
            email='operativo2@gproLogistic.com',
            password='operativo123',
            role='operativo2',
            first_name='María',
            last_name='Coordinadora'
        )
        print(f"✓ Usuario operativo2 creado")

def create_catalogs():
    print("\nCreando catálogos...")
    
    # Providers
    providers_data = [
        {'name': 'Transporte Rápido S.A.', 'nit': '12345678-9', 'phone': '2345-6789', 'email': 'info@transporterapido.com'},
        {'name': 'Agencia de Carga GT', 'nit': '98765432-1', 'phone': '2234-5678', 'email': 'contacto@agenciacarga.com'},
        {'name': 'Logística Express', 'nit': '45678912-3', 'phone': '2456-7890', 'email': 'ventas@logisticaexpress.com'},
    ]
    
    for prov_data in providers_data:
        Provider.objects.get_or_create(
            name=prov_data['name'],
            defaults=prov_data
        )
    print(f"✓ {len(providers_data)} proveedores creados")
    
    # Customs Agents
    agents_data = [
        {'name': 'Agente Aduanal López', 'code': 'AAL001', 'phone': '2345-1234', 'email': 'lopez@agentes.com'},
        {'name': 'Servicios Aduanales GT', 'code': 'SAG002', 'phone': '2456-2345', 'email': 'info@serviciosgt.com'},
    ]
    
    for agent_data in agents_data:
        CustomsAgent.objects.get_or_create(
            code=agent_data['code'],
            defaults=agent_data
        )
    print(f"✓ {len(agents_data)} agentes aduanales creados")
    
    # Shipment Types
    types_data = [
        {'name': 'Marítimo', 'code': 'MAR'},
        {'name': 'Aéreo', 'code': 'AER'},
        {'name': 'Terrestre', 'code': 'TER'},
    ]
    
    for type_data in types_data:
        ShipmentType.objects.get_or_create(
            code=type_data['code'],
            defaults=type_data
        )
    print(f"✓ {len(types_data)} tipos de envío creados")

def create_clients():
    print("\nCreando clientes...")
    
    clients_data = [
        {
            'name': 'Importadora Central S.A.',
            'nit': '123456-7',
            'iva_registration': 'IVA-123456',
            'address': 'Zona 10, Ciudad de Guatemala',
            'credit_limit': Decimal('50000.00'),
            'payment_condition': 'credito',
            'credit_days': 30,
            'phone': '2234-5678',
            'email': 'ventas@importadoracentral.com',
            'contact_person': 'Carlos Méndez'
        },
        {
            'name': 'Distribuidora El Sol',
            'nit': '987654-3',
            'iva_registration': 'IVA-987654',
            'address': 'Zona 12, Guatemala',
            'credit_limit': Decimal('30000.00'),
            'payment_condition': 'credito',
            'credit_days': 15,
            'phone': '2345-6789',
            'email': 'compras@elsol.com',
            'contact_person': 'Ana García'
        },
        {
            'name': 'Comercial Los Andes',
            'nit': '456789-1',
            'iva_registration': 'IVA-456789',
            'address': 'Zona 1, Guatemala',
            'credit_limit': Decimal('40000.00'),
            'payment_condition': 'credito',
            'credit_days': 45,
            'phone': '2456-7890',
            'email': 'info@losandes.com',
            'contact_person': 'Roberto Silva'
        },
    ]
    
    created_clients = []
    for client_data in clients_data:
        client, created = Client.objects.get_or_create(
            nit=client_data['nit'],
            defaults=client_data
        )
        created_clients.append(client)
    
    print(f"✓ {len(clients_data)} clientes creados")
    return created_clients

def create_service_orders(clients):
    print("\nCreando órdenes de servicio...")
    
    if not clients:
        print("No hay clientes disponibles")
        return []
    
    shipment_types = list(ShipmentType.objects.all())
    providers = list(Provider.objects.all())
    
    if not shipment_types:
        print("Faltan catálogos necesarios")
        return []
    
    orders_data = [
        {
            'client': clients[0],
            'order_number': 'OS-0001',
            'shipment_type': shipment_types[0],
            'provider': providers[0] if providers else None,
            'purchase_order': 'PO-2025-001',
            'eta': datetime.now().date(),
            'duca': 'DUCA-001-2025',
            'status': 'abierta',
        },
        {
            'client': clients[0],
            'order_number': 'OS-0002',
            'shipment_type': shipment_types[1],
            'provider': providers[1] if len(providers) > 1 else (providers[0] if providers else None),
            'purchase_order': 'PO-2025-002',
            'eta': (datetime.now() - timedelta(days=10)).date(),
            'duca': 'DUCA-002-2025',
            'status': 'cerrada',
        },
        {
            'client': clients[1],
            'order_number': 'OS-0003',
            'shipment_type': shipment_types[0],
            'provider': providers[2] if len(providers) > 2 else (providers[0] if providers else None),
            'purchase_order': 'PO-2025-003',
            'eta': datetime.now().date(),
            'duca': 'DUCA-003-2025',
            'status': 'abierta',
        },
    ]
    
    created_orders = []
    for order_data in orders_data:
        order, created = ServiceOrder.objects.get_or_create(
            order_number=order_data['order_number'],
            defaults=order_data
        )
        created_orders.append(order)
    
    print(f"✓ {len(orders_data)} órdenes de servicio creadas")
    return created_orders

def create_transfers(orders):
    print("\nCreando transferencias...")
    
    if not orders:
        print("No hay órdenes disponibles")
        return
    
    providers = list(Provider.objects.all())
    admin_user = User.objects.filter(role='admin').first()
    
    if not providers or not admin_user:
        print("Faltan proveedores o usuarios")
        return
    
    transfers_data = [
        {
            'service_order': orders[0],
            'transfer_type': 'terceros',
            'amount': Decimal('2500.00'),
            'status': 'provisionada',
            'provider': providers[0],
            'payment_method': 'transferencia',
            'description': 'Pago a transportista',
            'created_by': admin_user,
        },
        {
            'service_order': orders[0],
            'transfer_type': 'propios',
            'amount': Decimal('800.00'),
            'status': 'pagada',
            'payment_method': 'efectivo',
            'description': 'Gastos operativos',
            'created_by': admin_user,
        },
        {
            'service_order': orders[1],
            'transfer_type': 'terceros',
            'amount': Decimal('1500.00'),
            'status': 'pagada',
            'provider': providers[1] if len(providers) > 1 else providers[0],
            'payment_method': 'cheque',
            'description': 'Servicios aduanales',
            'created_by': admin_user,
        },
    ]
    
    for transfer_data in transfers_data:
        Transfer.objects.get_or_create(
            service_order=transfer_data['service_order'],
            transfer_type=transfer_data['transfer_type'],
            amount=transfer_data['amount'],
            defaults=transfer_data
        )
    
    print(f"✓ {len(transfers_data)} transferencias creadas")

def main():
    print("=" * 60)
    print("CREANDO DATOS DE PRUEBA PARA GPRO LOGISTIC")
    print("=" * 60)
    
    create_users()
    create_catalogs()
    clients = create_clients()
    orders = create_service_orders(clients)
    create_transfers(orders)
    
    print("\n" + "=" * 60)
    print("✓ DATOS DE PRUEBA CREADOS EXITOSAMENTE")
    print("=" * 60)
    print("\nCredenciales de acceso:")
    print("-" * 60)
    print("Admin:      username: admin      password: admin123")
    print("Operativo:  username: operativo  password: operativo123")
    print("Operativo2: username: operativo2 password: operativo123")
    print("-" * 60)

if __name__ == '__main__':
    main()
