# Generated migration file

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('catalogs', '0002_add_catalog_fields'),
        ('transfers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='transfer',
            name='payment_method',
            field=models.CharField(blank=True, choices=[('efectivo', 'Efectivo'), ('transferencia', 'Transferencia Bancaria'), ('cheque', 'Cheque'), ('tarjeta', 'Tarjeta')], max_length=20, verbose_name='Método de Pago'),
        ),
        migrations.AddField(
            model_name='transfer',
            name='provider',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='catalogs.provider', verbose_name='Proveedor'),
        ),
        migrations.AddField(
            model_name='transfer',
            name='invoice_number',
            field=models.CharField(blank=True, max_length=100, verbose_name='Número de Factura'),
        ),
        migrations.AddField(
            model_name='transfer',
            name='transaction_date',
            field=models.DateField(auto_now_add=True, verbose_name='Fecha de Transacción'),
        ),
        migrations.AddField(
            model_name='transfer',
            name='notes',
            field=models.TextField(blank=True, verbose_name='Notas Adicionales'),
        ),
        migrations.AddField(
            model_name='transfer',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, verbose_name='Creado por'),
        ),
        migrations.AlterField(
            model_name='transfer',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, verbose_name='Fecha de Registro'),
        ),
        migrations.AlterModelOptions(
            name='transfer',
            options={'ordering': ['-created_at'], 'verbose_name': 'Transferencia / Gasto', 'verbose_name_plural': 'Transferencias y Gastos'},
        ),
    ]
