Resumen del Plan

Duración estimada: 4-6 semanas (27-32 días)

Fases:

1. Fundamentos (Semana 1) - Backend crítico + React Query + Validaciones + Componentes UI
2. Operaciones (Semana 2) - Detalle de OS con tabs + Transferencias completas
3. Finanzas (Semana 3) - Facturación mejorada + Estados de Cuenta
4. Catálogos (Semana 4) - Servicios + Catálogos Generales + Dashboard + Usuarios
5. Optimizaciones (Semana 5-6) - Performance + Exportaciones + Pulido final

Características clave del plan:

✅ 34 tareas específicas con archivos exactos a crear/modificar
✅ Priorización clara (Crítico → Alto → Medio → Bajo)
✅ 5 checkpoints de validación con usuario
✅ Sistema de diseño profesional con paleta corporativa
✅ Mejores prácticas de React Query, validaciones, performance
✅ Navegación jerárquica por módulos (Operaciones, Finanzas, Catálogos)

El plan está completo y listo para implementación. ¿Te gustaría que proceda con la implementación?

● User approved Claude's plan
⎿  Plan saved to: ~\.claude\plans\binary-crunching-crab.md · /plan to edit
Plan de Implementación: Mejora Completa UI/UX GPRO Logistic App

     Fecha: 8 de Diciembre, 2025
     Objetivo: Implementar TODO lo especificado en PLAN_ESTRUCTURADO_GPRO_LOGISTIC.md con diseño profesional empresarial

     ---
     RESUMEN EJECUTIVO

     Estado Actual: 75-80% de madurez (backend sólido, frontend funcional pero incompleto)

     Objetivo Final: Sistema CRM empresarial completo con:
     - ✅ UI/UX profesional sobria y moderna
     - ✅ Todas las páginas del plan implementadas
     - ✅ Mejores prácticas de desarrollo (React Query, validaciones, performance)
     - ✅ Navegación jerárquica por módulos
     - ✅ Componentes consistentes y reutilizables

     Estrategia: 5 fases secuenciales (4-6 semanas)

     ---
     ANÁLISIS DEL CÓDIGO ACTUAL

     ✅ Lo que YA existe (Fortalezas)

     Backend (80% completo):
     - Modelos principales: ServiceOrder, OrderCharge, Invoice, InvoicePayment, Transfer
     - Catálogos: Provider, CustomsAgent, ShipmentType, SubClient, Service, ClientServicePrice
     - User con 3 roles (operativo, operativo2, admin)
     - APIs REST completas
     - Sistema de permisos implementado
     - Cálculos automáticos (IVA 13%, totales, balance)

     Frontend (75% completo):
     - 11 componentes UI base (Button, Card, Input, Modal, DataTable, etc.)
     - Tailwind CSS con paleta coherente (azul #1e40af, verde #059669, naranja #ea580c)
     - Páginas funcionando: Dashboard (80%), ServiceOrders (85%), Clients (90%), Invoicing (85%)
     - Layout responsive con Sidebar colapsable
     - DataTable profesional con búsqueda/ordenamiento/paginación

     ⚠️ Lo que necesita mejoras

     Backend:
     - ❌ Falta modelo Bank (CRÍTICO)
     - ❌ Client: Falta legal_name, secondary_phone
     - ⚠️ Transfer.bank y InvoicePayment.bank son CharField (deben ser ForeignKey)

     Frontend:
     - ❌ Páginas incompletas: Transfers, Services, Users, AccountStatements (solo placeholders)
     - ⚠️ Sin React Query (fetch manual, sin caché)
     - ⚠️ Validación básica de formularios (sin react-hook-form + Zod)
     - ⚠️ Loading states inconsistentes (skeleton vs spinner)
     - ⚠️ Sin optimizaciones de performance (useMemo, lazy loading)

     📋 Páginas a Crear/Mejorar según PLAN_ESTRUCTURADO

     OPERACIONES:
     1. Órdenes de Servicio → Mejorar con detalle expandido + tabs
     2. Transferencias → Implementar página completa

     FINANZAS:
     3. Facturación → Mejorar con generación desde OS + pagos
     4. Estados de Cuenta → Crear nueva página

     CATÁLOGOS:
     5. Clientes → Mejorar con tarifario personalizado
     6. Servicios y Tarifario → Implementar completo
     7. Catálogos Generales → Nueva página unificada (Proveedores, Aforadores, Bancos)

     ADMINISTRACIÓN:
     8. Usuarios → Implementar CRUD completo

     DASHBOARD:
     9. Dashboard → Mejorar con más KPIs y gráficas

     ---
     FASE 1: FUNDAMENTOS Y ARQUITECTURA BASE (Semana 1)

     Prioridad: CRÍTICA
     Duración: 5 días

     Backend Crítico

     1.1 Crear Modelo Bank

     Archivos:
     - backend/apps/catalogs/models.py - Agregar modelo Bank
     - backend/apps/catalogs/serializers.py - BankSerializer
     - backend/apps/catalogs/views.py - BankViewSet
     - backend/apps/catalogs/urls.py - Ruta /banks/
     - backend/apps/catalogs/admin.py - Admin de Bank

     Implementación:
     class Bank(BaseModel):
         name = models.CharField(max_length=100, unique=True)  # "Banco Agrícola"
         code = models.CharField(max_length=20, unique=True)   # "AGRI"
         swift_code = models.CharField(max_length=11, blank=True)
         is_active = models.BooleanField(default=True)

     Migraciones: python manage.py makemigrations && python manage.py migrate

     1.2 Mejorar Modelo Client

     Archivos:
     - backend/apps/clients/models.py - Agregar campos

     Cambios:
     legal_name = models.CharField(max_length=255, blank=True)
     secondary_phone = models.CharField(max_length=20, blank=True)

     1.3 Migrar bank a ForeignKey

     Archivos:
     - backend/apps/transfers/models.py - Transfer.bank
     - backend/apps/orders/models.py - InvoicePayment.bank

     Estrategia: Migración de datos en 3 pasos (crear bank_fk, migrar datos, eliminar bank viejo)

     Infraestructura Frontend

     1.4 Implementar React Query

     Archivos NUEVOS:
     - frontend/src/lib/queryClient.js - Configuración React Query
     - frontend/src/hooks/useServiceOrders.js - Custom hooks
     - frontend/src/hooks/useClients.js
     - frontend/src/hooks/useInvoices.js
     - frontend/src/hooks/useTransfers.js

     Actualizar: frontend/package.json, frontend/src/main.jsx

     1.5 Implementar Validación de Formularios

     Archivos NUEVOS:
     - frontend/src/lib/validations.js - Schemas Zod

     Instalar: react-hook-form, zod, @hookform/resolvers

     1.6 Componentes UI Nuevos

     Archivos NUEVOS:
     - frontend/src/components/ui/Tabs.jsx - Para vistas con tabs
     - frontend/src/components/ui/Dialog.jsx - Modales mejorados
     - frontend/src/components/ui/DatePicker.jsx - Selector de fechas
     - frontend/src/components/ui/Combobox.jsx - Select con búsqueda
     - frontend/src/components/ui/Skeleton.jsx - Loading consistente
     - frontend/src/components/ui/FileUpload.jsx - Upload de archivos
     - frontend/src/components/ui/ErrorBoundary.jsx - Manejo de errores

     1.7 Reorganizar Navegación

     Archivos:
     - frontend/src/components/Sidebar.jsx - Grupos jerárquicos

     Nueva estructura:
     📱 SIDEBAR
     ├── 🏠 Dashboard
     ├── 📦 OPERACIONES
     │   ├── Órdenes de Servicio
     │   └── Transferencias y Gastos
     ├── 💵 FINANZAS
     │   ├── Facturación y CXC
     │   └── Estados de Cuenta
     ├── 📚 CATÁLOGOS
     │   ├── Clientes
     │   ├── Servicios y Tarifario
     │   └── Catálogos Generales
     └── ⚙️ ADMINISTRACIÓN
         └── Usuarios

     ---
     FASE 2: MÓDULO OPERATIVO (Semana 2)

     Prioridad: ALTA
     Duración: 5 días

     2.1 Órdenes de Servicio - Vista Detallada con Tabs

     2.1.1 Detalle de OS

     Archivos NUEVOS:
     - frontend/src/pages/ServiceOrderDetail.jsx - Página principal
     - frontend/src/components/service-orders/GeneralInfoTab.jsx - Tab 1: Info general
     - frontend/src/components/service-orders/ChargesTab.jsx - Tab 2: Cálculo de cobros
     - frontend/src/components/service-orders/TransfersTab.jsx - Tab 3: Gastos a terceros
     - frontend/src/components/service-orders/InvoicingTab.jsx - Tab 4: Facturación
     - frontend/src/components/service-orders/ComparativeTab.jsx - Tab 5: Comparativa

     Actualizar: frontend/src/App.jsx - Agregar ruta /service-orders/:id

     Funcionalidad clave:
     - Tab 1: Información general de la OS (cliente, referencias, fechas)
     - Tab 2: Agregar/editar cobros desde tarifario del cliente
     - Tab 3: Lista de transferencias asociadas
     - Tab 4: Ver/generar factura
     - Tab 5: Comparativa Cobros Calculados vs Facturado

     2.1.2 Cálculo de Cobros

     Archivos NUEVOS:
     - frontend/src/components/service-orders/AddChargeModal.jsx - Modal agregar cobro

     Funcionalidad:
     - Select con búsqueda de servicios del tarifario del cliente
     - Cálculo automático: subtotal, IVA 13%, total
     - Solo Operativo2+ puede editar/eliminar

     2.2 Transferencias y Gastos - Página Completa

     2.2.1 Vista Principal

     Archivos NUEVOS (reemplazar placeholder):
     - frontend/src/pages/Transfers.jsx - Página principal
     - frontend/src/components/transfers/TransfersTable.jsx - Tabla con datos
     - frontend/src/components/transfers/TransferFilters.jsx - Filtros avanzados
     - frontend/src/components/transfers/TransferFormModal.jsx - Formulario completo

     Filtros:
     - Tipo (Terceros, Propios, Admin)
     - Estado (Provisionada, Pagada)
     - Mes
     - OS asociada
     - Proveedor

     2.2.2 Formulario de Transferencias

     Campos del formulario:
     - Orden de Servicio (select con búsqueda)
     - Tipo de Gasto (terceros/propios/admin)
     - Proveedor (solo si tipo=terceros)
     - Monto
     - Banco (select de modelo Bank)
     - Método de pago
     - Factura del proveedor (CCF) + upload PDF
     - Estado (Provisionada/Pagada)
     - Notas

     ---
     FASE 3: MÓDULO FINANCIERO (Semana 3)

     Prioridad: ALTA
     Duración: 5 días

     3.1 Facturación Mejorada

     3.1.1 Generar Factura desde OS

     Archivos NUEVOS:
     - frontend/src/components/invoicing/GenerateInvoiceModal.jsx - Modal generación

     Funcionalidad:
     - Pre-llenar con datos de OS (cliente, fecha, conceptos desde OrderCharges)
     - Calcular: Subtotal servicios + IVA + Gastos a terceros
     - Permitir editar conceptos
     - Generar Invoice + InvoiceItems

     3.1.2 Registrar Pagos/Abonos

     Archivos NUEVOS:
     - frontend/src/components/invoicing/RegisterPaymentModal.jsx - Modal pago
     - frontend/src/components/invoicing/InvoiceDetailModal.jsx - Detalle factura

     Archivos a MODIFICAR:
     - frontend/src/pages/Invoicing.jsx - Mejorar página

     Funcionalidad:
     - Validar que monto <= balance
     - Crear InvoicePayment
     - Actualizar balance de factura
     - Cambiar status automático (pending → partial → paid)

     3.1.3 Estados de Factura

     Archivos NUEVOS:
     - frontend/src/components/invoicing/InvoiceStatusBadge.jsx - Badges de estado

     Backend - Agregar a serializer:
     is_overdue = SerializerMethodField()
     days_overdue = SerializerMethodField()

     Estados visuales:
     - Pendiente: badge amarillo
     - Pago Parcial: badge naranja
     - Pagada: badge verde
     - Vencida: badge rojo (+ días de atraso)
     - Cancelada: badge gris

     3.2 Estados de Cuenta

     3.2.1 Nueva Página

     Archivos NUEVOS:
     - frontend/src/pages/AccountStatements.jsx - Página principal
     - frontend/src/components/account-statements/ClientSelector.jsx - Selector cliente
     - frontend/src/components/account-statements/CreditStatus.jsx - Estado crédito
     - frontend/src/components/account-statements/InvoiceHistory.jsx - Historial facturas
     - frontend/src/components/account-statements/AnnualSummary.jsx - Resumen anual

     Backend - Nuevo endpoint:
     GET /api/invoices/account-statement/?client_id={id}&year={year}

     Respuesta:
     {
       "client": {...},
       "credit_status": {
         "limit": 10000,
         "used": 1510,
         "available": 8490
       },
       "invoices": [...],
       "summary": {
         "total_invoiced": 45890,
         "total_paid": 44380,
         "total_pending": 1510
       }
     }

     3.2.2 Estado de Crédito Visual

     Componente: CreditStatus.jsx

     Diseño:
     - 3 métricas: Límite, Utilizado, Disponible
     - Barra de progreso con colores (verde < 80%, naranja 80-100%, rojo > 100%)
     - Alerta si cliente excede límite

     ---
     FASE 4: CATÁLOGOS Y DASHBOARD (Semana 4)

     Prioridad: MEDIA
     Duración: 5 días

     4.1 Servicios y Tarifario

     4.1.1 Página de Servicios

     Archivos NUEVOS (reemplazar placeholder):
     - frontend/src/pages/Services.jsx - Página principal
     - frontend/src/components/services/ServicesTable.jsx - Tabla
     - frontend/src/components/services/ServiceFormModal.jsx - Formulario CRUD

     Columnas tabla:
     - Código, Nombre, Descripción, Precio Base, Categoría, Estado

     4.1.2 Tarifario por Cliente

     Archivos NUEVOS:
     - frontend/src/components/clients/ClientPricingModal.jsx - Modal tarifario

     Archivos a MODIFICAR:
     - frontend/src/pages/Clients.jsx - Agregar botón "Tarifario"

     Funcionalidad:
     - Ver ClientServicePrice del cliente
     - Comparar Precio Base vs Precio Cliente
     - Agregar/editar precios personalizados

     4.2 Catálogos Generales - Página Unificada

     4.2.1 Nueva Página con Tabs

     Archivos NUEVOS:
     - frontend/src/pages/Catalogs.jsx - Página principal
     - frontend/src/components/catalogs/ProvidersTab.jsx - Tab proveedores
     - frontend/src/components/catalogs/CustomsAgentsTab.jsx - Tab aforadores
     - frontend/src/components/catalogs/BanksTab.jsx - Tab bancos ⭐
     - frontend/src/components/catalogs/ShipmentTypesTab.jsx - Tab tipos embarque
     - frontend/src/components/catalogs/SubClientsTab.jsx - Tab subclientes

     Actualizar: frontend/src/App.jsx - Agregar ruta /catalogs

     Cada tab: Tabla con CRUD básico (crear, editar, eliminar)

     4.3 Dashboard Mejorado

     4.3.1 KPI Cards Ampliados

     Archivos NUEVOS:
     - frontend/src/components/dashboard/KPICard.jsx - Componente reutilizable

     Archivos a MODIFICAR:
     - frontend/src/pages/Dashboard.jsx - Mejorar con 6 KPIs

     Backend - Nuevo endpoint:
     GET /api/dashboard/kpis/

     6 KPIs:
     1. OS del Mes (con trend vs mes anterior)
     2. Facturado del Mes
     3. Por Cobrar (total balance pendiente)
     4. OS Abiertas
     5. Gastos del Mes
     6. Rentabilidad del Mes (Ingresos - Gastos)

     4.3.2 Gráficas

     Archivos NUEVOS:
     - frontend/src/components/dashboard/RevenueChart.jsx - Gráfica Ingresos vs Gastos
     - frontend/src/components/dashboard/TopClientsTable.jsx - Top 5 clientes
     - frontend/src/components/dashboard/AlertsPanel.jsx - Panel de alertas

     Instalar: recharts

     Gráfica Ingresos vs Gastos:
     - LineChart de Recharts
     - Últimos 6 meses
     - 2 líneas: Ingresos (verde), Gastos (naranja)

     Alertas:
     - Facturas vencidas (badge rojo)
     - Clientes sobre límite de crédito (badge amarillo)
     - OS abiertas > 30 días (badge azul)

     4.4 Usuarios

     4.4.1 Página de Usuarios

     Archivos NUEVOS (reemplazar placeholder):
     - frontend/src/pages/Users.jsx - Página principal (solo Admin)
     - frontend/src/components/users/UserFormModal.jsx - Formulario CRUD

     Columnas tabla:
     - Usuario, Email, Nombre, Rol, Estado (Activo/Inactivo)

     ---
     FASE 5: OPTIMIZACIONES Y PULIDO FINAL (Semana 5-6)

     Prioridad: MEDIA-BAJA
     Duración: 7-10 días

     5.1 Performance

     5.1.1 Optimizar con useMemo/useCallback

     Archivos a modificar:
     - Todas las páginas principales (Dashboard, ServiceOrders, Invoicing, etc.)
     - frontend/src/components/ui/DataTable.jsx

     5.1.2 Lazy Loading de Rutas

     Archivos a modificar:
     - frontend/src/App.jsx - Usar React.lazy() + Suspense

     5.1.3 Error Boundary Global

     Archivos NUEVOS:
     - frontend/src/components/ui/ErrorBoundary.jsx

     Actualizar: frontend/src/App.jsx - Envolver app con ErrorBoundary

     5.2 Exportaciones

     5.2.1 Exportar Tablas a Excel

     Archivos NUEVOS:
     - frontend/src/lib/exportToExcel.js - Utilidad export

     Instalar: xlsx

     Actualizar: frontend/src/components/ui/DataTable.jsx - Botón "Exportar" (solo Operativo2+)

     5.2.2 Generar PDF Estado de Cuenta

     Archivos NUEVOS:
     - frontend/src/lib/generatePDF.js - Utilidad PDF

     Instalar: jspdf, jspdf-autotable

     Actualizar: frontend/src/pages/AccountStatements.jsx - Botón "Exportar PDF"

     5.3 Control de Permisos Frontend

     5.3.1 Hook de Permisos

     Archivos NUEVOS:
     - frontend/src/hooks/usePermissions.js - Hook custom
     - frontend/src/components/PermissionGate.jsx - Componente wrapper

     Uso:
     <PermissionGate requiredRole="operativo2">
       <Button onClick={handleEdit}>Editar</Button>
     </PermissionGate>

     5.4 Mejoras UI/UX

     5.4.1 Loading States Consistentes

     Patrón a aplicar en TODAS las páginas:
     if (isLoading) return <Skeleton count={5} />;
     if (error) return <EmptyState title="Error" action={<Button onClick={refetch}>Reintentar</Button>} />;
     if (!data?.length) return <EmptyState title="Sin datos" action={<Button onClick={handleCreate}>Crear</Button>} />;

     5.4.2 Animaciones Sutiles

     Actualizar: frontend/tailwind.config.js - Agregar animaciones fade-in, slide-up

     Aplicar a: Cards, Modals, transiciones hover

     5.4.3 Tooltips

     Archivos NUEVOS:
     - frontend/src/components/ui/Tooltip.jsx - Usando Radix UI

     Instalar: @radix-ui/react-tooltip

     ---
     SISTEMA DE COLORES Y ESTADOS

     Paleta Base (Ya existe en tailwind.config.js)

     - Primary: Azul #1e40af (corporativo)
     - Secondary: Verde #059669 (éxito, dinero)
     - Accent: Naranja #ea580c (advertencias)
     - Gray: #f3f4f6 (background), #1f2937 (text)

     Badges de Estado (Usar en todas las tablas)

     Service Orders:
     - Abierta: bg-blue-100 text-blue-800
     - Cerrada: bg-gray-100 text-gray-800

     Invoices:
     - Pendiente: bg-yellow-100 text-yellow-800
     - Pago Parcial: bg-orange-100 text-orange-800
     - Pagada: bg-green-100 text-green-800
     - Vencida: bg-red-100 text-red-800
     - Cancelada: bg-gray-100 text-gray-800

     Transfers:
     - Provisionada: bg-yellow-100 text-yellow-800
     - Pagada: bg-green-100 text-green-800

     ---
     ORDEN DE EJECUCIÓN RECOMENDADO

     ✅ Checkpoint 1 (Fin Semana 1)

     Validar:
     - Backend funcional con Bank
     - React Query implementado
     - Formularios con validación
     - Demo: Crear OS con nuevo formulario validado

     ✅ Checkpoint 2 (Fin Semana 2)

     Validar:
     - Detalle de OS completo con tabs
     - Transferencias funcionando
     - Demo: Flujo completo OS → Transferencias → Cobros

     ✅ Checkpoint 3 (Fin Semana 3)

     Validar:
     - Facturación mejorada
     - Estados de cuenta
     - Demo: Generar factura → Registrar pago → Ver estado

     ✅ Checkpoint 4 (Fin Semana 4)

     Validar:
     - Todos los catálogos
     - Dashboard final
     - Demo: Tour completo de la aplicación

     ✅ Checkpoint 5 (Fin Semana 5-6)

     Validar:
     - Performance optimizado
     - Exportaciones funcionando
     - Demo: Aplicación lista para producción

     ---
     ARCHIVOS CRÍTICOS POR FASE

     Fase 1 (Fundamentos)

     Backend:
     1. backend/apps/catalogs/models.py - Bank
     2. backend/apps/clients/models.py - Client mejorado
     3. backend/apps/transfers/models.py - Transfer.bank FK

     Frontend:
     4. frontend/src/lib/queryClient.js (NUEVO)
     5. frontend/src/lib/validations.js (NUEVO)
     6. frontend/src/components/ui/Tabs.jsx (NUEVO)
     7. frontend/src/components/ui/Dialog.jsx (NUEVO)
     8. frontend/src/components/ui/DatePicker.jsx (NUEVO)
     9. frontend/src/components/Sidebar.jsx (modificar)

     Fase 2 (Operaciones)

     10. frontend/src/pages/ServiceOrderDetail.jsx (NUEVO)
     11. frontend/src/components/service-orders/ChargesTab.jsx (NUEVO)
     12. frontend/src/pages/Transfers.jsx (reemplazar)
     13. frontend/src/components/transfers/TransferFormModal.jsx (NUEVO)

     Fase 3 (Finanzas)

     14. frontend/src/components/invoicing/GenerateInvoiceModal.jsx (NUEVO)
     15. frontend/src/components/invoicing/RegisterPaymentModal.jsx (NUEVO)
     16. frontend/src/pages/AccountStatements.jsx (NUEVO)
     17. backend/apps/orders/views.py - Endpoint account_statement

     Fase 4 (Catálogos)

     18. frontend/src/pages/Services.jsx (reemplazar)
     19. frontend/src/pages/Catalogs.jsx (NUEVO)
     20. frontend/src/pages/Dashboard.jsx (mejorar)
     21. frontend/src/pages/Users.jsx (reemplazar)

     Fase 5 (Optimizaciones)

     22. frontend/src/lib/exportToExcel.js (NUEVO)
     23. frontend/src/lib/generatePDF.js (NUEVO)
     24. frontend/src/hooks/usePermissions.js (NUEVO)
     25. frontend/src/components/ui/ErrorBoundary.jsx (NUEVO)

     ---
     MEJORES PRÁCTICAS A SEGUIR

     Código

     1. Estructura clara: Componentes pequeños y reutilizables
     2. Nomenclatura: PascalCase componentes, camelCase hooks
     3. Validaciones: Zod schemas centralizados en lib/validations.js
     4. Performance: useMemo para cálculos pesados, useCallback para handlers

     UX

     1. Loading: Skeleton para tablas, Spinner para botones
     2. Empty States: Siempre mostrar con acción clara
     3. Feedback: Toast para éxito, Modal para confirmaciones destructivas
     4. Responsive: Grid adaptable (3 → 2 → 1 columnas)

     Accesibilidad

     1. Contraste: WCAG AA mínimo
     2. Teclado: Todos los componentes navegables
     3. ARIA: Labels en formularios

     ---
     ESTIMACIÓN DE ESFUERZO

     | Fase              | Tareas | Complejidad | Días       |
     |-------------------|--------|-------------|------------|
     | 1. Fundamentos    | 7      | Media-Alta  | 5          |
     | 2. Operaciones    | 7      | Alta        | 5          |
     | 3. Finanzas       | 6      | Alta        | 5          |
     | 4. Catálogos      | 6      | Media       | 5          |
     | 5. Optimizaciones | 8      | Media       | 7-10       |
     | TOTAL             | 34     | -           | 27-32 días |

     ---
     RESULTADO ESPERADO

     Al completar este plan, GPRO Logistic App será:

     ✅ Completa: Todas las páginas del plan implementadas
     ✅ Profesional: UI sobria y moderna digna de entornos empresariales
     ✅ Funcional: Flujos de negocio completos (OS → Transferencias → Facturación → Cobros)
     ✅ Optimizada: Performance, caché, validaciones, exportaciones
     ✅ Mantenible: Código limpio, componentes reutilizables, patrones consistentes

     Stack Final:
     - Backend: Django REST + PostgreSQL
     - Frontend: React + Tailwind CSS + Shadcn/UI
     - Estado: React Query + Zustand (auth)
     - Validación: React Hook Form + Zod
     - Gráficas: Recharts
     - Exportación: XLSX + jsPDF
