"""
Validadores de seguridad para uploads de archivos
Implementa restricciones estrictas de tipo y tamaño para prevenir vulnerabilidades
"""
import os
from django.core.exceptions import ValidationError


# Mapeo de extensiones a MIME types permitidos
ALLOWED_MIME_TYPES = {
    '.pdf': ['application/pdf'],
    '.jpg': ['image/jpeg'],
    '.jpeg': ['image/jpeg'],
    '.png': ['image/png'],
}

ALLOWED_EXTENSIONS = list(ALLOWED_MIME_TYPES.keys())


def validate_file_extension(value):
    """
    Valida que el archivo sea solo PDF, JPG o PNG
    Bloquea archivos potencialmente peligrosos (.exe, .sh, .php, etc.)
    """
    ext = os.path.splitext(value.name)[1].lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise ValidationError(
            f'Tipo de archivo no permitido. Solo se aceptan: {", ".join(ALLOWED_EXTENSIONS)}'
        )


def validate_file_mime_type(value):
    """
    Valida el MIME type real del archivo usando magic bytes
    Previene ataques de suplantación de extensión
    """
    import magic

    ext = os.path.splitext(value.name)[1].lower()
    allowed_mimes = ALLOWED_MIME_TYPES.get(ext, [])

    # Leer los primeros bytes para detectar el tipo real
    value.seek(0)
    file_mime = magic.from_buffer(value.read(2048), mime=True)
    value.seek(0)  # Resetear el cursor del archivo

    if file_mime not in allowed_mimes:
        raise ValidationError(
            f'El contenido del archivo no coincide con su extensión. '
            f'Extensión: {ext}, Tipo detectado: {file_mime}'
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
    validate_file_mime_type(value)
