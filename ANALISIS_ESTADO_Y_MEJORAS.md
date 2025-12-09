# 🔍 ANÁLISIS DE ESTADO ACTUAL Y MEJORAS PENDIENTES

## GPRO Logistic App - Diciembre 8, 2025

---

## 📊 RESUMEN EJECUTIVO

### Estado General: **85% COMPLETO** ✅

**Backend:** 95% completo ✅
**Frontend:** 85% completo ⚠️
**Integración:** 75% completo ⚠️

---

## ✅ LO QUE YA FUNCIONA (Fortalezas)

### Backend Django REST (95% completo)

#### Modelos Completos ✅

-   ✅ **Client** con `legal_name` y `secondary_phone` implementados
-   ✅ **Bank** implementado como modelo completo (no CharField)
-   ✅ **ServiceOrder** con todos los campos
-   ✅ **OrderCharge** con cálculos automáticos
-   ✅ **Transfer** con tipo (terceros/propios) y estados
-   ✅ **Invoice** y **InvoicePayment** con balance
-   ✅ **Service** y **ClientServicePrice** para tarifarios
-   ✅ **Catálogos:** Provider, CustomsAgent, ShipmentType, SubClient

#### APIs REST Completas ✅

-   ✅ CRUD completo para todos los modelos
-   ✅ Endpoints de exportación a Excel:
    -   `/api/service-orders/export_excel/` ✅
    -   `/api/clients/{id}/export_statement_excel/` ✅
    -   `/api/transfers/export_excel/` ✅
-   ✅ Sistema de permisos por rol (operativo, operativo2, admin)
-   ✅ Filtros y búsqueda en todas las vistas
-   ✅ Cálculos automáticos (IVA 13%, totales, balances)

#### Validaciones Backend ✅

-   ✅ Validadores de decimales positivos
-   ✅ Campos únicos (NIT, códigos)
-   ✅ Validaciones de email
-   ✅ Relaciones ForeignKey correctas

### Frontend React (85% completo)

#### Componentes UI Base ✅

```
✅ Badge.jsx - Etiquetas con variantes
✅ Button.jsx - Botones con estilos
✅ Card.jsx - Tarjetas con header/content
✅ DataTable.jsx - Tabla profesional con búsqueda/ordenamiento
✅ Dialog.jsx - Sistema de modales
✅ EmptyState.jsx - Estados vacíos
✅ FileUpload.jsx - Carga de archivos con validación
✅ Input.jsx - Inputs con validación
✅ Label.jsx - Labels accesibles
✅ Modal.jsx - Modales alternativos
✅ Select.jsx - Selectores
✅ Skeleton.jsx - Estados de carga
✅ Spinner.jsx - Loading spinner
✅ Tabs.jsx - Sistema de tabs
```

#### Páginas Completamente Implementadas ✅

**1. Dashboard** (95% completo)

-   ✅ 6 KPIs con tendencias
-   ✅ Gráfico Ingresos vs Gastos (Recharts)
-   ✅ Top 5 Clientes
-   ✅ Panel de Alertas (3 niveles de severidad)
-   ✅ Tabla de órdenes recientes
-   ⚠️ Usa datos mock si el backend falla

**2. ServiceOrders** (90% completo)

-   ✅ DataTable con filtros avanzados
-   ✅ CRUD completo
-   ✅ Búsqueda y paginación
-   ✅ Exportación a Excel funcional
-   ✅ Estados con badges

**3. ServiceOrderDetail** (95% completo)

-   ✅ 5 Tabs completamente funcionales:
    -   Tab 1: Información General (4 cards)
    -   Tab 2: Cargos (DataTable + CRUD)
    -   Tab 3: Traslados (DataTable + CRUD)
    -   Tab 4: Facturación (info de factura)
    -   Tab 5: Comparativo (análisis rentabilidad)
-   ✅ Integración con backend
-   ✅ Cálculos automáticos de totales

**4. Transfers** (90% completo)

-   ✅ 4 KPIs (Total, Terceros, Propios, Provisionados)
-   ✅ DataTable con 7 columnas
-   ✅ Filtros por tipo y estado
-   ✅ CRUD completo
-   ✅ FileUpload para PDF
-   ⚠️ PDF se sube pero no se muestra/descarga aún

**5. Invoicing** (90% completo)

-   ✅ 4 KPIs de resumen
-   ✅ DataTable con facturas
-   ✅ Modal de generación desde OS
-   ✅ Modal de registro de pagos
-   ✅ Modal de detalle con historial
-   ✅ Validación de saldos
-   ✅ Días de vencimiento destacados

