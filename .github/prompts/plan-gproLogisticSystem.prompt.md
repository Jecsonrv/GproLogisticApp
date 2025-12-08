# SISTEMA DE GESTIÓN GPRO LOGISTIC - Plan de Desarrollo

## 1. RESUMEN DEL PROYECTO

Es una aplicación web para una agencia de tramitaciones aduanales

### Stack Tecnológico:

-   **Backend**: Python con Django REST Framework
-   **Frontend**: React con Vite y Tailwind CSS
-   **Base de Datos**: PostgreSQL
-   **Despliegue**: Vercel (Frontend) y Railway/Render (Backend)

---

## 2. ESTRUCTURA DE USUARIOS Y ROLES (Permissions)

El sistema tiene 3 niveles de acceso estrictos:

### Rol "Operativo"

-   Puede crear Órdenes de Servicio (OS)
-   Registrar transferencias
-   Ver clientes

### Rol "Operativo2"

-   Todo lo anterior
-   Descargar estados de cuenta
-   Exportar a Excel

### Rol "Administrador"

-   Acceso total
-   Gestión de usuarios
-   Gestión de catálogos

---

## 3. MODELO DE DATOS (Entidades Principales)

### A. Órdenes de Servicio (OS)

**Campos:**

-   Cliente
-   Subcliente
-   Tipo de Embarque
-   Proveedor
-   PO (Purchase Order)
-   ETA (Estimated Time of Arrival)
-   DUCA

**Lógica Crítica:**

-   Debe tener un número consecutivo automático (001, 002...) validado para evitar duplicados
-   Debe permitir adjuntar documentos PDF
-   Debe tener estados (Abierta, Cerrada)

### B. Transferencias y Provisiones (Gastos)

**Tipos de gasto:**

-   Cargos a Clientes (Terceros)
-   Costos Operativos (Propios)
-   Gastos Administrativos

**Estado del pago:**

-   "Provisionada"
-   "Pagada"

**Funcionalidad:**

-   Debe permitir adjuntar la factura del proveedor

### C. Clientes

**Datos Fiscales:**

-   NIT
-   Registro IVA
-   Dirección

**Finanzas:**

-   Condición de pago (Contado/Crédito)
-   Días de crédito
-   Límite de crédito

### D. Catálogos

Tablas auxiliares para:

-   Proveedores
-   Aforadores
-   Tipos de Embarque
-   Subclientes

---

## 4. REQUERIMIENTOS FUNCIONALES CLAVE

### Dashboard

Debe mostrar KPIs:

-   Total OS mes
-   Monto facturado
-   Gastos terceros

### Estados de Cuenta

Vista por cliente que muestre:

-   Crédito disponible vs. utilizado
-   Lista de facturas pendientes

### Exportación

Capacidad de generar:

-   Excel de los listados
-   Descargar documentos masivos en ZIP

---

## 5. REGLAS DE VALIDACIÓN

Cuando se genere código, asegurarse de que cumpla con estas reglas de negocio:

-   Campo DUCA obligatorio en OS
-   Campo ETA obligatorio en OS
-   Consecutivo automático único en OS
-   Validación de límite de crédito en clientes
-   Permisos estrictos por rol
