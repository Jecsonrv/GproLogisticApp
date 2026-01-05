# Documentación: Sistema de Bloqueo DTE con Ventana de 24 Horas

## Descripción General

Se ha implementado un sistema de bloqueo automático para facturas (CXC) que cumple con las regulaciones fiscales de El Salvador, permitiendo una ventana de 24 horas para correcciones antes del bloqueo permanente.

## Flujo de Trabajo

### 1. **Subir PDF de Factura**

-   Cuando se sube un archivo PDF a través del campo `pdf_file` de una factura:
    -   El sistema automáticamente marca `is_dte_issued = True`
    -   Se registra el timestamp en `dte_issued_at`
    -   La factura queda en estado "DTE Emitido"
    -   El número de DTE se puede editar posteriormente desde el formulario de edición

### 2. **Editar Número de DTE**

-   El número de DTE (`dte_number`) se puede editar en cualquier momento desde el formulario de edición de facturas
-   No es necesario tener un botón separado para "Marcar como DTE"
-   El campo `dte_number` es opcional pero recomendado para referencia fiscal

### 3. **Periodo de Gracia (24 horas)**

-   Durante las primeras 24 horas desde `dte_issued_at`:
    -   La factura **SÍ puede eliminarse** sin necesidad de nota de crédito
    -   Esto cumple con el plazo que otorga Hacienda para correcciones
    -   El frontend puede mostrar advertencias pero permitir la eliminación

### 4. **Bloqueo Permanente (después de 24 horas)**

-   Una vez transcurridas 24 horas desde `dte_issued_at`:
    -   La factura **NO puede eliminarse** directamente
    -   Solo se puede anular mediante **Nota de Crédito**
    -   Intentar eliminar retorna un error 400 con código `DTE_LOCKED`

## Cambios en el Modelo

### Nuevo Campo: `dte_issued_at`

```python
dte_issued_at = models.DateTimeField(
    null=True,
    blank=True,
    verbose_name="Fecha de Emisión DTE",
    help_text="Fecha y hora en que se marcó como DTE emitido. Permite eliminación durante 24 horas."
)
```

### Nuevos Métodos

#### `can_delete_without_credit_note()`

```python
def can_delete_without_credit_note(self):
    """
    Verifica si la factura puede eliminarse sin nota de crédito.
    Retorna True si:
    - No está emitida como DTE, O
    - Está emitida pero han pasado menos de 24 horas desde la emisión
    """
```

#### `get_hours_until_locked()`

```python
def get_hours_until_locked(self):
    """
    Retorna las horas restantes hasta que se bloquee permanentemente.
    Retorna None si ya está bloqueado o no aplica.
    """
```

## Cambios en las Vistas

### `InvoiceViewSet.destroy()`

Ahora valida:

1. Si hay pagos registrados → Error (como antes)
2. Si `is_dte_issued = True` y han pasado 24 horas → Error con código `DTE_LOCKED`
3. Si está dentro de las 24 horas → Permite eliminación (con advertencia opcional)

```python
if invoice.is_dte_issued:
    if not invoice.can_delete_without_credit_note():
        return Response({
            'error': 'Esta factura tiene DTE emitido y ha pasado el plazo de 24 horas. '
                    'Solo puede anularse mediante Nota de Crédito.',
            'code': 'DTE_LOCKED',
            'dte_issued_at': invoice.dte_issued_at.isoformat()
        }, status=400)
```

### `InvoiceViewSet.mark_as_dte()`

Ahora valida que existe el PDF y establece el timestamp:

```python
# Validar que existe el PDF de la factura antes de marcar como emitido
if not invoice.pdf_file:
    return Response({
        'error': 'No se puede marcar como DTE emitido sin haber subido el PDF de la factura.',
        'code': 'PDF_REQUIRED'
    }, status=400)

invoice.is_dte_issued = True
invoice.dte_issued_at = timezone.now()  # ← NUEVO
invoice.dte_number = dte_number
```

## Cambios en los Serializers

### Nuevos Campos en Respuesta API

