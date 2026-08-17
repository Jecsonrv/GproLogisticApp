"""
Asignación de correlativos de documentos sin bloquear tablas completas.

El patrón anterior (`Model.objects.select_for_update().filter(numero__regex=...)`)
tomaba un `FOR UPDATE` sobre TODAS las filas del año para calcular el siguiente
número. Esos locks se liberan recién cuando confirma la transacción de la
petición completa (subida de archivos a S3 incluida), así que cualquier otra
petición que tocara una de esas filas —por ejemplo un PATCH a una factura—
quedaba encolada hasta agotar el `statement_timeout` y moría con
`QueryCanceled: canceling statement due to statement timeout`.

Aquí se bloquea únicamente la fila contador de la serie, nunca los documentos
ya emitidos.
"""

from django.db import IntegrityError, transaction


def next_number(key, current_max=None):
    """
    Reserva y devuelve el siguiente correlativo de la serie ``key``.

    Args:
        key: identificador de la serie, por ejemplo ``'service_order:2026'``.
        current_max: callable opcional que devuelve el mayor correlativo ya
            presente en la tabla. Se consulta SIN bloqueo y sirve para respetar
            números ingresados manualmente que el contador aún no conoce.

    Returns:
        int: el número reservado (ya persistido en el contador).

    La reserva es exclusiva entre peticiones concurrentes porque el contador se
    lee con ``select_for_update()``, pero el bloqueo afecta a una sola fila de
    ``DocumentSequence`` y no a los documentos existentes.
    """
    from .models import DocumentSequence

    with transaction.atomic():
        counter = DocumentSequence.objects.select_for_update().filter(key=key).first()

        if counter is None:
            # Primera vez que se usa la serie. El savepoint permite recuperarse
            # si otra petición concurrente creó la misma fila primero.
            try:
                with transaction.atomic():
                    DocumentSequence.objects.create(key=key, last_number=0)
            except IntegrityError:
                pass
            counter = DocumentSequence.objects.select_for_update().get(key=key)

        last_number = counter.last_number
        if current_max is not None:
            last_number = max(last_number, current_max() or 0)

        counter.last_number = last_number + 1
        counter.save(update_fields=['last_number', 'updated_at'])

        return counter.last_number