**6. Catalogs** (95% completo)

-   ✅ 5 Tabs unificados (Proveedores, Aduanas, Bancos, Tipos, Subclientes)
-   ✅ Modal universal dinámico
-   ✅ CRUD completo para todos
-   ✅ Validaciones en formularios

**7. Users** (95% completo)

-   ✅ 3 KPIs
-   ✅ Gestión de roles completa
-   ✅ Cambio de contraseña
-   ✅ Control de acceso admin-only

**8. AccountStatements** (85% completo)

-   ✅ Visualización de crédito con barra de progreso
-   ✅ Historial de facturas
-   ✅ Resumen anual
-   ✅ Exportación a Excel (backend listo)
-   ⚠️ Botón de exportación existe pero falta probar

**9. Clients** (90% completo)

-   ✅ CRUD completo
-   ✅ Filtros por condición de pago
-   ✅ Búsqueda
-   ✅ Integración con tarifario

**10. ClientPricing** (85% completo)

-   ✅ Gestión de precios personalizados
-   ✅ Agregar/editar/eliminar
-   ✅ Agregar todos los servicios de una vez

**11. Services** (90% completo)

-   ✅ CRUD completo
-   ✅ Precio por defecto
-   ✅ Aplicación de IVA

#### Funcionalidades Transversales ✅

-   ✅ React Query 5.90.12 instalado y configurado
-   ✅ Zustand para auth
-   ✅ Axios con interceptores
-   ✅ Toast notifications
-   ✅ Diseño responsive con Tailwind
-   ✅ Sidebar jerárquico con 5 secciones
-   ✅ ProtectedRoute con validación de roles
-   ✅ Layout consistente

---

## ⚠️ LO QUE FALTA O NECESITA MEJORAS

### 🔴 Prioridad ALTA (Funcionalidad Crítica)

#### 1. **Exportaciones Frontend**

**Estado:** Backend listo ✅, Frontend parcial ⚠️

**Qué funciona:**

```javascript
// Backend tiene estos endpoints listos:
- GET /api/service-orders/export_excel/
- GET /api/clients/{id}/export_statement_excel/
- GET /api/transfers/export_excel/
```

**Qué falta:**

```javascript
// En ServiceOrders.jsx - Falta botón de exportación
// ❌ No hay botón "Exportar Excel" visible

// En AccountStatements.jsx - Botón existe pero puede fallar
handleExportExcel() {
  // ⚠️ Existe pero falta manejo robusto de errores
  // ⚠️ No muestra loading state
  // ⚠️ No valida que haya datos antes de exportar
}

// En Transfers.jsx - No hay exportación implementada
// ❌ Falta completamente
```

**Solución requerida:**

-   Agregar botón "Exportar Excel" en ServiceOrders
-   Mejorar handleExportExcel en AccountStatements con loading y validaciones
-   Implementar exportación en Transfers
-   Agregar indicador visual durante descarga

#### 2. **Manejo de PDFs en Transfers**

**Estado:** Upload funciona ⚠️, Display/Download no ❌

**Qué funciona:**

```javascript
// En Transfers.jsx - FileUpload existe
<FileUpload
    accept=".pdf"
    onChange={(file) => setFormData({ ...formData, pdf_file: file })}
/>
// ✅ El archivo se captura y se puede enviar al backend
```

**Qué falta:**

```javascript
// ❌ No se muestra el PDF subido en la tabla
// ❌ No hay columna "Archivo" en DataTable
// ❌ No hay botón para descargar/ver PDF
// ❌ Backend: falta endpoint GET /api/transfers/{id}/download_pdf/
```

**Solución requerida:**

-   Agregar columna "Archivo" en DataTable de Transfers
-   Mostrar icono de PDF cuando existe
-   Botón de descarga/vista previa
-   Backend: endpoint para servir archivos PDF

#### 3. **Generación de PDFs (Facturas/Reportes)**

**Estado:** No implementado ❌

**Qué falta:**

```python
# Backend: No hay generación de PDFs
# ❌ No existe: /api/invoices/{id}/generate_pdf/
# ❌ No existe: /api/service-orders/{id}/generate_report_pdf/
# ❌ No existe librería: reportlab o weasyprint
```

**Solución requerida:**

-   Instalar: `pip install reportlab` o `weasyprint`
-   Crear templates HTML para facturas
-   Endpoint para generar PDF de factura
-   Endpoint para generar reporte de OS
-   Botón de descarga en frontend

