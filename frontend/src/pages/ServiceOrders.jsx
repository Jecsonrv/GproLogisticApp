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
} from "lucide-react";
import {
    DataTable,
    Modal,
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Input,
    SelectERP,
    Badge,
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
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
    },
    cerrada: {
        label: "Cerrada",
        variant: "success",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    cancelada: {
        label: "Cancelada",
        variant: "default",
        bgColor: "bg-slate-50",
        textColor: "text-slate-600",
        borderColor: "border-slate-200",
        dotColor: "bg-slate-400",
    },
};

const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.cancelada;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full border",
                config.bgColor,
                config.textColor,
                config.borderColor
            )}
        >
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dotColor)} />
            {config.label}
        </span>
    );
};

const KPICard = ({
    label,
    value,
    subtext,
    icon: Icon,
    variant = "default",
}) => {
    const variants = {
        default: "text-slate-900",
        primary: "text-blue-600",
        success: "text-emerald-600",
        warning: "text-amber-600",
        danger: "text-red-600",
    };

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">
                            {label}
                        </p>
                        <p
                            className={cn(
                                "text-2xl font-bold mt-1",
                                variants[variant]
                            )}
                        >
                            {value}
                        </p>
                        {subtext && (
                            <p className="text-xs text-gray-400 mt-1">
                                {subtext}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                            <Icon className="w-5 h-5 text-gray-400" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

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
            cell: (row) => (
                <div>
                    <div className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        {row.order_number}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(row.created_at, { format: "short" })}
                    </div>
                </div>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            cell: (row) => (
                <div>
                    <div className="text-sm text-gray-900 font-medium">
                        {row.client_name}
                    </div>
                    {row.shipment_type_name && (
                        <div className="text-xs text-gray-500 mt-0.5">
                            {row.shipment_type_name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "DUCA",
            accessor: "duca",
            cell: (row) => (
                <div>
                    <div className="text-sm text-gray-900 font-medium">
                        {row.duca}
                    </div>
                    {row.bl_reference && (
                        <div className="text-xs text-gray-500 mt-0.5">
                            {row.bl_reference}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "ETA",
            accessor: "eta",
            cell: (row) => (
                <div className="text-sm text-gray-700">
                    {formatDate(row.eta + "T00:00:00", { format: "short" })}
                </div>
            ),
        },
        {
            header: "Ingresos / Costos",
            accessor: "total_amount",
            cell: (row) => {
                const totalCosts =
                    (row.total_direct_costs || 0) +
                    (row.total_admin_costs || 0);
                return (
                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1.5 mb-1">
                            <span className="text-xs text-gray-500">
                                Ingresos:
                            </span>
                            <span className="text-sm font-semibold text-emerald-600">
                                {formatCurrency(row.total_amount)}
                            </span>
                        </div>
                        <div className="flex items-center justify-end gap-1.5">
                            <span className="text-xs text-gray-500">
                                Costos:
                            </span>
                            <span className="text-sm font-semibold text-red-600">
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
            cell: (row) => (
                <div>
                    <StatusBadge status={row.status} />
                    {row.facturado && (
                        <div className="flex items-center gap-1 text-xs text-emerald-600 mt-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Facturado</span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            cell: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(row);
                        }}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {row.status === "abierta" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseOrder(row.id);
                            }}
                            className="text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Cerrar Orden"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Órdenes de Servicio
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión centralizada de tramitaciones y servicios
                        aduanales
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchOrders}
                        disabled={loading}
                    >
                        <RefreshCw
                            className={cn(
                                "w-4 h-4 mr-2",
                                loading && "animate-spin"
                            )}
                        />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExporting || orders.length === 0}
                    >
                        <Download
                            className={cn(
                                "w-4 h-4 mr-2",
                                isExporting && "animate-bounce"
                            )}
                        />
                        Exportar
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva Orden
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    subtext="Ingresos Estimados"
                />
            </div>

            {/* Filters & Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por OS, DUCA, BL, cliente..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            className={cn(isFiltersOpen && "bg-gray-100")}
                        >
                            <Filter className="w-4 h-4 mr-2" />
                            Filtros
                            {activeFiltersCount > 0 && (
                                <Badge
                                    variant="primary"
                                    className="ml-2 px-1.5 py-0.5 h-5"
                                >
                                    {activeFiltersCount}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </CardHeader>

                {isFiltersOpen && (
                    <CardContent className="pt-0 pb-4 border-b border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
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
                        <div className="flex justify-end pt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-red-600 hover:text-red-700"
                            >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Limpiar Filtros
                            </Button>
                        </div>
                    </CardContent>
                )}

                <CardContent className="px-5 pb-5 pt-0">
                    <DataTable
                        data={filteredOrders}
                        columns={columns}
                        loading={loading}
                        searchable={false} // Managed externally
                        onRowClick={handleViewDetail}
                        emptyMessage="No se encontraron órdenes de servicio"
                    />
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Nueva Orden de Servicio"
                size="2xl"
                footer={
                    <>
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleCreate}>Crear Orden</Button>
                    </>
                }
            >
                <div className="space-y-6">
                    {/* Client Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                                    1
                                </span>
                                Información del Cliente
                            </h4>
                        </div>
                        <SelectERP
                            label="Cliente"
                            value={formData.client}
                            onChange={(val) =>
                                setFormData({ ...formData, client: val })
                            }
                            options={clients}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                            required
                        />
                        <SelectERP
                            label="Aforador"
                            value={formData.customs_agent}
                            onChange={(val) =>
                                setFormData({ ...formData, customs_agent: val })
                            }
                            options={customsAgents}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                        />
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    {/* Shipment Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                                    2
                                </span>
                                Datos del Embarque
                            </h4>
                        </div>
                        <SelectERP
                            label="Tipo de Embarque"
                            value={formData.shipment_type}
                            onChange={(val) =>
                                setFormData({ ...formData, shipment_type: val })
                            }
                            options={shipmentTypes}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            clearable
                            required
                        />
                        <SelectERP
                            label="Proveedor Logístico"
                            value={formData.provider}
                            onChange={(val) =>
                                setFormData({ ...formData, provider: val })
                            }
                            options={providers}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="DUCA *"
                                value={formData.duca}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        duca: e.target.value,
                                    })
                                }
                                placeholder="Ej: 4-12345"
                                required
                                className="font-mono uppercase"
                            />
                            <Input
                                label="BL / Guía"
                                value={formData.bl_reference}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        bl_reference: e.target.value,
                                    })
                                }
                                placeholder="Ej: MAEU123456789"
                                className="font-mono uppercase"
                            />
                            <Input
                                label="Fecha ETA *"
                                type="date"
                                value={formData.eta}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        eta: e.target.value,
                                    })
                                }
                                required
                            />
                            <Input
                                label="Orden de Compra (PO)"
                                value={formData.purchase_order}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        purchase_order: e.target.value,
                                    })
                                }
                                placeholder="Ej: PO-998877"
                            />
                        </div>
                    </div>
                </div>
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
                    />
                )}
            </Modal>
        </div>
    );
};

export default ServiceOrders;
