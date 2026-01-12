# Script de Corrección: Balances de Facturas con Retención

## 📋 Problema Identificado

Las facturas con retención tenían un **bug crítico** en el cálculo del balance:

### Fórmula Incorrecta (antes):
```python
balance = (total_amount - retencion) - paid_amount - credited_amount
```

### Fórmula Correcta (ahora):
```python
balance = total_amount - paid_amount - credited_amount
```

### ¿Por qué estaba mal?

La retención del 1% **NO debe restarse automáticamente** del balance porque:

1. **La retención es un monto informativo** que indica cuánto debe retener el cliente
2. **Se paga mediante comprobante F-910** que se registra como un pago normal con `payment_method='retencion'`
3. **La fórmula anterior causaba doble contabilización**:
   - Restaba la retención del balance automáticamente
   - Cuando se registraba el pago F-910, sumaba a `paid_amount`
   - Resultado: el balance quedaba incorrecto

### Ejemplo del Bug:

**Factura con retención de $10 sobre total de $1000:**

❌ **CON EL BUG:**
- `total_amount` = $1000
- `retencion` = $10
- `paid_amount` = $0
- `balance` = ($1000 - $10) - $0 = **$990** ← Incorrecto

✅ **CORREGIDO:**
- `total_amount` = $1000
- `retencion` = $10 (informativo)
- `paid_amount` = $0
- `balance` = $1000 - $0 = **$1000** ← Correcto

Cuando el cliente registra el F-910 por $10:
- `paid_amount` = $10
- `balance` = $1000 - $10 = **$990** ← Ahora sí es correcto

---

## 🔧 Scripts de Corrección

Se han creado **2 scripts** para corregir las facturas existentes:

### Opción 1: Django Management Command (Recomendado)

```bash
# 1. Ver qué facturas necesitan corrección (DRY RUN - no guarda cambios)
python manage.py fix_retention_balances

# 2. Aplicar las correcciones
python manage.py fix_retention_balances --apply

# 3. Ver detalle de una factura específica
python manage.py fix_retention_balances --detail PRE-00123-2025
```

**Ubicación:** `backend/apps/orders/management/commands/fix_retention_balances.py`

### Opción 2: Script Standalone

```bash
# Desde el directorio backend/
python manage.py shell < fix_retention_balances.py

# O desde el shell de Django:
python manage.py shell
>>> from fix_retention_balances import fix_retention_balances
>>> fix_retention_balances(dry_run=True)   # Ver qué cambiaría
>>> fix_retention_balances(dry_run=False)  # Aplicar cambios
```

**Ubicación:** `backend/fix_retention_balances.py`

---

## 📊 Qué Hace el Script

1. **Identifica** todas las facturas con `retencion > 0`
2. **Calcula** el balance correcto para cada una
3. **Compara** con el balance actual
4. **Muestra** un reporte detallado de las diferencias
5. **Corrige** los balances (solo si se ejecuta con `--apply`)
6. **Actualiza** el estado de la factura si es necesario (pending → paid, etc.)

---

## 📝 Ejemplo de Salida

```
================================================================================
CORRECCIÓN: Balances de Facturas con Retención
================================================================================

⚠️  MODO DRY RUN - No se guardarán cambios
    Para aplicar cambios, usa: --apply

📊 Facturas con retención: 15

--------------------------------------------------------------------------------
Factura              Cliente                   Balance Viejo   Balance Nuevo   Estado
--------------------------------------------------------------------------------
PRE-00045-2025       ACME Corporation          $990.00         $1000.00        ❌ CORREGIR
PRE-00067-2025       Global Logistics SA       $1485.00        $1500.00        ❌ CORREGIR
PRE-00089-2025       Tech Solutions Inc        $0.00           $0.00           ✅ YA CORRECTO
--------------------------------------------------------------------------------

================================================================================
RESUMEN
================================================================================
Total analizadas:     15
Necesitan corrección:  12
Ya correctas:         3
Errores:              0

⚠️  Para aplicar los cambios:
    python manage.py fix_retention_balances --apply
================================================================================
```

---

## ⚠️ Recomendaciones

### Antes de Ejecutar:

1. **Hacer backup de la base de datos**
   ```bash
   # PostgreSQL
   pg_dump -U usuario -d nombre_db > backup_antes_fix_retention.sql
   
   # MySQL
   mysqldump -u usuario -p nombre_db > backup_antes_fix_retention.sql
   ```

2. **Ejecutar primero en modo DRY RUN** para ver qué cambiaría:
   ```bash
   python manage.py fix_retention_balances
   ```

3. **Revisar el reporte** y verificar que los cambios sean correctos

4. **Aplicar los cambios**:
   ```bash
   python manage.py fix_retention_balances --apply
   ```

### Después de Ejecutar:

1. **Verificar algunas facturas manualmente** usando:
   ```bash
   python manage.py fix_retention_balances --detail PRE-00123-2025
   ```

2. **Revisar en la interfaz** que los balances se muestren correctamente

3. **Probar el flujo completo** de registro de comprobantes F-910

---

## 🐛 Solución de Problemas

### Error: "No module named 'apps.orders'"

Asegúrate de ejecutar desde el directorio `backend/`:
```bash
cd backend/
python manage.py fix_retention_balances
```

### Error: "Invoice matching query does not exist"

El número de factura no existe. Verifica el formato:
```bash
python manage.py fix_retention_balances --detail PRE-00123-2025
```

### Las facturas siguen mostrando balance incorrecto

1. Verifica que el script se ejecutó con `--apply`
2. Limpia la caché del navegador (Ctrl + Shift + R)
3. Verifica que el backend esté usando el código actualizado

---

## 📞 Soporte

Si encuentras algún problema o tienes dudas:

1. Revisa los logs del script
2. Verifica que el modelo `Invoice` tenga la corrección aplicada
3. Ejecuta el script con `--detail` para ver información específica de una factura

---

## ✅ Checklist de Implementación

- [x] Corregir modelo `Invoice.save()` en `models.py`
- [x] Corregir método `Invoice.calculate_totals()` en `models.py`
- [x] Crear script de corrección como management command
- [x] Crear script standalone alternativo
- [x] Documentar el problema y la solución
- [ ] Ejecutar script en DRY RUN
- [ ] Hacer backup de la base de datos
- [ ] Ejecutar script con --apply
- [ ] Verificar resultados
- [ ] Probar flujo completo de retenciones

---

**Fecha de Creación:** 2025-01-11  
**Versión:** 1.0  
**Autor:** Sistema de Corrección Automática
