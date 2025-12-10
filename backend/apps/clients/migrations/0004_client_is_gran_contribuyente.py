# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clients', '0003_client_legal_name_client_secondary_phone'),
    ]

    operations = [
        migrations.AddField(
            model_name='client',
            name='is_gran_contribuyente',
            field=models.BooleanField(default=False, verbose_name='Gran Contribuyente'),
        ),
    ]
