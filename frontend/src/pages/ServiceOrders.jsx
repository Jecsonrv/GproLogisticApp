import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Plus,
    Eye,
    Check,
    Search,
    Download,
    Filter,
    X,
    ChevronDown,
    Calendar,
    Clock,
    Building2,
    FileText,
    Ship,
    MoreVertical,
    RefreshCw,
    ArrowUpDown,
    CheckCircle2,
    AlertCircle,
    XCircle,
} from "lucide-react";
import {
    DataTable,
    Modal,
    Button,
    Card,
    Input,
    Select,
    Badge,
    CardContent,
    Label,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import ServiceOrderDetail from "../components/ServiceOrderDetail";
import { formatCurrency, formatDate, cn } from "../lib/utils";

// ============================================
// STATUS CONFIGURATION
// ============================================
const STATUS_CONFIG = {
    abierta: {
        label: "En Proceso",
        variant: "info",
        icon: Clock,
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
    },
    cerrada: {
        label: "Cerrada",
        variant: "success",
        icon: CheckCircle2,
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    cancelada: {
        label: "Cancelada",
        variant: "default",
        icon: XCircle,
        bgColor: "bg-slate-50",
        textColor: "text-slate-600",
        borderColor: "border-slate-200",
        dotColor: "bg-slate-400",
    },
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================
const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.cancelada;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded",
                config.bgColor,
                config.textColor,
                "border",
                config.borderColor
            )}
        >
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
            {config.label}
        </span>
    );
};

