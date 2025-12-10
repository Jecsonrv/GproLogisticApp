# Generated manually

from django.db import migrations, models
import apps.validators


class Migration(migrations.Migration):

    dependencies = [
        ('transfers', '0004_alter_transfer_bank'),
    ]

    operations = [
        # Actualizar validadores de archivos en Transfer
        migrations.AlterField(
            model_name='transfer',
            name='invoice_file',
            field=models.FileField(
                blank=True,
                help_text='Solo PDF, JPG, PNG. Máximo 5MB',
                null=True,
                upload_to='transfers/invoices/',
                validators=[apps.validators.validate_document_file],
                verbose_name='Factura'
            ),
        ),
    ]
