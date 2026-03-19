from django.db import migrations, models
import apps.orders.models
import apps.validators


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0036_fix_orderdocument_description_keys'),
    ]

    operations = [
        migrations.AlterField(
            model_name='orderdocument',
            name='file',
            field=models.FileField(
                help_text='Solo PDF, JPG, PNG. Máximo 5MB',
                upload_to=apps.orders.models.order_document_upload_path,
                validators=[apps.validators.validate_document_file],
                verbose_name='Archivo'
            ),
        ),
    ]
