# Generated manually

from decimal import Decimal
from django.db import migrations, models
import apps.validators


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0003_alter_invoicepayment_bank'),
    ]

    operations = [
        # Agregar campo retencion al modelo Invoice
        migrations.AddField(
            model_name='invoice',
            name='retencion',
            field=models.DecimalField(
                decimal_places=2,
                default=Decimal('0.00'),
                max_digits=15,
                verbose_name='Retención 1% (Gran Contribuyente)'
            ),
        ),
        # Actualizar validadores de archivos en Invoice
        migrations.AlterField(
            model_name='invoice',
            name='dte_file',
            field=models.FileField(
                blank=True,
                help_text='Solo PDF, JPG, PNG. Máximo 5MB',
                null=True,
                upload_to='invoices/dte/',
                validators=[apps.validators.validate_document_file],
                verbose_name='Archivo DTE'
            ),
        ),
        migrations.AlterField(
            model_name='invoice',
            name='pdf_file',
            field=models.FileField(
                blank=True,
                help_text='Solo PDF, JPG, PNG. Máximo 5MB',
                null=True,
                upload_to='invoices/pdf/',
                validators=[apps.validators.validate_document_file],
                verbose_name='PDF de Factura'
            ),
        ),
        # Actualizar validadores de archivos en InvoicePayment
        migrations.AlterField(
            model_name='invoicepayment',
            name='receipt_file',
            field=models.FileField(
                blank=True,
                help_text='Solo PDF, JPG, PNG. Máximo 5MB',
                null=True,
                upload_to='invoices/payments/',
                validators=[apps.validators.validate_document_file],
                verbose_name='Comprobante de Pago'
            ),
        ),
        # Actualizar validadores de archivos en OrderDocument
        migrations.AlterField(
            model_name='orderdocument',
            name='file',
            field=models.FileField(
                help_text='Solo PDF, JPG, PNG. Máximo 5MB',
                upload_to='orders/docs/',
                validators=[apps.validators.validate_document_file],
                verbose_name='Archivo'
            ),
        ),
    ]
