import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Button,
    Badge,
    DataTable,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    Select,
    Skeleton,
    EmptyState,
    ConfirmDialog,
} from "../components/ui";
import {
    ArrowLeft,
    FileText,
    DollarSign,
    ArrowRightLeft,
    Receipt,
    BarChart3,
    Plus,
    Trash2,
    Edit,
    Building2,
    Ship,
    Calendar,
    Clock,
    User,
    Hash,
    Package,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
} from "lucide-react";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { useServiceOrder } from "../hooks/useServiceOrders";
import { formatCurrency, formatDate, cn } from "../lib/utils";

// ============================================
// DATA DISPLAY COMPONENT
// ============================================
const DataField = ({ label, value, mono = false, className = "" }) => (
    <div className={className}>
        <dt className="data-label">{label}</dt>
        <dd className={cn("data-value", mono && "font-mono")}>
            {value || "N/A"}
        </dd>
    </div>
);

// ============================================
// STATUS BADGE COMPONENT
// ============================================
const StatusBadge = ({ status, size = "default" }) => {
    const config = {
        abierta: {
            label: "En Proceso",
            className: "badge-info",
        },
        cerrada: {
            label: "Cerrada",
            className: "badge-success",
        },
        pagada: {
            label: "Pagada",
            className: "badge-success",
        },
        pendiente: {
            label: "Pendiente",
            className: "badge-warning",
        },
    };

    const { label, className } = config[status] || {
        label: status,
        className: "badge-default",
    };

    return <span className={className}>{label}</span>;
};

