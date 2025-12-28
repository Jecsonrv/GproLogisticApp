# Plan de Pruebas Integral - Gpro Logistic System

Este documento describe los pasos estructurados para probar el flujo completo del sistema Gpro Logistic, desde la configuración inicial hasta la facturación y cierre contable.

**Prerrequisitos:**
- Base de datos limpia (excepto usuarios).
- Usuario con rol de Administrador.

---

## 1. Configuración Inicial (Catálogos)

Antes de operar, es necesario poblar los catálogos base.

1.  **Bancos:**
    *   Ir a Catálogos -> Bancos.
    *   Crear al menos 2 bancos (ej. "Banco Agrícola", "BAC Credomatic").
2.  **Categorías de Proveedores:**
    *   Ir a Catálogos -> Categorías de Proveedores.
    *   Crear categorías: "Naviera", "Transporte Terrestre", "Agencia Aduanal", "Otros".
3.  **Proveedores:**
    *   Ir a Catálogos -> Proveedores.
    *   Crear un proveedor para cada categoría (ej. "Maersk", "Transportes Veloces", "Aduana Express").
4.  **Tipos de Embarque:**
    *   Ir a Catálogos -> Tipos de Embarque.
    *   Crear: "Marítimo FCL", "Aéreo", "Terrestre".
5.  **Servicios (Catálogo General):**
    *   Ir a Catálogos -> Servicios.
    *   Crear servicio "Flete Marítimo" (Precio: $1000, Exento).
    *   Crear servicio "Trámite Aduanal" (Precio: $150, Gravado).
    *   Crear servicio "Transporte Local" (Precio: $200, Gravado).

---

## 2. Gestión Comercial (Clientes)

1.  **Crear Clientes:**
    *   **Cliente A (Pequeño):** Crear cliente con clasificación "Pequeño Contribuyente".
    *   **Cliente B (Grande):** Crear cliente con clasificación "Gran Contribuyente" (Esto activará la retención del 1% en facturas > $100).
    *   **Cliente C (Crédito):** Crear cliente con condición de pago "Crédito" y límite $5000.
2.  **Precios Personalizados (Tarifario):**
    *   Ir al perfil del **Cliente B**.
    *   Asignar precio personalizado para "Trámite Aduanal" a $120 (Descuento especial).

---

## 3. Operaciones (Órdenes de Servicio)

### Escenario A: Importación Marítima (Cliente Grande)

1.  **Crear Orden:**
    *   Nuevo -> Orden de Servicio.
    *   Cliente: **Cliente B**.
    *   Tipo Embarque: "Marítimo FCL".
    *   Completar campos: BL, Poliza, Referencia.
2.  **Calculadora de Servicios (Ingresos):**
    *   Agregar "Flete Marítimo" (Debería salir Exento).
    *   Agregar "Trámite Aduanal" (Debería salir a $120 según tarifario + IVA).
    *   Agregar un servicio manual "Gastos Extra" ($50 + IVA).
3.  **Calculadora de Gastos (Egresos/Reembolsables):**
    *   Agregar Gasto (Transferencia) tipo "Costos Directos" -> Pago a Naviera (Maersk). Monto $800.
    *   Agregar Gasto tipo "Cargos a Clientes" -> Pago a Terceros (Transporte). Monto $150.
        *   Configurar: Margen 10% al cliente.
        *   Configurar: Cliente Aplica IVA (Gravado).
4.  **Documentación:**
    *   Subir un PDF de prueba en la pestaña Documentos (ej. BL).
5.  **Cambio de Estado:**
    *   Mover la orden a "En Tránsito" y luego "En Puerto".

---

## 4. Facturación (Cuentas por Cobrar)

1.  **Pre-Factura (Cliente B):**
    *   En la Orden del Escenario A, ir a pestaña Facturación.
    *   Clic en "Generar Pre-Factura".
    *   **Verificar Totales:**
        *   Servicios: Suma de base + IVA.
        *   Gastos a Terceros: Verificar que el transporte incluye el margen del 10% y el IVA.
        *   **Retención 1%:** Verificar que se esté calculando la retención sobre el subtotal de SERVICIOS (porque Cliente B es Gran Contribuyente y > $100). *Nota: Los gastos a terceros no suelen llevar retención en este flujo, verificar lógica.*
2.  **Emisión DTE:**
    *   Clic en "Emitir DTE" (Simular).
    *   Ingresar número de DTE real.
    *   La factura pasa a estado "Pendiente de Pago" (o Crédito).
3.  **Abono/Pago:**
    *   Registrar un pago parcial del cliente (ej. 50% del total).
    *   Verificar que el saldo de la factura disminuye.

---

## 5. Cuentas por Pagar (Proveedores)

1.  **Aprobación de Gastos:**
    *   Ir al módulo "Cuentas por Pagar" o "Transferencias".
    *   Filtrar por "Pendientes".
    *   Aprobar el pago a la Naviera ($800) y al Transporte ($150).
2.  **Pago Individual:**
    *   Registrar pago para el Transporte ($150).
    *   Subir comprobante.
    *   Estado cambia a "Pagado".
3.  **Pago por Lote (Batch):**
    *   Crear otra Orden rápida para el mismo proveedor (Naviera) con otro gasto de $500.
    *   Ir a "Pagos por Lote".
    *   Seleccionar Proveedor "Maersk".
    *   Seleccionar las dos facturas pendientes ($800 y $500).
    *   Generar Pago Total ($1300).
    *   Verificar que ambas transferencias quedan como "Pagadas".

---

## 6. Reportes y Cierre

1.  **Dashboard:**
    *   Verificar KPI de "Ventas del Mes".
    *   Verificar KPI de "Utilidad" (Ingresos - Costos Directos).
2.  **Estado de Cuenta Cliente:**
    *   Ir a Cliente B -> Estado de Cuenta.
    *   Verificar saldo pendiente.

---

**Nota:** Si encuentras algún error durante estos pasos, por favor repórtalo con detalle del paso fallido.
