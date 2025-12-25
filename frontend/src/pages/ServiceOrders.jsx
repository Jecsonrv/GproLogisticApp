import React, { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Eye,
    Check,
    Search,
    Download,
    Filter,
    X,
    Clock,
    FileText,
    CheckCircle2,
    RefreshCw,
    XCircle,
    Calendar,
    Edit,
    Edit2,
    Trash2,
    ArrowUpRight,
} from "lucide-react";
import {
    DataTable,
    Modal,
    ModalFooter,
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Input,
    SelectERP,
    Badge,
    Label,
    ConfirmDialog,
    Skeleton,
    SkeletonTable,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import ServiceOrderDetail from "../components/ServiceOrderDetail";
import { formatCurrency, formatDate, cn } from "../lib/utils";

/**
 * ServiceOrders - Rediseño Corporativo SaaS
 * Bloque Estratégico (Arriba) | Bloque Operativo (Abajo)
 */

// ============================================
// STATUS CONFIGURATION
// ============================================
const STATUS_CONFIG = {
    abierta: {
        label: "En Proceso",
        className: "bg-white border-slate-200 text-slate-700",
        icon: Clock,
        iconColor: "text-blue-500",
    },
    cerrada: {
        label: "Cerrada",
        className: "bg-white border-slate-200 text-slate-900 font-medium",
        icon: CheckCircle2,
        iconColor: "text-emerald-600",
    },
    cancelada: {
        label: "Cancelada",
        className: "bg-slate-50 border-transparent text-slate-500",
        icon: XCircle,
        iconColor: "text-slate-400",
    },
};

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.cancelada;
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

// ============================================
// KPI CARD - REFINED
// ============================================
const KPICard = ({
    label,
    value,
    icon: Icon,
    trend,
}) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4">
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 mb-1 truncate" title={label}>
                    {label}
                </p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {value}
                </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">
                {Icon && <Icon className="w-6 h-6 text-slate-400" />}
            </div>
        </div>
    );
};

