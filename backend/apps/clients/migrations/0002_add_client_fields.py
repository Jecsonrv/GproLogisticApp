# Generated migration file

from django.db import migrations, models
import django.core.validators
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='phone',
            field=models.CharField(blank=True, max_length=20, verbose_name='Teléfono'),
        ),
        migrations.AddField(
            model_name='client',
            name='email',
            field=models.EmailField(blank=True, max_length=254, validators=[django.core.validators.EmailValidator()], verbose_name='Email'),
        ),
        migrations.AddField(
            model_name='client',
            name='contact_person',
            field=models.CharField(blank=True, max_length=255, verbose_name='Persona de Contacto'),
        ),
        migrations.AddField(
            model_name='client',
            name='is_active',
            field=models.BooleanField(default=True, verbose_name='Activo'),
        ),
        migrations.AddField(
            model_name='client',
            name='created_at',
            field=models.DateTimeField(auto_now_add=True, default=django.utils.timezone.now, verbose_name='Fecha de Creación'),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='client',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='Última Actualización'),
        ),
        migrations.AddField(
            model_name='client',
            name='notes',
            field=models.TextField(blank=True, verbose_name='Notas'),
        ),
        migrations.AlterField(
            model_name='client',
            name='nit',
            field=models.CharField(max_length=50, unique=True, verbose_name='NIT'),
        ),
        migrations.AlterField(
            model_name='client',
            name='credit_limit',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=15, verbose_name='Límite de Crédito'),
        ),
        migrations.AlterModelOptions(
            name='client',
            options={'ordering': ['name'], 'verbose_name': 'Cliente', 'verbose_name_plural': 'Clientes'},
        ),
    ]
