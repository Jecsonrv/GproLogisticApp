from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler that ensures all errors are returned as JSON,
    even unhandled server errors (500).
    """
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

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
