import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Eye,
    Search,
    Download,
    Filter,
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    Edit2,
    Trash2,
    Clock,
    CheckCircle2,
    XCircle,
    RefreshCw,
    FileText,
    Building2,
    Calendar,
    Receipt,
    Banknote,
    AlertCircle,
    MoreVertical,
    Landmark,
    User,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Badge,
    SelectERP,
    Input,
    Label,
    Skeleton,
    SkeletonTable,
    Modal,
    ModalFooter,
    FileUpload,
    ConfirmDialog,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn, getTodayDate } from "../lib/utils";

// ============================================
// STATUS CONFIGURATION
// ============================================
const STATUS_CONFIG = {
    pendiente: {
        label: "Pendiente",
        variant: "warning",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
    },
    aprobado: {
        label: "Aprobado",
        variant: "info",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
    },
    pagado: {
        label: "Pagado",
        variant: "success",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    provisionada: {
        label: "Provisionada",
        variant: "default",
        bgColor: "bg-slate-50",
        textColor: "text-slate-600",
        borderColor: "border-slate-200",
        dotColor: "bg-slate-400",
    },
};

const TYPE_CONFIG = {
    costos: {
        label: "Costos Directos",
        variant: "danger",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
    },
    cargos: {
        label: "Cargos a Cliente",
        variant: "success",
        bgColor: "bg-green-50",
        textColor: "text-green-700",
        borderColor: "border-green-200",
    },
    admin: {
        label: "Gastos Operación",
        variant: "purple",
        bgColor: "bg-purple-50",
        textColor: "text-purple-700",
        borderColor: "border-purple-200",
    },
    terceros: {
        label: "Terceros",
        variant: "warning",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
    },
    propios: {
        label: "Propios",
        variant: "info",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
    },
};

const PAYMENT_METHODS = {
    efectivo: "Efectivo",
    transferencia: "Transferencia Bancaria",
    cheque: "Cheque",
    tarjeta: "Tarjeta",
};

// ============================================
// SELECT OPTIONS
// ============================================
const TRANSFER_TYPE_OPTIONS = [
    { id: "", name: "Todos" },
    { id: "costos", name: "Costos Directos" },
    { id: "cargos", name: "Cargos a Cliente" },
    { id: "admin", name: "Gastos Operación" },
    { id: "terceros", name: "Terceros" },
    { id: "propios", name: "Propios" },
];

const STATUS_OPTIONS = [
    { id: "", name: "Todos" },
    { id: "pendiente", name: "Pendiente" },
    { id: "aprobado", name: "Aprobado" },
    { id: "pagado", name: "Pagado" },
    { id: "provisionada", name: "Provisionada" },
];

const PAYMENT_METHOD_OPTIONS = [
    { id: "transferencia", name: "Transferencia" },
    { id: "efectivo", name: "Efectivo" },
    { id: "cheque", name: "Cheque" },
    { id: "tarjeta", name: "Tarjeta" },
];

const CREATE_TYPE_OPTIONS = [
    { id: "costos", name: "Costos Directos" },
    { id: "cargos", name: "Cargos a Cliente" },
    { id: "admin", name: "Gastos de Operación" },
];

const EDIT_TYPE_OPTIONS = [
    { id: "costos", name: "Costos Directos" },
    { id: "cargos", name: "Cargos a Cliente" },
    { id: "admin", name: "Gastos de Operación" },
];

// Estados solo para edición (no para creación inicial)
const EDIT_STATUS_OPTIONS = [
    { id: "pendiente", name: "Pendiente" },
    { id: "aprobado", name: "Aprobado" },
];

// ============================================
// STATUS & TYPE BADGES
// ============================================
const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
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

const TypeBadge = ({ type }) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.terceros;
    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border",
                config.bgColor,
                config.textColor,
                config.borderColor
            )}
        >
            {config.label}
        </span>
    );
};

