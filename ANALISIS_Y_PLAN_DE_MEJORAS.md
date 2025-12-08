# ANÁLISIS Y PLAN DE MEJORAS - GPRO LOGISTIC CRM
## Sistema de Gestión para Agencia de Tramitaciones Aduanales

**Fecha:** 7 de Diciembre, 2025
**Cliente:** GPRO Logistic (El Salvador)
**Presupuesto:** $800.00
**Tiempo:** 8 semanas

---

## 📊 ANÁLISIS DEL EXCEL ACTUAL

### Sheets Identificadas:
1. **PANEL PRINCIPAL** - Generador de OS con contador consecutivo
2. **REGISTRO OS** - Formulario para crear nuevas órdenes
3. **BASE OS** - Listado maestro de órdenes de servicio
4. **REGISTRO TRANSFERENCIAS** - Formulario de gastos
5. **BASE TRANSFERENCIAS** - Listado de gastos y transferencias
6. **CALCULO COBROS** - Calculadora de cobros por OS
7. **HISTÓRICO COBROS** - Historial de facturación
8. **CXC** - Cuentas por cobrar con seguimiento
9. **DATOS_COMPARACION** - Validación de datos
10. **BUSQUEDAS** - Sistema de búsqueda personalizada
11. **LISTAS** - Catálogos (Aforadores, Clientes, Bancos, etc.)
12. **DATOS_GRAFICO** - Datos para reportes visuales
13. **TARIFARIO** - Precios de servicios por cliente

### Campos Críticos Identificados:
- **OS:** Número consecutivo formato "XXX-YYYY"
- **Cliente/Subcliente**
- **DUCA** (Declaración Única Centroamericana)
- **Aforador** (Agente aduanal)
- **Referencia/BL** (Bill of Lading)
- **Tipo de Embarque**
- **Banco** para transferencias
- **Tipo de Gasto:** Cargos a Clientes, Costos, Gastos Operación
- **Estado Pago:** Provisionada/Pagada
- **Facturación:** DTE, FEX
- **Método Pago:** Transferencia, Efectivo, Cheque

---

## 🔍 PROBLEMAS IDENTIFICADOS EN EL CÓDIGO ACTUAL

### BACKEND (Django)

#### ❌ Problemas Críticos:

1. **Base de Datos SQLite en lugar de PostgreSQL**
   - settings.py:72-75 usa SQLite (solo para desarrollo)
   - DEBE usar PostgreSQL en producción

2. **Modelo de Órdenes de Servicio Incompleto**
   - Falta campo `aforador` (CustomsAgent)
   - Falta campo `bl_reference` (BL/Referencia)
   - Falta campo `mes` (mes de creación)
   - Falta campo `facturado` (Si/No)
   - Falta numeración correcta formato "001-2025"

3. **Modelo de Transferencias Incompleto**
   - Falta campo `banco`
   - Falta campo `a_nombre_de` (beneficiario)
   - Falta campo `ccf` (número de factura)
   - Falta relación a cliente directo
   - Falta mes de registro

4. **Falta Modelo de Servicios/Tarifario**
   - No existe tabla para servicios ofrecidos
   - No existe relación servicios-cliente (precios personalizados)
   - Falta tabla de cobros por OS

5. **Falta Modelo de Facturación (CXC)**
   - No existe modelo de Invoice/Factura
   - No hay seguimiento de cuentas por cobrar
   - Falta campos: DTE, FEX, fecha vencimiento, abonos, estado

6. **Sistema de Permisos Incompleto**
   - permissions.py solo tiene IsOperativo, IsOperativo2
   - Falta middleware de auditoría
   - No hay registro de acciones del usuario

7. **Time Zone Incorrecto**
   - settings.py:98 usa 'America/Mexico_City'
   - DEBE ser 'America/El_Salvador'

8. **Seguridad Débil**
   - ALLOWED_HOSTS = ['*'] (settings.py:13) es inseguro
   - CORS_ALLOW_ALL_ORIGINS = True (settings.py:126) es inseguro
   - DEBUG = True en producción es peligroso

9. **Falta Almacenamiento en la Nube**
   - MEDIA_ROOT usa almacenamiento local
   - Debe integrar Cloudflare R2 o AWS S3

### FRONTEND (React)

#### ❌ Problemas Identificados:

1. **Falta Página de Catálogos**
   - No existe vista para gestionar Proveedores, Aforadores, Tipos de Embarque

