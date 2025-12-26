from django.db import migrations, models

def migrate_statuses(apps, schema_editor):
    ServiceOrder = apps.get_model('orders', 'ServiceOrder')
    # Map 'abierta' to 'pendiente' (initial state)
    ServiceOrder.objects.filter(status='abierta').update(status='pendiente')

def reverse_migrate_statuses(apps, schema_editor):
    ServiceOrder = apps.get_model('orders', 'ServiceOrder')
    # Map all active statuses back to 'abierta'
    active_statuses = ['pendiente', 'en_puerto', 'en_transito', 'en_almacen', 'finalizada']
    ServiceOrder.objects.filter(status__in=active_statuses).update(status='abierta')

class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0018_update_ordercharge_exento'),
    ]

    operations = [
        migrations.AlterField(
            model_name='serviceorder',
            name='status',
            field=models.CharField(
                choices=[
                    ('pendiente', 'Pendiente'),
                    ('en_puerto', 'En Puerto'),
                    ('en_transito', 'En Tránsito'),
                    ('en_almacen', 'En Almacenadora'),
                    ('finalizada', 'Finalizada'),
                    ('cerrada', 'Cerrada')
                ],
                default='pendiente',
                max_length=20,
                verbose_name='Estado'
            ),
        ),
        migrations.RunPython(migrate_statuses, reverse_migrate_statuses),
    ]