// ============================================
// KPI CARD COMPONENT
// ============================================
const KPICard = ({ label, value, subtext, icon: Icon, variant = "default" }) => {
    const variants = {
        default: "text-slate-900",
        primary: "text-brand-600",
        success: "text-success-600",
        warning: "text-warning-600",
        danger: "text-danger-600",
    };

    return (
        <div className="kpi-card">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <p className="kpi-label">{label}</p>
                    <p className={cn("kpi-value mt-1", variants[variant])}>
                        {value}
                    </p>
                    {subtext && (
                        <p className="text-xs text-slate-500 mt-1 truncate">
                            {subtext}
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className="flex-shrink-0 p-2 bg-slate-100 rounded">
                        <Icon className="w-4 h-4 text-slate-500" />
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// FILTER CHIP COMPONENT
// ============================================
const FilterChip = ({ label, value, onRemove }) => (
    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-brand-50 text-brand-700 rounded border border-brand-200">
        <span className="text-brand-500">{label}:</span>
        {value}
        <button
            onClick={onRemove}
            className="ml-0.5 hover:bg-brand-100 rounded p-0.5"
        >
            <X className="w-3 h-3" />
        </button>
    </span>
);

// ============================================
// MAIN COMPONENT
// ============================================
const ServiceOrders = () => {
    // Data state
    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [customsAgents, setCustomsAgents] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [providers, setProviders] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        status: "",
        client: "",
        dateFrom: "",
        dateTo: "",
    });

    // Form state
    const [formData, setFormData] = useState({
        client: "",
        sub_client: null,
        shipment_type: "",
        provider: "",
        customs_agent: "",
        purchase_order: "",
        bl_reference: "",
        eta: "",
        duca: "",
    });

    // ============================================
    // DATA FETCHING
    // ============================================
    useEffect(() => {
        fetchOrders();
        fetchCatalogs();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/orders/service-orders/");
            setOrders(response.data);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar órdenes de servicio");
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [clientsRes, agentsRes, typesRes, providersRes] =
                await Promise.all([
                    axios.get("/clients/"),
                    axios.get("/catalogs/customs-agents/"),
                    axios.get("/catalogs/shipment-types/"),
                    axios.get("/catalogs/providers/"),
                ]);
            setClients(clientsRes.data);
            setCustomsAgents(agentsRes.data);
            setShipmentTypes(typesRes.data);
            setProviders(providersRes.data);
        } catch (error) {
            console.error("Error cargando catálogos", error);
        }
    };

    // ============================================
    // HANDLERS
    // ============================================
    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post("/orders/service-orders/", formData);
            toast.success("Orden de Servicio creada exitosamente");
            fetchOrders();
            setIsCreateModalOpen(false);
            resetForm();
        } catch (error) {
            const errorMsg =
                error.response?.data?.duca?.[0] ||
                error.response?.data?.message ||
                "Error al crear orden";
            toast.error(errorMsg);
        }
    };

    const resetForm = () => {
        setFormData({
            client: "",
            sub_client: null,
            shipment_type: "",
            provider: "",
            customs_agent: "",
            purchase_order: "",
            bl_reference: "",
            eta: "",
            duca: "",
        });
    };

    const handleViewDetail = (order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    const handleCloseOrder = async (orderId) => {
        if (!confirm("¿Confirmar cierre operativo de esta orden?")) return;

        try {
            await axios.patch(`/orders/service-orders/${orderId}/`, {
                status: "cerrada",
            });
            toast.success("Orden cerrada correctamente");
            fetchOrders();
        } catch (error) {
            toast.error("Error al cerrar la orden");
        }
    };

    const handleExportExcel = async () => {
        if (orders.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get(
                "/orders/service-orders/export_excel/",
                { responseType: "blob" }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().split("T")[0];
            link.setAttribute("download", `GPRO_Ordenes_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Archivo exportado correctamente");
        } catch (error) {
            toast.error("Error al exportar");
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            status: "",
            client: "",
            dateFrom: "",
            dateTo: "",
        });
        setSearchQuery("");
    };

    // ============================================
    // COMPUTED VALUES
    // ============================================
    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
            // Search query
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    order.order_number?.toLowerCase().includes(query) ||
                    order.duca?.toLowerCase().includes(query) ||
                    order.bl_reference?.toLowerCase().includes(query) ||
                    order.client_name?.toLowerCase().includes(query) ||
                    order.purchase_order?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Status filter
            if (filters.status && order.status !== filters.status) {
                return false;
            }

            // Client filter
            if (filters.client && order.client !== parseInt(filters.client)) {
                return false;
            }

            // Date filters
            if (filters.dateFrom) {
                const orderDate = new Date(order.created_at);
                const fromDate = new Date(filters.dateFrom);
                if (orderDate < fromDate) return false;
            }

            if (filters.dateTo) {
                const orderDate = new Date(order.created_at);
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59);
                if (orderDate > toDate) return false;
            }

            return true;
        });
    }, [orders, searchQuery, filters]);

    const kpis = useMemo(() => {
        const total = orders.length;
        const active = orders.filter((o) => o.status === "abierta").length;
        const closed = orders.filter((o) => o.status === "cerrada").length;
        const invoiced = orders.filter((o) => o.facturado).length;
        const totalAmount = orders.reduce(
            (acc, curr) => acc + (parseFloat(curr.total_amount) || 0),
            0
        );

        return { total, active, closed, invoiced, totalAmount };
    }, [orders]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.status) count++;
        if (filters.client) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        return count;
    }, [filters]);

    // ============================================
    // TABLE COLUMNS - Professional CRM Style
    // ============================================
    const columns = [
        {
            header: "Orden",
            accessor: "order_number",
            className: "w-[120px]",
            render: (row) => (
                <div className="py-0.5">
                    <div className="font-mono text-sm font-semibold text-slate-900">
                        {row.order_number}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                        {formatDate(row.created_at, { format: "medium" })}
                    </div>
                </div>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            render: (row) => (
                <div className="py-0.5">
                    <div className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                        {row.client_name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                        {row.shipment_type_name && (
                            <span className="text-xs text-slate-500">
                                {row.shipment_type_name}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "Referencias",
            accessor: "duca",
            render: (row) => (
                <div className="py-0.5 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-2xs font-medium text-slate-400 uppercase w-8">
                            DUCA
                        </span>
                        <span className="font-mono text-sm text-slate-900 bg-slate-50 px-1.5 py-0.5 rounded">
                            {row.duca}
                        </span>
                    </div>
                    {row.bl_reference && (
                        <div className="flex items-center gap-2">
                            <span className="text-2xs font-medium text-slate-400 uppercase w-8">
                                BL
                            </span>
                            <span className="font-mono text-xs text-slate-600">
                                {row.bl_reference}
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "ETA",
            accessor: "eta",
            className: "w-[100px]",
            render: (row) => (
                <div className="py-0.5">
                    <div className="text-sm text-slate-900 tabular-nums">
                        {formatDate(row.eta, { format: "short" })}
                    </div>
                </div>
            ),
        },
        {
            header: "Monto",
            accessor: "total_amount",
            className: "w-[140px] text-right",
            render: (row) => (
                <div className="py-0.5 text-right">
                    <div className="text-sm font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.total_amount)}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                        <span className="text-2xs text-brand-600 bg-brand-50 px-1 py-0.5 rounded tabular-nums">
                            S: {formatCurrency(row.total_services || 0)}
                        </span>
                        <span className="text-2xs text-warning-600 bg-warning-50 px-1 py-0.5 rounded tabular-nums">
                            T: {formatCurrency(row.total_third_party || 0)}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            className: "w-[130px]",
            render: (row) => (
                <div className="py-0.5 space-y-1.5">
                    <StatusBadge status={row.status} />
                    {row.facturado && (
                        <span className="inline-flex items-center gap-1 text-2xs text-success-700 font-medium">
                            <CheckCircle2 className="w-3 h-3" />
                            Facturado
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "",
            accessor: "actions",
            className: "w-[80px]",
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(row);
                        }}
                        className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded transition-colors"
                        title="Ver Detalle"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {row.status === "abierta" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseOrder(row.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-success-600 hover:bg-success-50 rounded transition-colors"
                            title="Cerrar Orden"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Page Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-semibold text-slate-900">
                                Órdenes de Servicio
                            </h1>
                            <p className="text-sm text-slate-500 mt-0.5">
                                Gestión de tramitaciones aduanales
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={fetchOrders}
                                disabled={loading}
                                className="text-slate-600"
                            >
                                <RefreshCw
                                    className={cn(
                                        "w-4 h-4 mr-1.5",
                                        loading && "animate-spin"
                                    )}
                                />
                                Actualizar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExportExcel}
                                disabled={isExporting || orders.length === 0}
                            >
                                <Download
                                    className={cn(
                                        "w-4 h-4 mr-1.5",
                                        isExporting && "animate-bounce"
                                    )}
                                />
                                Exportar
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                <Plus className="w-4 h-4 mr-1.5" />
                                Nueva Orden
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <KPICard
                        label="Total Órdenes"
                        value={kpis.total}
                        icon={FileText}
                    />
                    <KPICard
                        label="En Proceso"
                        value={kpis.active}
                        variant="primary"
                        icon={Clock}
                    />
                    <KPICard
                        label="Cerradas"
                        value={kpis.closed}
                        variant="success"
                        icon={CheckCircle2}
                    />
                    <KPICard
                        label="Facturadas"
                        value={kpis.invoiced}
                        variant="success"
                        icon={Check}
                    />
                    <KPICard
                        label="Monto Total"
                        value={formatCurrency(kpis.totalAmount)}
                        variant="default"
                        subtext="Servicios + Terceros"
                    />
                </div>

                {/* Search and Filters Bar */}
                <div className="bg-white border border-slate-200 rounded-md">
                    <div className="p-3 flex items-center gap-3">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por OS, DUCA, BL, cliente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="search-input"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Quick Filters */}
                        <div className="flex items-center gap-2">
                            <select
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters({ ...filters, status: e.target.value })
                                }
                                className="input-corporate w-auto py-1.5 pr-8"
                            >
                                <option value="">Estado: Todos</option>
                                <option value="abierta">En Proceso</option>
                                <option value="cerrada">Cerrada</option>
                            </select>

                            <select
                                value={filters.client}
                                onChange={(e) =>
                                    setFilters({ ...filters, client: e.target.value })
                                }
                                className="input-corporate w-auto py-1.5 pr-8"
                            >
                                <option value="">Cliente: Todos</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>

                            <button
                                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                className={cn(
                                    "btn-secondary gap-1.5",
                                    isFiltersOpen && "bg-slate-100"
                                )}
                            >
                                <Filter className="w-4 h-4" />
                                Filtros
                                {activeFiltersCount > 0 && (
                                    <span className="bg-brand-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                                        {activeFiltersCount}
                                    </span>
                                )}
                            </button>

                            {(searchQuery || activeFiltersCount > 0) && (
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-slate-500 hover:text-slate-700"
                                >
                                    Limpiar
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Extended Filters */}
                    {isFiltersOpen && (
                        <div className="px-3 pb-3 pt-0 border-t border-slate-100">
                            <div className="pt-3 grid grid-cols-4 gap-3">
                                <div>
                                    <label className="label-corporate">
                                        Fecha Desde
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                dateFrom: e.target.value,
                                            })
                                        }
                                        className="input-corporate"
                                    />
                                </div>
                                <div>
                                    <label className="label-corporate">
                                        Fecha Hasta
                                    </label>
                                    <input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                dateTo: e.target.value,
                                            })
                                        }
                                        className="input-corporate"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Filters Display */}
                    {(searchQuery || activeFiltersCount > 0) && (
                        <div className="px-3 pb-3 flex items-center gap-2 flex-wrap">
                            {searchQuery && (
                                <FilterChip
                                    label="Búsqueda"
                                    value={searchQuery}
                                    onRemove={() => setSearchQuery("")}
                                />
                            )}
                            {filters.status && (
                                <FilterChip
                                    label="Estado"
                                    value={
                                        STATUS_CONFIG[filters.status]?.label ||
                                        filters.status
                                    }
                                    onRemove={() =>
                                        setFilters({ ...filters, status: "" })
                                    }
                                />
                            )}
                            {filters.client && (
                                <FilterChip
                                    label="Cliente"
                                    value={
                                        clients.find(
                                            (c) => c.id === parseInt(filters.client)
                                        )?.name || filters.client
                                    }
                                    onRemove={() =>
                                        setFilters({ ...filters, client: "" })
                                    }
                                />
                            )}
                        </div>
                    )}
                </div>

                {/* Data Table */}
                <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Listado de Órdenes
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                {filteredOrders.length} de {orders.length} registros
                            </p>
                        </div>
                    </div>
                    <DataTable
                        data={filteredOrders}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder=""
                        onRowClick={handleViewDetail}
                        emptyMessage="No se encontraron órdenes de servicio"
                    />
                </div>
            </div>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-brand-50 flex items-center justify-center">
                            <Plus className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Nueva Orden de Servicio
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Ingrese la información de la tramitación
                            </p>
                        </div>
                    </div>
                }
                size="2xl"
                footer={
                    <div className="flex items-center justify-end gap-2 px-5 py-3 bg-slate-50 border-t border-slate-200">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="bg-brand-600 hover:bg-brand-700"
                        >
                            <Plus className="w-4 h-4 mr-1.5" />
                            Crear Orden
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleCreate} className="p-5 space-y-5">
                    {/* Client Section */}
                    <div className="space-y-4">
                        <h4 className="section-title">Información del Cliente</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Select
                                    label="Cliente"
                                    value={formData.client}
                                    onChange={(value) =>
                                        setFormData({ ...formData, client: value })
                                    }
                                    options={clients}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    required
                                />
                            </div>
                            <div>
                                <Select
                                    label="Aforador"
                                    value={formData.customs_agent}
                                    onChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            customs_agent: value,
                                        })
                                    }
                                    options={customsAgents}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                />
                            </div>
                        </div>
                    </div>

                    {/* Shipment Section */}
                    <div className="space-y-4">
                        <h4 className="section-title">Información del Embarque</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Select
                                    label="Tipo de Embarque"
                                    value={formData.shipment_type}
                                    onChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            shipment_type: value,
                                        })
                                    }
                                    options={shipmentTypes}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    required
                                />
                            </div>
                            <div>
                                <Select
                                    label="Proveedor Logístico"
                                    value={formData.provider}
                                    onChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            provider: value,
                                        })
                                    }
                                    options={providers}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                />
                            </div>
                        </div>
                    </div>

                    {/* References Section */}
                    <div className="space-y-4">
                        <h4 className="section-title">Referencias Operativas</h4>
                        <div className="p-4 bg-slate-50 rounded border border-slate-200 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="label-corporate label-required">
                                        DUCA
                                    </Label>
                                    <Input
                                        value={formData.duca}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                duca: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: 4-12345"
                                        required
                                        className="input-corporate font-mono"
                                    />
                                </div>
                                <div>
                                    <Label className="label-corporate">
                                        BL / Guía
                                    </Label>
                                    <Input
                                        value={formData.bl_reference}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                bl_reference: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: MAEU123456789"
                                        className="input-corporate font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="label-corporate label-required">
                                        Fecha ETA
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.eta}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                eta: e.target.value,
                                            })
                                        }
                                        required
                                        className="input-corporate"
                                    />
                                </div>
                                <div>
                                    <Label className="label-corporate">
                                        Orden de Compra (PO)
                                    </Label>
                                    <Input
                                        value={formData.purchase_order}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                purchase_order: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: PO-998877"
                                        className="input-corporate"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Detalle de Orden
                            </h3>
                            {selectedOrder && (
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    {selectedOrder.order_number} •{" "}
                                    {selectedOrder.client_name}
                                </p>
                            )}
                        </div>
                    </div>
                }
                size="4xl"
            >
                {selectedOrder && (
                    <ServiceOrderDetail
                        orderId={selectedOrder.id}
                        onUpdate={() => {
                            fetchOrders();
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};

export default ServiceOrders;