2. **Falta Sistema de Tarifas**
   - No hay módulo para gestionar precios por cliente
   - No existe calculadora de cobros automática

3. **Falta Página de Facturación**
   - No existe módulo CXC
   - No hay vista de estados de cuenta completa

4. **UI/UX Mejorable**
   - Diseño básico, no parece CRM profesional
   - Falta diseño moderno con Tailwind v3+
   - Falta componentes reutilizables avanzados

5. **Falta Validaciones del Lado del Cliente**
   - No hay validación de formularios robusta
   - Falta feedback visual de errores

---

## ✅ LO QUE ESTÁ BIEN Y SE MANTIENE

### BACKEND:
✓ Estructura de apps modulares (users, clients, catalogs, orders, transfers, dashboard)
✓ Uso de Django REST Framework
✓ Autenticación JWT configurada
✓ Exportación a Excel básica implementada
✓ Filtros y búsquedas con django-filter
✓ Modelo de Usuario personalizado con roles
✓ Modelo de Cliente con crédito fiscal

### FRONTEND:
✓ React con Vite (rápido)
✓ Tailwind CSS configurado
✓ React Router para navegación
✓ Protected Routes implementadas
✓ Dashboard con KPIs básicos
✓ Estructura de componentes clara

---

## 🎯 PLAN DE MEJORAS NECESARIAS

### FASE 1: MODELOS DE DATOS (Prioridad Alta) ⭐⭐⭐

#### 1.1 Actualizar Modelo ServiceOrder
```python
class ServiceOrder(models.Model):
    # Campos existentes +
    customs_agent = ForeignKey(CustomsAgent)  # Aforador
    bl_reference = CharField()  # BL/Referencia
    mes = CharField()  # Mes de creación
    facturado = BooleanField(default=False)
    # Numeración: 001-2025 formato
```

#### 1.2 Actualizar Modelo Transfer
```python
class Transfer(models.Model):
    # Campos existentes +
    banco = CharField()
    beneficiary_name = CharField()  # A nombre de
    ccf = CharField()  # Número CCF
    client = ForeignKey(Client, null=True)  # Cliente directo
    mes = CharField()
```

#### 1.3 Crear Modelo Service (Servicios)
```python
class Service(models.Model):
    code = CharField(unique=True)
    name = CharField()
    description = TextField()
    default_price = DecimalField()
    is_active = BooleanField()
```

#### 1.4 Crear Modelo ClientService (Tarifario)
```python
class ClientService(models.Model):
    client = ForeignKey(Client)
    service = ForeignKey(Service)
    custom_price = DecimalField()
    is_active = BooleanField()
```

#### 1.5 Crear Modelo OrderCharge (Cobros por OS)
```python
class OrderCharge(models.Model):
    service_order = ForeignKey(ServiceOrder)
    service = ForeignKey(Service)
    quantity = IntegerField(default=1)
    unit_price = DecimalField()
    subtotal = DecimalField()
    iva = DecimalField()
    total = DecimalField()
```

#### 1.6 Crear Modelo Invoice (Facturación/CXC)
```python
class Invoice(models.Model):
    service_order = ForeignKey(ServiceOrder)
    invoice_number = CharField()
    invoice_type = CharField(choices=[('DTE', 'DTE'), ('FEX', 'FEX')])
    issue_date = DateField()
    due_date = DateField()
    subtotal_services = DecimalField()
    subtotal_third_party = DecimalField()
    total = DecimalField()
    paid_amount = DecimalField(default=0)
    balance = DecimalField()
    status = CharField(choices=[('pending', 'Pendiente'), ('paid', 'Pagada'), ('partial', 'Parcial')])
    payment_method = CharField()
```

#### 1.7 Crear Modelo InvoicePayment (Abonos)
```python
class InvoicePayment(models.Model):
    invoice = ForeignKey(Invoice)
    payment_date = DateField()
    amount = DecimalField()
    payment_method = CharField()
    notes = TextField()
```

#### 1.8 Crear Modelo AuditLog (Auditoría)
```python
class AuditLog(models.Model):
    user = ForeignKey(User)
    action = CharField()  # CREATE, UPDATE, DELETE, VIEW
    model_name = CharField()
    object_id = IntegerField()
    timestamp = DateTimeField(auto_now_add=True)
    ip_address = GenericIPAddressField()
    details = JSONField()
```

### FASE 2: BACKEND - MEJORAS TÉCNICAS (Prioridad Alta) ⭐⭐⭐