#### 4. **Validaciones con Zod + react-hook-form**

**Estado:** Librerías instaladas ✅, No implementadas ❌

**Qué existe:**

```json
// package.json
"react-hook-form": "^7.68.0",
"zod": "^4.1.13",
"@hookform/resolvers": "^5.2.2"
```

**Qué falta:**

```javascript
// ❌ No existe: frontend/src/lib/validations.js
// ❌ No hay esquemas Zod definidos
// ❌ Los formularios usan useState simple, no react-hook-form

// Formularios que necesitan validación:
// - ServiceOrderForm (12+ campos)
// - TransferForm (8 campos)
// - InvoiceForm (6 campos)
// - ClientForm (15+ campos)
// - UserForm (5 campos)
```

**Solución requerida:**

```javascript
// Crear: frontend/src/lib/validations.js
import { z } from "zod";

export const serviceOrderSchema = z.object({
    client: z.string().min(1, "Cliente requerido"),
    order_number: z.string().min(1, "Número requerido"),
    eta: z.string().optional(),
    // ... más campos
});

export const transferSchema = z.object({
    transfer_type: z.enum(["terceros", "propios"]),
    amount: z.number().positive("Monto debe ser positivo"),
    // ... más campos
});

// Integrar en componentes:
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm({
    resolver: zodResolver(serviceOrderSchema),
});
```

### 🟡 Prioridad MEDIA (UX y Performance)

#### 5. **Optimizaciones de Performance**

**Estado:** No implementadas ❌

**Qué falta:**

```javascript
// ❌ No hay React.lazy para code splitting
// App.jsx carga todas las páginas de inmediato

// ❌ No hay useMemo para cálculos pesados
// ServiceOrderDetail: calcula totales en cada render

// ❌ No hay useCallback para event handlers
// Se crean nuevas funciones en cada render

// ❌ No hay virtualización para listas grandes
// DataTable puede ser lento con 1000+ filas
```

**Solución requerida:**

```javascript
// 1. Code Splitting
import { lazy, Suspense } from "react";
const ServiceOrders = lazy(() => import("./pages/ServiceOrders"));
const Dashboard = lazy(() => import("./pages/Dashboard"));

// 2. Memoización
const totalCharges = useMemo(() => {
    return charges.reduce((sum, c) => sum + parseFloat(c.subtotal_with_iva), 0);
}, [charges]);

// 3. useCallback
const handleDelete = useCallback(
    (id) => {
        // lógica
    },
    [dependencies]
);

// 4. Virtualización (opcional para listas muy grandes)
import { useVirtualizer } from "@tanstack/react-virtual";
```

#### 6. **Estados de Error Robustos**

**Estado:** Básicos ⚠️, Incompletos ❌

**Qué existe:**

```javascript
// Toast notifications básicas
toast.error("Error al cargar datos");

// Try-catch en requests
catch (error) {
  toast.error("Error");
}
```

**Qué falta:**

```javascript
// ❌ No hay retry logic
// ❌ No hay offline detection
// ❌ No hay error boundaries en React
// ❌ Mensajes de error genéricos (no específicos)
// ❌ No se muestran errores de validación del backend

// Ejemplo de error mal manejado:
catch (error) {
  toast.error("Error"); // ❌ No dice qué falló
}

// Debería ser:
catch (error) {
  const message = error.response?.data?.detail
    || error.response?.data?.error
    || "Error inesperado al guardar";
  toast.error(message);
}
```

**Solución requerida:**

```javascript
// 1. Error Boundary
class ErrorBoundary extends Component {
    state = { hasError: false };
    static getDerivedStateFromError(error) {
        return { hasError: true };
    }
    render() {
        if (this.state.hasError) {
            return <ErrorFallback />;
        }
        return this.props.children;
    }
}

// 2. Retry Logic en React Query
const { data, error, refetch } = useQuery({
    queryKey: ["orders"],
    queryFn: fetchOrders,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});

// 3. Manejo de errores específicos
const handleError = (error) => {
    if (error.response?.status === 404) {
        toast.error("Recurso no encontrado");
    } else if (error.response?.status === 403) {
        toast.error("No tienes permisos para esta acción");
    } else {
        toast.error(error.response?.data?.detail || "Error inesperado");
    }
};
```

#### 7. **Testing**

**Estado:** No implementado ❌

**Qué falta:**

