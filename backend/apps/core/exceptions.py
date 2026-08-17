from django.db import OperationalError
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

# Códigos SQLSTATE de PostgreSQL para contención de bloqueos.
PG_QUERY_CANCELED = '57014'   # statement_timeout agotado (normalmente esperando un lock)
PG_LOCK_NOT_AVAILABLE = '55P03'  # lock_timeout agotado
PG_DEADLOCK_DETECTED = '40P01'

LOCK_CONTENTION_CODES = {PG_QUERY_CANCELED, PG_LOCK_NOT_AVAILABLE, PG_DEADLOCK_DETECTED}


def _pg_sqlstate(exc):
    """Extrae el SQLSTATE de PostgreSQL de una excepción envuelta por Django."""
    cause = getattr(exc, '__cause__', None)
    return getattr(cause, 'pgcode', None)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures all errors are returned as JSON,
    even unhandled server errors (500).
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    # Contención de bloqueos: otro usuario mantiene bloqueado el registro.
    # No es un fallo del servidor, es un conflicto temporal reintentable.
    if response is None and isinstance(exc, OperationalError):
        if _pg_sqlstate(exc) in LOCK_CONTENTION_CODES:
            view_name = context['view'].__class__.__name__
            logger.warning(
                f"Lock contention in {view_name}: {exc}",
                exc_info=True
            )
            return Response(
                {
                    "detail": "El registro está siendo modificado por otra operación en curso. "
                              "Espere unos segundos e intente nuevamente.",
                    "code": "resource_locked",
                },
                status=status.HTTP_409_CONFLICT
            )

    # If response is None, then there's an unhandled exception (like a standard Python error)
    if response is None:
        # Log the full error for debugging
        view_name = context['view'].__class__.__name__
        logger.error(f"Unhandled exception in {view_name}: {exc}", exc_info=True)
        
        # Return a generic JSON error instead of HTML
        return Response(
            {
                "detail": "Ha ocurrido un error interno en el servidor. Por favor contacte a soporte.",
                "code": "internal_server_error",
                "original_error": str(exc) # Optional: include simple error message for easier debugging (remove in strict prod)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    return response