#### 2.1 Configuración de Producción
- [ ] Cambiar a PostgreSQL
- [ ] Configurar variables de entorno correctas
- [ ] TIME_ZONE = 'America/El_Salvador'
- [ ] ALLOWED_HOSTS específicos
- [ ] CORS configuración segura
- [ ] DEBUG = False en producción

#### 2.2 Almacenamiento en la Nube
- [ ] Integrar Cloudflare R2 o AWS S3
- [ ] Configurar django-storages
- [ ] Migrar MEDIA_ROOT a cloud

#### 2.3 Sistema de Permisos Avanzado
```python
class IsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return request.user.role == 'admin'
```
- [ ] IsAdministrador
- [ ] Decorador @audit_action para auditoría
- [ ] Middleware de logging

#### 2.4 API Endpoints Adicionales
- [ ] /api/services/ - CRUD servicios
- [ ] /api/client-services/ - Tarifario
- [ ] /api/order-charges/ - Cobros por OS
- [ ] /api/invoices/ - Facturas/CXC
- [ ] /api/invoice-payments/ - Abonos
- [ ] /api/account-statements/ - Estados de cuenta
- [ ] /api/reports/monthly/ - Reportes mensuales
- [ ] /api/audit-logs/ - Logs de auditoría

#### 2.5 Validaciones de Negocio
- [ ] Validar límite de crédito antes de crear OS
- [ ] Validar duplicados de DUCA
- [ ] Calcular automáticamente cobros al crear OS
- [ ] Actualizar balance de factura al registrar abono
- [ ] Notificar cuando crédito esté al 80%

### FASE 3: FRONTEND - UI/UX PROFESIONAL (Prioridad Alta) ⭐⭐⭐

#### 3.1 Biblioteca de Componentes
- [ ] Actualizar Tailwind a v3.4+
- [ ] Implementar shadcn/ui o Headless UI
- [ ] Componentes:
  - Modal reutilizable
  - DataTable con ordenamiento, paginación, filtros
  - Select con búsqueda (react-select)
  - DatePicker
  - Toast notifications
  - Skeleton loaders
  - Empty states

#### 3.2 Páginas Nuevas
- [ ] **/catalogs** - Gestión de catálogos (Tabs: Proveedores, Aforadores, Tipos Embarque, Subclientes)
- [ ] **/services** - Gestión de servicios
- [ ] **/tariffs** - Tarifario por cliente
- [ ] **/invoices** - Gestión de CXC
- [ ] **/account-statements** - Estados de cuenta detallados
- [ ] **/reports** - Reportes y dashboards

#### 3.3 Mejorar Páginas Existentes
- [ ] **Dashboard:** Añadir gráficas (Chart.js o Recharts)
- [ ] **ServiceOrders:**
  - Calculadora de cobros en línea
  - Subir múltiples documentos con drag & drop
  - Vista previa de PDFs
  - Timeline de eventos de la OS
- [ ] **Transfers:**
  - Filtros avanzados por fecha, banco, tipo
  - Carga masiva de transferencias (CSV)
- [ ] **Clients:**
  - Dashboard del cliente (crédito, facturas pendientes)
  - Historial de órdenes

