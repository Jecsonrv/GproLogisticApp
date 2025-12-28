"""
Constantes fiscales y de negocio centralizadas para GPRO Logistic.

Este modulo centraliza todas las constantes fiscales de El Salvador
para facilitar el mantenimiento y evitar duplicacion.

Normativa aplicable:
- Ley de IVA de El Salvador
- Codigo Tributario Art. 162 (Retenciones)
"""

from decimal import Decimal

# =============================================================================
# CONSTANTES FISCALES - EL SALVADOR
# =============================================================================

# Tasa de IVA (13%)
IVA_RATE = Decimal('0.13')

# Tasa de retencion para Grandes Contribuyentes (1%)
RETENCION_RATE = Decimal('0.01')

# Umbral minimo para aplicar retencion ($100.00)
RETENCION_THRESHOLD = Decimal('100.00')

# =============================================================================
# TIPOS DE TRATAMIENTO FISCAL
# =============================================================================

# Tipos de IVA para servicios y cargos
IVA_TYPE_CHOICES = (
    ('gravado', 'Gravado (13% IVA)'),
    ('no_sujeto', 'No Sujeto'),
)

# Tipos de contribuyente
TAXPAYER_TYPE_CHOICES = (
    ('pequeno', 'Pequeno Contribuyente'),
    ('mediano', 'Mediano Contribuyente'),
    ('grande', 'Gran Contribuyente'),
)

# =============================================================================
# VALIDADORES DE MONTOS
# =============================================================================

# Monto minimo permitido para cargos/pagos
MIN_AMOUNT = Decimal('0.01')

# Descuento maximo permitido (100%)
MAX_DISCOUNT_PERCENTAGE = Decimal('100.00')

# Precision decimal para calculos monetarios
MONETARY_DECIMAL_PLACES = 2

# =============================================================================
# ESTADOS DE DOCUMENTOS
# =============================================================================

# Estados de factura (Invoice)
INVOICE_STATUS_CHOICES = (
    ('pending', 'Pendiente'),
    ('partial', 'Pago Parcial'),
    ('paid', 'Pagada'),
    ('cancelled', 'Anulada'),
    ('overdue', 'Vencida'),
)

# Estados de orden de servicio
SERVICE_ORDER_STATUS_CHOICES = (
    ('pendiente', 'Pendiente'),
    ('en_puerto', 'En Puerto'),
    ('en_transito', 'En Transito'),
    ('en_almacen', 'En Almacenadora'),
    ('finalizada', 'Finalizada'),
    ('cerrada', 'Cerrada'),
)

# Estados de transfer/pago a proveedor
TRANSFER_STATUS_CHOICES = (
    ('pendiente', 'Pendiente'),
    ('aprobado', 'Aprobado'),
    ('parcial', 'Pago Parcial'),
    ('pagado', 'Pagado'),
)

# =============================================================================
# FUNCIONES UTILITARIAS
# =============================================================================

def calculate_iva(base_amount, iva_type='gravado'):
    """
    Calcula el IVA para un monto base.

    Args:
        base_amount: Decimal - Monto base sin IVA
        iva_type: str - Tipo de tratamiento fiscal ('gravado', 'no_sujeto')

    Returns:
        Decimal - Monto de IVA (0 si no aplica)
    """
    if iva_type == 'gravado':
        return base_amount * IVA_RATE
    return Decimal('0.00')


def calculate_retention(base_gravada, is_gran_contribuyente=False):
    """
    Calcula la retencion del 1% para Grandes Contribuyentes.

    Args:
        base_gravada: Decimal - Base gravada (solo montos con IVA)
        is_gran_contribuyente: bool - Si el cliente es Gran Contribuyente

    Returns:
        Decimal - Monto de retencion (0 si no aplica)
    """
    if not is_gran_contribuyente:
        return Decimal('0.00')

    if base_gravada <= RETENCION_THRESHOLD:
        return Decimal('0.00')

    return base_gravada * RETENCION_RATE


def round_monetary(amount, decimal_places=MONETARY_DECIMAL_PLACES):
    """
    Redondea un monto monetario a la precision correcta.

    Args:
        amount: Decimal - Monto a redondear
        decimal_places: int - Numero de decimales

    Returns:
        Decimal - Monto redondeado
    """
    from decimal import ROUND_HALF_UP
    quantize_str = '0.' + '0' * decimal_places
    return amount.quantize(Decimal(quantize_str), rounding=ROUND_HALF_UP)
