# PLAN ESTRUCTURADO - GPRO LOGISTIC CRM

## Sistema de Gestión para Agencia de Tramitaciones Aduanales

**Fecha de Creación:** 8 de Diciembre, 2025  
**Cliente:** GPRO Logistic (El Salvador)  
**Stack:** Django REST + React + PostgreSQL  
**Objetivo:** Sistema completo de gestión de operaciones aduanales con control financiero

---

## 📋 ÍNDICE

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Arquitectura de Información](#2-arquitectura-de-información)
3. [Modelo de Datos Completo](#3-modelo-de-datos-completo)
4. [Páginas y Funcionalidades](#4-páginas-y-funcionalidades)
5. [Sistema de Permisos](#5-sistema-de-permisos)
6. [Flujos de Trabajo Principales](#6-flujos-de-trabajo-principales)
7. [Mejoras UI/UX](#7-mejoras-uiux)
8. [Plan de Implementación](#8-plan-de-implementación)

---

## 1. VISIÓN GENERAL DEL SISTEMA

### 1.1 Propósito

Sistema integral para gestionar operaciones de una agencia aduanal, incluyendo:

-   **Operaciones:** Órdenes de Servicio (OS), transferencias, gastos
-   **Finanzas:** Facturación, cuentas por cobrar (CXC), estados de cuenta
-   **Catálogos:** Clientes, proveedores, servicios, aforadores, bancos
-   **Reportes:** Dashboard, comparativas, análisis de rentabilidad

### 1.2 Usuarios del Sistema

1. **Operativo:** Crear OS, registrar transferencias, consultar
2. **Operativo2:** Todo lo anterior + descargar reportes/Excel
3. **Administrador:** Acceso total + gestión de catálogos y usuarios

### 1.3 Flujo de Negocio Principal

```
1. Cliente solicita tramitación aduanal
2. Se crea Orden de Servicio (OS) con número consecutivo
3. Se registran gastos/transferencias asociadas a la OS
4. Se calculan cobros basados en tarifario del cliente
5. Se genera factura (DTE/FEX/CCF)
6. Se da seguimiento a pagos y saldos
7. Se genera estado de cuenta del cliente
8. Se cierra la OS cuando todo está pagado
```

---

## 2. ARQUITECTURA DE INFORMACIÓN

### 2.1 Páginas Necesarias (Solo las Esenciales)

#### 📊 MÓDULO OPERATIVO

1. **Órdenes de Servicio (OS)** ✅ Existente
    - Lista con filtros y búsqueda
    - Formulario de registro
    - Detalle expandido en la misma página
2. **Transferencias y Gastos** ✅ Existente
    - Lista con filtros por tipo, estado, mes
    - Formulario de registro
    - Subir facturas de proveedores

#### 💰 MÓDULO FINANCIERO

3. **Cálculo de Cobros**
    - Asociado al detalle de OS
    - Agregar servicios del tarifario
    - Vista previa de factura
4. **Facturación y CXC**

    - Lista de facturas emitidas
    - Generar factura desde OS
    - Registrar pagos/abonos
    - Subir DTE/FEX

5. **Estados de Cuenta**
    - Por cliente
    - Saldo pendiente vs crédito disponible
    - Facturas vencidas

#### 📁 MÓDULO CATÁLOGOS

6. **Clientes** ✅ Existente (Mejorar)

    - Datos fiscales (NIT, IVA, dirección)
    - Condiciones de pago
    - Límite de crédito
    - Tarifario personalizado

7. **Catálogos Generales** (Nueva página unificada)

    - **Proveedores:** Nombre, NIT, teléfono, email
    - **Aforadores:** Nombre, código, contacto
    - **Bancos:** Nombre, código
    - **Tipos de Embarque:** Marítimo, aéreo, terrestre
    - **Tipos de Gasto:** Terceros, costos, gastos admin
    - **Tipos de Factura:** DTE, FEX, CCF
    - **Métodos de Pago:** Transferencia, cheque, efectivo
    - **Subclientes:** Filiales de clientes principales

8. **Servicios y Tarifario** ✅ Existente
    - Servicios estándar con precios base
    - Tarifario personalizado por cliente

#### 📈 MÓDULO REPORTES

9. **Dashboard** ✅ Existente (Mejorar)
    - KPIs: OS del mes, facturado, pendiente de cobro
    - Gráficas de gastos por tipo
    - Top clientes
    - OS abiertas vs cerradas

#### 👤 MÓDULO ADMINISTRACIÓN

10. **Usuarios** ✅ Existente
    -   Gestión de usuarios y roles

### 2.2 Páginas a ELIMINAR/CONSOLIDAR

-   **NO** se necesita página separada de "Services" si ya está en Catálogos
-   **NO** se necesita página separada de "Client Pricing" (incluir en detalle de cliente)
-   **NO** se necesita "Invoicing" como página aislada (consolidar en Facturación)

### 2.3 Estructura de Navegación Propuesta

```
📱 NAVEGACIÓN PRINCIPAL (Sidebar)

├── 🏠 Dashboard
│
├── 📦 OPERACIONES
│   ├── Órdenes de Servicio (OS)
│   └── Transferencias y Gastos
│
├── 💵 FINANZAS
│   ├── Facturación y CXC
│   └── Estados de Cuenta
│
├── 📚 CATÁLOGOS
│   ├── Clientes
│   ├── Servicios y Tarifario
│   └── Catálogos Generales
│
└── ⚙️ ADMINISTRACIÓN
    └── Usuarios
```

---

## 3. MODELO DE DATOS COMPLETO

### 3.1 APPS DE DJANGO

#### App: `clients`

-   **Client** ✅ (Mejorar campos)

#### App: `catalogs`

-   **Provider** ✅
-   **CustomsAgent** ✅
-   **ShipmentType** ✅
-   **SubClient** ✅
-   **Service** ✅
-   **ClientServicePrice** ✅ (Tarifario personalizado)
-   **Bank** ⚠️ FALTA CREAR
-   **ExpenseType** ⚠️ FALTA CREAR (o usar choices en Transfer)

#### App: `orders`

-   **ServiceOrder** ✅
-   **OrderDocument** ✅
-   **OrderCharge** ✅ (Cobros calculados)
-   **Invoice** ✅
-   **Payment** ✅ (Pagos/abonos a facturas)

#### App: `transfers`

-   **Transfer** ✅ (Mejorar campos)

#### App: `users`

-   **User** ✅
-   **AuditLog** ✅

### 3.2 Campos Críticos por Modelo

#### ✅ Client (Mejorado)

```python
- name (Razón Social o Nombre Comercial)
- legal_name (Nombre Jurídico) ⚠️ AGREGAR
- nit
- iva_registration
- address
- phone
- secondary_phone ⚠️ AGREGAR
- email
- contact_person
- payment_condition (contado/crédito)
- credit_days
- credit_limit
- is_active
- notes
```

#### ⚠️ Bank (CREAR NUEVO MODELO)

```python
- name (Banco Agrícola, Scotiabank, etc.)
- code (BA, SC, etc.)
- swift_code
- is_active
```

#### ✅ ServiceOrder (Ya completo)

```python
- order_number (XXX-YYYY) ✅
- client ✅
- sub_client ✅
- shipment_type ✅
- provider ✅
- customs_agent (aforador) ✅
- purchase_order (PO) ✅
- bl_reference ✅
- eta ✅
- duca ✅
- status (abierta/cerrada) ✅
- facturado ✅
- mes ✅
- created_by, closed_by ✅
```

#### ✅ Transfer (Mejorar)

```python
- transfer_type (terceros/propios/admin) ✅
- status (provisionada/pagada) ✅
- amount ✅
- description ✅
- service_order ✅
- client ✅
- provider ✅
- beneficiary_name ✅
- bank (CharField) ⚠️ CAMBIAR A ForeignKey
- ccf (número de factura del proveedor) ✅
- invoice_file ✅
- payment_method ✅
- transaction_date ✅
- payment_date ✅
- mes ✅
- notes ✅
```

#### ✅ OrderCharge (Cálculo de Cobros)

```python
- service_order ✅
- service ✅
- description ✅
- quantity ✅
- unit_price ✅
- subtotal ✅ (calculado)
- iva_amount ✅ (calculado)
- total ✅ (calculado)
```

#### ✅ Invoice (Facturación)

```python
- service_order ✅
- invoice_number (DTE-XXX, FEX-XXX) ✅
- invoice_type (DTE/FEX/CCF) ✅
- issue_date ✅
- due_date ✅
- subtotal_services ✅
- iva_services ✅
- total_services ✅
- subtotal_third_party ✅
- total_amount ✅
- paid_amount ✅
- balance ✅
- status (pending/partial/paid/cancelled/overdue) ✅
- payment_condition ✅
- dte_file ✅
```

#### ✅ Payment (Pagos/Abonos)

```python
- invoice ✅
- payment_number ✅
- payment_date ✅
- amount ✅
- payment_method (transferencia/cheque/efectivo) ✅
- bank ⚠️ AGREGAR ForeignKey
- reference_number ✅
- notes ✅
```

---

## 4. PÁGINAS Y FUNCIONALIDADES

### 4.1 ÓRDENES DE SERVICIO (Mejorar UI)

#### Vista Lista

```
┌─────────────────────────────────────────────────────────────┐
│ 📦 Órdenes de Servicio                         [+ Nueva OS] │
├─────────────────────────────────────────────────────────────┤
│ Filtros:                                                    │
│ [Cliente ▼] [Estado ▼] [Mes ▼] [Aforador ▼] [Buscar...]  │
├─────────────────────────────────────────────────────────────┤
│ OS      │ Cliente    │ DUCA    │ ETA       │ Estado │ $ Total│
│ 001-2025│ ACME Corp │ DU12345 │ 15/12/2025│ Abierta│ $1,250 │
│ 002-2025│ Global SA │ DU12346 │ 18/12/2025│ Cerrada│ $2,890 │
└─────────────────────────────────────────────────────────────┘
```

#### Detalle de OS (Modal o Expandido)

```
┌─────────────────────────────────────────────────────────────┐
│ 📄 Detalle de OS: 001-2025                       [Editar] [X]│
├─────────────────────────────────────────────────────────────┤
│ INFORMACIÓN GENERAL                                         │
│ Cliente: ACME Corp          │ Subcliente: ACME Logistics    │
│ DUCA: DU12345              │ BL: BL789456                  │
│ Aforador: Juan Pérez       │ Tipo: Marítimo                │
│ ETA: 15/12/2025            │ Estado: ⚪ Abierta            │
├─────────────────────────────────────────────────────────────┤
│ 💰 CÁLCULO DE COBROS                         [+ Agregar]   │
│ Servicio                    │ Cant │ P.Unit │ IVA │ Total │
│ Gestión Aduanal            │  1   │ $150  │ $19.5│ $169.50│
│ Transporte Interno         │  1   │ $80   │ $10.4│ $90.40 │
│                                           Subtotal: $230.00 │
│                                           IVA 13%:  $29.90 │
│                                           Total:   $259.90 │
├─────────────────────────────────────────────────────────────┤
│ 🔄 GASTOS A TERCEROS (Transferencias)                      │
│ Proveedor          │ Concepto        │ Estado     │ Monto │
│ Almacenes XYZ     │ Bodegaje        │ Pagada     │ $350  │
│ Transporte SA     │ Flete           │ Provisionada│ $450  │
│                                           Total:    $800.00│
├─────────────────────────────────────────────────────────────┤
│ 🧾 FACTURACIÓN                                              │
│ DTE-125 │ 10/12/2025 │ Vence: 10/01/2026 │ $1,059.90 │ [Ver]│
│ Estado: Pendiente │ Pagado: $0.00 │ Saldo: $1,059.90       │
├─────────────────────────────────────────────────────────────┤
│ 📊 COMPARATIVA: Cobros Calculados vs Facturado             │
│ Cobros Esperados: $259.90                                  │
│ Gastos Terceros:  $800.00                                  │
│ Total Esperado:   $1,059.90                                │
│ ────────────────────────────────────────────────────────   │
│ Facturado Real:   $1,059.90  ✅ Coincide                   │
│ Diferencia:       $0.00                                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 TRANSFERENCIAS Y GASTOS

```
┌─────────────────────────────────────────────────────────────┐
│ 🔄 Transferencias y Gastos                  [+ Registrar]  │
├─────────────────────────────────────────────────────────────┤
│ Filtros:                                                    │
│ [Tipo ▼] [Estado ▼] [Mes ▼] [OS ▼] [Proveedor ▼] [Buscar]│
├─────────────────────────────────────────────────────────────┤
│ Fecha      │ OS      │ Tipo    │ Proveedor │ Estado │ Monto │
│ 05/12/2025 │ 001-2025│ Terceros│ Almacén XYZ│ Pagada│ $350  │
│ 06/12/2025 │ ADMON   │ Gastos  │ TIGO      │ Pagada│ $120  │
│ 07/12/2025 │ 002-2025│ Terceros│ Transport │ Provis│ $450  │
└─────────────────────────────────────────────────────────────┘

Nota: OS "ADMON" se usa para gastos administrativos sin OS específica
```

#### Formulario de Registro

```
┌─────────────────────────────────────────────────────────────┐
│ Registrar Transferencia/Gasto                           [X] │
├─────────────────────────────────────────────────────────────┤
│ Tipo de Gasto:                                              │
│ ○ Cargos a Clientes (Terceros)                            │
│ ○ Costos Operativos (Propios)                             │
│ ○ Gastos Administrativos                                   │
│                                                             │
│ OS Asociada: [001-2025 ▼] o [ADMON] si es gasto admin     │
│ Proveedor: [Seleccionar ▼]                                 │
│ Monto: [$______]                                           │
│ Método de Pago: [Transferencia ▼]                         │
│ Banco: [Banco Agrícola ▼]                                  │
│ A nombre de: [____________________]                        │
│ CCF/Factura: [____________________]                        │
│ Adjuntar Factura: [Subir archivo]                         │
│ Estado: [Provisionada ▼]                                   │
│ Descripción: [_________________________]                   │
│                                                             │
│              [Cancelar]  [Guardar]                         │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 FACTURACIÓN Y CXC

```
┌─────────────────────────────────────────────────────────────┐
│ 💵 Facturación y Cuentas por Cobrar        [+ Nueva Factura]│
├─────────────────────────────────────────────────────────────┤
│ Filtros:                                                    │
│ [Cliente ▼] [Estado ▼] [Tipo ▼] [Mes ▼] [Buscar...]      │
├─────────────────────────────────────────────────────────────┤
│ Factura │ OS      │ Cliente  │ Emisión │ Vence │ Total │ Saldo│
│ DTE-125 │ 001-2025│ ACME    │15/12/25 │15/01/26│$1,059│$1,059│
│ FEX-089 │ 002-2025│ Global  │10/12/25 │10/01/26│$2,890│  $0  │
│ CCF-045 │ 003-2025│ Export  │12/12/25 │12/02/26│$1,450│  $450│
└─────────────────────────────────────────────────────────────┘

📊 Resumen: Total Facturado: $5,399  |  Total Cobrado: $3,949  |  Saldo Pendiente: $1,450
```

#### Generar Factura desde OS

```
┌─────────────────────────────────────────────────────────────┐
│ Generar Factura para OS: 001-2025                       [X] │
├─────────────────────────────────────────────────────────────┤
│ Cliente: ACME Corp                                          │
│ Tipo de Factura: [DTE ▼]  (DTE/FEX/CCF)                   │
│ Fecha de Emisión: [15/12/2025]                            │
│ Condición: Crédito 30 días                                 │
│ Fecha de Vencimiento: [15/01/2026] (auto-calculado)       │
│                                                             │
│ DETALLE:                                                    │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Servicios Cobrados:                                     ││
│ │ - Gestión Aduanal              $169.50                  ││
│ │ - Transporte Interno            $90.40                  ││
│ │                       Subtotal: $230.00                 ││
│ │                       IVA 13%:   $29.90                 ││
│ │                                                         ││
│ │ Gastos a Terceros:                                      ││
│ │ - Bodegaje (Almacenes XYZ)     $350.00                 ││
│ │ - Flete (Transporte SA)        $450.00                 ││
│ │                       Subtotal: $800.00                 ││
│ │                                                         ││
│ │ TOTAL A FACTURAR:            $1,059.90                  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Adjuntar DTE: [Subir archivo PDF]                         │
│                                                             │
│              [Cancelar]  [Generar Factura]                 │
└─────────────────────────────────────────────────────────────┘
```

#### Registrar Pago/Abono

```
┌─────────────────────────────────────────────────────────────┐
│ Registrar Pago - Factura DTE-125                        [X] │
├─────────────────────────────────────────────────────────────┤
│ Saldo Actual: $1,059.90                                    │
│                                                             │
│ Monto del Pago: [$________]                                │
│ Fecha de Pago: [20/12/2025]                               │
│ Método: [Transferencia ▼]                                  │
│ Banco: [Banco Agrícola ▼]                                  │
│ Referencia: [______________]                               │
│ Notas: [_____________________]                             │
│                                                             │
│ Nuevo Saldo: $_____ (calculado automáticamente)            │
│                                                             │
│              [Cancelar]  [Registrar Pago]                  │
└─────────────────────────────────────────────────────────────┘
```

### 4.4 ESTADOS DE CUENTA

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Estados de Cuenta                                        │
├─────────────────────────────────────────────────────────────┤
│ Seleccionar Cliente: [ACME Corp ▼]              [Descargar]│
├─────────────────────────────────────────────────────────────┤
│ DATOS DEL CLIENTE:                                          │
│ Razón Social: ACME Corporation S.A. de C.V.                │
│ NIT: 0614-123456-101-7                                     │
│ Condición: Crédito a 30 días                               │
│                                                             │
│ 💳 ESTADO DE CRÉDITO:                                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Límite de Crédito:        $10,000.00                    ││
│ │ Crédito Utilizado:         $1,509.90                    ││
│ │ Crédito Disponible:        $8,490.10  ✅                ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 📋 FACTURAS PENDIENTES:                                     │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Factura │ Emisión │ Vence │ Total │ Pagado │ Saldo │ Estado││
│ │ DTE-125 │15/12/25 │15/01/26│$1,060│   $0   │$1,060│⚠️Pend.││
│ │ DTE-089 │01/12/25 │01/01/26│  $450│   $0   │  $450│⚠️Pend.││
│ │                                                         ││
│ │ TOTALES:                    $1,510│   $0   │$1,510      ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ✅ FACTURAS PAGADAS (Últimas 5):                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ FEX-078 │20/11/25 │20/12/25│$2,500│$2,500  │  $0  │✅Pag.││
│ │ DTE-067 │15/11/25 │15/12/25│$1,800│$1,800  │  $0  │✅Pag.││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 📈 RESUMEN:                                                 │
│ Total Facturado (2025): $45,890                            │
│ Total Cobrado:          $44,380                            │
│ Saldo Pendiente:         $1,510                            │
│ Facturas Vencidas:            0                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 CATÁLOGOS GENERALES (Nueva Página Unificada)

```
┌─────────────────────────────────────────────────────────────┐
│ 📚 Catálogos del Sistema                                    │
├─────────────────────────────────────────────────────────────┤
│ [ Proveedores ] [ Aforadores ] [ Bancos ] [ Tipos Embarque ]│
│ [ Subclientes ]                                             │
├─────────────────────────────────────────────────────────────┤
│ (Vista activa: Proveedores)                    [+ Agregar]  │
│                                                             │
│ 🏢 PROVEEDORES                                              │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Nombre              │ NIT         │ Teléfono │ Email  │✏️││
│ │ Almacenes XYZ SA    │0614-111111-1│2222-3333 │[email]│✏️││
│ │ Transporte Rápido   │0614-222222-2│2222-4444 │[email]│✏️││
│ │ Aduana Express      │0614-333333-3│2222-5555 │[email]│✏️││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 👤 AFORADORES                                               │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Nombre          │ Código │ Teléfono │ Email          │✏️││
│ │ Juan Pérez      │ AF-001 │7777-8888 │[email]        │✏️││
│ │ María González  │ AF-002 │7777-9999 │[email]        │✏️││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ 🏦 BANCOS                                                   │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Nombre              │ Código │ SWIFT      │ Activo  │✏️││
│ │ Banco Agrícola      │ BA     │ BAELSVSS   │ ✅      │✏️││
│ │ Scotiabank          │ SC     │ NOSCSVSS   │ ✅      │✏️││
│ │ Banco Cuscatlán     │ BC     │ BCUSUSVS   │ ✅      │✏️││
│ └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 4.6 CLIENTES (Mejorar)

```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Clientes                                     [+ Agregar] │
├─────────────────────────────────────────────────────────────┤
│ [Buscar...] [Activos ▼] [Condición ▼]                      │
├─────────────────────────────────────────────────────────────┤
│ Cliente         │ NIT       │ Condición │ Crédito │ Deuda │✏️│
│ ACME Corp SA    │0614-12345 │ Crédito 30│ $10,000 │$1,510 │✏️│
│ Global Trade    │0614-67890 │ Contado   │    $0   │   $0  │✏️│
│ Export Partners │0614-11111 │ Crédito 45│ $25,000 │$5,230 │✏️│
└─────────────────────────────────────────────────────────────┘
```

#### Detalle/Edición de Cliente

```
┌─────────────────────────────────────────────────────────────┐
│ Editar Cliente: ACME Corp                               [X] │
├─────────────────────────────────────────────────────────────┤
│ DATOS GENERALES:                                            │
│ Nombre Comercial: [ACME Corp                            ]  │
│ Nombre Jurídico:  [ACME Corporation S.A. de C.V.        ]  │
│ NIT:              [0614-123456-101-7]                      │
│ Registro IVA:     [123456-7]                               │
│                                                             │
│ CONTACTO:                                                   │
│ Dirección:        [_______________________________]        │
│ Teléfono:         [2222-3333]  Tel. Secundario: [________] │
│ Email:            [[email protected]]                  │
│ Contacto:         [Juan Pérez]                             │
│                                                             │
│ CONDICIONES DE PAGO:                                        │
│ ○ Contado  ● Crédito                                       │
│ Días de Crédito:  [30]                                     │
│ Límite de Crédito: [$10,000.00]                            │
│                                                             │
│ TARIFARIO PERSONALIZADO:                      [+ Agregar]  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Servicio              │ Precio Normal │ Precio Cliente││
│ │ Gestión Aduanal      │ $200.00       │ $150.00       │✏️││
│ │ Transporte Interno   │ $100.00       │  $80.00       │✏️││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ Notas: [____________________________________]              │
│                                                             │
│              [Cancelar]  [Guardar Cambios]                 │
└─────────────────────────────────────────────────────────────┘
```

### 4.7 DASHBOARD (Mejorar)

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Dashboard - Diciembre 2025                               │
├─────────────────────────────────────────────────────────────┤
│ 📊 KPIs DEL MES:                                            │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ 🚢 OS Creadas   │ │ 💰 Facturado    │ │ 📈 Por Cobrar   ││
│ │      45         │ │   $125,890      │ │    $23,450      ││
│ │  ▲ +12% vs Nov  │ │  ▲ +8% vs Nov   │ │  ▼ -5% vs Nov   ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│ │ 🔄 OS Abiertas  │ │ 💸 Gastos       │ │ 🎯 Rentabilidad ││
│ │      18         │ │   $45,230       │ │      64%        ││
│ │  (40% del total)│ │  Terceros: $35k │ │  Muy Buena ✅   ││
│ └─────────────────┘ └─────────────────┘ └─────────────────┘│
│                                                             │
│ 📈 GRÁFICA: Ingresos vs Gastos (Últimos 6 meses)           │
│ [Gráfica de barras]                                         │
│                                                             │
│ 🏆 TOP 5 CLIENTES DEL MES:                                  │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 1. Export Partners    $45,230  (15 OS)                  ││
│ │ 2. ACME Corp          $32,890  (12 OS)                  ││
│ │ 3. Global Trade       $28,450  (10 OS)                  ││
│ │ 4. Logistics Pro      $19,320   (7 OS)                  ││
│ │ 5. Maritime Inc       $15,890   (5 OS)                  ││
│ └─────────────────────────────────────────────────────────┘│
│                                                             │
│ ⚠️ ALERTAS:                                                 │
│ • 3 facturas vencidas por $12,450                          │
│ • 2 clientes cerca del límite de crédito                   │
│ • 5 OS abiertas con más de 60 días                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. SISTEMA DE PERMISOS

### 5.1 Roles y Permisos

| Funcionalidad           | Operativo | Operativo2 | Admin |
| ----------------------- | --------- | ---------- | ----- |
| **Dashboard**           |
| Ver KPIs                | ✅        | ✅         | ✅    |
| **Órdenes de Servicio** |
| Crear OS                | ✅        | ✅         | ✅    |
| Ver OS                  | ✅        | ✅         | ✅    |
| Editar OS abierta       | ✅        | ✅         | ✅    |
| Cerrar OS               | ❌        | ✅         | ✅    |
| Eliminar OS             | ❌        | ❌         | ✅    |
| **Transferencias**      |
| Registrar gasto         | ✅        | ✅         | ✅    |
| Ver gastos              | ✅        | ✅         | ✅    |
| Editar gasto            | ❌        | ✅         | ✅    |
| Eliminar gasto          | ❌        | ❌         | ✅    |
| **Facturación**         |
| Generar factura         | ❌        | ✅         | ✅    |
| Ver facturas            | ✅        | ✅         | ✅    |
| Registrar pagos         | ❌        | ✅         | ✅    |
| Anular factura          | ❌        | ❌         | ✅    |
| **Estados de Cuenta**   |
| Ver estados             | ✅        | ✅         | ✅    |
| Descargar Excel         | ❌        | ✅         | ✅    |
| **Clientes**            |
| Ver clientes            | ✅        | ✅         | ✅    |
| Crear/editar            | ❌        | ❌         | ✅    |
| **Catálogos**           |
| Ver catálogos           | ✅        | ✅         | ✅    |
| Crear/editar            | ❌        | ❌         | ✅    |
| **Usuarios**            |
| Ver usuarios            | ❌        | ❌         | ✅    |
| Gestionar usuarios      | ❌        | ❌         | ✅    |

---

## 6. FLUJOS DE TRABAJO PRINCIPALES

### 6.1 Flujo: Crear y Facturar una OS

```
┌─────────────────────────────────────────────────────────────┐
│ FLUJO COMPLETO: De OS a Pago                                │
└─────────────────────────────────────────────────────────────┘

1️⃣ CREAR ORDEN DE SERVICIO
   ├─ Usuario: Operativo
   ├─ Página: Órdenes de Servicio → [+ Nueva OS]
   ├─ Datos: Cliente, DUCA, ETA, Aforador, Tipo embarque
   └─ Sistema genera número: 001-2025

2️⃣ REGISTRAR GASTOS/TRANSFERENCIAS
   ├─ Usuario: Operativo
   ├─ Página: Transferencias → [+ Registrar]
   ├─ Seleccionar: OS 001-2025
   ├─ Tipo: Cargos a Clientes (Terceros)
   ├─ Ej: Bodegaje $350, Flete $450
   └─ Estado: Provisionada

3️⃣ CALCULAR COBROS
   ├─ Usuario: Operativo2/Admin
   ├─ Página: Detalle de OS → Cálculo de Cobros → [+ Agregar]
   ├─ Agregar servicios del tarifario del cliente
   ├─ Ej: Gestión Aduanal $150, Transporte $80
   └─ Sistema calcula IVA automáticamente

4️⃣ COMPARAR COBROS vs TERCEROS
   ├─ Sistema muestra comparativa en detalle de OS
   ├─ Servicios: $259.90 (con IVA)
   ├─ Terceros: $800.00
   └─ Total a Facturar: $1,059.90

5️⃣ GENERAR FACTURA
   ├─ Usuario: Operativo2/Admin
   ├─ Página: Facturación → [+ Nueva Factura]
   ├─ Seleccionar OS: 001-2025
   ├─ Tipo: DTE (o FEX si es exportación)
   ├─ Sistema pre-llena montos desde cobros + terceros
   ├─ Adjuntar PDF del DTE
   └─ Estado: Pendiente

6️⃣ MARCAR GASTOS COMO PAGADOS
   ├─ Usuario: Operativo2/Admin
   ├─ Página: Transferencias
   ├─ Editar cada gasto → Estado: Pagada
   └─ Fecha de pago

7️⃣ REGISTRAR PAGO DEL CLIENTE
   ├─ Usuario: Operativo2/Admin
   ├─ Página: Facturación → Ver DTE-125 → [Registrar Pago]
   ├─ Monto: $1,059.90 (pago completo)
   ├─ Método: Transferencia
   ├─ Banco: Banco Agrícola
   └─ Estado factura cambia a: Pagada

8️⃣ CERRAR ORDEN DE SERVICIO
   ├─ Usuario: Operativo2/Admin
   ├─ Página: Detalle OS → Estado: [Cerrada]
   ├─ Sistema registra fecha de cierre
   └─ OS ya no se puede editar (solo Admin)

9️⃣ CONSULTAR ESTADO DE CUENTA
   ├─ Usuario: Cualquiera
   ├─ Página: Estados de Cuenta
   ├─ Seleccionar: ACME Corp
   └─ Ver historial de facturas y saldo
```

### 6.2 Flujo: Gasto Administrativo (Sin OS)

```
1️⃣ REGISTRAR GASTO ADMIN
   ├─ Página: Transferencias → [+ Registrar]
   ├─ Tipo: Gastos Administrativos
   ├─ OS: ADMON (crear una OS especial para admin)
   ├─ Ej: Luz, agua, telefonía
   └─ Estado: Provisionada

2️⃣ MARCAR COMO PAGADO
   ├─ Editar gasto → Estado: Pagada
   └─ No genera factura al cliente
```

---

## 7. MEJORAS UI/UX

### 7.1 Diseño General

-   **Framework UI:** Continuar con Shadcn/UI + Tailwind CSS
-   **Paleta de Colores:**
    -   Primario: Azul corporativo (#2563eb)
    -   Secundario: Verde para estados exitosos (#10b981)
    -   Alertas: Amarillo (#f59e0b) y Rojo (#ef4444)
-   **Tipografía:** Inter o similar (legible y moderna)

### 7.2 Componentes a Mejorar

#### 7.2.1 Tabla de Datos

```jsx
// Características necesarias:
- Paginación (20 registros por página)
- Ordenamiento por columna
- Filtros múltiples en header
- Búsqueda global
- Exportar a Excel (solo Operativo2+)
- Estados visuales con badges:
  • Abierta → Badge azul
  • Cerrada → Badge gris
  • Pendiente → Badge amarillo
  • Pagada → Badge verde
  • Vencida → Badge rojo
```

#### 7.2.2 Formularios

```jsx
// Mejoras:
- Validación en tiempo real
- Mensajes de error claros
- Auto-completado en campos de búsqueda
- Selects con búsqueda (React-Select)
- Fechas con calendario (date-picker)
- Upload de archivos con preview
- Botones de acción con confirmación
```

#### 7.2.3 Modales/Dialogs

```jsx
// Para:
- Crear/editar registros
- Ver detalles expandidos
- Confirmaciones de eliminación
- Formularios complejos
```

#### 7.2.4 Estados de Carga

```jsx
// Agregar:
- Skeletons en tablas
- Spinners en botones
- Progress bars para uploads
- Mensajes de "Guardando..."
```

### 7.3 Navegación

#### Sidebar Mejorado

```jsx
<Sidebar>
  <Logo />

  <NavSection title="OPERACIONES">
    <NavItem icon={📦} href="/orders">Órdenes de Servicio</NavItem>
    <NavItem icon={🔄} href="/transfers">Transferencias</NavItem>
  </NavSection>

  <NavSection title="FINANZAS">
    <NavItem icon={💵} href="/invoicing">Facturación</NavItem>
    <NavItem icon={📊} href="/statements">Estados de Cuenta</NavItem>
  </NavSection>

  <NavSection title="CATÁLOGOS">
    <NavItem icon={👥} href="/clients">Clientes</NavItem>
    <NavItem icon={🛠️} href="/services">Servicios</NavItem>
    <NavItem icon={📚} href="/catalogs">Catálogos</NavItem>
  </NavSection>

  {isAdmin && (
    <NavSection title="ADMINISTRACIÓN">
      <NavItem icon={👤} href="/users">Usuarios</NavItem>
    </NavSection>
  )}

  <UserMenu />
</Sidebar>
```

### 7.4 Dashboard con Gráficas

```jsx
// Librerías recomendadas:
- Recharts o Chart.js para gráficas
- TanStack Table para tablas avanzadas

// Gráficas necesarias:
1. Ingresos vs Gastos (Barras, últimos 6 meses)
2. OS por Estado (Dona/Pie chart)
3. Gastos por Tipo (Barras horizontales)
4. Top 5 Clientes (Barras)
```

### 7.5 Responsividad

-   Desktop: Sidebar fijo, tabla completa
-   Tablet: Sidebar colapsable, tabla con scroll horizontal
-   Mobile: Menú hamburguesa, cards en lugar de tabla

---

## 8. PLAN DE IMPLEMENTACIÓN

### 8.1 Fase 1: Fundamentos (Semana 1-2)

**Backend:**

-   [x] Modelo ServiceOrder completo
-   [x] Modelo Transfer completo
-   [x] Modelo Invoice y Payment
-   [ ] Crear modelo Bank
-   [ ] Mejorar modelo Client (legal_name, secondary_phone)
-   [ ] Endpoints API REST para todos los modelos

**Frontend:**

-   [ ] Mejorar componente TableList con filtros y paginación
-   [ ] Crear componentes de formulario reutilizables
-   [ ] Configurar React Query para caché

### 8.2 Fase 2: Módulo Operativo (Semana 3-4)

-   [ ] Mejorar página de Órdenes de Servicio
    -   Detalle expandido con tabs
    -   Filtros avanzados
    -   Estados visuales
-   [ ] Mejorar página de Transferencias
    -   Formulario completo con todos los campos
    -   Upload de facturas
    -   Filtros por tipo, estado, mes
-   [ ] Implementar permisos por rol

### 8.3 Fase 3: Módulo Financiero (Semana 5-6)

-   [ ] Página de Cálculo de Cobros
    -   Agregar servicios desde tarifario
    -   Calcular IVA automáticamente
    -   Vista previa de factura
-   [ ] Página de Facturación y CXC
    -   Generar factura desde OS
    -   Registrar pagos/abonos
    -   Estados de factura (pending/partial/paid/overdue)
-   [ ] Página de Estados de Cuenta
    -   Por cliente
    -   Crédito disponible vs utilizado
    -   Facturas pendientes y pagadas

### 8.4 Fase 4: Catálogos y Dashboard (Semana 7)

-   [ ] Página de Catálogos Generales
    -   Vista unificada con tabs
    -   CRUD para Proveedores, Aforadores, Bancos, etc.
-   [ ] Mejorar página de Clientes
    -   Tarifario personalizado en detalle
    -   Campos adicionales (legal_name, teléfono secundario)
-   [ ] Mejorar Dashboard
    -   KPIs del mes
    -   Gráficas interactivas
    -   Top clientes
    -   Alertas

### 8.5 Fase 5: Reportes y Exportación (Semana 8)

-   [ ] Exportar a Excel desde todas las tablas
-   [ ] Comparativa: Cobros Calculados vs Facturado
-   [ ] Reportes de rentabilidad
-   [ ] Optimización y testing final

### 8.6 Tareas Técnicas Transversales

-   [ ] Migrar de SQLite a PostgreSQL
-   [ ] Configurar Cloudflare R2 o AWS S3 para archivos
-   [ ] Implementar sistema de auditoría completo
-   [ ] Ajustar timezone a America/El_Salvador
-   [ ] ALLOWED_HOSTS seguro para producción
-   [ ] CORS configurado correctamente
-   [ ] Testing unitario backend
-   [ ] Testing E2E frontend (Playwright)

---

## 9. CAMPOS Y VALIDACIONES CRÍTICAS

### 9.1 Validaciones de Negocio

#### ServiceOrder

```python
# Validaciones:
- order_number: Único, formato XXX-YYYY
- duca: Obligatorio
- eta: Obligatorio, no puede ser pasada
- status: Solo Admin/Operativo2 puede cerrar
- No permitir edición si status='cerrada' (excepto Admin)
```

#### Transfer

```python
# Validaciones:
- amount: > 0
- service_order: Obligatorio si type='terceros'
- provider: Obligatorio
- invoice_file: Recomendado
- Estado 'pagada' requiere payment_date
```

#### Invoice

```python
# Validaciones:
- invoice_number: Único, formato DTE-XXX, FEX-XXX, CCF-XXX
- due_date: Auto-calculado desde client.credit_days
- total_amount: Debe coincidir con sum(charges) + sum(third_party)
- No permitir edición si status='paid' o 'cancelled'
```

#### Client

```python
# Validaciones:
- nit: Único, formato salvadoreño XXXX-XXXXXX-XXX-X
- credit_limit: Si payment_condition='credito', debe ser > 0
- Validar que crédito utilizado no exceda credit_limit
```

### 9.2 Cálculos Automáticos

#### OrderCharge

```python
subtotal = quantity * unit_price
if service.applies_iva:
    iva_amount = subtotal * 0.13  # IVA El Salvador
else:
    iva_amount = 0
total = subtotal + iva_amount
```

#### Invoice

```python
# Al generar factura:
total_services = sum(order.charges.all().values_list('total', flat=True))
total_third_party = sum(
    order.transfers.filter(type='terceros').values_list('amount', flat=True)
)
total_amount = total_services + total_third_party
balance = total_amount - paid_amount

# Si balance == 0 → status = 'paid'
# Si 0 < balance < total_amount → status = 'partial'
# Si balance == total_amount → status = 'pending'
# Si today > due_date and balance > 0 → status = 'overdue'
```

#### Client Credit

```python
# Crédito disponible:
credit_used = sum(
    Invoice.objects.filter(
        service_order__client=client,
        status__in=['pending', 'partial', 'overdue']
    ).values_list('balance', flat=True)
)
credit_available = client.credit_limit - credit_used

# No permitir generar factura si credit_available < invoice.total_amount
```

---

## 10. NOMENCLATURA Y CONVENCIONES

### 10.1 Nombres de Archivos

```
Backend (Django):
- models.py, serializers.py, views.py, urls.py
- models_<entity>.py si hay múltiples modelos en una app

Frontend (React):
- PascalCase para componentes: ServiceOrders.jsx
- camelCase para utils: formatCurrency.js
- kebab-case para archivos CSS (si aplica)
```

### 10.2 Nombres de Variables

```python
# Backend (Python):
service_order  # snake_case
order_number
client_name

# Frontend (JavaScript):
serviceOrder  // camelCase
orderNumber
clientName
```

### 10.3 Endpoints API

```
# REST Conventions:
GET    /api/orders/                    # Listar
POST   /api/orders/                    # Crear
GET    /api/orders/{id}/               # Detalle
PUT    /api/orders/{id}/               # Actualizar completo
PATCH  /api/orders/{id}/               # Actualizar parcial
DELETE /api/orders/{id}/               # Eliminar

# Custom actions:
POST   /api/orders/{id}/close/         # Cerrar OS
GET    /api/orders/{id}/charges/       # Cobros de OS
POST   /api/orders/{id}/generate-invoice/  # Generar factura
```

### 10.4 Mensajes de Usuario

```javascript
// Éxito:
"Orden de Servicio creada exitosamente";
"Factura generada correctamente";

// Error:
"El campo DUCA es obligatorio";
"El cliente ha excedido su límite de crédito";

// Advertencia:
"Esta orden tiene 3 gastos sin pagar";
"La factura vence en 5 días";

// Confirmación:
"¿Está seguro de cerrar esta orden de servicio?";
"¿Desea anular esta factura?";
```

---

## 11. CONSIDERACIONES TÉCNICAS

### 11.1 Seguridad

-   [ ] JWT con refresh tokens
-   [ ] HTTPS obligatorio en producción
-   [ ] Validación de permisos en backend (no solo frontend)
-   [ ] Sanitización de inputs
-   [ ] Rate limiting en API
-   [ ] Logs de auditoría para acciones críticas

### 11.2 Performance

-   [ ] Paginación en todas las listas (20 items)
-   [ ] Lazy loading de imágenes/documentos
-   [ ] Caché con React Query (5 min TTL)
-   [ ] Índices en DB para campos frecuentes (order_number, nit, invoice_number)
-   [ ] Compression en archivos estáticos

### 11.3 Despliegue

-   [ ] Frontend: Vercel
-   [ ] Backend: Railway o Render
-   [ ] DB: PostgreSQL en Railway/Render
-   [ ] Storage: Cloudflare R2 (más barato que S3)
-   [ ] Environment variables en .env

---

## 12. RESUMEN EJECUTIVO

### ✅ Lo que YA existe y funciona:

-   Modelo ServiceOrder completo
-   Modelo Transfer completo
-   Modelos de facturación (Invoice, Payment)
-   Modelos de catálogos (Provider, CustomsAgent, Service, etc.)
-   Sistema de permisos básico
-   Páginas: Dashboard, ServiceOrders, Transfers, Clients, Users

### ⚠️ Lo que falta implementar:

1. **Backend:**

    - Modelo Bank
    - Mejorar Client (legal_name, secondary_phone)
    - Endpoints completos para facturación

2. **Frontend:**

    - Página de Facturación y CXC
    - Página de Estados de Cuenta
    - Página de Catálogos Generales (unificada)
    - Mejorar UI de OS con detalle expandido
    - Mejorar UI de Transferencias
    - Mejorar Dashboard con gráficas
    - Exportar a Excel

3. **Integraciones:**
    - Cloudflare R2 para archivos
    - PostgreSQL en producción

### 🎯 Prioridades:

1. **Alta:** Facturación y CXC (núcleo del negocio)
2. **Alta:** Mejorar UI de OS y Transferencias
3. **Media:** Estados de Cuenta y reportes
4. **Media:** Catálogos unificados
5. **Baja:** Mejoras estéticas en Dashboard

---

## 13. CRONOGRAMA SUGERIDO

```
SEMANA 1-2: Fundamentos
├─ Backend: Modelo Bank, mejorar Client
├─ Backend: Endpoints API completos
└─ Frontend: Componentes base mejorados

SEMANA 3-4: Operaciones
├─ Mejorar página OS con detalle expandido
├─ Mejorar página Transferencias
└─ Implementar permisos por rol

SEMANA 5-6: Finanzas (CRÍTICO)
├─ Página Cálculo de Cobros
├─ Página Facturación y CXC
└─ Página Estados de Cuenta

SEMANA 7: Catálogos y Dashboard
├─ Página Catálogos Generales
├─ Mejorar clientes con tarifario
└─ Dashboard con gráficas

SEMANA 8: Finalización
├─ Exportar a Excel
├─ Reportes y comparativas
├─ Testing y deployment
└─ Capacitación usuario final
```

---

## 14. CHECKLIST DE ENTREGA

### Backend

-   [ ] Modelos completos y migrados
-   [ ] API REST documentada (Swagger/Postman)
-   [ ] Permisos implementados y probados
-   [ ] PostgreSQL configurado
-   [ ] Cloudflare R2 configurado
-   [ ] Sistema de auditoría funcionando

### Frontend

-   [ ] Todas las páginas implementadas
-   [ ] UI/UX mejorado y consistente
-   [ ] Permisos reflejados en UI
-   [ ] Exportar a Excel funcionando
-   [ ] Responsive en móvil/tablet
-   [ ] Manejo de errores y loading states

### Testing

-   [ ] Tests unitarios backend (80%+ coverage)
-   [ ] Tests E2E frontend (flujos críticos)
-   [ ] Testing manual de todos los flujos
-   [ ] Testing de permisos por rol

### Documentación

-   [ ] README actualizado
-   [ ] Manual de usuario
-   [ ] Guía de despliegue
-   [ ] Postman collection para API

### Deployment

-   [ ] Backend desplegado en Railway/Render
-   [ ] Frontend desplegado en Vercel
-   [ ] DB PostgreSQL en producción
-   [ ] Variables de entorno configuradas
-   [ ] SSL/HTTPS funcionando

---

## 15. CONTACTO Y SOPORTE

**Desarrollador:** [Tu Nombre]  
**Email:** [tu-email]  
**Proyecto:** GPRO Logistic CRM  
**Versión:** 1.0  
**Última Actualización:** 8 de Diciembre, 2025

---

## 📝 NOTAS FINALES

Este plan está diseñado para ser **flexible pero estructurado**. Cada fase puede ajustarse según las prioridades del cliente, pero mantiene la coherencia del sistema completo.

**Recomendaciones:**

1. Implementar fase por fase, validando con usuario final
2. Priorizar facturación (núcleo del negocio)
3. Mantener UI consistente en todas las páginas
4. Documentar cambios importantes
5. Hacer demos semanales con el cliente

**¿Dudas o cambios?** Referirse a este documento como fuente de verdad para decisiones de diseño y desarrollo.