#### 3.4 Diseño Profesional
- [ ] Paleta de colores corporativa (Azul #1E40AF, Verde #059669, Naranja #EA580C)
- [ ] Tipografía: Inter o Poppins
- [ ] Iconos: Heroicons o Lucide
- [ ] Diseño responsive mobile-first
- [ ] Animaciones sutiles (Framer Motion)
- [ ] Dark mode toggle

### FASE 4: FUNCIONALIDADES AVANZADAS (Prioridad Media) ⭐⭐

#### 4.1 Sistema de Facturación Completo
- [ ] Generar factura automática al cerrar OS
- [ ] Cálculo automático de IVA
- [ ] Registro de abonos parciales
- [ ] Alertas de vencimiento
- [ ] Generación de PDF de factura

#### 4.2 Reportes y Exportaciones
- [ ] Exportar a Excel por módulo
- [ ] Exportar estados de cuenta PDF
- [ ] Descargar ZIPs de documentos masivos
- [ ] Reporte mensual consolidado
- [ ] Reporte por cliente (resumen anual)

#### 4.3 Búsquedas y Filtros
- [ ] Búsqueda global (omnisearch)
- [ ] Filtros guardados (saved filters)
- [ ] Exportar resultados de búsqueda

### FASE 5: OPTIMIZACIÓN Y DEPLOY (Prioridad Media) ⭐⭐

#### 5.1 Performance
- [ ] Lazy loading de componentes
- [ ] Virtualización de tablas largas (react-window)
- [ ] Caché de consultas (React Query)
- [ ] Optimización de imágenes

#### 5.2 Deployment
- [ ] Backend: Railway o Render
- [ ] Frontend: Vercel
- [ ] Base de Datos: Neon PostgreSQL o Railway
- [ ] Storage: Cloudflare R2
- [ ] Dominio personalizado
- [ ] SSL/HTTPS
- [ ] Variables de entorno seguras

#### 5.3 Testing y QA
- [ ] Unit tests críticos (pytest)
- [ ] Integration tests de API
- [ ] E2E tests (Playwright)
- [ ] Manual testing checklist

### FASE 6: DOCUMENTACIÓN Y CAPACITACIÓN (Prioridad Baja) ⭐

#### 6.1 Documentación Técnica
- [ ] README.md completo
- [ ] Diagrama ER de base de datos
- [ ] Documentación de API (Swagger/OpenAPI)
- [ ] Guía de deployment

#### 6.2 Documentación de Usuario
- [ ] Manual de usuario (PDF)
- [ ] Video tutoriales
- [ ] FAQs
- [ ] Guía rápida (Quick Start)

#### 6.3 Capacitación
- [ ] Sesión de capacitación 2 horas
- [ ] Soporte post-entrega 2 meses

---

## 📋 CHECKLIST DE VALIDACIÓN FINAL

### Funcionalidades Core:
- [ ] Crear OS con numeración automática (001-2025)
- [ ] Adjuntar documentos PDF a OS
- [ ] Registrar transferencias con proveedor
- [ ] Calcular cobros automáticamente
- [ ] Generar factura (CXC)
- [ ] Registrar abonos a facturas
- [ ] Validar límite de crédito
- [ ] Exportar a Excel por módulo
- [ ] Descargar documentos en ZIP
- [ ] Dashboard con KPIs en tiempo real
- [ ] Estados de cuenta por cliente
- [ ] Gestión de catálogos (Proveedores, Aforadores, etc.)
- [ ] Sistema de roles y permisos
- [ ] Auditoría de acciones

### Seguridad:
- [ ] Autenticación JWT
- [ ] Permisos por rol funcionando
- [ ] HTTPS habilitado
- [ ] Variables sensibles en .env
- [ ] Validación de entrada en backend y frontend
- [ ] Protección CSRF
- [ ] Rate limiting en API

### Performance:
- [ ] Tiempo de carga < 3 segundos
- [ ] Consultas optimizadas (índices DB)
- [ ] Lazy loading implementado
- [ ] Cach é de assets estáticos

### UX:
- [ ] Diseño responsive (mobile, tablet, desktop)
- [ ] Mensajes de error claros
- [ ] Loading states en todas las acciones
- [ ] Confirmaciones en acciones críticas (eliminar)
- [ ] Tooltips en campos complejos

---

## 🚀 CRONOGRAMA ESTIMADO (8 Semanas)

| Semana | Fase | Entregables |
|--------|------|-------------|
| 1-2 | Fase 1 | Modelos de datos completos, migraciones |
| 3-4 | Fase 2 | Backend completo, API endpoints, validaciones |
| 5-6 | Fase 3 | Frontend completo, UI/UX profesional |
| 7 | Fase 4 | Funcionalidades avanzadas, reportes |
| 8 | Fase 5-6 | Deploy, testing, documentación, capacitación |

---

## 💰 COSTOS MENSUALES ESTIMADOS

| Servicio | Costo Mensual |
|----------|---------------|
| Backend (Railway) | $5-10 |
| Frontend (Vercel) | $0 (Free tier) |
| PostgreSQL (Neon/Railway) | $5 |
| Storage (Cloudflare R2) | $5-10 |
| **TOTAL** | **$15-25/mes** |

---

## 📌 PRIORIDADES INMEDIATAS

1. ✅ Migrar a PostgreSQL
2. ✅ Completar modelos de datos (Servicios, Tarifario, Facturación)
3. ✅ Implementar calculadora de cobros
4. ✅ Sistema de facturación (CXC)
5. ✅ UI/UX profesional
6. ✅ Página de catálogos
7. ✅ Estados de cuenta completos
8. ✅ Deployment en producción

---

**Elaborado por:** Claude (Anthropic)
**Versión:** 1.0
**Última actualización:** 7 de Diciembre, 2025