Tanto `InvoiceListSerializer` como `InvoiceDetailSerializer` ahora incluyen:

-   **`dte_issued_at`**: Timestamp de cuando se emitió el DTE
-   **`can_delete`**: Boolean que indica si puede eliminarse sin nota de crédito
-   **`hours_until_locked`**: Horas restantes hasta el bloqueo permanente (null si no aplica)

Ejemplo de respuesta:

```json
{
  "id": 123,
  "invoice_number": "FAC-00045-2026",
  "is_dte_issued": true,
  "dte_issued_at": "2026-01-04T10:30:00Z",
  "can_delete": true,
  "hours_until_locked": 18.5,
  "is_editable": false,
  ...
}
```

## Migración de Base de Datos

Se ha creado la migración `0025_add_dte_issued_timestamp.py` que:

-   Agrega el campo `dte_issued_at` (nullable)
-   Las facturas existentes tendrán `dte_issued_at = NULL`
    -   Si `is_dte_issued = False` → Sin cambios, funciona normal
    -   Si `is_dte_issued = True` → Se considera ya bloqueado (sin periodo de gracia)

## Recomendaciones para el Frontend

### 1. Mostrar Estado del Bloqueo

```javascript
if (invoice.is_dte_issued) {
    if (invoice.can_delete) {
        const hours = Math.floor(invoice.hours_until_locked);
        showWarning(
            `DTE emitido. Puede eliminarse durante ${hours} horas más.`
        );
    } else {
        showError("DTE bloqueado. Solo puede anularse con Nota de Crédito.");
    }
}
```

### 2. Deshabilitar Botón de Eliminar

```javascript
const canDelete = !invoice.is_dte_issued || invoice.can_delete;
<button disabled={!canDelete}>Eliminar</button>;
```

### 3. Mostrar Contador Regresivo

```javascript
if (invoice.hours_until_locked && invoice.hours_until_locked > 0) {
    const hours = Math.floor(invoice.hours_until_locked);
    const minutes = Math.floor((invoice.hours_until_locked % 1) * 60);
    showCountdown(`${hours}h ${minutes}m restantes para correcciones`);
}
```

## Casos de Uso

### Caso 0: Intentar Marcar como DTE sin PDF

```
Estado: is_dte_issued = False, pdf_file = None
Acción: Intentar mark_as_dte
Resultado: Error 400 - "PDF_REQUIRED"
Mensaje: "No se puede marcar como DTE emitido sin haber subido el PDF de la factura."
```

### Caso 1: Factura Normal (sin DTE)

```
Estado: is_dte_issued = False
Acción: Puede editarse y eliminarse normalmente
```

### Caso 2: PDF Recién Subido

```
Estado: is_dte_issued = True, dte_issued_at = hace 2 horas
Acción: Puede eliminarse (dentro de 24h)
Advertencia: "Quedan 22 horas para correcciones"
```

### Caso 3: DTE Marcado hace 30 horas

```
Estado: is_dte_issued = True, dte_issued_at = hace 30 horas
Acción: NO puede eliminarse
Solución: Crear Nota de Crédito
```

### Caso 4: Con Pagos Registrados

```
Estado: Cualquiera + paid_amount > 0
Acción: NO puede eliminarse (requiere eliminar pagos primero)
```

## Testing

### Pruebas Recomendadas

1. **Subir PDF** → Verificar que `is_dte_issued = True` y `dte_issued_at` se establece
2. **Eliminar dentro de 24h** → Debe permitir eliminación
3. **Eliminar después de 24h** → Debe retornar error `DTE_LOCKED`
4. **Marcar manualmente como DTE** → Verificar que `dte_issued_at` se establece
5. **API response** → Verificar que `can_delete` y `hours_until_locked` están presentes

## Notas Importantes

-   ✅ Compatible con facturas existentes (dte_issued_at nullable)
-   ✅ No afecta el flujo de Notas de Crédito
-   ✅ Cumple con regulaciones fiscales de El Salvador
-   ✅ Protege contra eliminaciones accidentales después del plazo
-   ✅ Permite correcciones dentro del plazo legal de 24 horas