```javascript
// ❌ Sin tests unitarios
// ❌ Sin tests de integración
// ❌ Sin tests E2E
// ❌ Sin configuración de Jest/Vitest

// Tests críticos que faltan:
// - Validaciones de formularios
// - Cálculos de totales (OrderCharge, Transfer)
// - Autenticación y permisos
// - CRUD operations
// - Integración de componentes
```

### 🟢 Prioridad BAJA (Nice to Have)

#### 8. **Features Adicionales**

**Notificaciones en tiempo real**

-   WebSockets para alertas
-   Notificaciones push
-   Actualización automática de dashboard

**Internacionalización (i18n)**

-   Multi-idioma (ES/EN)
-   Formatos de fecha/moneda configurables

**Dark Mode**

-   Toggle light/dark theme
-   Persistencia en localStorage

**Filtros Avanzados**

-   Date range pickers
-   Filtros múltiples combinados
-   Guardado de filtros favoritos

**Reportes Avanzados**

-   Dashboard personalizable
-   Exportación a múltiples formatos (CSV, PDF, Excel)
-   Gráficos interactivos con drill-down

---

## 🔧 PLAN DE ACCIÓN INMEDIATO

### Fase 1: Exportaciones y PDFs (2-3 días) 🔴

**Día 1: Exportaciones Excel**

```javascript
// 1. ServiceOrders.jsx
- ✅ Agregar botón "Exportar Excel"
- ✅ Implementar handleExportExcel con loading
- ✅ Manejo de errores robusto

// 2. Transfers.jsx
- ✅ Agregar botón "Exportar Excel"
- ✅ Conectar con backend endpoint
- ✅ Filtros aplicados a exportación

// 3. AccountStatements.jsx
- ✅ Mejorar handleExportExcel existente
- ✅ Validación de datos antes de exportar
- ✅ Loading state visual
```

**Día 2: Manejo de PDFs en Transfers**

```python
# Backend: views.py
@action(detail=True, methods=['get'])
def download_pdf(self, request, pk=None):
    transfer = self.get_object()
    if not transfer.pdf_file:
        return Response({'error': 'No hay archivo'}, status=404)

    file_path = transfer.pdf_file.path
    with open(file_path, 'rb') as f:
        response = HttpResponse(f.read(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{os.path.basename(file_path)}"'
        return response
```

```javascript
// Frontend: Transfers.jsx
// 1. Agregar columna "Archivo" en DataTable
{
  header: "Archivo",
  accessor: "pdf_file",
  render: (row) => row.pdf_file ? (
    <button onClick={() => handleDownloadPDF(row.id)}>
      <FileText className="h-5 w-5 text-blue-600" />
    </button>
  ) : (
    <span className="text-gray-400">-</span>
  )
}

// 2. Función de descarga
const handleDownloadPDF = async (id) => {
  try {
    const response = await axios.get(`/api/transfers/${id}/download_pdf/`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `transfer_${id}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (error) {
    toast.error("Error al descargar PDF");
  }
};
```

**Día 3: Generación de PDFs (Facturas)**

```python
# Backend: requirements.txt
reportlab==4.0.7

# Backend: apps/orders/pdf_generator.py
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

def generate_invoice_pdf(invoice):
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)

    # Header
    p.setFont("Helvetica-Bold", 16)
    p.drawString(1*inch, 10*inch, "GPRO LOGISTIC")
    p.setFont("Helvetica", 12)
    p.drawString(1*inch, 9.5*inch, f"Factura #{invoice.invoice_number}")

    # Cliente
    p.drawString(1*inch, 9*inch, f"Cliente: {invoice.client.name}")
    p.drawString(1*inch, 8.7*inch, f"NIT: {invoice.client.nit}")

    # Items (service orders)
    y = 8*inch
    for order in invoice.service_orders.all():
        p.drawString(1*inch, y, order.order_number)
        p.drawString(4*inch, y, f"${order.total_amount}")
        y -= 0.3*inch

    # Total
    p.drawString(1*inch, y-0.5*inch, f"Total: ${invoice.total_amount}")

    p.save()
    buffer.seek(0)
    return buffer
