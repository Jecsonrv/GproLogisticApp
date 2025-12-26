import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Eye,
    Search,
    Download,
    Filter,
    DollarSign,
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
    Receipt,
    Banknote,
    AlertCircle,
    Landmark,
    User,
    Calendar,
    ArrowUpRight,
    Lock as LockIcon,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
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
import ExportButton from "../components/ui/ExportButton";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn, getTodayDate } from "../lib/utils";

/**
 * Gestión de Pagos - Rediseño Corporativo SaaS
 * Bloque Estratégico (KPIs Compactos) | Bloque Operativo (Tabla + Herramientas)
 */

// ============================================
// STATUS CONFIGURATION - CORPORATE STYLE
// ============================================
const STATUS_CONFIG = {
    pendiente: {
        label: "Pendiente",
        className: "bg-white border-slate-200 text-slate-600",
        icon: Clock,
        iconColor: "text-amber-500",
    },
    aprobado: {
        label: "Aprobado",
        className: "bg-white border-slate-200 text-slate-700",
        icon: CheckCircle2,
        iconColor: "text-slate-900",
    },
    parcial: {
        label: "Pago Parcial",
        className: "bg-white border-blue-200 text-blue-700",
        icon: CreditCard,
        iconColor: "text-blue-600",
    },
    pagado: {
        label: "Pagado",
        className: "bg-white border-slate-200 text-slate-900 font-medium",
        icon: Banknote,
        iconColor: "text-emerald-600",
    },
};

const TYPE_CONFIG = {
    costos: {
        label: "Costo Directo",
        className: "text-slate-700 bg-slate-100 border-slate-200",
    },
    cargos: {
        label: "Cargo Cliente",
        className: "text-blue-700 bg-blue-50 border-blue-100",
    },
    admin: {
        label: "Gasto Operación",
        className: "text-purple-700 bg-purple-50 border-purple-100",
    },
};

const PAYMENT_METHODS = {
    efectivo: "Efectivo",
    transferencia: "Transferencia",
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
    { id: "admin", name: "Gastos de Operación" },
];

const STATUS_OPTIONS = [
    { id: "", name: "Todos" },
    { id: "pendiente", name: "Pendiente" },
    { id: "aprobado", name: "Aprobado" },
    { id: "parcial", name: "Pago Parcial" },
    { id: "pagado", name: "Pagado" },
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

const EDIT_STATUS_OPTIONS = [
    { id: "pendiente", name: "Pendiente" },
    { id: "aprobado", name: "Aprobado" },
];

// ============================================
// STATUS & TYPE BADGES
// ============================================
const StatusBadge = ({ status }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
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

const TypeBadge = ({ type }) => {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.costos;
    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded border",
                config.className
            )}
        >
            {config.label}
        </span>
    );
};

