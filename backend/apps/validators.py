"""
Validadores de seguridad para uploads de archivos
Implementa restricciones estrictas de tipo y tamaño para prevenir vulnerabilidades
"""
import os
from django.core.exceptions import ValidationError


def validate_file_extension(value):
    """
    Valida que el archivo sea solo PDF, JPG o PNG
    Bloquea archivos potencialmente peligrosos (.exe, .sh, .php, etc.)
    """
    ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

    ext = os.path.splitext(value.name)[1].lower()

    if not ext in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f'Tipo de archivo no permitido. Solo se aceptan: {", ".join(ALLOWED_EXTENSIONS)}'
        )


def validate_file_size(value):
    """
    Valida que el archivo no exceda 5MB
    Previene ataques de saturación del servidor
    """
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB en bytes

    if value.size > MAX_FILE_SIZE:
        raise ValidationError(
            f'El archivo excede el tamaño máximo permitido de 5MB. '
            f'Tamaño actual: {value.size / (1024 * 1024):.2f}MB'
        )


def validate_document_file(value):
    """
    Validador compuesto que aplica todas las validaciones de seguridad
    Usar este validador en los campos FileField
    """
    validate_file_extension(value)
    validate_file_size(value)