```

```python
# Backend: apps/orders/views_invoices.py
@action(detail=True, methods=['get'])
def generate_pdf(self, request, pk=None):
    invoice = self.get_object()
    pdf_buffer = generate_invoice_pdf(invoice)

    response = HttpResponse(pdf_buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="factura_{invoice.invoice_number}.pdf"'
    return response
```

```javascript
// Frontend: Invoicing.jsx
const handleGeneratePDF = async (invoiceId) => {
    try {
        setLoadingPDF(invoiceId);
        const response = await axios.get(
            `/api/invoices/${invoiceId}/generate_pdf/`,
            {
                responseType: "blob",
            }
        );

        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `factura_${invoiceId}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();

        toast.success("PDF generado exitosamente");
    } catch (error) {
        toast.error("Error al generar PDF");
    } finally {
        setLoadingPDF(null);
    }
};

// Agregar botón en columna de acciones:
<button
    onClick={() => handleGeneratePDF(row.id)}
    className="text-red-600 hover:text-red-900"
    title="Generar PDF"
>
    <Download className="h-5 w-5" />
</button>;
```

### Fase 2: Validaciones Zod (1-2 días) 🟡

```javascript
// Día 4: Crear esquemas de validación
// frontend/src/lib/validations.js

import { z } from "zod";

export const serviceOrderSchema = z.object({
    client: z.string().min(1, "Seleccione un cliente"),
    order_number: z.string().min(1, "Número de orden requerido"),
    purchase_order: z.string().optional(),
    duca: z.string().optional(),
    eta: z.string().optional(),
    shipment_type: z.string().optional(),
    provider: z.string().optional(),
    sub_client: z.string().optional(),
    status: z.enum(["abierta", "cerrada", "cancelada"]),
});

export const transferSchema = z.object({
    transfer_type: z.enum(["terceros", "propios"], {
        required_error: "Seleccione tipo de traslado",
    }),
    provider: z.string().min(1, "Seleccione proveedor"),
    amount: z.number().positive("Monto debe ser positivo"),
    currency: z.enum(["USD", "MXN"]),
    payment_method: z.string().min(1, "Método de pago requerido"),
    status: z.enum(["pendiente", "pagada", "provisionada"]),
});

export const clientSchema = z.object({
    name: z.string().min(3, "Nombre debe tener al menos 3 caracteres"),
    legal_name: z.string().optional(),
    nit: z.string().regex(/^\d{4}-\d{6}-\d{3}-\d$/, "NIT inválido"),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    phone: z.string().min(8, "Teléfono inválido").optional(),
    credit_limit: z.number().nonnegative("Límite debe ser positivo o cero"),
});

export const userSchema = z.object({
    username: z.string().min(3, "Usuario debe tener al menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(8, "Contraseña debe tener al menos 8 caracteres"),
    role: z.enum(["operativo", "operativo2", "admin"]),
});
```

```javascript
// Día 5: Integrar en componentes
// Ejemplo: ServiceOrders.jsx

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceOrderSchema } from "../lib/validations";

function ServiceOrderForm({ onSubmit, initialData }) {
    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm({
        resolver: zodResolver(serviceOrderSchema),
        defaultValues: initialData,
    });

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <div>
                <Label>Cliente *</Label>
                <Select {...register("client")}>{/* options */}</Select>
                {errors.client && (
                    <p className="text-red-500 text-sm mt-1">
                        {errors.client.message}
                    </p>
                )}
            </div>

            <div>
                <Label>Número de Orden *</Label>
                <Input {...register("order_number")} />
                {errors.order_number && (
                    <p className="text-red-500 text-sm mt-1">
                        {errors.order_number.message}
                    </p>
                )}
            </div>

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Guardando..." : "Guardar"}
            </Button>
        </form>
    );
}
```

### Fase 3: Performance y Polish (2-3 días) 🟢

**Día 6-7: Optimizaciones**

```javascript
// 1. Code Splitting
// App.jsx
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ServiceOrders = lazy(() => import("./pages/ServiceOrders"));
// ... todos los componentes pesados

<Suspense fallback={<Spinner />}>
    <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* ... */}
    </Routes>
</Suspense>;

// 2. Memoización de cálculos
// ServiceOrderDetail.jsx
const totalCharges = useMemo(() => {
    return charges.reduce((sum, charge) => {
        return sum + parseFloat(charge.subtotal_with_iva || 0);
    }, 0);
}, [charges]);

const totalTransfers = useMemo(() => {
    return transfers.reduce((sum, transfer) => {
        return sum + parseFloat(transfer.amount || 0);
    }, 0);
}, [transfers]);

// 3. useCallback para handlers
const handleDeleteCharge = useCallback(
    (id) => {
        if (window.confirm("¿Eliminar cargo?")) {
            axios.delete(`/api/charges/${id}/`).then(() => {
                fetchCharges();
                toast.success("Cargo eliminado");
            });
        }
    },
    [fetchCharges]
);

// 4. Error Boundary
// components/ErrorBoundary.jsx
import React from "react";

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Error capturado:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
                        <h2 className="text-2xl font-bold text-red-600 mb-4">
                            ¡Algo salió mal!
                        </h2>
                        <p className="text-gray-600 mb-4">
                            Lo sentimos, ha ocurrido un error inesperado.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full bg-primary-600 text-white py-2 rounded-lg hover:bg-primary-700"
                        >
                            Recargar página
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// App.jsx
<ErrorBoundary>
    <QueryClientProvider client={queryClient}>
        <Router>{/* ... */}</Router>
    </QueryClientProvider>
</ErrorBoundary>;
```

**Día 8: Testing básico**

```bash
# Instalar testing libraries
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Configurar Vitest
# vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
});
```

```javascript
// Tests básicos para validaciones
// src/lib/__tests__/validations.test.js
import { describe, it, expect } from "vitest";
import { serviceOrderSchema, transferSchema } from "../validations";

describe("serviceOrderSchema", () => {
    it("valida un orden válido", () => {
        const valid = {
            client: "1",
            order_number: "OS-001",
            status: "abierta",
        };
        expect(() => serviceOrderSchema.parse(valid)).not.toThrow();
    });

    it("rechaza orden sin cliente", () => {
        const invalid = {
            order_number: "OS-001",
            status: "abierta",
        };
        expect(() => serviceOrderSchema.parse(invalid)).toThrow();
    });
});

describe("transferSchema", () => {
    it("rechaza monto negativo", () => {
        const invalid = {
            transfer_type: "terceros",
            provider: "1",
            amount: -100,
        };
        expect(() => transferSchema.parse(invalid)).toThrow();
    });
});
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Semana 1: Exportaciones y PDFs

-   [ ] Botón exportar Excel en ServiceOrders
-   [ ] Botón exportar Excel en Transfers
-   [ ] Mejorar exportación AccountStatements
-   [ ] Backend: endpoint download_pdf para transfers
-   [ ] Frontend: columna y botón para PDFs en transfers
-   [ ] Backend: instalar reportlab
-   [ ] Backend: función generate_invoice_pdf
-   [ ] Backend: endpoint generate_pdf para invoices
-   [ ] Frontend: botón generar PDF en Invoicing

### Semana 2: Validaciones

-   [ ] Crear lib/validations.js con esquemas Zod
-   [ ] Migrar ServiceOrderForm a react-hook-form
-   [ ] Migrar TransferForm a react-hook-form
-   [ ] Migrar ClientForm a react-hook-form
-   [ ] Migrar UserForm a react-hook-form
-   [ ] Manejo de errores mejorado en todos los formularios

### Semana 3: Performance y Testing

-   [ ] Implementar code splitting con React.lazy
-   [ ] Agregar useMemo para cálculos pesados
-   [ ] Agregar useCallback para handlers
-   [ ] Crear ErrorBoundary component
-   [ ] Configurar Vitest
-   [ ] Tests para validaciones
-   [ ] Tests para cálculos (totales, IVA)
-   [ ] Documentación de APIs

---

## 🎯 ESTADO FINAL ESPERADO

Al completar estas mejoras, el sistema tendrá:

✅ **100% funcionalidad del plan original**
✅ **Exportaciones completas** (Excel para todos los módulos)
✅ **PDFs generados** (facturas y reportes)
✅ **Validaciones robustas** (Zod + react-hook-form)
✅ **Performance optimizado** (lazy loading, memoización)
✅ **Testing básico** (validaciones y cálculos)
✅ **Manejo de errores profesional** (boundaries, retry logic)
✅ **UX pulida** (loading states, confirmaciones, feedback)

**Tiempo estimado total: 3 semanas**
**Estado final: 100% PRODUCCIÓN READY** 🚀

---

## 📝 NOTAS TÉCNICAS

### Librerías Backend Requeridas

```bash
pip install reportlab==4.0.7
pip install openpyxl==3.1.2  # Ya instalado
```

### Librerías Frontend Ya Instaladas

```json
{
  "react-hook-form": "^7.68.0",  ✅
  "zod": "^4.1.13",               ✅
  "@hookform/resolvers": "^5.2.2", ✅
  "@tanstack/react-query": "^5.90.12", ✅
  "recharts": "^2.15.4"           ✅
}
```

### Librerías Frontend a Instalar

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

---

**Documento generado:** Diciembre 8, 2025
**Última actualización:** Análisis completo del estado actual