// ============================================
// SUMMARY CARD COMPONENT
// ============================================
const SummaryCard = ({ title, value, variant = "default", icon: Icon }) => {
    // Professional ERP styling: subtle backgrounds, neutral colors
    const iconColors = {
        default: "text-slate-400",
        success: "text-slate-500",
        warning: "text-slate-500",
        danger: "text-slate-500",
        info: "text-slate-500",
    };

    const valueColors = {
        default: "text-slate-900",
        success: "text-slate-900",
        warning: "text-slate-900",
        danger: "text-slate-900",
        info: "text-slate-900",
    };

    return (
        <div className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {title}
                    </p>
                    <p
                        className={cn(
                            "text-xl font-bold mt-1.5 tabular-nums",
                            valueColors[variant]
                        )}
                    >
                        {value}
                    </p>
                </div>
                {Icon && (
                    <div className={cn("ml-3", iconColors[variant])}>
                        <Icon className="w-5 h-5" />
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
function ServiceOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: order, isLoading } = useServiceOrder(id);

    // Data state
    const [charges, setCharges] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [invoice, setInvoice] = useState(null);
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);

    // UI state
    const [activeTab, setActiveTab] = useState("general");
    const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
    const [isAddTransferModalOpen, setIsAddTransferModalOpen] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
    });

    // Form state
    const [chargeFormData, setChargeFormData] = useState({
        service: "",
        quantity: 1,
        unit_price: "",
    });

    const [transferFormData, setTransferFormData] = useState({
        transfer_type: "terceros",
        provider: "",
        amount: "",
        notes: "",
    });

    // ============================================
    // DATA FETCHING
    // ============================================
    useEffect(() => {
        if (id) {
            fetchOrderDetails();
            fetchCatalogs();
        }
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const [chargesRes, transfersRes, invoiceRes] = await Promise.all([
                axios.get(`/orders/order-charges/?service_order=${id}`),
                axios.get(`/transfers/?service_order=${id}`),
                axios.get(`/invoices/?service_order=${id}`),
            ]);
            setCharges(chargesRes.data);
            setTransfers(transfersRes.data);
            setInvoice(invoiceRes.data[0] || null);
        } catch (error) {
            console.error("Error fetching order details:", error);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [servicesRes, providersRes] = await Promise.all([
                axios.get("/catalogs/services/"),
                axios.get("/catalogs/providers/"),
            ]);
            setServices(servicesRes.data);
            setProviders(providersRes.data);
        } catch (error) {
            toast.error("Error al cargar catálogos");
        }
    };

    // ============================================
    // HANDLERS
    // ============================================
    const handleAddCharge = useCallback(
        async (e) => {
            e.preventDefault();
            try {
                await axios.post("/orders/order-charges/", {
                    ...chargeFormData,
                    service_order: id,
                });
                toast.success("Cobro agregado exitosamente");
                setIsAddChargeModalOpen(false);
                setChargeFormData({ service: "", quantity: 1, unit_price: "" });
                fetchOrderDetails();
            } catch (error) {
                toast.error("Error al agregar cobro");
            }
        },
        [id, chargeFormData]
    );

    const handleDeleteCharge = useCallback((chargeId) => {
        setConfirmDialog({ open: true, id: chargeId });
    }, []);

    const confirmDeleteCharge = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null });

        try {
            await axios.delete(`/orders/order-charges/${id}/`);
            toast.success("Cobro eliminado exitosamente");
            fetchOrderDetails();
        } catch (error) {
            const errorMessage =
                error.response?.data?.error ||
                error.response?.data?.detail ||
                "Error al eliminar cobro";
            toast.error(errorMessage);
        }
    };

    const handleAddTransfer = useCallback(
        async (e) => {
            e.preventDefault();
            try {
                await axios.post("/transfers/", {
                    ...transferFormData,
                    service_order: id,
                });
                toast.success("Transferencia agregada");
                setIsAddTransferModalOpen(false);
                setTransferFormData({
                    transfer_type: "terceros",
                    provider: "",
                    amount: "",
                    notes: "",
                });
                fetchOrderDetails();
            } catch (error) {
                toast.error("Error al agregar transferencia");
            }
        },
        [id, transferFormData]
    );

    // ============================================
    // COMPUTED VALUES
    // ============================================
    const totals = useMemo(
        () => ({
            charges: charges.reduce(
                (sum, c) => sum + parseFloat(c.total || 0),
                0
            ),
            transfers: transfers.reduce(
                (sum, t) => sum + parseFloat(t.amount || 0),
                0
            ),
            invoiced: invoice ? parseFloat(invoice.total_amount || 0) : 0,
        }),
        [charges, transfers, invoice]
    );

    const margin = useMemo(() => {
        const value = totals.charges - totals.transfers;
        const percentage =
            totals.charges > 0 ? (value / totals.charges) * 100 : 0;
        return { value, percentage };
    }, [totals]);

    // ============================================
    // TABLE COLUMNS
    // ============================================
    const chargesColumns = [
        {
            header: "Servicio",
            accessor: "service_name",
            cell: (row) => (
                <span className="font-medium text-slate-900">
                    {row.service_name || "N/A"}
                </span>
            ),
        },
        {
            header: "Cantidad",
            accessor: "quantity",
            className: "w-20 text-center",
            cell: (row) => <span className="tabular-nums">{row.quantity}</span>,
        },
        {
            header: "Precio Unit.",
            accessor: "unit_price",
            className: "w-28 text-right",
            cell: (row) => (
                <span className="tabular-nums">
                    {formatCurrency(row.unit_price)}
                </span>
            ),
        },
        {
            header: "Subtotal",
            accessor: "subtotal",
            className: "w-28 text-right",
            cell: (row) => (
                <span className="tabular-nums">
                    {formatCurrency(row.subtotal)}
                </span>
            ),
        },
        {
            header: "IVA 13%",
            accessor: "iva_amount",
            className: "w-24 text-right",
            cell: (row) => (
                <span className="tabular-nums text-slate-500">
                    {formatCurrency(row.iva_amount)}
                </span>
            ),
        },
        {
            header: "Total",
            accessor: "total",
            className: "w-28 text-right",
            cell: (row) => (
                <span className="font-semibold tabular-nums text-slate-900">
                    {formatCurrency(row.total)}
                </span>
            ),
        },
        {
            header: "",
            accessor: "actions",
            className: "w-16",
            cell: (row) => (
                <button
                    onClick={() => handleDeleteCharge(row.id)}
                    className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                    title="Eliminar"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            ),
        },
    ];

    const transfersColumns = [
        {
            header: "Tipo",
            accessor: "transfer_type",
            className: "w-28",
            cell: (row) => {
                const types = {
                    terceros: { label: "Terceros", className: "badge-warning" },
                    propios: { label: "Propios", className: "badge-info" },
                    admin: { label: "Admin", className: "badge-default" },
                };
                const config = types[row.transfer_type] || types.terceros;
                return <span className={config.className}>{config.label}</span>;
            },
        },
        {
            header: "Proveedor",
            accessor: "provider",
            cell: (row) => (
                <span className="text-slate-900">
                    {row.provider?.name || "-"}
                </span>
            ),
        },
        {
            header: "Monto",
            accessor: "amount",
            className: "w-32 text-right",
            cell: (row) => (
                <span className="font-semibold tabular-nums">
                    {formatCurrency(row.amount)}
                </span>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            className: "w-28",
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: "Notas",
            accessor: "notes",
            cell: (row) => (
                <span className="text-sm text-slate-500 truncate max-w-[200px] block">
                    {row.notes || "-"}
                </span>
            ),
        },
    ];

    // ============================================
    // LOADING STATE
    // ============================================
    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6">
                <div className="space-y-6 max-w-7xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-8 w-64" />
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                    </div>
                    <Skeleton className="h-96" />
                </div>
            </div>
        );
    }

    // ============================================
    // NOT FOUND STATE
    // ============================================
    if (!order) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <EmptyState
                    icon={FileText}
                    title="Orden no encontrada"
                    description="No se pudo cargar la información de la orden de servicio"
                    action={
                        <Button
                            variant="outline"
                            onClick={() => navigate("/service-orders")}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Volver al listado
                        </Button>
                    }
                />
            </div>
        );
    }

    // ============================================
    // RENDER
    // ============================================
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
                <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/service-orders")}
                                className="text-slate-600"
                            >
                                <ArrowLeft className="w-4 h-4 mr-1.5" />
                                Volver
                            </Button>
                            <div className="h-6 w-px bg-slate-200" />
                            <div>
                                <div className="flex items-center gap-3">
                                    <h1 className="text-xl font-semibold text-slate-900 font-mono">
                                        {order.order_number}
                                    </h1>
                                    <StatusBadge status={order.status} />
                                    {order.facturado && (
                                        <span className="badge-success">
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Facturado
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    {order.client?.name} •{" "}
                                    {order.shipment_type?.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                                <Edit className="w-4 h-4 mr-1.5" />
                                Editar
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <div className="px-6 tabs-corporate">
                    <button
                        onClick={() => setActiveTab("general")}
                        className={cn(
                            "tab-item",
                            activeTab === "general" && "tab-item-active"
                        )}
                    >
                        <FileText className="w-4 h-4 mr-2 inline" />
                        Información General
                    </button>
                    <button
                        onClick={() => setActiveTab("charges")}
                        className={cn(
                            "tab-item",
                            activeTab === "charges" && "tab-item-active"
                        )}
                    >
                        <DollarSign className="w-4 h-4 mr-2 inline" />
                        Cobros ({charges.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("transfers")}
                        className={cn(
                            "tab-item",
                            activeTab === "transfers" && "tab-item-active"
                        )}
                    >
                        <ArrowRightLeft className="w-4 h-4 mr-2 inline" />
                        Transferencias ({transfers.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("invoice")}
                        className={cn(
                            "tab-item",
                            activeTab === "invoice" && "tab-item-active"
                        )}
                    >
                        <Receipt className="w-4 h-4 mr-2 inline" />
                        Facturación
                    </button>
                    <button
                        onClick={() => setActiveTab("analysis")}
                        className={cn(
                            "tab-item",
                            activeTab === "analysis" && "tab-item-active"
                        )}
                    >
                        <BarChart3 className="w-4 h-4 mr-2 inline" />
                        Análisis
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Tab: General Info */}
                {activeTab === "general" && (
                    <div className="space-y-6 animate-fade-in">
                        {/* Quick Summary */}
                        <div className="grid grid-cols-4 gap-4">
                            <SummaryCard
                                title="Total Cobros"
                                value={formatCurrency(totals.charges)}
                                variant="success"
                                icon={DollarSign}
                            />
                            <SummaryCard
                                title="Total Gastos"
                                value={formatCurrency(totals.transfers)}
                                variant="warning"
                                icon={ArrowRightLeft}
                            />
                            <SummaryCard
                                title="Margen"
                                value={formatCurrency(margin.value)}
                                variant={margin.value >= 0 ? "info" : "danger"}
                                icon={
                                    margin.value >= 0
                                        ? TrendingUp
                                        : TrendingDown
                                }
                            />
                            <SummaryCard
                                title="Facturado"
                                value={formatCurrency(totals.invoiced)}
                                variant="default"
                                icon={Receipt}
                            />
                        </div>

                        {/* Info Cards */}
                        <div className="grid grid-cols-2 gap-5">
                            {/* Client Info */}
                            <div className="card-corporate p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Building2 className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Información del Cliente
                                    </h3>
                                </div>
                                <dl className="grid grid-cols-2 gap-4">
                                    <DataField
                                        label="Cliente"
                                        value={order.client?.name}
                                    />
                                    <DataField
                                        label="NIT"
                                        value={order.client?.nit}
                                        mono
                                    />
                                    {order.sub_client && (
                                        <DataField
                                            label="Subcliente"
                                            value={order.sub_client.name}
                                            className="col-span-2"
                                        />
                                    )}
                                </dl>
                            </div>

                            {/* Shipment Info */}
                            <div className="card-corporate p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Ship className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Detalles del Embarque
                                    </h3>
                                </div>
                                <dl className="grid grid-cols-2 gap-4">
                                    <DataField
                                        label="Tipo de Embarque"
                                        value={order.shipment_type?.name}
                                    />
                                    <DataField
                                        label="Proveedor"
                                        value={order.provider?.name}
                                    />
                                    <DataField
                                        label="Aforador"
                                        value={order.customs_agent?.name}
                                        className="col-span-2"
                                    />
                                </dl>
                            </div>

                            {/* References */}
                            <div className="card-corporate p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Hash className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Referencias
                                    </h3>
                                </div>
                                <dl className="grid grid-cols-2 gap-4">
                                    <DataField
                                        label="DUCA"
                                        value={order.duca}
                                        mono
                                    />
                                    <DataField
                                        label="BL / Referencia"
                                        value={order.bl_reference}
                                        mono
                                    />
                                    <DataField
                                        label="Orden de Compra"
                                        value={order.purchase_order}
                                        mono
                                    />
                                </dl>
                            </div>

                            {/* Dates */}
                            <div className="card-corporate p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <Calendar className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Fechas y Estado
                                    </h3>
                                </div>
                                <dl className="grid grid-cols-2 gap-4">
                                    <DataField
                                        label="ETA"
                                        value={formatDate(order.eta, {
                                            format: "medium",
                                        })}
                                    />
                                    <DataField
                                        label="Fecha de Creación"
                                        value={formatDate(order.created_at, {
                                            format: "medium",
                                        })}
                                    />
                                    <div>
                                        <dt className="data-label">Estado</dt>
                                        <dd className="mt-1">
                                            <StatusBadge
                                                status={order.status}
                                            />
                                        </dd>
                                    </div>
                                    {order.closed_at && (
                                        <DataField
                                            label="Fecha de Cierre"
                                            value={formatDate(order.closed_at, {
                                                format: "medium",
                                            })}
                                        />
                                    )}
                                </dl>
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: Charges */}
                {activeTab === "charges" && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="card-corporate overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Cálculo de Cobros
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Servicios facturables con IVA 13%
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        setIsAddChargeModalOpen(true)
                                    }
                                    className="bg-brand-600 hover:bg-brand-700"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Agregar Cobro
                                </Button>
                            </div>

                            {charges.length > 0 ? (
                                <>
                                    <DataTable
                                        columns={chargesColumns}
                                        data={charges}
                                    />
                                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                                        <div className="flex justify-end">
                                            <div className="text-right">
                                                <p className="text-sm text-slate-600">
                                                    Total Cobros
                                                </p>
                                                <p className="text-2xl font-bold text-success-600 tabular-nums">
                                                    {formatCurrency(
                                                        totals.charges
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12">
                                    <EmptyState
                                        icon={DollarSign}
                                        title="Sin cobros registrados"
                                        description="Agrega cobros para esta orden de servicio"
                                        action={
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setIsAddChargeModalOpen(
                                                        true
                                                    )
                                                }
                                                className="bg-brand-600 hover:bg-brand-700"
                                            >
                                                <Plus className="w-4 h-4 mr-1.5" />
                                                Agregar Cobro
                                            </Button>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Transfers */}
                {activeTab === "transfers" && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="card-corporate overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Gastos y Transferencias
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Gastos a terceros, propios y
                                        administrativos
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        setIsAddTransferModalOpen(true)
                                    }
                                    className="bg-brand-600 hover:bg-brand-700"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Agregar Gasto
                                </Button>
                            </div>

                            {transfers.length > 0 ? (
                                <>
                                    <DataTable
                                        columns={transfersColumns}
                                        data={transfers}
                                    />
                                    <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                                        <div className="flex justify-end">
                                            <div className="text-right">
                                                <p className="text-sm text-slate-600">
                                                    Total Gastos
                                                </p>
                                                <p className="text-2xl font-bold text-warning-600 tabular-nums">
                                                    {formatCurrency(
                                                        totals.transfers
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="py-12">
                                    <EmptyState
                                        icon={ArrowRightLeft}
                                        title="Sin transferencias registradas"
                                        description="Agrega gastos a terceros para esta orden"
                                        action={
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setIsAddTransferModalOpen(
                                                        true
                                                    )
                                                }
                                                className="bg-brand-600 hover:bg-brand-700"
                                            >
                                                <Plus className="w-4 h-4 mr-1.5" />
                                                Agregar Gasto
                                            </Button>
                                        }
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Invoice */}
                {activeTab === "invoice" && (
                    <div className="space-y-5 animate-fade-in">
                        <div className="card-corporate p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Receipt className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Información de Facturación
                                </h3>
                            </div>

                            {invoice ? (
                                <div className="space-y-5">
                                    <div className="grid grid-cols-4 gap-4">
                                        <DataField
                                            label="Número de Factura"
                                            value={invoice.invoice_number}
                                            mono
                                        />
                                        <div>
                                            <dt className="data-label">
                                                Estado
                                            </dt>
                                            <dd className="mt-1">
                                                <StatusBadge
                                                    status={invoice.status}
                                                />
                                            </dd>
                                        </div>
                                        <DataField
                                            label="Total Facturado"
                                            value={formatCurrency(
                                                invoice.total_amount
                                            )}
                                        />
                                        <DataField
                                            label="Saldo Pendiente"
                                            value={
                                                <span className="text-danger-600 font-semibold">
                                                    {formatCurrency(
                                                        invoice.balance
                                                    )}
                                                </span>
                                            }
                                        />
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Receipt}
                                    title="Sin factura generada"
                                    description="Esta orden aún no tiene una factura asociada"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Analysis */}
                {activeTab === "analysis" && (
                    <div className="space-y-5 animate-fade-in">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <SummaryCard
                                title="Cobros Calculados"
                                value={formatCurrency(totals.charges)}
                                variant="success"
                                icon={DollarSign}
                            />
                            <SummaryCard
                                title="Gastos a Terceros"
                                value={formatCurrency(totals.transfers)}
                                variant="warning"
                                icon={ArrowRightLeft}
                            />
                            <SummaryCard
                                title="Total Facturado"
                                value={formatCurrency(totals.invoiced)}
                                variant="info"
                                icon={Receipt}
                            />
                        </div>

                        {/* Profitability Analysis */}
                        <div className="card-corporate p-5">
                            <div className="flex items-center gap-2 mb-5">
                                <BarChart3 className="w-4 h-4 text-slate-400" />
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Análisis de Rentabilidad
                                </h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-slate-600">
                                        Ingresos (Cobros)
                                    </span>
                                    <span className="font-semibold tabular-nums text-success-600">
                                        +{formatCurrency(totals.charges)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-sm text-slate-600">
                                        Gastos (Terceros)
                                    </span>
                                    <span className="font-semibold tabular-nums text-danger-600">
                                        -{formatCurrency(totals.transfers)}
                                    </span>
                                </div>
                                <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                                    <span className="text-sm font-semibold text-slate-900">
                                        Margen Bruto
                                    </span>
                                    <div className="text-right">
                                        <span
                                            className={cn(
                                                "text-xl font-bold tabular-nums",
                                                margin.value >= 0
                                                    ? "text-success-600"
                                                    : "text-danger-600"
                                            )}
                                        >
                                            {formatCurrency(margin.value)}
                                        </span>
                                        {totals.charges > 0 && (
                                            <span className="text-sm text-slate-500 ml-2">
                                                ({margin.percentage.toFixed(1)}
                                                %)
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cobros vs Facturado */}
                        {invoice && (
                            <div className="card-corporate p-5">
                                <div className="flex items-center gap-2 mb-5">
                                    <Receipt className="w-4 h-4 text-slate-400" />
                                    <h3 className="text-sm font-semibold text-slate-900">
                                        Cobros vs Facturado
                                    </h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-slate-600">
                                            Total Cobros
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {formatCurrency(totals.charges)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2">
                                        <span className="text-sm text-slate-600">
                                            Total Facturado
                                        </span>
                                        <span className="font-semibold tabular-nums">
                                            {formatCurrency(totals.invoiced)}
                                        </span>
                                    </div>
                                    <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-900">
                                            Diferencia
                                        </span>
                                        <span
                                            className={cn(
                                                "text-lg font-bold tabular-nums",
                                                Math.abs(
                                                    totals.charges -
                                                        totals.invoiced
                                                ) < 0.01
                                                    ? "text-success-600"
                                                    : "text-warning-600"
                                            )}
                                        >
                                            {formatCurrency(
                                                Math.abs(
                                                    totals.charges -
                                                        totals.invoiced
                                                )
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal: Add Charge */}
            <Dialog
                open={isAddChargeModalOpen}
                onOpenChange={setIsAddChargeModalOpen}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agregar Cobro</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCharge} className="space-y-4">
                        <div>
                            <Label className="label-corporate label-required">
                                Servicio
                            </Label>
                            <select
                                value={chargeFormData.service}
                                onChange={(e) => {
                                    const service = services.find(
                                        (s) => s.id === parseInt(e.target.value)
                                    );
                                    setChargeFormData({
                                        ...chargeFormData,
                                        service: e.target.value,
                                        unit_price:
                                            service?.default_price || "",
                                    });
                                }}
                                required
                                className="input-corporate"
                            >
                                <option value="">
                                    Seleccionar servicio...
                                </option>
                                {services.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} -{" "}
                                        {formatCurrency(s.default_price)}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="label-corporate label-required">
                                    Cantidad
                                </Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={chargeFormData.quantity}
                                    onChange={(e) =>
                                        setChargeFormData({
                                            ...chargeFormData,
                                            quantity: e.target.value,
                                        })
                                    }
                                    required
                                    className="input-corporate"
                                />
                            </div>
                            <div>
                                <Label className="label-corporate label-required">
                                    Precio Unitario
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={chargeFormData.unit_price}
                                    onChange={(e) =>
                                        setChargeFormData({
                                            ...chargeFormData,
                                            unit_price: e.target.value,
                                        })
                                    }
                                    required
                                    className="input-corporate"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddChargeModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                Agregar Cobro
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal: Add Transfer */}
            <Dialog
                open={isAddTransferModalOpen}
                onOpenChange={setIsAddTransferModalOpen}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Agregar Gasto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTransfer} className="space-y-4">
                        <div>
                            <Label className="label-corporate label-required">
                                Tipo de Gasto
                            </Label>
                            <select
                                value={transferFormData.transfer_type}
                                onChange={(e) =>
                                    setTransferFormData({
                                        ...transferFormData,
                                        transfer_type: e.target.value,
                                    })
                                }
                                required
                                className="input-corporate"
                            >
                                <option value="terceros">Terceros</option>
                                <option value="propios">Propios</option>
                                <option value="admin">Administrativos</option>
                            </select>
                        </div>
                        {transferFormData.transfer_type === "terceros" && (
                            <div>
                                <Label className="label-corporate label-required">
                                    Proveedor
                                </Label>
                                <select
                                    value={transferFormData.provider}
                                    onChange={(e) =>
                                        setTransferFormData({
                                            ...transferFormData,
                                            provider: e.target.value,
                                        })
                                    }
                                    required
                                    className="input-corporate"
                                >
                                    <option value="">
                                        Seleccionar proveedor...
                                    </option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div>
                            <Label className="label-corporate label-required">
                                Monto
                            </Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={transferFormData.amount}
                                onChange={(e) =>
                                    setTransferFormData({
                                        ...transferFormData,
                                        amount: e.target.value,
                                    })
                                }
                                required
                                className="input-corporate"
                            />
                        </div>
                        <div>
                            <Label className="label-corporate">Notas</Label>
                            <textarea
                                className="input-corporate min-h-[80px] resize-none"
                                value={transferFormData.notes}
                                onChange={(e) =>
                                    setTransferFormData({
                                        ...transferFormData,
                                        notes: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddTransferModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                Agregar Gasto
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog - Cobros */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, id: null })}
                onConfirm={confirmDeleteCharge}
                title="¿Eliminar este cobro?"
                description="Esta acción no se puede deshacer. El cobro será eliminado permanentemente de la orden de servicio."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
}

export default ServiceOrderDetail;
