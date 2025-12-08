# Generated migration file

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('catalogs', '0001_initial'),
        ('clients', '0001_initial'),
    ]

    operations = [
        # Provider fields
        migrations.AddField(
            model_name='provider',
            name='nit',
            field=models.CharField(blank=True, max_length=50, verbose_name='NIT'),
        ),
        migrations.AddField(
            model_name='provider',
            name='phone',
            field=models.CharField(blank=True, max_length=20, verbose_name='Teléfono'),
        ),
        migrations.AddField(
            model_name='provider',
            name='email',
            field=models.EmailField(blank=True, max_length=254, verbose_name='Email'),
        ),
        migrations.AddField(
            model_name='provider',
            name='address',
            field=models.TextField(blank=True, verbose_name='Dirección'),
        ),
        migrations.AddField(
            model_name='provider',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Activo'),
        ),
        migrations.AddField(
            model_name='provider',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name='Fecha de Creación'),
            preserve_default=False,
        ),
        
        # CustomsAgent fields
        migrations.AddField(
            model_name='customsagent',
            name='code',
            field=models.CharField(blank=True, max_length=50, verbose_name='Código'),
        ),
        migrations.AddField(
            model_name='customsagent',
            name='phone',
            field=models.CharField(blank=True, max_length=20, verbose_name='Teléfono'),
        ),
        migrations.AddField(
            model_name='customsagent',
            name='email',
            field=models.EmailField(blank=True, max_length=254, verbose_name='Email'),
        ),
        migrations.AddField(
            model_name='customsagent',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Activo'),
        ),
        migrations.AddField(
            model_name='customsagent',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name='Fecha de Creación'),
            preserve_default=False,
        ),
        
        # ShipmentType fields
        migrations.AddField(
            model_name='shipmenttype',
            name='code',
            field=models.CharField(blank=True, max_length=10, verbose_name='Código'),
        ),
        migrations.AddField(
            model_name='shipmenttype',
            name='description',
            field=models.TextField(blank=True, verbose_name='Descripción'),
        ),
        migrations.AddField(
            model_name='shipmenttype',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Activo'),
        ),
        migrations.AddField(
            model_name='shipmenttype',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name='Fecha de Creación'),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name='shipmenttype',
            name='name',
            field=models.CharField(max_length=255, unique=True, verbose_name='Nombre'),
        ),
        
        # SubClient fields
        migrations.AddField(
            model_name='subclient',
            name='parent_client',
            field=models.ForeignKey(blank=True, null=True, on_delete=models.deletion.CASCADE, related_name='subclients', to='clients.client', verbose_name='Cliente Principal'),
        ),
        migrations.AddField(
            model_name='subclient',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Activo'),
        ),
        migrations.AddField(
            model_name='subclient',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name='Fecha de Creación'),
            preserve_default=False,
        ),
        
        # Add ordering to Meta classes
        migrations.AlterModelOptions(
            name='customsagent',
            options={'ordering': ['name'], 'verbose_name': 'Aforador', 'verbose_name_plural': 'Aforadores'},
        ),
        migrations.AlterModelOptions(
            name='provider',
            options={'ordering': ['name'], 'verbose_name': 'Proveedor', 'verbose_name_plural': 'Proveedores'},
        ),
        migrations.AlterModelOptions(
            name='shipmenttype',
            options={'ordering': ['name'], 'verbose_name': 'Tipo de Embarque', 'verbose_name_plural': 'Tipos de Embarque'},
        ),
        migrations.AlterModelOptions(
            name='subclient',
            options={'ordering': ['name'], 'verbose_name': 'Subcliente', 'verbose_name_plural': 'Subclientes'},
        ),
    ]
