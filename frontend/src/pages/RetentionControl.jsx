import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Search,
    CheckCircle2,
    Clock,
    Upload,
    Eye,
    RefreshCw,
    DollarSign,
    TrendingUp,
    FileCheck,
    Filter,
    XCircle,
    Receipt,
    Calendar,
    Building2,
    AlertCircle,
    CalendarClock,
    ArrowUpRight,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    Button,
    Input,
    Label,
    Modal,
    ModalFooter,
    DataTable,
    SelectERP,
    FileUpload,
    Skeleton,
    Badge,
    SkeletonTable,
} from "../components/ui";
import ExportButton from "../components/ui/ExportButton";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn } from "../lib/utils";

const formatDateSafe = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const dateOnly = String(dateStr).split("T")[0];
        const parts = dateOnly.split("-");
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            const dateObj = new Date(year, month - 1, day);
            return dateObj.toLocaleDateString("es-SV", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }
        return formatDate(dateStr);
    } catch {
        return dateStr;
    }
};

// ============================================
// KPI CARD - REFINED (Invoicing Style)
// ============================================
const KPICard = ({ label, value, subtext, icon: Icon }) => {
    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
                <p
                    className="text-[10px] sm:text-xs lg:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate"
                    title={label}
                >
                    {label}
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 tabular-nums tracking-tight truncate">
                    {value}
                </p>
                {subtext && (
                    <p className="text-[9px] sm:text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                        {subtext}
                    </p>
                )}
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100 flex-shrink-0">
                {Icon && (
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-slate-400" />
                )}
            </div>
        </div>
    );
};

// Configuración de estados de retención - Paleta Mate Profesional
const RETENTION_STATUS_CONFIG = {
    pending: {
        label: "Pendiente de Recibir",
        className: "bg-white border-slate-200 text-slate-600",
        icon: Clock,
        iconColor: "text-amber-500",
    },
    received: {
        label: "Comprobante Recibido",
        className: "bg-white border-slate-200 text-slate-900 font-medium",
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
    },
};

// Componente de Badge de Estado - Estilo Sobrio
const RetentionStatusBadge = ({ status }) => {
    const config =
        RETENTION_STATUS_CONFIG[status] || RETENTION_STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border shadow-sm transition-colors",
                config.className
            )}
        >
            {Icon && <Icon className={cn("w-3.5 h-3.5", config.iconColor)} />}
            {config.label}
        </span>
    );
};

