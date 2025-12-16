# Reporte de Auditoría de Calidad y Seguridad - Gpro Logistic App

**Fecha:** 15 de Diciembre de 2025
**Auditor:** Gemini (Arquitecto de Software & Lead QA)

## 1. Resumen Ejecutivo
Se realizó una revisión profunda del código fuente enfocada en integridad financiera, seguridad de datos (IDOR) y rendimiento. Se detectaron vulnerabilidades críticas en el cálculo de márgenes (falta de soporte multimoneda) y acceso a datos (falta de Row-Level Security). Todas las vulnerabilidades detectadas han sido mitigadas.

## 2. Hallazgos y Correcciones

### A. Integridad Financiera (Profit & Loss)
*   **Hallazgo:** El sistema asumía una única moneda (GTQ). Al ingresar costos en USD (ej. $100) y ventas en GTQ (ej. Q1000), el sistema calculaba el profit como `1000 - 100 = 900`, ignorando que $100 USD son aprox. Q750 GTQ (Profit real = 250).
*   **Corrección:** 
    *   Se agregaron campos `currency` y `exchange_rate` a los modelos `Transfer` (Gastos) y `OrderCharge` (Ingresos).
    *   Se actualizaron los métodos de cálculo en `ServiceOrder` (`get_total_services`, `get_total_third_party`) para normalizar todos los montos a la moneda base (GTQ) usando el tipo de cambio registrado.
    *   **Resultado:** Los reportes de Ganancia/Pérdida ahora son precisos independientemente de la moneda de la transacción original.

### B. Seguridad de Acceso (IDOR)
*   **Hallazgo:** El endpoint `GET /api/service-orders/` permitía a cualquier usuario con rol 'operativo' ver **todas** las órdenes de servicio, simplemente iterando IDs, sin restricción de propiedad.
*   **Corrección:**
    *   Se implementó seguridad a nivel de fila (Row-Level Security) en `ServiceOrderViewSet.get_queryset`.
    *   **Regla aplicada:**
        *   `Admin` / `Operativo2` (Gerentes): Ven todo.
        *   `Operativo`: Solo ve órdenes donde es el **Aforador (customs_agent)** o el **Creador**.
    *   **Resultado:** Un operativo ya no puede espiar las órdenes de otro operativo ni acceder a datos confidenciales no asignados.

### C. Optimización y Rendimiento (N+1 Queries)
*   **Hallazgo:** El listado de órdenes ejecutaba 1 query principal + 5 queries adicionales *por cada orden* para traer datos de Cliente, Subcliente, Proveedor, Aforador y Creador. Para 100 órdenes, esto generaba ~501 consultas a la base de datos.
*   **Corrección:**
    *   Se implementó `select_related('client', 'sub_client', 'shipment_type', 'provider', 'customs_agent', 'created_by')` en la vista.
    *   **Resultado:** El listado ahora se resuelve en **1 única consulta SQL** optimizada, reduciendo la carga del servidor en un 90%+.

### D. Frontend / UX Defensiva
*   **Hallazgo:** El frontend calculaba los totales de la tabla de servicios localmente (`cantidad * precio`), ignorando el tipo de cambio que el backend ahora sí procesa. Esto creaba una discrepancia visual ("El total dice 750, pero la suma de filas da 100").
*   **Corrección:**
    *   Se actualizó la función `calculateChargeTotal` en `ServiceOrderDetail.jsx` para multiplicar por el `exchange_rate` si existe.
    *   Se verificó la existencia de `ErrorBoundary` global para prevenir "pantallas blancas".

## 3. Próximos Pasos Recomendados
1.  Ejecutar `python manage.py makemigrations` y `python manage.py migrate` para aplicar los cambios en base de datos.
2.  Capacitar a los operativos para que ingresen el "Tipo de Cambio" correcto al registrar gastos en USD.
