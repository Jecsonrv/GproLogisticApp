from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='DocumentSequence',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=100, unique=True, verbose_name='Serie')),
                ('last_number', models.PositiveIntegerField(default=0, verbose_name='Último número asignado')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Actualizado el')),
            ],
            options={
                'verbose_name': 'Correlativo de Documento',
                'verbose_name_plural': 'Correlativos de Documentos',
            },
        ),
    ]