const ServiceOrders = () => {
    // Data state
    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [providers, setProviders] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({
        open: false,
        id: null,
        orderNumber: ""
    });

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
        purchase_order: "",
        bl_reference: "",
        eta: "",
        duca: "",
    });

    useEffect(() => {
        fetchOrders();
        fetchCatalogs();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/orders/service-orders/");
            setOrders(response.data);
        } catch {
            toast.error("Error al cargar órdenes de servicio");
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [clientsRes, typesRes, providersRes, categoriesRes] = await Promise.all([
                axios.get("/clients/"),
                axios.get("/catalogs/shipment-types/"),
                axios.get("/catalogs/providers/"),
                axios.get("/catalogs/provider-categories/"),
            ]);
            setClients(clientsRes.data);
            setShipmentTypes(typesRes.data);

            // Filtrar proveedores para mostrar solo Naviera y Agencia de Carga
            const navieraAgenciaCategories = categoriesRes.data.filter(
                cat => cat.name === 'Naviera' || cat.name === 'Agencia de Carga'
            );
            const categoryIds = navieraAgenciaCategories.map(cat => cat.id);
            const filteredProviders = providersRes.data.filter(
                prov => prov.category && categoryIds.includes(prov.category)
            );

            setProviders(filteredProviders);
        } catch {
            // Silencioso
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            if (selectedOrder) {
                // Update logic
                await axios.patch(`/orders/service-orders/${selectedOrder.id}/`, formData);
                toast.success("Orden de Servicio actualizada exitosamente");
            } else {
                // Create logic
                await axios.post("/orders/service-orders/", formData);
                toast.success("Orden de Servicio creada exitosamente");
            }
            fetchOrders();
            setIsCreateModalOpen(false);
            resetForm();
        } catch (error) {
            const errorMsg =
                error.response?.data?.duca?.[0] ||
                error.response?.data?.message ||
                "Error al procesar la orden";
            toast.error(errorMsg);
        }
    };

    const handleEdit = (order) => {
        setSelectedOrder(order);
        setFormData({
            client: order.client || "",
            sub_client: order.sub_client || null,
            shipment_type: order.shipment_type || "",
            provider: order.provider || "",
            purchase_order: order.purchase_order || "",
            bl_reference: order.bl_reference || "",
            eta: order.eta || "",
            duca: order.duca || "",
        });
        setIsCreateModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            client: "",
            sub_client: null,
            shipment_type: "",
            provider: "",
            purchase_order: "",
            bl_reference: "",
            eta: "",
            duca: "",
        });
        setSelectedOrder(null);
    };

    const handleViewDetail = (order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    const handleEditFromDetail = (order) => {
        setIsDetailModalOpen(false);
        // Small timeout to ensure smooth transition
        setTimeout(() => {
            handleEdit(order);
        }, 100);
    };

    const handleDelete = (order) => {
        setConfirmDeleteDialog({
            open: true,
            id: order.id,
            orderNumber: order.order_number
        });
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/orders/service-orders/${confirmDeleteDialog.id}/`);
            toast.success("Orden de Servicio eliminada exitosamente");
            fetchOrders();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al eliminar la orden");
        } finally {
            setConfirmDeleteDialog({ open: false, id: null, orderNumber: "" });
        }
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
            const timestamp = new Date().toLocaleDateString("en-CA");
            link.setAttribute("download", `GPRO_Ordenes_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Archivo exportado correctamente");
        } catch (error) {
            toast.error("Error al exportar");
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

    const filteredOrders = useMemo(() => {
        return orders.filter((order) => {
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

            if (filters.status && order.status !== filters.status) return false;
            if (filters.client && order.client !== parseInt(filters.client))
                return false;

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

    const columns = [
        {
            header: "N° Orden",
            accessor: "order_number",
            className: "w-[120px]",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(row);
                        }}
                        className="font-mono text-sm font-semibold text-slate-700 hover:text-slate-900 hover:underline text-left w-fit flex items-center gap-1"
                    >
                        {row.order_number}
                        <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </button>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {formatDate(row.created_at, { format: "short" })}
                    </span>
                </div>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            className: "min-w-[200px]",
            sortable: false,
            cell: (row) => (
                <div>
                    <div className="font-semibold text-slate-900 text-sm truncate max-w-[220px]" title={row.client_name}>
                        {row.client_name}
                    </div>
                    {row.shipment_type_name && (
                        <div className="text-xs text-slate-500 mt-0.5">
                            {row.shipment_type_name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Referencia DUCA",
            accessor: "duca",
            className: "w-[150px]",
            sortable: false,
            cell: (row) => (
                <div>
                    <div className="font-mono text-xs font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">
                        {row.duca || "—"}
                    </div>
                    {row.bl_reference && (
                        <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[140px]" title={row.bl_reference}>
                            BL: {row.bl_reference}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "ETA",
            accessor: "eta",
            className: "w-[100px]",
            sortable: false,
            cell: (row) => (
                <div className="text-xs font-medium text-slate-600">
                    {formatDate(row.eta + "T00:00:00", { format: "short" })}
                </div>
            ),
        },
        {
            header: "Balance Financiero",
            accessor: "total_amount",
            className: "text-center w-[160px]",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => {
                const totalCosts =
                    (row.total_direct_costs || 0) +
                    (row.total_admin_costs || 0);
                return (
                    <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Ing:</span>
                            <span className="font-semibold text-slate-700 tabular-nums">
                                {formatCurrency(row.total_amount)}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px]">
                            <span className="text-slate-400 font-bold uppercase text-[9px]">Gas:</span>
                            <span className="font-medium text-slate-600 tabular-nums">
                                {formatCurrency(totalCosts)}
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            header: "Estado",
            accessor: "status",
            className: "w-[120px]",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col gap-1">
                    <StatusBadge status={row.status} />
                    {row.facturado && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                            <CheckCircle2 className="w-3 h-3" />
                            Facturado
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[140px] text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="grid grid-cols-3 gap-1 w-full max-w-[120px] mx-auto">
                    {row.status === "abierta" ? (
                        <>
                            <div className="flex justify-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCloseOrder(row.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                    title="Cerrar Orden"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(row);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                    title="Editar"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="flex justify-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(row);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                    title="Eliminar"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="col-span-3 text-center text-xs text-slate-300 italic">
                            Cerrada
                        </div>
                    )}
                </div>
            ),
        },
    ];

    if (loading && orders.length === 0) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <SkeletonTable rows={10} columns={7} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-2">
            
            {/* Bloque Superior (Estratégico): KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Total órdenes"
                    value={kpis.total}
                    icon={FileText}
                />
                <KPICard
                    label="En proceso"
                    value={kpis.active}
                    icon={Clock}
                />
                <KPICard
                    label="Cerradas"
                    value={kpis.closed}
                    icon={CheckCircle2}
                />
                <KPICard
                    label="Facturadas"
                    value={kpis.invoiced}
                    icon={Check}
                />
                <KPICard
                    label="Ingresos estimados"
                    value={formatCurrency(kpis.totalAmount)}
                    icon={Calendar}
                />
            </div>

            {/* Bloque Inferior (Operativo): Tabla + Herramientas */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Barra de Herramientas Unificada */}
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50/30">
                    
                    {/* Izquierda: Buscador y Filtros */}
                    <div className="flex items-center gap-3 flex-1 w-full lg:max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por OS, cliente, DUCA..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            className={cn(
                                "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all whitespace-nowrap",
                                isFiltersOpen && "ring-2 ring-slate-900/5 border-slate-900 bg-slate-50"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Filtros
                            {activeFiltersCount > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-full">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </Button>
                    </div>
                    
                    {/* Derecha: Botones de Acción Operativa */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        <div className="h-6 w-px bg-slate-200 hidden lg:block" />
                        
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportExcel}
                            disabled={isExporting || orders.length === 0}
                            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm h-9 px-3 transition-all active:scale-95 whitespace-nowrap"
                        >
                            {isExporting ? (
                                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                            ) : (
                                <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            )}
                            Exportar
                        </Button>
                        <Button 
                            size="sm"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nueva Orden
                        </Button>
                    </div>
                </div>

                {/* Expanded Filters Panel */}
                {isFiltersOpen && (
                    <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                            <div>
                                <SelectERP
                                    label="Estado"
                                    value={filters.status}
                                    onChange={(val) =>
                                        setFilters({ ...filters, status: val })
                                    }
                                    options={[
                                        { id: "abierta", name: "En Proceso" },
                                        { id: "cerrada", name: "Cerrada" },
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    clearable
                                />
                            </div>
                            <div>
                                <SelectERP
                                    label="Cliente"
                                    value={filters.client}
                                    onChange={(val) =>
                                        setFilters({ ...filters, client: val })
                                    }
                                    options={clients}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                />
                            </div>
                            <div>
                                <Label>Desde</Label>
                                <Input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            dateFrom: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div>
                                <Label>Hasta</Label>
                                <Input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) =>
                                        setFilters({
                                            ...filters,
                                            dateTo: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="flex justify-end pt-5">
                            <button
                                onClick={clearFilters}
                                className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                            >
                                <XCircle className="w-4 h-4" />
                                Restablecer Filtros
                            </button>
                        </div>
                    </div>
                )}

                <DataTable
                    data={filteredOrders}
                    columns={columns}
                    loading={loading}
                    searchable={false}
                    onRowClick={handleViewDetail}
                    emptyMessage="No se encontraron órdenes de servicio"
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title={selectedOrder ? `Editar Orden: ${selectedOrder.order_number}` : "Nueva Orden de Servicio"}
                size="2xl"
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    {/* Client Info */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Información del Cliente
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="col-span-2">
                                <Label className="mb-1.5 block">Cliente</Label>
                                <SelectERP
                                    value={formData.client}
                                    onChange={(val) => setFormData({ ...formData, client: val })}
                                    options={clients}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Shipment Info */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Datos del Embarque
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">Tipo de Embarque</Label>
                                <SelectERP
                                    value={formData.shipment_type}
                                    onChange={(val) => setFormData({ ...formData, shipment_type: val })}
                                    options={shipmentTypes}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    clearable
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Naviera / Transportista</Label>
                                <SelectERP
                                    value={formData.provider}
                                    onChange={(val) => setFormData({ ...formData, provider: val })}
                                    options={providers}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">DUCA *</Label>
                                <Input
                                    value={formData.duca}
                                    onChange={(e) => setFormData({ ...formData, duca: e.target.value })}
                                    placeholder="Ej: 4-12345"
                                    required
                                    className="font-mono uppercase"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">BL / Guía</Label>
                                <Input
                                    value={formData.bl_reference}
                                    onChange={(e) => setFormData({ ...formData, bl_reference: e.target.value })}
                                    placeholder="Ej: MAEU123456789"
                                    className="font-mono uppercase"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha ETA *</Label>
                                <Input
                                    type="date"
                                    value={formData.eta}
                                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Orden de Compra (PO)</Label>
                                <Input
                                    value={formData.purchase_order}
                                    onChange={(e) => setFormData({ ...formData, purchase_order: e.target.value })}
                                    placeholder="Ej: PO-998877"
                                />
                            </div>
                        </div>
                    </div>

                    <ModalFooter className="px-0 pb-0 mr-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                resetForm();
                            }}
                            className="text-slate-500 font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-slate-900 text-white hover:bg-black min-w-[140px] shadow-lg shadow-slate-200 transition-all active:scale-95 mr-0"
                        >
                            {selectedOrder ? "Guardar Cambios" : "Crear Orden"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Detalle de Orden: ${selectedOrder?.order_number || ""}`}
                size="4xl"
            >
                {selectedOrder && (
                    <ServiceOrderDetail
                        orderId={selectedOrder.id}
                        onUpdate={() => fetchOrders()}
                        onEdit={() => handleEditFromDetail(selectedOrder)}
                    />
                )}
            </Modal>

            <ConfirmDialog
                open={confirmDeleteDialog.open}
                onClose={() => setConfirmDeleteDialog({ open: false, id: null, orderNumber: "" })}
                onConfirm={confirmDelete}
                title={`¿Eliminar Orden ${confirmDeleteDialog.orderNumber}?`}
                description="Esta acción eliminará la orden de servicio. Si tiene facturas o pagos asociados, es posible que no se pueda eliminar."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default ServiceOrders;