// ============================================
// KPI CARD - REFINED & SPACIOUS
// ============================================
const KPICard = ({
    label,
    value,
    icon: Icon,
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
        provider: "",
        dateFrom: "",
        dateTo: "",
    });

    // Form state
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

    // Payment Execution State
    const [isPayModalOpen, setIsPayModalOpen] = useState(false);
    const [payFormData, setPayFormData] = useState({
        payment_method: "transferencia",
        bank: "",
        reference: "",
        payment_date: getTodayDate(),
    });

    // Derived options
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
        } catch {
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
        } catch {
            // Silencioso
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
            setIsCreateModalOpen(false);
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

    const handleMarkAsPaid = (payment) => {
        setSelectedPayment(payment);
        setPayFormData({
            payment_method: "transferencia",
            bank: "",
            reference: "",
            payment_date: getTodayDate(),
            invoice_file: null,
        });
        setIsPayModalOpen(true);
    };

    const handlePaySubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting || !selectedPayment) return;

        try {
            setIsSubmitting(true);
            const formDataToSend = new FormData();
            
            // Usar el saldo pendiente si existe, si no el monto total
            const amountToPay = selectedPayment.balance || selectedPayment.amount;
            formDataToSend.append("amount", amountToPay);
            
            formDataToSend.append("payment_date", payFormData.payment_date);
            if (payFormData.payment_method) formDataToSend.append("payment_method", payFormData.payment_method);
            if (payFormData.bank) formDataToSend.append("bank", payFormData.bank);
            if (payFormData.reference) formDataToSend.append("reference", payFormData.reference);
            
            if (payFormData.invoice_file instanceof File) {
                formDataToSend.append("proof_file", payFormData.invoice_file);
            }

            await axios.post(
                `/transfers/transfers/${selectedPayment.id}/register_payment/`, 
                formDataToSend,
                {
                    headers: { "Content-Type": undefined },
                }
            );
            
            toast.success("Pago registrado exitosamente");
            setIsPayModalOpen(false);
            fetchPayments();
        } catch (error) {
             const errorMsg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                "Error al registrar pago";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (payment) => {
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

        setFormData(formDataToSet);
        setIsCreateModalOpen(true);
    };

    const openDetailModal = (payment) => {
        setSelectedPayment(payment);
        setIsDetailModalOpen(true);
    };

    const resetForm = () => {
        setFormData(initialFormData);
        setSelectedPayment(null);
    };

    const handleExportExcel = async (exportType = "all") => {
        const dataToExport = exportType === "filtered" ? filteredPayments : payments;

        if (dataToExport.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);

            const params = exportType === "filtered" ? filters : {};

            const response = await axios.get(
                "/transfers/transfers/export_excel/",
                {
                    responseType: "blob",
                    params: params,
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().split("T")[0];
            const filename = exportType === "filtered"
                ? `GPRO_Pagos_Filtrados_${timestamp}.xlsx`
                : `GPRO_Pagos_Proveedores_${timestamp}.xlsx`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            const message = exportType === "filtered"
                ? `${dataToExport.length} pago(s) exportado(s)`
                : "Todos los pagos exportados exitosamente";
            toast.success(message);
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

        return { total, pendiente, aprobado, pagado, costos };
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

    const columns = [
        {
            header: "Orden de Servicio",
            accessor: "service_order_number",
            className: "w-[180px]",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col">
                    {row.service_order_number ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/service-orders/${row.service_order}`);
                            }}
                            className="font-mono text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline text-left w-fit"
                        >
                            {row.service_order_number}
                        </button>
                    ) : (
                        <span className="font-mono text-xs text-slate-400 italic">Administrativo</span>
                    )}
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {formatDate(row.transaction_date, { format: "short" })}
                    </span>
                </div>
            ),
        },
        {
            header: "Proveedor / Beneficiario",
            accessor: "provider_name",
            className: "min-w-[220px]",
            sortable: false,
            cell: (row) => (
                <div>
                    <div className="font-medium text-slate-700 text-sm truncate max-w-[240px]">
                        {row.provider_name || row.beneficiary_name || "—"}
                    </div>
                    {row.description && (
                        <div
                            className="text-xs text-slate-500 truncate max-w-[240px] mt-0.5 leading-tight font-normal"
                            title={row.description}
                        >
                            {row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Categoría",
            accessor: "transfer_type",
            className: "w-[130px]",
            sortable: false,
            cell: (row) => <TypeBadge type={row.transfer_type} />,
        },
        {
            header: "Monto",
            accessor: "amount",
            className: "w-[140px]",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col items-end text-right">
                    <span className="font-semibold text-slate-700 tabular-nums text-sm tracking-tight">
                        {formatCurrency(row.amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Referencia",
            accessor: "invoice_number",
            className: "w-[150px]",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col gap-1">
                    {row.invoice_number ? (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">
                            <Receipt className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{row.invoice_number}</span>
                        </div>
                    ) : (
                        <span className="text-[10px] text-slate-300 font-medium italic">Sin soporte</span>
                    )}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            className: "w-[130px]",
            sortable: false,
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: "Soporte",
            accessor: "invoice_file",
            className: "w-[80px] text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="flex items-center justify-center">
                    {row.invoice_file ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.invoice_file, "_blank");
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Ver soporte digital"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    ) : (
                        <span className="text-slate-300 text-xs">—</span>
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
                    <div className="flex justify-center">
                        {row.status !== "pagado" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAsPaid(row);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Ejecutar Pago"
                            >
                                <Banknote className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(row);
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
                                setDeleteConfirm({ open: true, id: row.id });
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ),
        },
    ];

    if (loading && payments.length === 0) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-20 rounded-xl" />
                    ))}
                </div>
                <SkeletonTable rows={10} columns={7} />
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-2">
            
            {/* Bloque Superior (Estratégico): KPIs Compactos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Pendientes de pago"
                    value={formatCurrency(kpis.pendiente)}
                    icon={Clock}
                />
                <KPICard
                    label="Listos para pagar"
                    value={formatCurrency(kpis.aprobado)}
                    icon={CheckCircle2}
                />
                <KPICard
                    label="Pagado este mes"
                    value={formatCurrency(kpis.pagado)}
                    icon={Banknote}
                />
                <KPICard
                    label="Gastos operativos"
                    value={formatCurrency(kpis.costos)}
                    icon={TrendingDown}
                />
                <KPICard
                    label="Total obligaciones"
                    value={formatCurrency(kpis.total)}
                    icon={DollarSign}
                />
            </div>

            {/* Bloque Inferior (Operativo): Tabla + Acciones */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Barra de Herramientas Unificada (Buscador + Filtros + Botones de Acción) */}
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50/30">
                    
                    {/* Izquierda: Buscador y Filtros */}
                    <div className="flex items-center gap-3 flex-1 w-full lg:max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por proveedor, OS o factura..."
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

                        <ExportButton
                            onExportAll={() => handleExportExcel("all")}
                            onExportFiltered={() => handleExportExcel("filtered")}
                            filteredCount={filteredPayments.length}
                            totalCount={payments.length}
                            isExporting={isExporting}
                            allLabel="Todos los Pagos"
                            allDescription="Exportar el registro completo de pagos a proveedores"
                            filteredLabel="Pagos Filtrados"
                            filteredDescription="Exportar solo los pagos visibles actualmente"
                        />

                        <Button
                            size="sm"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nuevo Gasto
                        </Button>
                    </div>
                </div>

                {/* Expanded Filters Panel */}
                {isFiltersOpen && (
                    <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                            <SelectERP
                                label="Tipo de Gasto"
                                value={filters.transfer_type}
                                onChange={(val) => setFilters({ ...filters, transfer_type: val })}
                                options={TRANSFER_TYPE_OPTIONS}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                            />
                            <SelectERP
                                label="Estado"
                                value={filters.status}
                                onChange={(val) => setFilters({ ...filters, status: val })}
                                options={STATUS_OPTIONS}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                            />
                            <SelectERP
                                label="Proveedor"
                                value={filters.provider}
                                onChange={(val) => setFilters({ ...filters, provider: val })}
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
                                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                            />
                            <Input
                                label="Hasta"
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                            />
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
                    data={filteredPayments}
                    columns={columns}
                    loading={loading}
                    searchable={false}
                    onRowClick={openDetailModal}
                    emptyMessage="No se encontraron movimientos financieros con los criterios actuales."
                />
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    resetForm();
                }}
                title={selectedPayment ? "Editar Registro de Gasto" : "Nuevo Registro de Gasto"}
                size="3xl"
            >
                {(() => {
                    // Un registro está bloqueado SOLO si:
                    // 1. Está completamente pagado (status === 'pagado'), O
                    // 2. Ya fue facturado al cliente (is_billed === true)
                    // NOTA: Los pagos parciales (status === 'parcial') NO se bloquean para permitir ajustes
                    const isLocked = selectedPayment && (
                        selectedPayment.status === 'pagado' ||
                        selectedPayment.is_billed === true
                    );

                    // Determinar mensaje de bloqueo específico
                    let lockReason = '';
                    if (selectedPayment?.status === 'pagado') {
                        lockReason = 'Este gasto ya fue pagado completamente al proveedor.';
                    } else if (selectedPayment?.is_billed) {
                        lockReason = 'Este gasto ya fue facturado al cliente.';
                    }

                    return (
                        <form onSubmit={selectedPayment ? handleEdit : handleCreate} className="space-y-6">
                            {/* Indicador de Registro Bloqueado - Diseño ERP Profesional */}
                            {isLocked && (
                                <div className="relative overflow-hidden bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900" />
                                    <div className="p-4 pl-5 flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-slate-900 flex items-center justify-center">
                                            <LockIcon className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                                                    Registro Bloqueado
                                                </p>
                                                <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 bg-slate-200 text-slate-700">
                                                    Solo Lectura
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-600 leading-relaxed">
                                                {lockReason}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Indicador de Pago Parcial - Diseño ERP Informativo */}
                            {selectedPayment?.status === 'parcial' && !isLocked && (
                                <div className="relative overflow-hidden bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-lg">
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600" />
                                    <div className="p-4 pl-5 flex items-start gap-3">
                                        <div className="flex-shrink-0 w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
                                            <CreditCard className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-sm font-semibold text-blue-900 uppercase tracking-wide">
                                                    Pago Parcial Aplicado
                                                </p>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                                <div>
                                                    <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Monto Pagado</p>
                                                    <p className="text-sm font-bold text-blue-900 tabular-nums">
                                                        {formatCurrency(selectedPayment.paid_amount || 0)}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-medium text-blue-600 uppercase tracking-wider">Saldo Pendiente</p>
                                                    <p className="text-sm font-bold text-blue-900 tabular-nums">
                                                        {formatCurrency(selectedPayment.balance || 0)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Section 1: Asociación */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                                    Origen y Clasificación
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <Label className="mb-1.5 block">Orden de Servicio</Label>
                                        <SelectERP
                                            value={formData.service_order}
                                            onChange={(val) => setFormData({ ...formData, service_order: val })}
                                            options={serviceOrderOptions}
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                            searchable
                                            clearable
                                            disabled={isLocked}
                                        />
                                        <p className="text-xs text-slate-500 mt-1.5">Opcional para gastos administrativos generales</p>
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">Tipo de Movimiento *</Label>
                                        <SelectERP
                                            value={formData.transfer_type}
                                            onChange={(val) => setFormData({ ...formData, transfer_type: val })}
                                            options={CREATE_TYPE_OPTIONS}
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                            disabled={isLocked}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Detalle */}
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pt-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                                    Detalle Financiero
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <Label className="mb-1.5 block">Proveedor</Label>
                                        <SelectERP
                                            value={formData.provider}
                                            onChange={(val) => setFormData({ ...formData, provider: val })}
                                            options={providerOptions}
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                            searchable
                                            clearable
                                            disabled={isLocked}
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">Beneficiario (Alternativo)</Label>
                                        <Input
                                            value={formData.beneficiary_name}
                                            onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                                            placeholder="Si el cheque/transferencia sale a otro nombre"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="mb-1.5 block">Concepto del Gasto *</Label>
                                        <Input
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Ej: Pago de alquiler bodega diciembre 2025"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">Monto Solicitado *</Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.amount}
                                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                                placeholder="0.00"
                                                className="pl-7 font-mono font-bold text-slate-900"
                                                required
                                                disabled={isLocked}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">Fecha de Operación</Label>
                                        <Input
                                            type="date"
                                            value={formData.transaction_date}
                                            onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                                            disabled={isLocked}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Soporte */}
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" />
                                    Documentación de Soporte
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div>
                                        <Label className="mb-1.5 block">N° Factura / Comprobante (Opcional)</Label>
                                        <Input
                                            value={formData.invoice_number}
                                            onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                                            placeholder="Ej: FAC-001-552"
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block">Adjuntar Archivo</Label>
                                        <FileUpload
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onFileChange={(file) => setFormData({ ...formData, invoice_file: file })}
                                            helperText="PDF, JPG o PNG - Máx. 5MB"
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
                                    disabled={isSubmitting}
                                    className="bg-slate-900 text-white hover:bg-black min-w-[140px] shadow-lg shadow-slate-200 transition-all active:scale-95 mr-0"
                                >
                                    {isSubmitting ? "Procesando..." : selectedPayment ? "Actualizar Movimiento" : "Registrar Movimiento"}
                                </Button>
                            </ModalFooter>
                        </form>
                    );
                })()}
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedPayment(null);
                }}
                title="Detalle de Movimiento"
                size="2xl"
            >
                {selectedPayment && (
                    <div className="space-y-6">
                        {/* Header con monto principal */}
                        <div className="flex items-center justify-between p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700">
                            <div>
                                <p className="text-xs font-medium text-slate-400 mb-1">Monto Total</p>
                                <h2 className="text-3xl font-bold text-white tabular-nums">
                                    {formatCurrency(selectedPayment.amount)}
                                </h2>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <StatusBadge status={selectedPayment.status} />
                                <div className="text-xs text-slate-300">
                                    {formatDate(selectedPayment.transaction_date, { format: "long" })}
                                </div>
                            </div>
                        </div>

                        {/* Grid de información */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Proveedor */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Proveedor / Beneficiario</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                        <Building2 className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">{selectedPayment.provider_name || selectedPayment.beneficiary_name || "—"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Categoría */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Categoría</label>
                                <div className="mt-1">
                                    <TypeBadge type={selectedPayment.transfer_type} />
                                </div>
                            </div>

                            {/* Orden de Servicio */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Orden de Servicio</label>
                                {selectedPayment.service_order_number ? (
                                    <button
                                        onClick={() => navigate(`/service-orders/${selectedPayment.service_order}`)}
                                        className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-slate-900 transition-colors group"
                                    >
                                        <span className="font-mono">{selectedPayment.service_order_number}</span>
                                        <ArrowUpRight className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100" />
                                    </button>
                                ) : (
                                    <p className="text-sm text-slate-500 italic">Gasto Administrativo</p>
                                )}
                            </div>

                            {/* Referencia Fiscal */}
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Referencia Fiscal</label>
                                {selectedPayment.invoice_number ? (
                                    <p className="text-sm font-mono font-semibold text-slate-700">{selectedPayment.invoice_number}</p>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Sin referencia</p>
                                )}
                            </div>
                        </div>

                        {/* Descripción */}
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Concepto</label>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                {selectedPayment.description || "Sin descripción proporcionada"}
                            </p>
                        </div>

                        {/* Archivo adjunto */}
                        {selectedPayment.invoice_file && (
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Archivo Adjunto</label>
                                <button
                                    onClick={() => window.open(selectedPayment.invoice_file, "_blank")}
                                    className="flex items-center gap-3 p-3 bg-white border border-slate-300 rounded-lg hover:border-slate-900 hover:bg-slate-50 transition-all group w-full"
                                >
                                    <div className="p-2 bg-slate-100 text-slate-600 rounded group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="text-left flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-slate-700 truncate">Ver Documento</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {/* Botones de Acción */}
                        <div className="flex items-center justify-end gap-3 mt-6 pt-2">
                            <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>Cerrar</Button>
                            <Button
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    openEditModal(selectedPayment);
                                }}
                                className="bg-slate-900 text-white hover:bg-slate-800"
                            >
                                Editar Movimiento
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Pay Modal */}
            <Modal
                isOpen={isPayModalOpen}
                onClose={() => setIsPayModalOpen(false)}
                title="Registrar Pago"
                size="lg"
            >
                {selectedPayment && (
                    <form onSubmit={handlePaySubmit} className="space-y-6">
                        {/* Resumen del Pago */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                    <Building2 className="w-5 h-5 text-slate-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Proveedor / Beneficiario</p>
                                    <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">
                                        {selectedPayment.provider_name || selectedPayment.beneficiary_name || "—"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Monto a Pagar</p>
                                <p className="text-xl font-bold text-slate-800 tabular-nums tracking-tight">
                                    {formatCurrency(selectedPayment.amount)}
                                </p>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                                Detalle de la Transacción
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <Label className="mb-1.5 block">Método de Pago</Label>
                                    <SelectERP
                                        value={payFormData.payment_method}
                                        onChange={(val) => setPayFormData({ ...payFormData, payment_method: val })}
                                        options={Object.entries(PAYMENT_METHODS).map(([id, name]) => ({ id, name }))}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>

                                <div>
                                    <Label className="mb-1.5 block">Fecha de Pago</Label>
                                    <Input
                                        type="date"
                                        value={payFormData.payment_date}
                                        onChange={(e) => setPayFormData({ ...payFormData, payment_date: e.target.value })}
                                        required
                                    />
                                </div>

                                {payFormData.payment_method !== "efectivo" && (
                                    <div className="sm:col-span-2">
                                        <Label className="mb-1.5 block">Banco de Salida</Label>
                                                                            <SelectERP
                                                                                value={payFormData.bank}
                                                                                onChange={(val) => setPayFormData({ ...payFormData, bank: val })}
                                                                                options={[
                                                                                    { id: "", name: "Seleccionar banco..." },
                                                                                    ...banks.map(b => ({ id: String(b.id), name: b.name }))
                                                                                ]}
                                                                                getOptionLabel={(opt) => opt.name}
                                                                                getOptionValue={(opt) => opt.id}
                                                                            />
                                        
                                    </div>
                                )}

                                <div className="sm:col-span-2">
                                    <Label className="mb-1.5 block">Referencia / N° Cheque</Label>
                                    <Input
                                        value={payFormData.reference}
                                        onChange={(e) => setPayFormData({ ...payFormData, reference: e.target.value })}
                                        placeholder="Ej: Transferencia #123456 o Cheque #001"
                                    />
                                </div>

                                <div className="sm:col-span-2">
                                    <Label className="mb-1.5 block">Comprobante de Pago (Opcional)</Label>
                                    <FileUpload
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onFileChange={(file) => setPayFormData({ ...payFormData, invoice_file: file })}
                                        helperText="Adjuntar comprobante de transferencia o cheque"
                                    />
                                </div>
                            </div>
                        </div>

                        <ModalFooter>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setIsPayModalOpen(false)}
                                className="text-slate-500 font-semibold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[160px]"
                            >
                                {isSubmitting ? "Procesando..." : "Confirmar Pago"}
                            </Button>
                        </ModalFooter>
                    </form>
                )}
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, id: null })}
                title="Confirmar Eliminación"
                description="¿Estás seguro de que deseas eliminar este registro financiero? Esta acción es permanente y afectará los reportes mensuales."
                confirmText="Eliminar Permanentemente"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDelete}
            />
        </div>
    );
}

export default ProviderPayments;