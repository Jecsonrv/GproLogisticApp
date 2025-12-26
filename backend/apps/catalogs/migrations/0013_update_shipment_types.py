from django.db import migrations

def update_shipment_types(apps, schema_editor):
    ShipmentType = apps.get_model('catalogs', 'ShipmentType')
    ServiceOrder = apps.get_model('orders', 'ServiceOrder')
    
    # Required shipment types
    required_types = ['FCL', 'LCL', 'FTL', 'LTL', 'AIR', 'OTROS']
    
    # Ensure FCL exists first
    fcl_type, _ = ShipmentType.objects.get_or_create(name='FCL')
    fcl_type.is_active = True
    fcl_type.save()

    # Handle 'maritime' -> 'FCL'
    maritime = ShipmentType.objects.filter(name__iexact='maritime').first()
    
    if maritime:
        if maritime.pk != fcl_type.pk:
            # Reassign orders from 'maritime' to 'FCL'
            ServiceOrder.objects.filter(shipment_type=maritime).update(shipment_type=fcl_type)
            # Now it is safe to delete
            maritime.delete()

    # Ensure other required types exist
    for type_name in required_types:
        if type_name == 'FCL': continue # Already handled
        obj, created = ShipmentType.objects.get_or_create(name=type_name)
        if not obj.is_active:
            obj.is_active = True
            obj.save()

    # Deactivate any other types not in the list
    ShipmentType.objects.exclude(name__in=required_types).update(is_active=False)

def reverse_update_shipment_types(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('catalogs', '0012_service_deleted_at_service_is_deleted'),
        ('orders', '0019_update_service_order_status_choices'), # Ensure orders app is loaded
    ]

    operations = [
        migrations.RunPython(update_shipment_types, reverse_update_shipment_types),
    ]
