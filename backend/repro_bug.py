import os
import django
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.orders.models import ServiceOrder
from apps.transfers.models import Transfer, TransferPayment
from apps.clients.models import Client
from apps.catalogs.models import ShipmentType, Provider
from django.contrib.auth import get_user_model

User = get_user_model()

def run():
    # Setup
    user = User.objects.first()
    if not user:
        print("No user found")
        return

    client, _ = Client.objects.get_or_create(
        name="Test Client", 
        defaults={'nit': '12345678', 'created_by': user}
    )
    
    shipment_type, _ = ShipmentType.objects.get_or_create(name="Maritime")
    provider, _ = Provider.objects.get_or_create(name="Test Provider")

    # Create Order
    order = ServiceOrder.objects.create(
        client=client,
        shipment_type=shipment_type,
        eta="2025-01-01",
        duca="DUCA123",
        created_by=user
    )
    print(f"Order created: {order.order_number}")

    # Create Transfer (Cost)
    transfer = Transfer.objects.create(
        service_order=order,
        transfer_type='costos',
        amount=Decimal('100.00'),
        provider=provider,
        description="Test Cost",
        created_by=user
    )
    print(f"Transfer created: {transfer.id}, Amount: {transfer.amount}, Status: {transfer.status}")

    # Check Total Costs (Before Payment)
    total_before = order.get_total_direct_costs()
    print(f"Total Direct Costs (Before Payment): {total_before}")

    # Pay the Transfer
    payment = TransferPayment.objects.create(
        transfer=transfer,
        amount=Decimal('100.00'),
        payment_method='efectivo',
        created_by=user
    )
    
    # Refresh Transfer to check status
    transfer.refresh_from_db()
    print(f"Transfer paid. Status: {transfer.status}, Paid Amount: {transfer.paid_amount}")

    # Refresh Order (not strictly necessary for method call, but good practice)
    order.refresh_from_db()
    
    # Check Total Costs (After Payment)
    total_after = order.get_total_direct_costs()
    print(f"Total Direct Costs (After Payment): {total_after}")

    # Check via Serializer
    from apps.orders.serializers import ServiceOrderSerializer
    serializer = ServiceOrderSerializer(order)
    total_after_serializer = serializer.data['total_direct_costs']
    print(f"Total Direct Costs (After Payment - Serializer): {total_after_serializer}")

    if total_after == 0 or total_after_serializer == 0:
        print("BUG REPRODUCED: Total costs became 0 after payment.")
    else:
        print("Bug NOT reproduced. Total costs remained correct.")

    # Cleanup
    # order.delete() # Soft delete
    # client.delete()

if __name__ == "__main__":
    run()
