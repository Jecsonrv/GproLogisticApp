"""
Utilidades para subir archivos FUERA de las transacciones que mantienen locks.

Motivo:
    Varios endpoints hacían

        with transaction.atomic():
            inv = Invoice.objects.select_for_update().get(pk=pk)   # lock de fila
            ...
            InvoicePayment.objects.create(..., receipt_file=request.FILES[...])  # PUT a S3

    La subida a S3 ocurre dentro de la transacción, así que el lock exclusivo
    sobre la fila de `orders_invoice` se mantiene durante toda la latencia de
    red. Cualquier otra petición sobre esa misma factura (por ejemplo el PATCH
    de InvoiceViewSet) queda esperando el lock y muere al agotar el
    `statement_timeout`:

        psycopg2.errors.QueryCanceled: canceling statement due to statement timeout
        CONTEXT: while updating tuple (...) in relation "orders_invoice"

    `stage_upload()` sube el archivo antes de abrir la transacción y devuelve el
    nombre ya almacenado. Ese nombre se asigna al FileField como string, con lo
    que Django lo guarda sin volver a subirlo y la transacción sólo cubre
    trabajo de base de datos.
"""

from django.core.files.uploadedfile import UploadedFile


def stage_upload(model, field_name, uploaded_file, instance=None):
    """
    Sube ``uploaded_file`` al storage del campo y devuelve el nombre resultante.

    Args:
        model: clase del modelo dueño del FileField.
        field_name: nombre del FileField (por ejemplo ``'receipt_file'``).
        uploaded_file: archivo recibido en ``request.FILES`` (puede ser None).
        instance: sólo necesario si ``upload_to`` del campo es un callable.

    Returns:
        str | None: el nombre almacenado, o None si no venía archivo.

    Debe llamarse SIEMPRE fuera de ``transaction.atomic()``. Si la transacción
    posterior falla, el archivo queda huérfano en el storage; es un costo
    aceptable frente a bloquear la fila durante toda la subida.
    """
    if not uploaded_file:
        return None

    if not isinstance(uploaded_file, UploadedFile):
        # Ya es un nombre almacenado, no hay nada que subir.
        return uploaded_file

    field = model._meta.get_field(field_name)

    if callable(field.upload_to) and instance is None:
        raise ValueError(
            f"{model.__name__}.{field_name} usa un upload_to dinámico: "
            "se requiere 'instance' para calcular la ruta."
        )

    filename = field.generate_filename(instance, uploaded_file.name)
    return field.storage.save(filename, uploaded_file)