// ============================================
// KPI CARD
// ============================================
const KPICard = ({
    label,
    value,
    subtext,
    icon: Icon,
    variant = "default",
}) => {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                            {label}
                        </p>
                        <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                            {value}
                        </p>
                        {subtext && (
                            <p className="text-xs text-slate-500 mt-1.5">
                                {subtext}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                            <Icon className="w-5 h-5 text-slate-400" />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================
function ProviderPayments() {
    const navigate = useNavigate();
    // Data state
    const [payments, setPayments] = useState([]);
    const [serviceOrders, setServiceOrders] = useState([]);
    const [providers, setProviders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [clients, setClients] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search and filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        transfer_type: "",
        status: "",
        month: "",
        provider: "",
        dateFrom: "",
        dateTo: "",
    });

    // Form state - Nota: payment_method y status se definen al EJECUTAR el pago, no al registrar
    const initialFormData = {
        service_order: "",
        transfer_type: "costos",
        provider: "",
        description: "",
        amount: "",
        invoice_number: "",
        ccf: "",
        beneficiary_name: "",
        transaction_date: getTodayDate(),
        notes: "",
        invoice_file: null,
    };
    const [formData, setFormData] = useState(initialFormData);

    // Derived options for Select components
    const serviceOrderOptions = useMemo(
        () => [
            { id: "", name: "Sin OS (Gasto Administrativo)" },
            ...serviceOrders.map((os) => ({
                id: String(os.id),
                name: `${os.order_number} - ${os.client_name}`,
            })),
        ],
        [serviceOrders]
    );

    const providerOptions = useMemo(
        () => [
            { id: "", name: "Seleccionar proveedor" },
            ...providers.map((p) => ({ id: String(p.id), name: p.name })),
        ],
        [providers]
    );

    const bankOptions = useMemo(
        () => [
            { id: "", name: "Seleccionar banco" },
            ...banks.map((b) => ({ id: String(b.id), name: b.name })),
        ],
        [banks]
    );

    const filterProviderOptions = useMemo(
        () => [
            { id: "", name: "Todos" },
            ...providers.map((p) => ({ id: String(p.id), name: p.name })),
        ],
        [providers]
    );

    useEffect(() => {
        fetchPayments();
        fetchCatalogs();
    }, []);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/transfers/transfers/");
            setPayments(response.data || []);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar pagos a proveedores");
            setPayments([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [ordersRes, providersRes, banksRes, clientsRes] =
                await Promise.all([
                    axios.get("/orders/service-orders/"),
                    axios.get("/catalogs/providers/"),
                    axios.get("/catalogs/banks/"),
                    axios.get("/clients/"),
                ]);
            setServiceOrders(ordersRes.data);
            setProviders(providersRes.data);
            setBanks(banksRes.data);
            setClients(clientsRes.data);
        } catch (error) {
            console.error("Error cargando catálogos", error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const formDataToSend = new FormData();

            Object.keys(formData).forEach((key) => {
                if (
                    key !== "invoice_file" &&
                    formData[key] !== null &&
                    formData[key] !== ""
                ) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            if (formData.invoice_file instanceof File) {
                formDataToSend.append("invoice_file", formData.invoice_file);
            }

            await axios.post("/transfers/transfers/", formDataToSend, {
                headers: { "Content-Type": undefined },
            });

            toast.success("Pago registrado exitosamente");
            setIsCreateModalOpen(false);
            resetForm();
            fetchPayments();
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                Object.values(error.response?.data || {})[0]?.[0] ||
                "Error al registrar pago";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        if (isSubmitting || !selectedPayment) return;

        try {
            setIsSubmitting(true);
            const formDataToSend = new FormData();

            Object.keys(formData).forEach((key) => {
                if (
                    key !== "invoice_file" &&
                    formData[key] !== null &&
                    formData[key] !== ""
                ) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            if (formData.invoice_file instanceof File) {
                formDataToSend.append("invoice_file", formData.invoice_file);
            }

            await axios.patch(
                `/transfers/transfers/${selectedPayment.id}/`,
                formDataToSend,
                {
                    headers: { "Content-Type": undefined },
                }
            );

            toast.success("Pago actualizado exitosamente");
            setIsEditModalOpen(false);
            resetForm();
            fetchPayments();
        } catch (error) {
            const errorMsg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                Object.values(error.response?.data || {})[0]?.[0] ||
                "Error al actualizar pago";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm.id) return;

        try {
            await axios.delete(`/transfers/transfers/${deleteConfirm.id}/`);
            toast.success("Pago eliminado correctamente");
            setDeleteConfirm({ open: false, id: null });
            fetchPayments();
        } catch (error) {
            const errorMsg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                Object.values(error.response?.data || {})[0]?.[0] ||
                "Error al eliminar pago";
            toast.error(errorMsg);
        }
    };

    const openEditModal = (payment) => {
        console.log("=== DATOS DEL PAGO PARA EDITAR (Página General) ===");
        console.log("payment completo:", payment);
        console.log("service_order:", payment.service_order);
        console.log("provider:", payment.provider);
        console.log("bank:", payment.bank);

        setSelectedPayment(payment);

        const formDataToSet = {
            service_order: payment.service_order?.id
                ? String(payment.service_order.id)
                : payment.service_order
                ? String(payment.service_order)
                : "",
            transfer_type: payment.transfer_type || "costos",
            provider: payment.provider?.id
                ? String(payment.provider.id)
                : payment.provider
                ? String(payment.provider)
                : "",
            description: payment.description || "",
            amount: payment.amount ? String(payment.amount) : "",
            bank: payment.bank?.id
                ? String(payment.bank.id)
                : payment.bank
                ? String(payment.bank)
                : "",
            payment_method: payment.payment_method || "transferencia",
            invoice_number: payment.invoice_number || "",
            ccf: payment.ccf || "",
            beneficiary_name: payment.beneficiary_name || "",
            status: payment.status || "pendiente",
            transaction_date: payment.transaction_date || getTodayDate(),
            notes: payment.notes || "",
            invoice_file: null,
        };

        console.log("FormData a establecer:", formDataToSet);
        setFormData(formDataToSet);
        setIsEditModalOpen(true);
    };

    const openDetailModal = (payment) => {
        setSelectedPayment(payment);
        setIsDetailModalOpen(true);
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setSelectedPayment(null);
    };

    const handleExportExcel = async () => {
        if (payments.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get(
                "/transfers/transfers/export_excel/",
                {
                    responseType: "blob",
                    params: filters,
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().split("T")[0];
            link.setAttribute(
                "download",
                `pagos_proveedores_${timestamp}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Archivo exportado exitosamente");
        } catch (error) {
            toast.error("Error al exportar archivo");
        } finally {
            setIsExporting(false);
        }
    };

    const clearFilters = () => {
        setFilters({
            transfer_type: "",
            status: "",
            month: "",
            provider: "",
            dateFrom: "",
            dateTo: "",
        });
        setSearchQuery("");
    };

    // Filtered data
    const filteredPayments = useMemo(() => {
        return payments.filter((payment) => {
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    payment.service_order_number
                        ?.toLowerCase()
                        .includes(query) ||
                    payment.provider_name?.toLowerCase().includes(query) ||
                    payment.description?.toLowerCase().includes(query) ||
                    payment.invoice_number?.toLowerCase().includes(query) ||
                    payment.ccf?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            if (
                filters.transfer_type &&
                payment.transfer_type !== filters.transfer_type
            )
                return false;
            if (filters.status && payment.status !== filters.status)
                return false;
            if (
                filters.provider &&
                payment.provider !== parseInt(filters.provider)
            )
                return false;

            if (filters.dateFrom) {
                const paymentDate = new Date(payment.transaction_date);
                const fromDate = new Date(filters.dateFrom);
                if (paymentDate < fromDate) return false;
            }

            if (filters.dateTo) {
                const paymentDate = new Date(payment.transaction_date);
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59);
                if (paymentDate > toDate) return false;
            }

            return true;
        });
    }, [payments, searchQuery, filters]);

    // KPIs
    const kpis = useMemo(() => {
        const total = payments.reduce(
            (sum, p) => sum + parseFloat(p.amount || 0),
            0
        );
        const pendiente = payments
            .filter((p) => p.status === "pendiente")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const aprobado = payments
            .filter((p) => p.status === "aprobado")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const pagado = payments
            .filter((p) => p.status === "pagado" || p.status === "pagada")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const costos = payments
            .filter((p) => p.transfer_type === "costos")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
        const cargos = payments
            .filter(
                (p) =>
                    p.transfer_type === "cargos" ||
                    p.transfer_type === "terceros"
            )
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

        return { total, pendiente, aprobado, pagado, costos, cargos };
    }, [payments]);

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.transfer_type) count++;
        if (filters.status) count++;
        if (filters.provider) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        return count;
    }, [filters]);

    // Table columns
    const columns = [
        {
            header: "Orden de Servicio",
            accessor: "service_order_number",
            cell: (row) => (
                <div>
                    <div className="font-mono text-sm font-semibold">
                        {row.service_order_number ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(
                                        `/service-orders/${row.service_order}`
                                    );
                                }}
                                className="text-brand-600 hover:text-brand-700 hover:underline"
                            >
                                {row.service_order_number}
                            </button>
                        ) : (
                            <span className="text-gray-400 italic">Sin OS</span>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                        {formatDate(row.transaction_date, { format: "medium" })}
                    </div>
                </div>
            ),
        },
        {
            header: "Tipo",
            accessor: "transfer_type",
            cell: (row) => <TypeBadge type={row.transfer_type} />,
        },
        {
            header: "Proveedor / Descripción",
            accessor: "provider_name",
            cell: (row) => (
                <div className="min-w-[180px]">
                    <div className="font-medium text-gray-900">
                        {row.provider_name || row.beneficiary_name || "—"}
                    </div>
                    {row.description && (
                        <div
                            className="text-xs text-gray-500 truncate max-w-[250px]"
                            title={row.description}
                        >
                            {row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Monto",
            accessor: "amount",
            cell: (row) => (
                <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 tabular-nums">
                        {formatCurrency(row.amount)}
                    </div>
                </div>
            ),
        },
        {
            header: "Factura Prov.",
            accessor: "invoice_number",
            cell: (row) => (
                <div>
                    {row.invoice_number ? (
                        <div className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {row.invoice_number}
                        </div>
                    ) : (
                        <span className="text-gray-400 text-xs">—</span>
                    )}
                </div>
            ),
        },
        {
            header: "Método de Pago",
            accessor: "payment_method",
            cell: (row) => (
                <div className="text-sm text-gray-700">
                    {row.payment_method ? (
                        <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                            <span>{PAYMENT_METHODS[row.payment_method]}</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 text-xs">—</span>
                    )}
                </div>
            ),
        },
        {
            header: "Banco",
            accessor: "bank_name",
            cell: (row) => (
                <div className="text-sm text-gray-700">
                    {row.bank_name ? (
                        <span>{row.bank_name}</span>
                    ) : (
                        <span className="text-gray-400 text-xs">—</span>
                    )}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: "Doc.",
            accessor: "invoice_file",
            className: "w-16 text-center",
            cell: (row) =>
                row.invoice_file ? (
                    <div className="relative group">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.invoice_file, "_blank");
                            }}
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Ver comprobante (click para ver, click derecho para descargar)"
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Descargar usando axios
                                axios
                                    .get(
                                        `/transfers/transfers/${row.id}/download_invoice/`,
                                        {
                                            responseType: "blob",
                                        }
                                    )
                                    .then((response) => {
                                        const url = window.URL.createObjectURL(
                                            new Blob([response.data])
                                        );
                                        const link =
                                            document.createElement("a");
                                        link.href = url;
                                        link.setAttribute(
                                            "download",
                                            `comprobante_${
                                                row.invoice_number || row.id
                                            }.pdf`
                                        );
                                        document.body.appendChild(link);
                                        link.click();
                                        link.remove();
                                        window.URL.revokeObjectURL(url);
                                        toast.success(
                                            "Descargando comprobante..."
                                        );
                                    })
                                    .catch((error) => {
                                        toast.error(
                                            "Error al descargar comprobante"
                                        );
                                    });
                            }}
                        >
                            <FileText className="w-4 h-4" />
                        </Button>
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            cell: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(row);
                        }}
                        className="text-gray-500 hover:text-blue-600"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(row);
                        }}
                        className="text-gray-500 hover:text-amber-600"
                        title="Editar"
                    >
                        <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, id: row.id });
                        }}
                        className="text-gray-400 hover:text-red-600"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    // Loading state
    if (loading && payments.length === 0) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <SkeletonTable rows={8} columns={7} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Pagos a Proveedores
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión de gastos, costos y pagos asociados a órdenes de
                        servicio
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchPayments}
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
                        disabled={isExporting || payments.length === 0}
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
                        Nuevo Pago
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Pendientes"
                    value={formatCurrency(kpis.pendiente)}
                    icon={Clock}
                    variant="warning"
                />
                <KPICard
                    label="Aprobados"
                    value={formatCurrency(kpis.aprobado)}
                    icon={CheckCircle2}
                    variant="primary"
                />
                <KPICard
                    label="Pagados"
                    value={formatCurrency(kpis.pagado)}
                    icon={Banknote}
                    variant="success"
                />
                <KPICard
                    label="Costos Directos"
                    value={formatCurrency(kpis.costos)}
                    icon={TrendingDown}
                    variant="danger"
                />
                <KPICard
                    label="Total General"
                    value={formatCurrency(kpis.total)}
                    icon={DollarSign}
                    variant="default"
                    subtext="Todos los gastos"
                />
            </div>

            {/* Filters & Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por OS, proveedor, factura..."
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
                    <div className="text-sm text-gray-500">
                        {filteredPayments.length} de {payments.length} registros
                    </div>
                </CardHeader>

                {isFiltersOpen && (
                    <CardContent className="pt-0 pb-4 border-b border-gray-100">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                            <SelectERP
                                label="Tipo de Gasto"
                                value={filters.transfer_type}
                                onChange={(val) =>
                                    setFilters({
                                        ...filters,
                                        transfer_type: val,
                                    })
                                }
                                options={TRANSFER_TYPE_OPTIONS}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                            />
                            <SelectERP
                                label="Estado"
                                value={filters.status}
                                onChange={(val) =>
                                    setFilters({ ...filters, status: val })
                                }
                                options={STATUS_OPTIONS}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                            />
                            <SelectERP
                                label="Proveedor"
                                value={filters.provider}
                                onChange={(val) =>
                                    setFilters({ ...filters, provider: val })
                                }
                                options={filterProviderOptions}
                                searchable
                                clearable
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                            <Input
                                label="Desde"
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        dateFrom: e.target.value,
                                    })
                                }
                            />
                            <Input
                                label="Hasta"
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
                        <div className="flex justify-end pt-3">
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
                        data={filteredPayments}
                        columns={columns}
                        loading={loading}
                        searchable={false}
                        onRowClick={openDetailModal}
                        emptyMessage="No se encontraron pagos a proveedores"
                    />
                </CardContent>
            </Card>

            {/* Create Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title="Registrar Pago a Proveedor"
                size="3xl"
            >
                <form onSubmit={handleCreate} className="space-y-6">
                    {/* Section 1: Asociación */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                1
                            </span>
                            Asociación del Pago
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <SelectERP
                                    label="Orden de Servicio"
                                    value={formData.service_order}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            service_order: val,
                                        })
                                    }
                                    options={serviceOrderOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                    helperText="Deja vacío para gastos de operación"
                                />
                            </div>
                            <div>
                                <SelectERP
                                    label="Tipo de Gasto"
                                    value={formData.transfer_type}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            transfer_type: val,
                                        })
                                    }
                                    required
                                    options={CREATE_TYPE_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Section 2: Proveedor y Monto */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                2
                            </span>
                            Datos del Proveedor y Monto
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <SelectERP
                                    label="Proveedor"
                                    value={formData.provider}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            provider: val,
                                        })
                                    }
                                    options={providerOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                />
                            </div>
                            <div>
                                <Label>Beneficiario (si es diferente)</Label>
                                <Input
                                    value={formData.beneficiary_name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            beneficiary_name: e.target.value,
                                        })
                                    }
                                    placeholder="Nombre del beneficiario"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Descripción *</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Concepto del pago..."
                                    required
                                />
                            </div>
                            <div>
                                <Label>Monto *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: e.target.value,
                                        })
                                    }
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Fecha de Transacción</Label>
                                <Input
                                    type="date"
                                    value={formData.transaction_date}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            transaction_date: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Section 3: Pago y Facturación */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                3
                            </span>
                            Datos de Factura del Proveedor
                        </h4>
                        <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <Label>
                                    Número de Factura/CCF del Proveedor
                                </Label>
                                <Input
                                    value={formData.invoice_number}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            invoice_number: e.target.value,
                                        })
                                    }
                                    placeholder="F-2025-001 o CCF-123456"
                                    className="font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Número del documento fiscal del proveedor
                                </p>
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Adjuntar Factura (Opcional)</Label>
                                <FileUpload
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onFileChange={(file) =>
                                        setFormData({
                                            ...formData,
                                            invoice_file: file,
                                        })
                                    }
                                    helperText="El método de pago se define al ejecutar el pago desde Cuentas por Pagar"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            El estado inicial será "Pendiente". El método de
                            pago se registra al ejecutar el pago.
                        </p>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Notas Adicionales</Label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreateModalOpen(false);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Registrar Pago"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Edit Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    resetForm();
                }}
                title="Editar Pago a Proveedor"
                size="3xl"
            >
                <form onSubmit={handleEdit} className="space-y-6">
                    {/* Section 1: Asociación */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                1
                            </span>
                            Asociación del Pago
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <SelectERP
                                    label="Orden de Servicio"
                                    value={formData.service_order}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            service_order: val,
                                        })
                                    }
                                    options={serviceOrderOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                />
                            </div>
                            <div>
                                <SelectERP
                                    label="Tipo de Gasto"
                                    value={formData.transfer_type}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            transfer_type: val,
                                        })
                                    }
                                    options={EDIT_TYPE_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Section 2: Proveedor y Monto */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                2
                            </span>
                            Datos del Proveedor y Monto
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <SelectERP
                                    label="Proveedor"
                                    value={formData.provider}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            provider: val,
                                        })
                                    }
                                    options={providerOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    clearable
                                />
                            </div>
                            <div>
                                <Label>Beneficiario</Label>
                                <Input
                                    value={formData.beneficiary_name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            beneficiary_name: e.target.value,
                                        })
                                    }
                                    placeholder="Nombre del beneficiario"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Descripción *</Label>
                                <Input
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    placeholder="Concepto del pago..."
                                    required
                                />
                            </div>
                            <div>
                                <Label>Monto *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: e.target.value,
                                        })
                                    }
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                            <div>
                                <Label>Fecha de Transacción</Label>
                                <Input
                                    type="date"
                                    value={formData.transaction_date}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            transaction_date: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Section 3: Datos de Factura (Edición) */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                                3
                            </span>
                            Datos de Factura y Estado
                        </h4>
                        <div className="grid grid-cols-1 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <SelectERP
                                    label="Estado"
                                    value={formData.status}
                                    onChange={(val) =>
                                        setFormData({
                                            ...formData,
                                            status: val,
                                        })
                                    }
                                    options={EDIT_STATUS_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    helperText="Para marcar como pagado, use Cuentas por Pagar"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label>Número de Factura/CCF</Label>
                                <Input
                                    value={formData.invoice_number}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            invoice_number: e.target.value,
                                        })
                                    }
                                    placeholder="F-2025-001 o CCF-123456"
                                    className="font-mono"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Comprobante de Crédito Fiscal o número de
                                    factura
                                </p>
                            </div>
                            <div>
                                <Label>Nueva Factura (opcional)</Label>
                                <FileUpload
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onFileChange={(file) =>
                                        setFormData({
                                            ...formData,
                                            invoice_file: file,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <Label>Notas Adicionales</Label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={formData.notes}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsEditModalOpen(false);
                                resetForm();
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Guardando..." : "Actualizar Pago"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedPayment(null);
                }}
                title="Detalles del Pago"
                size="3xl"
            >
                {selectedPayment && (
                    <div className="space-y-6">
                        {/* Header con monto y estado */}
                        <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <div className="text-sm text-slate-500 mb-1">
                                    Monto Total
                                </div>
                                <div className="text-3xl font-bold text-slate-900 tabular-nums">
                                    {formatCurrency(selectedPayment.amount)}
                                </div>
                            </div>
                            <div className="text-right space-y-2">
                                <StatusBadge status={selectedPayment.status} />
                                <div className="text-xs text-slate-500">
                                    {formatDate(
                                        selectedPayment.transaction_date,
                                        { format: "long" }
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Información General */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Tipo de Pago
                                    </div>
                                    <TypeBadge
                                        type={selectedPayment.transfer_type}
                                    />
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Orden de Servicio
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {selectedPayment.service_order_number ? (
                                            <button
                                                onClick={() =>
                                                    navigate(
                                                        `/service-orders/${selectedPayment.service_order}`
                                                    )
                                                }
                                                className="text-brand-600 hover:text-brand-700 hover:underline flex items-center gap-1 font-mono"
                                            >
                                                {
                                                    selectedPayment.service_order_number
                                                }
                                                <Eye className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                Sin OS vinculada
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Método de Pago
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {selectedPayment.payment_method ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg border border-slate-200 w-fit">
                                                <CreditCard className="w-4 h-4 text-slate-500" />
                                                <span>
                                                    {
                                                        PAYMENT_METHODS[
                                                            selectedPayment
                                                                .payment_method
                                                        ]
                                                    }
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                No especificado
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Proveedor
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-slate-400" />
                                        {selectedPayment.provider_name ||
                                            selectedPayment.beneficiary_name ||
                                            "No especificado"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Banco
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {selectedPayment.bank?.name ||
                                        selectedPayment.bank_name ? (
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200 w-fit">
                                                <Landmark className="w-4 h-4 text-blue-600" />
                                                <span>
                                                    {selectedPayment.bank
                                                        ?.name ||
                                                        selectedPayment.bank_name}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400 italic">
                                                No especificado
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Solicitado por
                                    </div>
                                    <div className="text-sm font-medium text-slate-900 flex items-center gap-2">
                                        <User className="w-4 h-4 text-slate-400" />
                                        {selectedPayment.created_by_name ||
                                            selectedPayment.created_by_username ||
                                            "Sistema"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Facturación */}
                        {selectedPayment.invoice_number && (
                            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                                <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <Receipt className="w-4 h-4" />
                                    Información de Factura
                                </div>
                                <div>
                                    <div className="text-xs text-amber-600 mb-0.5">
                                        Número de Factura/CCF
                                    </div>
                                    <div className="font-mono text-sm font-medium text-slate-900">
                                        {selectedPayment.invoice_number}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Comprobante */}
                        {selectedPayment.invoice_file && (
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4" />
                                    Comprobante Adjunto
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            window.open(
                                                selectedPayment.invoice_file,
                                                "_blank"
                                            )
                                        }
                                        className="flex-1"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver Comprobante
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={async () => {
                                            try {
                                                const response =
                                                    await axios.get(
                                                        `/transfers/transfers/${selectedPayment.id}/download_invoice/`,
                                                        { responseType: "blob" }
                                                    );
                                                const url =
                                                    window.URL.createObjectURL(
                                                        new Blob([
                                                            response.data,
                                                        ])
                                                    );
                                                const link =
                                                    document.createElement("a");
                                                link.href = url;
                                                link.setAttribute(
                                                    "download",
                                                    `comprobante_${
                                                        selectedPayment.invoice_number ||
                                                        selectedPayment.id
                                                    }.pdf`
                                                );
                                                document.body.appendChild(link);
                                                link.click();
                                                link.remove();
                                                window.URL.revokeObjectURL(url);
                                                toast.success(
                                                    "Comprobante descargado"
                                                );
                                            } catch (error) {
                                                toast.error(
                                                    "Error al descargar comprobante"
                                                );
                                            }
                                        }}
                                        className="flex-1"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Descargar
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Descripción */}
                        {selectedPayment.description && (
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Descripción
                                </div>
                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    {selectedPayment.description}
                                </div>
                            </div>
                        )}

                        {/* Notas */}
                        {selectedPayment.notes && (
                            <div>
                                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                    Notas Adicionales
                                </div>
                                <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                    {selectedPayment.notes}
                                </div>
                            </div>
                        )}

                        {/* Auditoría */}
                        <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-xs text-slate-500">
                            <div>
                                <span className="font-medium">Registrado:</span>{" "}
                                {formatDate(selectedPayment.created_at, {
                                    format: "long",
                                })}
                                {selectedPayment.created_by_username && (
                                    <span className="ml-1">
                                        por{" "}
                                        <span className="font-medium text-slate-700">
                                            {
                                                selectedPayment.created_by_username
                                            }
                                        </span>
                                    </span>
                                )}
                            </div>
                            {selectedPayment.payment_date && (
                                <div>
                                    <span className="font-medium">Pagado:</span>{" "}
                                    {formatDate(selectedPayment.payment_date, {
                                        format: "long",
                                    })}
                                </div>
                            )}
                        </div>

                        <ModalFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    setSelectedPayment(null);
                                }}
                            >
                                Cerrar
                            </Button>
                            <Button
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    openEditModal(selectedPayment);
                                }}
                            >
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar Pago
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onOpenChange={(open) =>
                    setDeleteConfirm({
                        open,
                        id: open ? deleteConfirm.id : null,
                    })
                }
                title="Eliminar Pago"
                description="¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDelete}
            />
        </div>
    );
}

export default ProviderPayments;
