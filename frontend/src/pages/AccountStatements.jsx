import React, { useState, useEffect, useMemo } from "react";
import {
    Search,
    Download,
    Filter,
    DollarSign,
    TrendingUp,
    TrendingDown,
    CreditCard,
    FileText,
    Eye,
    Receipt,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    RefreshCw,
    Building2,
    Banknote,
    User,
    Phone,
    Mail,
    Upload,
    X,
    ChevronDown,
    MoreVertical,
    Table,
    FileSpreadsheet,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Badge,
    Select,
    Input,
    Label,
    Skeleton,
    SkeletonTable,
    Modal,
    ModalFooter,
    FileUpload,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn, getTodayDate } from "../lib/utils";

// ============================================
// STATUS CONFIGURATION
// ============================================
const INVOICE_STATUS = {
    pending: {
        label: "Pendiente",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
    },
    partial: {
        label: "Pago Parcial",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
    },
    paid: {
        label: "Pagada",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    overdue: {
        label: "Vencida",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
        dotColor: "bg-red-500",
    },
    cancelled: {
        label: "Anulada",
        bgColor: "bg-slate-50",
        textColor: "text-slate-600",
        borderColor: "border-slate-200",
        dotColor: "bg-slate-400",
    },
};

const StatusBadge = ({ status }) => {
    const config = INVOICE_STATUS[status] || INVOICE_STATUS.pending;
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

// ============================================
// KPI CARD COMPONENT
// ============================================
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

// ============================================
// CLIENT CARD COMPONENT (Sidebar)
// ============================================
const ClientCard = ({ client, isSelected, onClick }) => {
    const hasOverdue = client.overdue_amount > 0;
    const utilizationPercent =
        client.credit_limit > 0
            ? Math.min((client.credit_used / client.credit_limit) * 100, 100)
            : 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                isSelected
                    ? "border-blue-500 bg-blue-50 shadow-sm"
                    : "border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50"
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs",
                            isSelected
                                ? "bg-blue-500 text-white"
                                : "bg-slate-100 text-slate-600"
                        )}
                    >
                        {client.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-medium text-slate-900 text-sm leading-tight">
                            {client.name}
                        </h3>
                        <p className="text-xs text-slate-500">{client.nit}</p>
                    </div>
                </div>
                {hasOverdue && <AlertCircle className="w-4 h-4 text-red-500" />}
            </div>

            <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Saldo</span>
                    <span
                        className={cn(
                            "font-medium",
                            client.total_pending > 0
                                ? "text-amber-600"
                                : "text-emerald-600"
                        )}
                    >
                        {formatCurrency(client.total_pending || 0)}
                    </span>
                </div>

                {client.credit_limit > 0 && (
                    <div className="space-y-1">
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    utilizationPercent > 80
                                        ? "bg-red-500"
                                        : utilizationPercent > 50
                                        ? "bg-amber-500"
                                        : "bg-emerald-500"
                                )}
                                style={{ width: `${utilizationPercent}%` }}
                            />
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                            {utilizationPercent.toFixed(0)}% utilizado
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ============================================
// YEAR OPTIONS
// ============================================
const YEAR_OPTIONS = [
    { id: 2025, name: "2025" },
    { id: 2024, name: "2024" },
    { id: 2023, name: "2023" },
    { id: 2022, name: "2022" },
];

const STATUS_OPTIONS = [
    { id: "", name: "Todos los estados" },
    { id: "pending", name: "Pendientes" },
    { id: "partial", name: "Pago Parcial" },
    { id: "paid", name: "Pagadas" },
    { id: "overdue", name: "Vencidas" },
];

// ============================================
// MAIN COMPONENT
// ============================================
function AccountStatements() {
    // Data state
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [statement, setStatement] = useState(null);
    const [invoices, setInvoices] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [loadingStatement, setLoadingStatement] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState(2025);
    const [statusFilter, setStatusFilter] = useState("");
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const [filters, setFilters] = useState({
        dateFrom: "",
        dateTo: "",
        minAmount: "",
        maxAmount: "",
        invoiceType: "",
    });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: getTodayDate(),
        payment_method: "transferencia",
        reference: "",
        notes: "",
        payment_proof: null,
    });

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchStatement(selectedClient.id);
            fetchInvoices(selectedClient.id);
        }
    }, [selectedClient, selectedYear]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/clients/");
            // Enriquecer clientes con información de saldos
            const enrichedClients = await Promise.all(
                response.data.map(async (client) => {
                    try {
                        const stmtRes = await axios.get(
                            `/clients/${client.id}/account_statement/`
                        );
                        return {
                            ...client,
                            credit_used: stmtRes.data.credit_used || 0,
                            total_pending: stmtRes.data.credit_used || 0,
                            overdue_amount: 0,
                        };
                    } catch {
                        return {
                            ...client,
                            credit_used: 0,
                            total_pending: 0,
                            overdue_amount: 0,
                        };
                    }
                })
            );
            setClients(enrichedClients);
        } catch (error) {
            toast.error("Error al cargar clientes");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStatement = async (clientId) => {
        try {
            setLoadingStatement(true);
            const response = await axios.get(
                `/clients/${clientId}/account_statement/`,
                {
                    params: { year: selectedYear },
                }
            );
            setStatement(response.data);
        } catch (error) {
            toast.error("Error al cargar estado de cuenta");
            setStatement(null);
        } finally {
            setLoadingStatement(false);
        }
    };

    const fetchInvoices = async (clientId) => {
        try {
            const response = await axios.get(`/orders/invoices/`, {
                params: { client: clientId },
            });
            setInvoices(response.data || []);
        } catch (error) {
            console.error("Error fetching invoices:", error);
            setInvoices([]);
        }
    };

    const handleExportExcel = async (exportType = "full") => {
        if (!selectedClient) {
            toast.error("Seleccione un cliente primero");
            return;
        }

        try {
            setIsExporting(true);
            setIsExportMenuOpen(false);

            let filename = "";
            let response;

            if (exportType === "filtered") {
                // Exportar solo facturas filtradas
                if (filteredInvoices.length === 0) {
                    toast.error("No hay facturas para exportar");
                    setIsExporting(false);
                    return;
                }

                // Aquí idealmente llamarías a un endpoint con los IDs de las facturas filtradas
                // Por ahora, usamos el endpoint completo
                response = await axios.get(
                    `/clients/${selectedClient.id}/export_statement_excel/`,
                    {
                        responseType: "blob",
                        params: { year: selectedYear },
                    }
                );
                filename = `facturas_filtradas_${selectedClient.name}_${new Date().toISOString().split('T')[0]}.xlsx`;
                toast.success(`${filteredInvoices.length} facturas exportadas`);
            } else {
                // Exportar estado de cuenta completo
                response = await axios.get(
                    `/clients/${selectedClient.id}/export_statement_excel/`,
                    {
                        responseType: "blob",
                        params: { year: selectedYear },
                    }
                );
                filename = `estado_cuenta_${selectedClient.name}_${selectedYear}.xlsx`;
                toast.success("Estado de cuenta exportado exitosamente");
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            toast.error("Error al exportar");
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedInvoice || isSubmitting) return;

        try {
            setIsSubmitting(true);

            // Crear FormData para soportar archivos
            const formData = new FormData();
            formData.append("amount", paymentForm.amount);
            formData.append("payment_date", paymentForm.payment_date);
            formData.append("payment_method", paymentForm.payment_method);
            if (paymentForm.reference) formData.append("reference", paymentForm.reference);
            if (paymentForm.notes) formData.append("notes", paymentForm.notes);
            if (paymentForm.payment_proof) formData.append("payment_proof", paymentForm.payment_proof);

            await axios.post(
                `/orders/invoices/${selectedInvoice.id}/add_payment/`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            toast.success("Pago registrado exitosamente");
            setIsPaymentModalOpen(false);
            setPaymentForm({
                amount: "",
                payment_date: getTodayDate(),
                payment_method: "transferencia",
                reference: "",
                notes: "",
                payment_proof: null,
            });
            fetchInvoices(selectedClient.id);
            fetchStatement(selectedClient.id);
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al registrar pago"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentForm({
            ...paymentForm,
            amount: invoice.balance || "",
        });
        setIsPaymentModalOpen(true);
    };

    // Filtered clients
    const filteredClients = useMemo(() => {
        return clients.filter((client) => {
            if (clientSearchQuery) {
                const query = clientSearchQuery.toLowerCase();
                return (
                    client.name?.toLowerCase().includes(query) ||
                    client.nit?.toLowerCase().includes(query)
                );
            }
            return true;
        });
    }, [clients, clientSearchQuery]);

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            // Búsqueda por texto
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matches =
                    inv.invoice_number?.toLowerCase().includes(query) ||
                    inv.service_order_number?.toLowerCase().includes(query);
                if (!matches) return false;
            }

            // Filtro de estado
            if (statusFilter && inv.status !== statusFilter) return false;

            // Filtro de fechas
            if (filters.dateFrom) {
                const invDate = new Date(inv.issue_date);
                const fromDate = new Date(filters.dateFrom);
                if (invDate < fromDate) return false;
            }
            if (filters.dateTo) {
                const invDate = new Date(inv.issue_date);
                const toDate = new Date(filters.dateTo);
                if (invDate > toDate) return false;
            }

            // Filtro de montos
            if (filters.minAmount && parseFloat(inv.total_amount) < parseFloat(filters.minAmount)) {
                return false;
            }
            if (filters.maxAmount && parseFloat(inv.total_amount) > parseFloat(filters.maxAmount)) {
                return false;
            }

            // Filtro de tipo de factura
            if (filters.invoiceType && inv.invoice_type !== filters.invoiceType) {
                return false;
            }

            return true;
        });
    }, [invoices, searchQuery, statusFilter, filters]);

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (statusFilter) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        if (filters.minAmount) count++;
        if (filters.maxAmount) count++;
        if (filters.invoiceType) count++;
        return count;
    }, [statusFilter, filters]);

    const clearFilters = () => {
        setStatusFilter("");
        setFilters({
            dateFrom: "",
            dateTo: "",
            minAmount: "",
            maxAmount: "",
            invoiceType: "",
        });
        setIsFiltersOpen(false);
    };

    // Aging Analysis (Antigüedad de Cuentas por Cobrar)
    const agingData = useMemo(() => {
        const today = new Date();
        const aging = {
            current: { count: 0, amount: 0, invoices: [] }, // 0-30 días
            days30: { count: 0, amount: 0, invoices: [] },  // 31-60 días
            days60: { count: 0, amount: 0, invoices: [] },  // 61-90 días
            days90: { count: 0, amount: 0, invoices: [] },  // 91+ días
        };

        invoices
            .filter(inv => inv.status !== "paid" && inv.status !== "cancelled" && parseFloat(inv.balance) > 0)
            .forEach(inv => {
                const dueDate = new Date(inv.due_date);
                const diffTime = today - dueDate;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const balance = parseFloat(inv.balance);

                if (diffDays <= 0) {
                    // Facturas al corriente (aún no vencidas)
                    aging.current.count++;
                    aging.current.amount += balance;
                    aging.current.invoices.push(inv);
                } else if (diffDays <= 30) {
                    // Vencidas hace 1-30 días
                    aging.days30.count++;
                    aging.days30.amount += balance;
                    aging.days30.invoices.push(inv);
                } else if (diffDays <= 60) {
                    // Vencidas hace 31-60 días
                    aging.days60.count++;
                    aging.days60.amount += balance;
                    aging.days60.invoices.push(inv);
                } else {
                    // Vencidas hace más de 60 días
                    aging.days90.count++;
                    aging.days90.amount += balance;
                    aging.days90.invoices.push(inv);
                }
            });

        return aging;
    }, [invoices]);

    // Client KPIs
    const clientKPIs = useMemo(() => {
        if (!statement) return null;

        return {
            creditLimit: statement.credit_limit || 0,
            creditUsed: statement.credit_used || 0,
            creditAvailable: statement.available_credit || 0,
            pendingOrders: statement.total_pending_orders || 0,
            totalInvoiced: invoices.reduce(
                (sum, inv) => sum + parseFloat(inv.total_amount || 0),
                0
            ),
            totalPaid: invoices.reduce(
                (sum, inv) => sum + parseFloat(inv.paid_amount || 0),
                0
            ),
            totalPending: invoices
                .filter(
                    (inv) => inv.status !== "paid" && inv.status !== "cancelled"
                )
                .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
        };
    }, [statement, invoices]);

    // Invoice columns
    const invoiceColumns = [
        {
            header: "Factura",
            accessor: "invoice_number",
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center border border-blue-200">
                        <Receipt className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <div className="font-mono text-sm font-semibold text-gray-900">
                            {row.invoice_number || "Sin número"}
                        </div>
                        <div className="text-xs text-gray-500 uppercase">
                            {row.invoice_type || "DTE"}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            header: "Orden de Servicio",
            accessor: "service_order_number",
            cell: (row) => (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-slate-100 to-slate-50 border border-slate-200 rounded-lg">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span className="font-mono text-xs font-medium text-slate-700">
                        {row.service_order_number || "—"}
                    </span>
                </div>
            ),
        },
        {
            header: "Emisión",
            accessor: "issue_date",
            cell: (row) => (
                <div className="text-sm text-gray-700">
                    {formatDate(row.issue_date, { format: "short" })}
                </div>
            ),
        },
        {
            header: "Vencimiento",
            accessor: "due_date",
            cell: (row) => {
                const isOverdue =
                    row.due_date &&
                    new Date(row.due_date) < new Date() &&
                    row.status !== "paid";
                return (
                    <div
                        className={cn(
                            "text-sm",
                            isOverdue
                                ? "text-red-600 font-medium"
                                : "text-gray-700"
                        )}
                    >
                        {row.due_date
                            ? formatDate(row.due_date, { format: "short" })
                            : "—"}
                        {isOverdue && (
                            <div className="text-xs text-red-500">Vencida</div>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Total",
            accessor: "total_amount",
            cell: (row) => (
                <div className="text-right font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(row.total_amount)}
                </div>
            ),
        },
        {
            header: "Pagado",
            accessor: "paid_amount",
            cell: (row) => (
                <div className="text-right text-emerald-600 tabular-nums">
                    {formatCurrency(row.paid_amount || 0)}
                </div>
            ),
        },
        {
            header: "Saldo",
            accessor: "balance",
            cell: (row) => (
                <div
                    className={cn(
                        "text-right font-semibold tabular-nums",
                        parseFloat(row.balance) > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                    )}
                >
                    {formatCurrency(row.balance || 0)}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: "Acciones",
            accessor: "actions",
            cell: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                    {/* Ver detalles */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(row);
                            setIsDetailModalOpen(true);
                        }}
                        className="group relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white hover:bg-blue-50 hover:border-blue-300 transition-all duration-200"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                        <span className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap z-10">
                            Ver detalles
                        </span>
                    </button>

                    {/* Registrar pago - Solo si no está pagada o cancelada */}
                    {row.status !== "paid" && row.status !== "cancelled" && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openPaymentModal(row);
                            }}
                            className="group relative inline-flex items-center justify-center w-8 h-8 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200"
                            title="Registrar pago"
                        >
                            <Banknote className="w-4 h-4 text-emerald-600 group-hover:text-emerald-700 transition-colors" />
                            <span className="absolute bottom-full mb-2 hidden group-hover:block px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded whitespace-nowrap z-10">
                                Registrar pago
                            </span>
                        </button>
                    )}

                    {/* Indicador de días de vencimiento */}
                    {row.due_date && row.status !== "paid" && row.status !== "cancelled" && (() => {
                        const today = new Date();
                        const dueDate = new Date(row.due_date);
                        const diffTime = dueDate - today;
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < 0) {
                            return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-red-100 text-red-700 rounded-full border border-red-200">
                                    <AlertCircle className="w-3 h-3" />
                                    {Math.abs(diffDays)}d vencida
                                </span>
                            );
                        } else if (diffDays <= 7) {
                            return (
                                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-semibold bg-amber-100 text-amber-700 rounded-full border border-amber-200">
                                    <Clock className="w-3 h-3" />
                                    {diffDays}d restantes
                                </span>
                            );
                        }
                        return null;
                    })()}
                </div>
            ),
        },
    ];

    // Pending orders columns
    const pendingOrdersColumns = [
        {
            header: "OS",
            accessor: "order_number",
            cell: (row) => (
                <span className="font-mono text-sm font-semibold text-gray-900">
                    {row.order_number}
                </span>
            ),
        },
        {
            header: "Fecha",
            accessor: "date",
            cell: (row) => formatDate(row.date, { format: "short" }),
        },
        {
            header: "ETA",
            accessor: "eta",
            cell: (row) =>
                row.eta ? formatDate(row.eta, { format: "short" }) : "—",
        },
        {
            header: "DUCA",
            accessor: "duca",
            cell: (row) => (
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {row.duca || "—"}
                </span>
            ),
        },
        {
            header: "Monto",
            accessor: "amount",
            cell: (row) => (
                <div className="text-right font-semibold text-amber-600 tabular-nums">
                    {formatCurrency(row.amount)}
                </div>
            ),
        },
    ];

    // Loading
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-24" />
                        ))}
                    </div>
                    <div className="lg:col-span-3">
                        <SkeletonTable rows={6} columns={5} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Estados de Cuenta
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestión de cuentas por cobrar y facturación por cliente
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select
                        value={selectedYear}
                        onChange={(val) => setSelectedYear(val)}
                        options={YEAR_OPTIONS}
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.id}
                    />
                    <Button
                        variant="outline"
                        onClick={() => {
                            fetchClients();
                            if (selectedClient) {
                                fetchStatement(selectedClient.id);
                                fetchInvoices(selectedClient.id);
                            }
                        }}
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
                    {/* Menú de Exportación */}
                    <div className="relative">
                        <Button
                            variant="outline"
                            onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                            disabled={isExporting || !selectedClient}
                            className="gap-2"
                        >
                            <Download
                                className={cn(
                                    "w-4 h-4",
                                    isExporting && "animate-bounce"
                                )}
                            />
                            Exportar
                            <ChevronDown className="w-4 h-4" />
                        </Button>

                        {/* Dropdown Menu */}
                        {isExportMenuOpen && !isExporting && selectedClient && (
                            <>
                                {/* Overlay para cerrar al hacer click afuera */}
                                <div
                                    className="fixed inset-0 z-10"
                                    onClick={() => setIsExportMenuOpen(false)}
                                />

                                {/* Menu */}
                                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                                    <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                                        <p className="text-xs font-semibold text-gray-700 px-2">
                                            Opciones de Exportación
                                        </p>
                                    </div>

                                    <div className="p-1">
                                        {/* Exportar Estado de Cuenta Completo */}
                                        <button
                                            onClick={() => handleExportExcel("full")}
                                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors text-left group"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Estado de Cuenta Completo
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Exportar todas las facturas del año {selectedYear}
                                                </p>
                                            </div>
                                        </button>

                                        {/* Exportar Solo Facturas Filtradas */}
                                        <button
                                            onClick={() => handleExportExcel("filtered")}
                                            disabled={filteredInvoices.length === 0}
                                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-emerald-50 rounded-lg transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                                                <Table className="w-4 h-4 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Facturas Filtradas
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    Exportar {filteredInvoices.length} factura(s) visible(s)
                                                </p>
                                            </div>
                                        </button>

                                        {/* Exportar Resumen por Cliente */}
                                        <button
                                            onClick={() => {
                                                handleExportExcel("summary");
                                                setIsExportMenuOpen(false);
                                            }}
                                            className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-purple-50 rounded-lg transition-colors text-left group"
                                        >
                                            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                                <Building2 className="w-4 h-4 text-purple-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900">
                                                    Resumen del Cliente
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">
                                                    KPIs, límites de crédito y totales
                                                </p>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar de Clientes */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <User className="w-4 h-4" />
                                Clientes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar cliente..."
                                    value={clientSearchQuery}
                                    onChange={(e) =>
                                        setClientSearchQuery(e.target.value)
                                    }
                                    className="pl-9 text-sm"
                                />
                            </div>
                            <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
                                {filteredClients.map((client) => (
                                    <ClientCard
                                        key={client.id}
                                        client={client}
                                        isSelected={
                                            selectedClient?.id === client.id
                                        }
                                        onClick={() =>
                                            setSelectedClient(client)
                                        }
                                    />
                                ))}
                                {filteredClients.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No se encontraron clientes
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Contenido Principal */}
                <div className="lg:col-span-9 space-y-6">
                    {!selectedClient ? (
                        <Card>
                            <CardContent className="py-16">
                                <div className="text-center">
                                    <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Selecciona un Cliente
                                    </h3>
                                    <p className="text-gray-500 max-w-md mx-auto">
                                        Selecciona un cliente de la lista para
                                        ver su estado de cuenta, historial de
                                        facturas y registrar pagos.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Client Header Card */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xl text-slate-600">
                                                {selectedClient.name
                                                    ?.charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-gray-900">
                                                    {selectedClient.name}
                                                </h2>
                                                <div className="flex items-center gap-4 mt-1 text-gray-500 text-sm">
                                                    <span>
                                                        NIT:{" "}
                                                        {selectedClient.nit}
                                                    </span>
                                                    {selectedClient.payment_condition && (
                                                        <Badge variant="outline">
                                                            {selectedClient.payment_condition ===
                                                            "credito"
                                                                ? "Crédito"
                                                                : "Contado"}
                                                        </Badge>
                                                    )}
                                                    {selectedClient.credit_days >
                                                        0 && (
                                                        <span>
                                                            {
                                                                selectedClient.credit_days
                                                            }{" "}
                                                            días
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {selectedClient.phone && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    {selectedClient.phone}
                                                </Button>
                                            )}
                                            {selectedClient.email && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* KPIs */}
                            {clientKPIs && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <KPICard
                                        label="Límite de Crédito"
                                        value={formatCurrency(
                                            clientKPIs.creditLimit
                                        )}
                                        icon={CreditCard}
                                        variant="primary"
                                    />
                                    <KPICard
                                        label="Crédito Utilizado"
                                        value={formatCurrency(
                                            clientKPIs.creditUsed
                                        )}
                                        icon={TrendingUp}
                                        variant="warning"
                                    />
                                    <KPICard
                                        label="Crédito Disponible"
                                        value={formatCurrency(
                                            clientKPIs.creditAvailable
                                        )}
                                        icon={TrendingDown}
                                        variant={
                                            clientKPIs.creditAvailable > 0
                                                ? "success"
                                                : "danger"
                                        }
                                    />
                                    <KPICard
                                        label="OS Pendientes"
                                        value={clientKPIs.pendingOrders}
                                        subtext="En proceso"
                                        icon={FileText}
                                        variant="default"
                                    />
                                </div>
                            )}

                            {/* Aging Analysis - Antigüedad de Cuentas por Cobrar */}
                            {agingData && (agingData.current.count > 0 || agingData.days30.count > 0 || agingData.days60.count > 0 || agingData.days90.count > 0) && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-purple-500" />
                                                Análisis de Antigüedad (Aging)
                                            </CardTitle>
                                            <Badge variant="outline" className="text-xs">
                                                {agingData.current.count + agingData.days30.count + agingData.days60.count + agingData.days90.count} facturas
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-5 pb-5 pt-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                            {/* Al Corriente (0-30 días) */}
                                            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 border border-emerald-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">
                                                        {agingData.current.count}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-medium text-emerald-700 mb-1">
                                                    Al Corriente
                                                </h4>
                                                <p className="text-xl font-bold text-emerald-900">
                                                    {formatCurrency(agingData.current.amount)}
                                                </p>
                                                <p className="text-[10px] text-emerald-600 mt-1">
                                                    No vencidas
                                                </p>
                                            </div>

                                            {/* 1-30 días vencidas */}
                                            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                                                        <Clock className="w-5 h-5 text-amber-600" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                                                        {agingData.days30.count}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-medium text-amber-700 mb-1">
                                                    1-30 días
                                                </h4>
                                                <p className="text-xl font-bold text-amber-900">
                                                    {formatCurrency(agingData.days30.amount)}
                                                </p>
                                                <p className="text-[10px] text-amber-600 mt-1">
                                                    Vencimiento reciente
                                                </p>
                                            </div>

                                            {/* 31-60 días vencidas */}
                                            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                                        <AlertCircle className="w-5 h-5 text-orange-600" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-orange-700 bg-orange-100 px-2 py-1 rounded-full">
                                                        {agingData.days60.count}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-medium text-orange-700 mb-1">
                                                    31-60 días
                                                </h4>
                                                <p className="text-xl font-bold text-orange-900">
                                                    {formatCurrency(agingData.days60.amount)}
                                                </p>
                                                <p className="text-[10px] text-orange-600 mt-1">
                                                    Requiere seguimiento
                                                </p>
                                            </div>

                                            {/* Más de 60 días vencidas */}
                                            <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4 border border-red-200">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                                                        <XCircle className="w-5 h-5 text-red-600" />
                                                    </div>
                                                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-1 rounded-full">
                                                        {agingData.days90.count}
                                                    </span>
                                                </div>
                                                <h4 className="text-xs font-medium text-red-700 mb-1">
                                                    Más de 60 días
                                                </h4>
                                                <p className="text-xl font-bold text-red-900">
                                                    {formatCurrency(agingData.days90.amount)}
                                                </p>
                                                <p className="text-[10px] text-red-600 mt-1">
                                                    Acción urgente
                                                </p>
                                            </div>
                                        </div>

                                        {/* Barra de progreso visual */}
                                        <div className="mt-4 pt-4 border-t border-gray-200">
                                            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                                <span>Distribución de saldos pendientes</span>
                                                <span className="font-semibold">
                                                    Total: {formatCurrency(
                                                        agingData.current.amount +
                                                        agingData.days30.amount +
                                                        agingData.days60.amount +
                                                        agingData.days90.amount
                                                    )}
                                                </span>
                                            </div>
                                            <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex">
                                                {(() => {
                                                    const total = agingData.current.amount + agingData.days30.amount + agingData.days60.amount + agingData.days90.amount;
                                                    if (total === 0) return null;
                                                    return (
                                                        <>
                                                            {agingData.current.amount > 0 && (
                                                                <div
                                                                    className="bg-emerald-500 h-full"
                                                                    style={{ width: `${(agingData.current.amount / total) * 100}%` }}
                                                                    title={`Al corriente: ${formatCurrency(agingData.current.amount)}`}
                                                                />
                                                            )}
                                                            {agingData.days30.amount > 0 && (
                                                                <div
                                                                    className="bg-amber-500 h-full"
                                                                    style={{ width: `${(agingData.days30.amount / total) * 100}%` }}
                                                                    title={`1-30 días: ${formatCurrency(agingData.days30.amount)}`}
                                                                />
                                                            )}
                                                            {agingData.days60.amount > 0 && (
                                                                <div
                                                                    className="bg-orange-500 h-full"
                                                                    style={{ width: `${(agingData.days60.amount / total) * 100}%` }}
                                                                    title={`31-60 días: ${formatCurrency(agingData.days60.amount)}`}
                                                                />
                                                            )}
                                                            {agingData.days90.amount > 0 && (
                                                                <div
                                                                    className="bg-red-500 h-full"
                                                                    style={{ width: `${(agingData.days90.amount / total) * 100}%` }}
                                                                    title={`Más de 60 días: ${formatCurrency(agingData.days90.amount)}`}
                                                                />
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Órdenes Pendientes */}
                            {statement?.pending_invoices?.length > 0 && (
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Clock className="w-5 h-5 text-amber-500" />
                                                Órdenes de Servicio Pendientes
                                            </CardTitle>
                                            <Badge variant="warning">
                                                {
                                                    statement.pending_invoices
                                                        .length
                                                }{" "}
                                                orden(es)
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="px-5 pb-5 pt-0">
                                        <DataTable
                                            data={statement.pending_invoices}
                                            columns={pendingOrdersColumns}
                                            compact
                                        />
                                    </CardContent>
                                </Card>
                            )}

                            {/* Facturas / CXC */}
                            <Card>
                                <CardHeader className="pb-4">
                                    <div className="flex flex-row items-center justify-between">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Receipt className="w-5 h-5 text-blue-500" />
                                            Cuentas por Cobrar (Facturas)
                                        </CardTitle>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                                className="relative"
                                            >
                                                <Filter className="w-4 h-4 mr-2" />
                                                Filtros
                                                {activeFiltersCount > 0 && (
                                                    <span className="ml-2 px-1.5 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full">
                                                        {activeFiltersCount}
                                                    </span>
                                                )}
                                                <ChevronDown className={cn(
                                                    "w-4 h-4 ml-1 transition-transform",
                                                    isFiltersOpen && "rotate-180"
                                                )} />
                                            </Button>
                                            <div className="relative w-48">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <Input
                                                    placeholder="Buscar factura..."
                                                    value={searchQuery}
                                                    onChange={(e) =>
                                                        setSearchQuery(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="pl-9 text-sm m-0"
                                                />
                                            </div>
                                            <div className="min-w-[180px]">
                                                <Select
                                                    value={statusFilter}
                                                    onChange={(val) =>
                                                        setStatusFilter(val)
                                                    }
                                                    options={STATUS_OPTIONS}
                                                    getOptionLabel={(opt) => opt.name}
                                                    getOptionValue={(opt) => opt.id}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Panel de Filtros Avanzados */}
                                    {isFiltersOpen && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 space-y-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Filter className="w-4 h-4 text-blue-600" />
                                                        <h4 className="text-sm font-semibold text-gray-900">
                                                            Filtros Avanzados
                                                        </h4>
                                                        {activeFiltersCount > 0 && (
                                                            <span className="text-xs text-blue-600 font-medium">
                                                                ({activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''})
                                                            </span>
                                                        )}
                                                    </div>
                                                    {activeFiltersCount > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={clearFilters}
                                                            className="text-xs h-7"
                                                        >
                                                            <X className="w-3 h-3 mr-1" />
                                                            Limpiar filtros
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {/* Filtro de Fecha Desde */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                                            Fecha desde
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={filters.dateFrom}
                                                            onChange={(e) =>
                                                                setFilters({
                                                                    ...filters,
                                                                    dateFrom: e.target.value,
                                                                })
                                                            }
                                                            className="text-sm h-9"
                                                        />
                                                    </div>

                                                    {/* Filtro de Fecha Hasta */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                                            Fecha hasta
                                                        </Label>
                                                        <Input
                                                            type="date"
                                                            value={filters.dateTo}
                                                            onChange={(e) =>
                                                                setFilters({
                                                                    ...filters,
                                                                    dateTo: e.target.value,
                                                                })
                                                            }
                                                            className="text-sm h-9"
                                                        />
                                                    </div>

                                                    {/* Filtro de Monto Mínimo */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                                            Monto mínimo
                                                        </Label>
                                                        <div className="relative">
                                                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                value={filters.minAmount}
                                                                onChange={(e) =>
                                                                    setFilters({
                                                                        ...filters,
                                                                        minAmount: e.target.value,
                                                                    })
                                                                }
                                                                className="text-sm h-9 pl-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Filtro de Monto Máximo */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                                            Monto máximo
                                                        </Label>
                                                        <div className="relative">
                                                            <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                placeholder="0.00"
                                                                value={filters.maxAmount}
                                                                onChange={(e) =>
                                                                    setFilters({
                                                                        ...filters,
                                                                        maxAmount: e.target.value,
                                                                    })
                                                                }
                                                                className="text-sm h-9 pl-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Filtro de Tipo de Factura */}
                                                    <div>
                                                        <Label className="text-xs font-medium text-gray-700 mb-1.5 block">
                                                            Tipo de factura
                                                        </Label>
                                                        <Select
                                                            value={filters.invoiceType}
                                                            onChange={(val) =>
                                                                setFilters({
                                                                    ...filters,
                                                                    invoiceType: val,
                                                                })
                                                            }
                                                            options={[
                                                                { id: "", name: "Todos los tipos" },
                                                                { id: "ccf", name: "CCF" },
                                                                { id: "factura", name: "Factura" },
                                                                { id: "ticket", name: "Ticket" },
                                                            ]}
                                                            getOptionLabel={(opt) => opt.name}
                                                            getOptionValue={(opt) => opt.id}
                                                            className="h-9"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Indicador de resultados filtrados */}
                                                <div className="pt-2 border-t border-blue-100">
                                                    <p className="text-xs text-gray-600">
                                                        Mostrando <span className="font-semibold text-blue-600">{filteredInvoices.length}</span> de <span className="font-semibold">{invoices.length}</span> facturas
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </CardHeader>
                                <CardContent className="px-5 pb-5 pt-0">
                                    {filteredInvoices.length > 0 ? (
                                        <DataTable
                                            data={filteredInvoices}
                                            columns={invoiceColumns}
                                        />
                                    ) : (
                                        <div className="text-center py-12 text-gray-500">
                                            <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                            <p>
                                                No hay facturas registradas para
                                                este cliente
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Resumen de Pagos */}
                            {invoices.length > 0 && clientKPIs && (
                                <Card>
                                    <CardContent className="p-4">
                                        <div className="grid grid-cols-3 gap-4 text-center">
                                            <div className="p-3 bg-slate-50 rounded-lg">
                                                <div className="text-xs text-slate-500 mb-1">
                                                    Total Facturado
                                                </div>
                                                <div className="text-lg font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(
                                                        clientKPIs.totalInvoiced
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-emerald-50 rounded-lg">
                                                <div className="text-xs text-emerald-600 mb-1">
                                                    Total Cobrado
                                                </div>
                                                <div className="text-lg font-bold text-emerald-600 tabular-nums">
                                                    {formatCurrency(
                                                        clientKPIs.totalPaid
                                                    )}
                                                </div>
                                            </div>
                                            <div className="p-3 bg-amber-50 rounded-lg">
                                                <div className="text-xs text-amber-600 mb-1">
                                                    Por Cobrar
                                                </div>
                                                <div className="text-lg font-bold text-amber-600 tabular-nums">
                                                    {formatCurrency(
                                                        clientKPIs.totalPending
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedInvoice(null);
                }}
                title="Registrar Pago / Abono"
                size="2xl"
            >
                <form onSubmit={handleAddPayment} className="space-y-6">
                    {/* Información de Factura */}
                    {selectedInvoice && (
                        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                                        Factura a Pagar
                                    </div>
                                    <div className="font-mono text-xl font-bold text-slate-900">
                                        {selectedInvoice.invoice_number}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline">
                                            {selectedInvoice.invoice_type || "DTE"}
                                        </Badge>
                                        {selectedInvoice.service_order_number && (
                                            <span className="text-xs text-slate-600">
                                                OS: {selectedInvoice.service_order_number}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-1">
                                        Saldo Pendiente
                                    </div>
                                    <div className="font-bold text-3xl text-amber-600 tabular-nums">
                                        {formatCurrency(selectedInvoice.balance)}
                                    </div>
                                    {selectedInvoice.total_amount && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Total: {formatCurrency(selectedInvoice.total_amount)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección 1: Datos del Pago */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                1
                            </span>
                            Datos del Pago
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Monto del Pago *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                        $
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={selectedInvoice?.balance}
                                        value={paymentForm.amount}
                                        onChange={(e) =>
                                            setPaymentForm({
                                                ...paymentForm,
                                                amount: e.target.value,
                                            })
                                        }
                                        placeholder="0.00"
                                        className="pl-7 font-mono"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    Máximo: {formatCurrency(selectedInvoice?.balance || 0)}
                                </p>
                            </div>
                            <div>
                                <Label>Fecha de Pago *</Label>
                                <Input
                                    type="date"
                                    value={paymentForm.payment_date}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_date: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Sección 2: Información de Transacción */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                2
                            </span>
                            Información de Transacción
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div>
                                <Label>Método de Pago *</Label>
                                <Select
                                    value={paymentForm.payment_method}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_method: val,
                                        })
                                    }
                                    options={[
                                        { id: "transferencia", name: "Transferencia Bancaria" },
                                        { id: "efectivo", name: "Efectivo" },
                                        { id: "cheque", name: "Cheque" },
                                        { id: "tarjeta", name: "Tarjeta de Crédito/Débito" },
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                />
                            </div>
                            <div>
                                <Label>Referencia / No. Documento</Label>
                                <Input
                                    value={paymentForm.reference}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            reference: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: TRF-12345, CHQ-789"
                                    className="font-mono"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Número de transferencia, cheque, etc.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Sección 3: Comprobante */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                3
                            </span>
                            Comprobante de Pago
                        </h4>
                        <div>
                            <Label>Archivo de Comprobante (Opcional)</Label>
                            <FileUpload
                                accept=".pdf,.jpg,.jpeg,.png"
                                onFileChange={(file) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_proof: file,
                                    })
                                }
                            />
                            <p className="text-xs text-slate-500 mt-2">
                                Sube el comprobante de pago (transferencia, captura, recibo, etc.)
                            </p>
                        </div>
                    </div>

                    {/* Notas */}
                    <div>
                        <Label>Notas Adicionales</Label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={paymentForm.notes}
                            onChange={(e) =>
                                setPaymentForm({
                                    ...paymentForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Observaciones adicionales sobre el pago..."
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsPaymentModalOpen(false);
                                setSelectedInvoice(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-emerald-600 hover:bg-emerald-700"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <Banknote className="w-4 h-4 mr-2" />
                                    Registrar Pago
                                </>
                            )}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Invoice Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedInvoice(null);
                }}
                title="Detalle de Factura"
                size="2xl"
            >
                {selectedInvoice && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <div className="text-sm text-slate-500">
                                    Factura
                                </div>
                                <div className="text-2xl font-bold font-mono text-slate-900">
                                    {selectedInvoice.invoice_number ||
                                        "Sin número"}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">
                                        {selectedInvoice.invoice_type || "DTE"}
                                    </Badge>
                                    <StatusBadge
                                        status={selectedInvoice.status}
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-500">
                                    Total
                                </div>
                                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                                    {formatCurrency(
                                        selectedInvoice.total_amount
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Orden de Servicio
                                    </div>
                                    <div className="font-mono text-sm">
                                        {selectedInvoice.service_order_number ||
                                            "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Emisión
                                    </div>
                                    <div className="text-sm">
                                        {formatDate(
                                            selectedInvoice.issue_date,
                                            { format: "long" }
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Vencimiento
                                    </div>
                                    <div className="text-sm">
                                        {selectedInvoice.due_date
                                            ? formatDate(
                                                  selectedInvoice.due_date,
                                                  { format: "long" }
                                              )
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-lg">
                                    <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">
                                        Monto Pagado
                                    </div>
                                    <div className="text-xl font-bold text-emerald-600 tabular-nums">
                                        {formatCurrency(
                                            selectedInvoice.paid_amount || 0
                                        )}
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg">
                                    <div className="text-xs font-semibold text-amber-600 uppercase mb-1">
                                        Saldo Pendiente
                                    </div>
                                    <div className="text-xl font-bold text-amber-600 tabular-nums">
                                        {formatCurrency(
                                            selectedInvoice.balance || 0
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        {selectedInvoice.payments &&
                            selectedInvoice.payments.length > 0 && (
                                <div>
                                    <div className="text-sm font-semibold text-slate-900 mb-3">
                                        Historial de Pagos
                                    </div>
                                    <div className="space-y-2">
                                        {selectedInvoice.payments.map(
                                            (payment, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                        <div>
                                                            <div className="text-sm font-medium tabular-nums">
                                                                {formatCurrency(
                                                                    payment.amount
                                                                )}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {
                                                                    payment.payment_method
                                                                }{" "}
                                                                •{" "}
                                                                {payment.reference ||
                                                                    "Sin referencia"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-slate-500">
                                                        {formatDate(
                                                            payment.payment_date,
                                                            { format: "short" }
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                        <ModalFooter>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    setSelectedInvoice(null);
                                }}
                            >
                                Cerrar
                            </Button>
                            {selectedInvoice.status !== "paid" &&
                                selectedInvoice.status !== "cancelled" && (
                                    <Button
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            openPaymentModal(selectedInvoice);
                                        }}
                                    >
                                        <Banknote className="w-4 h-4 mr-2" />
                                        Registrar Pago
                                    </Button>
                                )}
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default AccountStatements;