function RetentionControl() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
    const [selectedClient, setSelectedClient] = useState(null);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [clients, setClients] = useState([]);
    
    // UI State
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [registerLoading, setRegisterLoading] = useState(false);
    const [formData, setFormData] = useState({
        numero_f910: "",
        retention_generation_code: "",
        retention_reception_stamp: "",
        payment_date: new Date().toISOString().split("T")[0],
        receipt_file: null,
        notes: "",
    });
    
    const [isExporting, setIsExporting] = useState(false);

    // Fetch data from API
    const fetchData = async () => {
        try {
            setLoading(true);
            const params = {
                year: selectedYear,
                month: selectedMonth,
            };
            if (selectedClient) {
                params.client_id = selectedClient;
            }
            if (statusFilter && statusFilter !== 'all') {
                params.status = statusFilter;
            }
            
            const response = await api.get('/orders/retention-control/', { params });
            setData(response.data);
        } catch (error) {
            console.error('Error fetching retention data:', error);
            toast.error('Error al cargar datos de retenciones');
        } finally {
            setLoading(false);
        }
    };

    // Fetch clients list
    const fetchClients = async () => {
        try {
            const response = await api.get('/clients/');
            setClients(response.data.results || response.data || []);
        } catch (error) {
            console.error('Error fetching clients:', error);
        }
    };
    
    const handleExportExcel = async () => {
        try {
            setIsExporting(true);
            const params = {
                year: selectedYear,
                month: selectedMonth,
                export: 'excel'
            };
            
            if (selectedClient) params.client_id = selectedClient;
            if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

            const response = await api.get('/orders/retention-control/', { 
                params,
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `control_retenciones_${selectedYear}_${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            
            toast.success("Reporte exportado exitosamente");
        } catch (error) {
            console.error('Export error:', error);
            toast.error("Error al exportar reporte");
        } finally {
            setIsExporting(false);
        }
    };

    // Load data on mount and when filters change
    useEffect(() => {
        fetchData();
    }, [selectedYear, selectedMonth, selectedClient, statusFilter]);

    // Load clients on mount
    useEffect(() => {
        fetchClients();
    }, []);

    // Filtered invoices based on search term
    const filteredInvoices = useMemo(() => {
        if (!data?.invoices) return [];
        
        if (!searchTerm) return data.invoices;
        
        const term = searchTerm.toLowerCase();
        return data.invoices.filter(invoice => 
            invoice.invoice_number?.toLowerCase().includes(term) ||
            invoice.client_name?.toLowerCase().includes(term) ||
            invoice.comprobante_data?.numero_retencion?.toLowerCase().includes(term)
        );
    }, [data?.invoices, searchTerm]);

    // Count active filters
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (selectedClient) count++;
        if (statusFilter && statusFilter !== 'all') count++;
        if (selectedMonth !== new Date().getMonth() + 1) count++;
        if (selectedYear !== new Date().getFullYear()) count++;
        return count;
    }, [selectedClient, statusFilter, selectedMonth, selectedYear]);

    const handleRegisterComprobante = (invoice) => {
        setSelectedInvoice(invoice);
        setFormData({
            numero_f910: "",
            retention_generation_code: "",
            retention_reception_stamp: "",
            payment_date: new Date().toISOString().split("T")[0],
            receipt_file: null,
            notes: "",
        });
        setShowRegisterModal(true);
    };

    const handleSubmitComprobante = async () => {
        if (!formData.numero_f910.trim()) {
            toast.error("Debe ingresar el número de comprobante de retención");
            return;
        }

        if (!formData.receipt_file) {
            toast.error("Debe subir el comprobante de retención escaneado");
            return;
        }

        try {
            setRegisterLoading(true);
            
            const submitData = new FormData();
            submitData.append("amount", selectedInvoice.retencion);
            submitData.append("payment_date", formData.payment_date);
            submitData.append("payment_method", "retencion");
            submitData.append("numero_comprobante_retencion", formData.numero_f910);
            
            if (formData.retention_generation_code) {
                submitData.append("retention_generation_code", formData.retention_generation_code);
            }
            if (formData.retention_reception_stamp) {
                submitData.append("retention_reception_stamp", formData.retention_reception_stamp);
            }
            
            submitData.append("notes", formData.notes);
            
            if (formData.receipt_file) {
                submitData.append("receipt_file", formData.receipt_file);
            }

            await api.post(
                `/orders/invoices/${selectedInvoice.id}/add_payment/`,
                submitData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            toast.success("Comprobante de retención registrado exitosamente");
            setShowRegisterModal(false);
            fetchData();
        } catch (error) {
            console.error("Error registrando comprobante:", error);
            toast.error(
                error.response?.data?.error ||
                    "Error al registrar comprobante"
            );
        } finally {
            setRegisterLoading(false);
        }
    };

    const clearFilters = () => {
        setSelectedYear(new Date().getFullYear());
        setSelectedMonth(new Date().getMonth() + 1);
        setSelectedClient(null);
        setStatusFilter("all");
        setSearchTerm("");
    };

    const columns = [
        {
            header: "Documento",
            accessor: "invoice_number",
            sortable: false,
            render: (row) => (
                <div className="py-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-700 text-xs tracking-tighter">
                            {row.invoice_number}
                        </span>
                    </div>
                    {row.os_number && row.os_number !== "N/A" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (row.service_order_id) {
                                    navigate(`/service-orders/${row.service_order_id}`);
                                }
                            }}
                            className="text-[10px] text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 mt-0.5"
                        >
                            {row.os_number}
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                    )}
                </div>
            ),
        },
        {
            header: "Cliente (Agente de Retención)",
            accessor: "client_name",
            sortable: false,
            render: (row) => (
                <div className="py-1 max-w-[200px]">
                    <div
                        className="font-medium text-slate-700 text-sm truncate"
                        title={row.client_name}
                    >
                        {row.client_name}
                    </div>
                    {row.client_nit && (
                        <div className="text-[10px] text-slate-400 font-mono tracking-tighter">
                            NIT: {row.client_nit}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Fecha Emisión",
            accessor: "issue_date",
            sortable: false,
            render: (row) => (
                <div className="text-[11px] text-slate-500 font-medium tabular-nums py-1 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatDateSafe(row.issue_date)}
                </div>
            ),
        },
        {
            header: "Retención (1%)",
            accessor: "retencion",
            className: "w-[140px]",
            headerClassName: "text-right",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col items-end text-right">
                    <div className="font-semibold text-slate-700 tabular-nums text-sm tracking-tight">
                        {formatCurrency(row.retencion)}
                    </div>
                </div>
            ),
        },
        {
            header: "Comprobante de Retención",
            accessor: "comprobante",
            sortable: false,
            render: (row) => {
                if (row.comprobante_data) {
                    return (
                        <div className="py-1">
                            <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-700 text-xs">
                                    {row.comprobante_data.numero_retencion}
                                </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                                Recibido: {formatDateSafe(row.comprobante_data.payment_date)}
                            </div>
                        </div>
                    );
                }
                return (
                    <span className="text-[11px] text-slate-400 italic">Pendiente de recepción</span>
                );
            },
        },
        {
            header: "Estado",
            accessor: "status",
            sortable: false,
            render: (row) => <RetentionStatusBadge status={row.status} />,
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[120px] text-center",
            headerClassName: "text-center",
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-center gap-0.5">
                    {row.comprobante_data?.receipt_file && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.comprobante_data.receipt_file, "_blank");
                            }}
                            title="Ver archivo"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            <FileCheck className="w-4 h-4" />
                        </button>
                    )}
                    
                    {row.status === "pending" ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRegisterComprobante(row);
                            }}
                            title="Registrar Comprobante"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoice(row);
                                setShowRegisterModal(true);
                            }}
                            title="Ver Detalle"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    if (loading && !data) {
        return (
            <div className="space-y-6 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <SkeletonTable rows={10} columns={7} />
            </div>
        );
    }

    const kpis = data?.kpis || {};

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 mt-1 sm:mt-2">
            {/* Header / Title - Optional depending on layout preferences, kept minimal */}
            
            {/* Bloque Estratégico (KPIs) */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <KPICard
                    label="Total Retenciones"
                    value={formatCurrency(kpis.total_retenciones || 0)}
                    icon={DollarSign}
                />
                <KPICard
                    label="Comprobantes Recibidos"
                    value={`${kpis.comprobantes_recibidos?.count || 0}`}
                    subtext={formatCurrency(kpis.comprobantes_recibidos?.monto || 0)}
                    icon={CheckCircle2}
                />
                <KPICard
                    label="Pendientes de Recibir"
                    value={`${kpis.pendientes?.count || 0}`}
                    subtext={formatCurrency(kpis.pendientes?.monto || 0)}
                    icon={Clock}
                />
                <KPICard
                    label="Tasa de Recuperación"
                    value={`${kpis.tasa_recuperacion || 0}%`}
                    icon={TrendingUp}
                />
            </div>

            {/* Bloque Operativo (Tabla + Herramientas) */}
            <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Barra de Herramientas */}
                <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* Izquierda: Búsqueda + Filtros */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-3xl">
                            {/* Búsqueda */}
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                <input
                                    placeholder="Buscar factura, cliente, F-910..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                                />
                            </div>

                            {/* Botón Filtros */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                className={cn(
                                    "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all h-10 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap",
                                    isFiltersOpen &&
                                        "ring-2 ring-slate-900/5 border-slate-900 bg-slate-50"
                                )}
                            >
                                <Filter className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-2 text-slate-500" />
                                <span className="hidden sm:inline">Filtros</span>
                                {activeFiltersCount > 0 && (
                                    <span className="ml-1 sm:ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-full">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </Button>
                        </div>

                        {/* Derecha: Acciones */}
                        <div className="flex items-center gap-2 sm:gap-3 justify-end shrink-0">
                            <div className="text-xs sm:text-sm text-slate-500 hidden md:block">
                                <span className="font-semibold text-slate-900">
                                    {filteredInvoices.length}
                                </span>{" "}
                                facturas
                            </div>
                            <div className="h-6 w-px bg-slate-200 hidden lg:block" />

                            <ExportButton
                                onExportAll={handleExportExcel}
                                onExportFiltered={handleExportExcel}
                                isExporting={isExporting}
                                totalCount={filteredInvoices.length}
                                filteredCount={filteredInvoices.length}
                                allLabel="Exportar Reporte"
                                allDescription="Descargar Excel con los filtros actuales"
                                filteredLabel="Exportar Vista Actual"
                                filteredDescription="Descargar exactamente lo que se ve en pantalla"
                            />

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchData}
                                disabled={loading}
                                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm h-10 sm:h-9 px-3 transition-all active:scale-95"
                            >
                                <RefreshCw
                                    className={cn(
                                        "w-3.5 h-3.5 sm:mr-2",
                                        loading && "animate-spin"
                                    )}
                                />
                                <span className="hidden sm:inline">Actualizar</span>
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters Panel */}
                {isFiltersOpen && (
                    <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <SelectERP
                                label="Año"
                                value={selectedYear}
                                onChange={setSelectedYear}
                                options={Array.from({ length: 5 }, (_, i) => ({
                                    id: new Date().getFullYear() - 2 + i,
                                    name: String(new Date().getFullYear() - 2 + i),
                                }))}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable={false}
                            />
                            
                            <SelectERP
                                label="Mes"
                                value={selectedMonth}
                                onChange={setSelectedMonth}
                                options={[
                                    { id: 0, name: "Año Completo" },
                                    { id: 1, name: "Enero" },
                                    { id: 2, name: "Febrero" },
                                    { id: 3, name: "Marzo" },
                                    { id: 4, name: "Abril" },
                                    { id: 5, name: "Mayo" },
                                    { id: 6, name: "Junio" },
                                    { id: 7, name: "Julio" },
                                    { id: 8, name: "Agosto" },
                                    { id: 9, name: "Septiembre" },
                                    { id: 10, name: "Octubre" },
                                    { id: 11, name: "Noviembre" },
                                    { id: 12, name: "Diciembre" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable={false}
                            />
                            
                            <SelectERP
                                label="Cliente"
                                value={selectedClient}
                                onChange={setSelectedClient}
                                options={clients}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                placeholder="Todos los clientes"
                                searchable
                                clearable
                            />
                            
                            <SelectERP
                                label="Estado"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { id: "all", name: "Todos" },
                                    { id: "pending", name: "Pendientes" },
                                    { id: "received", name: "Recibidos" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable={false}
                            />
                        </div>

                        <div className="flex justify-end pt-5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Restablecer Filtros
                            </Button>
                        </div>
                    </div>
                )}

                <div className="relative min-h-[400px]">
                    <DataTable
                        data={filteredInvoices}
                        columns={columns}
                        loading={loading}
                        searchable={false}
                        emptyMessage={
                            <div className="py-12 text-center">
                                <Receipt className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                                <p className="text-slate-500 font-medium">
                                    No se encontraron facturas con retención
                                </p>
                            </div>
                        }
                    />
                </div>
            </div>

            {/* Modal de Registro */}
            {showRegisterModal && selectedInvoice && (
                <Modal
                    isOpen={showRegisterModal}
                    onClose={() => setShowRegisterModal(false)}
                    title={
                        selectedInvoice.status === "pending"
                            ? "Registrar Comprobante de Retención"
                            : "Detalle Comprobante de Retención"
                    }
                    size="md"
                >
                    <div className="space-y-6">
                        {/* Resumen Factura */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Receipt className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Factura
                                        </p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {selectedInvoice.invoice_number}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Monto Retención
                                    </p>
                                    <p className="text-base font-bold text-emerald-700 tabular-nums">
                                        {formatCurrency(selectedInvoice.retencion)}
                                    </p>
                                </div>
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
                                <span>{selectedInvoice.client_name}</span>
                                <RetentionStatusBadge status={selectedInvoice.status} />
                            </div>
                        </div>

                        {selectedInvoice.status === "pending" ? (
                            <>
                                <div>
                                    <Label htmlFor="numero_f910" className="mb-1.5 block">
                                        Número Comprobante de Retención{" "}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="numero_f910"
                                        value={formData.numero_f910}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                numero_f910: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: 2026-001234"
                                        className="font-mono uppercase"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="retention_generation_code" className="mb-1.5 block">
                                        Código de Generación
                                    </Label>
                                    <Input
                                        id="retention_generation_code"
                                        value={formData.retention_generation_code}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                retention_generation_code: e.target.value,
                                            })
                                        }
                                        placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                                        className="font-mono uppercase text-xs"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="retention_reception_stamp" className="mb-1.5 block">
                                        Sello de Recepción
                                    </Label>
                                    <Input
                                        id="retention_reception_stamp"
                                        value={formData.retention_reception_stamp}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                retention_reception_stamp: e.target.value,
                                            })
                                        }
                                        placeholder="Sello de Hacienda..."
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="payment_date" className="mb-1.5 block">
                                        Fecha de Recepción{" "}
                                        <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="payment_date"
                                        type="date"
                                        value={formData.payment_date}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                payment_date: e.target.value,
                                            })
                                        }
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="receipt_file" className="mb-1.5 block">
                                        Comprobante Escaneado <span className="text-red-500">*</span>
                                    </Label>
                                    <FileUpload
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onFileChange={(file) =>
                                            setFormData({
                                                ...formData,
                                                receipt_file: file,
                                            })
                                        }
                                        maxSize={5 * 1024 * 1024}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="notes" className="mb-1.5 block">Notas</Label>
                                    <textarea
                                        id="notes"
                                        value={formData.notes}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                notes: e.target.value,
                                            })
                                        }
                                        rows={3}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                                        placeholder="Observaciones adicionales..."
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
                                            Número Comprobante
                                        </Label>
                                        <p className="font-mono font-bold text-slate-900 text-sm">
                                            {selectedInvoice.comprobante_data?.numero_retencion}
                                        </p>
                                    </div>
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
                                            Fecha de Recepción
                                        </Label>
                                        <p className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                            {formatDateSafe(
                                                selectedInvoice.comprobante_data
                                                    ?.payment_date
                                            )}
                                        </p>
                                    </div>
                                </div>

                                {(selectedInvoice.comprobante_data?.generation_code || selectedInvoice.comprobante_data?.reception_stamp) && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        {selectedInvoice.comprobante_data?.generation_code && (
                                            <div>
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
                                                    Código de Generación
                                                </Label>
                                                <p className="font-mono text-xs text-slate-700 break-all">
                                                    {selectedInvoice.comprobante_data.generation_code}
                                                </p>
                                            </div>
                                        )}
                                        {selectedInvoice.comprobante_data?.reception_stamp && (
                                            <div>
                                                <Label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
                                                    Sello de Recepción
                                                </Label>
                                                <p className="font-mono text-xs text-slate-700 break-all">
                                                    {selectedInvoice.comprobante_data.reception_stamp}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                {selectedInvoice.comprobante_data?.receipt_file && (
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
                                            Archivo Adjunto
                                        </Label>
                                        <a
                                            href={
                                                selectedInvoice.comprobante_data
                                                    .receipt_file
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors w-full"
                                        >
                                            <FileCheck className="h-4 w-4" />
                                            Ver comprobante escaneado
                                        </a>
                                    </div>
                                )}
                                
                                {selectedInvoice.comprobante_data?.notes && (
                                    <div>
                                        <Label className="text-slate-500 text-xs uppercase tracking-wider mb-1 block">
                                            Notas
                                        </Label>
                                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                            {selectedInvoice.comprobante_data.notes}
                                        </p>
                                    </div>
                                )}
                                
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-400 text-right">
                                        Registrado por {selectedInvoice.comprobante_data?.created_by || "Sistema"}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowRegisterModal(false)}
                        >
                            {selectedInvoice.status === "pending"
                                ? "Cancelar"
                                : "Cerrar"}
                        </Button>
                        {selectedInvoice.status === "pending" && (
                            <Button
                                onClick={handleSubmitComprobante}
                                disabled={registerLoading}
                                className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95"
                            >
                                {registerLoading ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                                        Registrando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Registrar Comprobante
                                    </>
                                )}
                            </Button>
                        )}
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

export default RetentionControl;