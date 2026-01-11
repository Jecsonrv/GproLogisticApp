import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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
    Edit2,
    Trash2,
    FileMinus,
    ArrowUpRight,
    ExternalLink,
    ListChecks,
    Truck,
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
import ExportButton from "../components/ui/ExportButton";
import PaymentItemsModal from "../components/PaymentItemsModal";
import PaymentDetailModal from "../components/PaymentDetailModal";
import CreditNoteModal from "../components/CreditNoteModal";
import InvoiceItemsEditor from "../components/InvoiceItemsEditor";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn } from "../lib/utils";

// ============================================
// HELPERS
// ============================================
const formatDateSafe = (dateStr, variant = "short") => {
    if (!dateStr) return "—";
    try {
        // Asegurar que solo tomamos la parte de la fecha YYYY-MM-DD
        const dateOnly = String(dateStr).split("T")[0];
        const parts = dateOnly.split("-");
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            // Meses en JS son 0-11
            const dateObj = new Date(year, month - 1, day);
            const options =
                variant === "long"
                    ? { day: "2-digit", month: "long", year: "numeric" }
                    : { day: "2-digit", month: "short", year: "numeric" };
            return dateObj.toLocaleDateString("es-SV", options);
        }
        return formatDate(dateStr, { format: variant });
    } catch {
        return dateStr;
    }
};

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
        textColor: "text-blue-800",
        borderColor: "border-blue-300",
        dotColor: "bg-blue-600",
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

// ============================================
// CLIENT CARD COMPONENT (Sidebar)
// ============================================
const ClientCard = ({ client, isSelected, onClick }) => {
    const hasOverdue = client.overdue_amount > 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-3 rounded-lg border cursor-pointer transition-all",
                isSelected
                    ? "border-slate-300 bg-slate-50 shadow-sm"
                    : "border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50"
            )}
        >
            <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div
                        className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-xs border",
                            isSelected
                                ? "bg-slate-100 text-slate-700 border-slate-300"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                        )}
                    >
                        {client.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 text-sm leading-tight truncate">
                            {client.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                            {client.nit}
                        </p>
                    </div>
                </div>
                {hasOverdue && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    </div>
                )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Saldo pendiente</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(client.total_pending || 0)}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ============================================
// YEAR OPTIONS
// ============================================
const YEAR_OPTIONS = [
    { id: "", name: "Todo el tiempo" },
    { id: 2026, name: "2026" },
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
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientIdFromUrl = searchParams.get("client");

    // Data state
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [statement, setStatement] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [banks, setBanks] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [clientSearchQuery, setClientSearchQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState("");
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({
        dateFrom: "",
        dateTo: "",
        minAmount: "",
        maxAmount: "",
        invoiceType: "",
    });
    const [isPaymentItemsModalOpen, setIsPaymentItemsModalOpen] =
        useState(false);
    const [isPaymentDetailModalOpen, setIsPaymentDetailModalOpen] =
        useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
    });
    const [deletePaymentConfirm, setDeletePaymentConfirm] = useState(null); // {id, amount}

    const clearFilters = () => {
        setStatusFilter("");
        setFilters({
            dateFrom: "",
            dateTo: "",
            minAmount: "",
            maxAmount: "",
            invoiceType: "",
        });
        setSearchQuery("");
    };

    useEffect(() => {
        fetchClients();
        fetchBanks();
    }, []);

    // Auto-select client from URL params
    useEffect(() => {
        if (clientIdFromUrl && clients.length > 0 && !selectedClient) {
            const clientFromUrl = clients.find(
                (c) => c.id === parseInt(clientIdFromUrl)
            );
            if (clientFromUrl) {
                setSelectedClient(clientFromUrl);
            }
        }
    }, [clientIdFromUrl, clients, selectedClient]);

    useEffect(() => {
        if (selectedClient) {
            fetchStatement(selectedClient.id);
            fetchInvoices(selectedClient.id);
        }
        // fetchStatement deliberately omitted from deps to avoid recreating requests each render
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        } catch {
            toast.error("Error al cargar clientes");
        } finally {
            setLoading(false);
        }
    };

    const fetchBanks = async () => {
        try {
            const response = await axios.get("/catalogs/banks/");
            setBanks(response.data);
        } catch {
            toast.error("Error al cargar bancos");
        }
    };

    const fetchStatement = async (clientId) => {
        try {
            const response = await axios.get(
                `/clients/${clientId}/account_statement/`,
                {
                    params: { year: selectedYear },
                }
            );
            setStatement(response.data);
        } catch {
            toast.error("Error al cargar estado de cuenta");
            setStatement(null);
        }
    };

    const fetchInvoices = async (clientId) => {
        try {
            const response = await axios.get(`/orders/invoices/`, {
                params: { client: clientId },
            });
            setInvoices(response.data || []);
        } catch {
            setInvoices([]);
        }
    };

    const fetchInvoiceDetails = async (invoiceId) => {
        try {
            const response = await axios.get(`/orders/invoices/${invoiceId}/`);
            setSelectedInvoice(response.data);
        } catch {
            toast.error("Error al cargar detalle de factura");
        }
    };

    const handleExportExcel = async (exportType = "full") => {
        if (!selectedClient) {
            toast.error("Seleccione un cliente primero");
            return;
        }

        try {
            setIsExporting(true);

            let filename = "";
            let response;

            if (exportType === "filtered") {
                // Exportar solo facturas filtradas
                if (filteredInvoices.length === 0) {
                    toast.error("No hay facturas para exportar");
                    setIsExporting(false);
                    return;
                }

                const params = {
                    year: selectedYear,
                    status: statusFilter,
                    search: searchQuery,
                    ...filters,
                };

                response = await axios.get(
                    `/clients/${selectedClient.id}/export_statement_excel/`,
                    {
                        responseType: "blob",
                        params: params,
                    }
                );
                filename = `facturas_filtradas_${selectedClient.name}_${
                    new Date().toISOString().split("T")[0]
                }.xlsx`;
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

    const openPaymentItemsModal = (invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentItemsModalOpen(true);
    };

    const handlePaymentItemsSuccess = () => {
        if (selectedClient) {
            fetchInvoices(selectedClient.id);
            fetchStatement(selectedClient.id);
        }
        // Si el modal de detalle está abierto, actualizar los datos
        if (isDetailModalOpen && selectedInvoice) {
            fetchInvoiceDetails(selectedInvoice.id);
        }
    };

    const handleDeleteInvoice = async () => {
        if (!deleteConfirm.id) return;

        try {
            await axios.delete(`/orders/invoices/${deleteConfirm.id}/`);
            toast.success("Factura eliminada correctamente");
            if (selectedClient) {
                fetchInvoices(selectedClient.id);
                fetchStatement(selectedClient.id);
            }
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setDeleteConfirm({ open: false, id: null });
        }
    };

    const handleDeletePayment = async (paymentId) => {
        try {
            await axios.delete(`/orders/invoice-payments/${paymentId}/`);
            toast.success("Pago eliminado correctamente");
            if (selectedClient) {
                fetchInvoices(selectedClient.id);
                fetchStatement(selectedClient.id);
            }
            // Actualizar el detalle si está abierto
            if (isDetailModalOpen && selectedInvoice) {
                fetchInvoiceDetails(selectedInvoice.id);
            }
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setDeletePaymentConfirm(null);
        }
    };

    // Filtered clients
    const filteredClients = useMemo(() => {
        if (!clientSearchQuery) return clients;
        const query = clientSearchQuery.toLowerCase();
        return clients.filter((client) => {
            return (
                client.name?.toLowerCase().includes(query) ||
                client.commercial_name?.toLowerCase().includes(query) ||
                client.nit?.toLowerCase().includes(query)
            );
        });
    }, [clients, clientSearchQuery]);

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((inv) => {
            // Filtro por año (Permitir facturas de otros años si tienen saldo pendiente)
            if (selectedYear) {
                const invDate = new Date(inv.issue_date);
                const isSameYear = invDate.getFullYear() === selectedYear;
                const hasBalance = parseFloat(inv.balance || 0) > 0.01;
                
                if (!isSameYear && !hasBalance) return false;
            }

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
            if (
                filters.minAmount &&
                parseFloat(inv.total_amount) < parseFloat(filters.minAmount)
            ) {
                return false;
            }
            if (
                filters.maxAmount &&
                parseFloat(inv.total_amount) > parseFloat(filters.maxAmount)
            ) {
                return false;
            }

            // Filtro de tipo de factura
            if (
                filters.invoiceType &&
                inv.invoice_type !== filters.invoiceType
            ) {
                return false;
            }

            return true;
        });
    }, [invoices, searchQuery, statusFilter, filters, selectedYear]);

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
            sortable: false,
            cell: (row) => (
                <div className="flex items-center gap-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center border border-slate-200">
                        <Receipt className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <div className="font-mono text-xs font-bold text-slate-900">
                            {row.invoice_number || "Sin número"}
                        </div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                            {row.invoice_type || "DTE"}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            header: "Orden de Servicio",
            accessor: "service_order_number",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col">
                    {row.service_order ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                    `/service-orders/${row.service_order}`
                                );
                            }}
                            className="font-mono text-[11px] font-bold text-slate-700 hover:text-slate-900 hover:underline text-left w-fit flex items-center gap-1"
                        >
                            {row.service_order_number}
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                    ) : (
                        <span className="font-mono text-[11px] text-slate-400 italic">
                            —
                        </span>
                    )}
                    <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                        {formatDateSafe(row.issue_date)}
                    </span>
                </div>
            ),
        },
        {
            header: "Vencimiento",
            accessor: "due_date",
            sortable: false,
            cell: (row) => {
                let isOverdue = false;
                let formattedDueDate = "-";

                if (row.due_date) {
                    // Parseo seguro sin timezone shift
                    const [year, month, day] = row.due_date
                        .split("-")
                        .map(Number);
                    const dueDateObj = new Date(year, month - 1, day);

                    // Formateo para display
                    formattedDueDate = formatDateSafe(row.due_date);

                    // Lógica de vencimiento (comparar con hoy sin horas)
                    if (row.status !== "paid") {
                        const now = new Date();
                        const today = new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate()
                        );
                        isOverdue = dueDateObj < today;
                    }
                }

                return (
                    <div className="py-1">
                        {row.due_date ? (
                            <>
                                <div
                                    className={cn(
                                        "text-[11px] font-semibold tabular-nums",
                                        isOverdue
                                            ? "text-red-600"
                                            : "text-slate-500"
                                    )}
                                >
                                    {formattedDueDate}
                                </div>
                                {isOverdue && (
                                    <div className="text-[9px] text-red-600 font-bold uppercase tracking-tight">
                                        {row.days_overdue === 1
                                            ? "Venció ayer"
                                            : `${row.days_overdue}d vencida`}
                                    </div>
                                )}
                            </>
                        ) : (
                            <span className="text-[10px] text-slate-400 font-medium italic">
                                Sin fecha
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Total",
            accessor: "total_amount",
            className: "text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="font-semibold text-slate-900 tabular-nums text-sm tracking-tight py-1">
                    {formatCurrency(row.total_amount)}
                </div>
            ),
        },
        {
            header: "Pagado",
            accessor: "paid_amount",
            className: "text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="text-emerald-700 tabular-nums font-medium text-sm tracking-tight py-1">
                    {formatCurrency(row.paid_amount || 0)}
                </div>
            ),
        },
        {
            header: "Saldo",
            accessor: "balance",
            className: "text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div
                    className={cn(
                        "font-bold tabular-nums text-sm tracking-tight py-1",
                        parseFloat(row.balance) > 0.01
                            ? "text-slate-900"
                            : "text-emerald-600"
                    )}
                >
                    {parseFloat(row.balance) > 0.01 ? (
                        formatCurrency(row.balance)
                    ) : (
                        <span className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> $0.00
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            sortable: false,
            cell: (row) => <StatusBadge status={row.status} />,
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[170px] text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="grid grid-cols-5 gap-1 w-full max-w-[150px] mx-auto">
                    <div className="flex justify-center">
                        {row.pdf_file ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(row.pdf_file, "_blank");
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
                                title="Ver PDF"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
                    <div className="flex justify-center">
                        {row.status !== "paid" && row.status !== "cancelled" ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openPaymentItemsModal(row);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Pago por Items (detallado)"
                            >
                                <ListChecks className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoice(row);
                                setIsDetailModalOpen(true);
                                fetchInvoiceDetails(row.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Ver detalles"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        {row.status !== "paid" ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({
                                        open: true,
                                        id: row.id,
                                    });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
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
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/service-orders/${row.id}`);
                    }}
                    className="font-mono text-sm font-semibold text-slate-900 hover:text-slate-700 hover:underline"
                >
                    {row.order_number}
                </button>
            ),
        },
        {
            header: "Fecha",
            accessor: "date",
            cell: (row) => formatDateSafe(row.date),
        },
        {
            header: "ETA",
            accessor: "eta",
            cell: (row) => (row.eta ? formatDateSafe(row.eta) : "—"),
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
                {/* Header Skeleton */}
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-9 w-40" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar Skeleton */}
                    <div className="lg:col-span-3 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton
                                    key={i}
                                    className="h-16 w-full rounded-lg"
                                />
                            ))}
                        </div>
                    </div>

                    {/* Main Content Skeleton */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Client Header Card */}
                        <Skeleton className="h-32 w-full rounded-xl" />

                        {/* KPIs */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[1, 2, 3, 4].map((i) => (
                                <Skeleton key={i} className="h-24 rounded-xl" />
                            ))}
                        </div>

                        {/* Aging Analysis */}
                        <div className="space-y-4">
                            <Skeleton className="h-6 w-40" />
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Skeleton
                                        key={i}
                                        className="h-20 rounded-lg"
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Invoices Table */}
                        <SkeletonTable rows={6} columns={7} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-end gap-2">
                <SelectERP
                    value={selectedYear}
                    onChange={(val) => setSelectedYear(val)}
                    options={YEAR_OPTIONS}
                    getOptionLabel={(opt) => opt.name}
                    getOptionValue={(opt) => opt.id}
                    size="sm"
                    className="w-24"
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
                <ExportButton
                    onExportAll={() => handleExportExcel("full")}
                    onExportFiltered={() => handleExportExcel("filtered")}
                    filteredCount={filteredInvoices.length}
                    totalCount={invoices.length}
                    isExporting={isExporting}
                    disabled={!selectedClient}
                    allLabel="Estado de Cuenta Completo"
                    allDescription={`Exportar todas las facturas del año ${selectedYear}`}
                    filteredLabel="Facturas Filtradas"
                    filteredDescription="Exportar solo las facturas visibles actualmente"
                />
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
                                <CardContent className="p-5">
                                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-12 h-12 rounded-lg bg-slate-50 border-2 border-slate-200 flex items-center justify-center font-semibold text-lg text-slate-700">
                                                {selectedClient.name
                                                    ?.charAt(0)
                                                    .toUpperCase()}
                                            </div>
                                            <div>
                                                <h2 className="text-lg font-semibold text-slate-900">
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
                                                    onClick={() =>
                                                        window.open(
                                                            `tel:${selectedClient.phone}`
                                                        )
                                                    }
                                                >
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    {selectedClient.phone}
                                                </Button>
                                            )}
                                            {selectedClient.email && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        window.open(
                                                            `mailto:${selectedClient.email}`
                                                        )
                                                    }
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
                                        label="Total Facturado"
                                        value={formatCurrency(
                                            clientKPIs.totalInvoiced
                                        )}
                                        icon={FileText}
                                        variant="primary"
                                    />
                                    <KPICard
                                        label="Total Cobrado"
                                        value={formatCurrency(
                                            clientKPIs.totalPaid
                                        )}
                                        icon={CheckCircle2}
                                        variant="success"
                                    />
                                    <KPICard
                                        label="Saldo Pendiente"
                                        value={formatCurrency(
                                            clientKPIs.totalPending
                                        )}
                                        icon={TrendingUp}
                                        variant={
                                            clientKPIs.totalPending > 0
                                                ? "warning"
                                                : "default"
                                        }
                                    />
                                    <KPICard
                                        label="OS Pendientes"
                                        value={clientKPIs.pendingOrders}
                                        subtext="En proceso"
                                        icon={Clock}
                                        variant="default"
                                    />
                                </div>
                            )}

                            {/* Aging Analysis */}
                            {statement?.aging && (
                                <Card className="border-slate-200 shadow-sm">
                                    <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
                                        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-slate-500" />
                                            Antigüedad de Saldos
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                            {/* Current */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                        Corriente
                                                    </span>
                                                </div>
                                                <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(
                                                        statement.aging.current
                                                    )}
                                                </div>
                                            </div>
                                            {/* 1-30 */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                        1-30 Días
                                                    </span>
                                                </div>
                                                <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(
                                                        statement.aging["1-30"]
                                                    )}
                                                </div>
                                            </div>
                                            {/* 31-60 */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                        31-60 Días
                                                    </span>
                                                </div>
                                                <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(
                                                        statement.aging["31-60"]
                                                    )}
                                                </div>
                                            </div>
                                            {/* 61-90 */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                        61-90 Días
                                                    </span>
                                                </div>
                                                <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(
                                                        statement.aging["61-90"]
                                                    )}
                                                </div>
                                            </div>
                                            {/* 90+ */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                                        +90 Días
                                                    </span>
                                                </div>
                                                <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(
                                                        statement.aging["90+"]
                                                    )}
                                                </div>
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
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-2 flex-1 max-w-lg">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <Input
                                                    placeholder="Buscar por factura, orden de servicio..."
                                                    value={searchQuery}
                                                    onChange={(e) =>
                                                        setSearchQuery(
                                                            e.target.value
                                                        )
                                                    }
                                                    className="pl-9"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() =>
                                                    setIsFiltersOpen(
                                                        !isFiltersOpen
                                                    )
                                                }
                                                className={cn(
                                                    isFiltersOpen &&
                                                        "bg-slate-100"
                                                )}
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
                                        <div className="min-w-[180px]">
                                            <SelectERP
                                                value={statusFilter}
                                                onChange={(val) =>
                                                    setStatusFilter(val)
                                                }
                                                options={STATUS_OPTIONS}
                                                getOptionLabel={(opt) =>
                                                    opt.name
                                                }
                                                getOptionValue={(opt) => opt.id}
                                                clearable
                                                placeholder="Estado"
                                                size="sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Panel de Filtros Avanzados */}
                                    {isFiltersOpen && (
                                        <div className="pt-4 border-t border-gray-200">
                                            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-4 space-y-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Filter className="w-4 h-4 text-slate-700" />
                                                        <h4 className="text-sm font-semibold text-gray-900">
                                                            Filtros Avanzados
                                                        </h4>
                                                        {activeFiltersCount >
                                                            0 && (
                                                            <span className="text-xs text-slate-700 font-medium">
                                                                (
                                                                {
                                                                    activeFiltersCount
                                                                }{" "}
                                                                activo
                                                                {activeFiltersCount >
                                                                1
                                                                    ? "s"
                                                                    : ""}
                                                                )
                                                            </span>
                                                        )}
                                                    </div>
                                                    {activeFiltersCount > 0 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={
                                                                clearFilters
                                                            }
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
                                                            value={
                                                                filters.dateFrom
                                                            }
                                                            onChange={(e) =>
                                                                setFilters({
                                                                    ...filters,
                                                                    dateFrom:
                                                                        e.target
                                                                            .value,
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
                                                            value={
                                                                filters.dateTo
                                                            }
                                                            onChange={(e) =>
                                                                setFilters({
                                                                    ...filters,
                                                                    dateTo: e
                                                                        .target
                                                                        .value,
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
                                                                value={
                                                                    filters.minAmount
                                                                }
                                                                onChange={(e) =>
                                                                    setFilters({
                                                                        ...filters,
                                                                        minAmount:
                                                                            e
                                                                                .target
                                                                                .value,
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
                                                                value={
                                                                    filters.maxAmount
                                                                }
                                                                onChange={(e) =>
                                                                    setFilters({
                                                                        ...filters,
                                                                        maxAmount:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    })
                                                                }
                                                                className="text-sm h-9 pl-8"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Filtro de Tipo de Factura */}
                                                    <div>
                                                        <SelectERP
                                                            label="Tipo de factura"
                                                            value={
                                                                filters.invoiceType
                                                            }
                                                            onChange={(val) =>
                                                                setFilters({
                                                                    ...filters,
                                                                    invoiceType:
                                                                        val,
                                                                })
                                                            }
                                                            options={[
                                                                {
                                                                    id: "",
                                                                    name: "Todos los tipos",
                                                                },
                                                                {
                                                                    id: "ccf",
                                                                    name: "CCF",
                                                                },
                                                                {
                                                                    id: "factura",
                                                                    name: "Factura",
                                                                },
                                                                {
                                                                    id: "ticket",
                                                                    name: "Ticket",
                                                                },
                                                            ]}
                                                            getOptionLabel={(
                                                                opt
                                                            ) => opt.name}
                                                            getOptionValue={(
                                                                opt
                                                            ) => opt.id}
                                                            clearable
                                                            size="sm"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Indicador de resultados filtrados */}
                                                <div className="pt-2 border-t border-slate-200">
                                                    <p className="text-xs text-gray-600">
                                                        Mostrando{" "}
                                                        <span className="font-semibold text-slate-700">
                                                            {
                                                                filteredInvoices.length
                                                            }
                                                        </span>{" "}
                                                        de{" "}
                                                        <span className="font-semibold">
                                                            {invoices.length}
                                                        </span>{" "}
                                                        facturas
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
                                            searchable={false}
                                            searchPlaceholder="Buscar por factura, OS..."
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

                            {/* Resumen de Pagos - Removed */}
                        </>
                    )}
                </div>
            </div>

            {/* Credit Note Modal - Componente Profesional Reutilizable */}
            <CreditNoteModal
                isOpen={isCreditNoteModalOpen}
                onClose={() => {
                    setIsCreditNoteModalOpen(false);
                    setSelectedInvoice(null);
                }}
                invoice={selectedInvoice}
                onSuccess={() => {
                    // Refrescar datos después de crear NC
                    if (selectedClient?.id) {
                        fetchInvoices(selectedClient.id);
                        fetchStatement(selectedClient.id);
                    }
                    if (isDetailModalOpen && selectedInvoice?.id) {
                        fetchInvoiceDetails(selectedInvoice.id);
                    }
                }}
            />

            {/* Invoice Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedInvoice(null);
                }}
                title={`Detalle de Factura: ${
                    selectedInvoice?.invoice_number || ""
                }`}
                size="4xl"
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
                                <div className="text-2xl font-semibold text-slate-700 tabular-nums">
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
                                    {selectedInvoice.service_order_id ? (
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/service-orders/${selectedInvoice.service_order_id}`
                                                )
                                            }
                                            className="font-mono text-sm text-blue-700 hover:text-blue-900 hover:underline transition-colors flex items-center gap-1 group"
                                        >
                                            {selectedInvoice.service_order_number ||
                                                "—"}
                                            <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </button>
                                    ) : (
                                        <div className="font-mono text-sm">
                                            {selectedInvoice.service_order_number ||
                                                "—"}
                                        </div>
                                    )}
                                    {selectedInvoice.purchase_order && (
                                        <div className="mt-1 flex items-center gap-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">PO:</span>
                                            <span className="font-mono text-xs text-slate-600">{selectedInvoice.purchase_order}</span>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Emisión
                                    </div>
                                    <div className="text-sm">
                                        {formatDateSafe(
                                            selectedInvoice.issue_date,
                                            "long"
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Vencimiento
                                    </div>
                                    <div className="text-sm">
                                        {selectedInvoice.due_date
                                            ? formatDateSafe(
                                                  selectedInvoice.due_date,
                                                  "long"
                                              )
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                        Monto Pagado
                                    </div>
                                    <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                        {formatCurrency(
                                            selectedInvoice.paid_amount || 0
                                        )}
                                    </div>
                                </div>
                                {parseFloat(
                                    selectedInvoice.credited_amount || 0
                                ) > 0 && (
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                            Notas de Crédito
                                        </div>
                                        <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                            {formatCurrency(
                                                selectedInvoice.credited_amount ||
                                                    0
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                        Saldo Pendiente
                                    </div>
                                    <div
                                        className={cn(
                                            "text-xl font-bold tabular-nums",
                                            parseFloat(
                                                selectedInvoice.balance
                                            ) > 0
                                                ? "text-red-600"
                                                : "text-slate-900"
                                        )}
                                    >
                                        {formatCurrency(
                                            selectedInvoice.balance || 0
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Datos Fiscales DTE */}
                        {(selectedInvoice.generation_code || selectedInvoice.reception_stamp) && (
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    Datos Fiscales (DTE)
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedInvoice.generation_code && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Código de Generación</p>
                                            <p className="font-mono text-sm font-medium text-slate-700 select-all">
                                                {selectedInvoice.generation_code}
                                            </p>
                                        </div>
                                    )}
                                    {selectedInvoice.reception_stamp && (
                                        <div>
                                            <p className="text-xs text-slate-500 mb-0.5">Sello de Recepción</p>
                                            <p className="font-mono text-sm font-medium text-slate-700 select-all">
                                                {selectedInvoice.reception_stamp}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t border-slate-200">
                            <InvoiceItemsEditor
                                invoice={{
                                    ...selectedInvoice,
                                    billed_charges:
                                        selectedInvoice.billed_charges ||
                                        selectedInvoice.charges ||
                                        [],
                                    billed_expenses:
                                        selectedInvoice.billed_expenses ||
                                        selectedInvoice.billed_transfers ||
                                        [],
                                }}
                                onUpdate={() => {
                                    if (selectedClient) {
                                        fetchInvoices(selectedClient.id);
                                        fetchStatement(selectedClient.id);
                                    }
                                    if (selectedInvoice?.id) {
                                        fetchInvoiceDetails(selectedInvoice.id);
                                    }
                                }}
                                onPaymentClick={(payment) => {
                                    setSelectedPayment(payment);
                                    setIsPaymentDetailModalOpen(true);
                                }}
                            />
                        </div>
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
                                        variant="outline"
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            openPaymentItemsModal(
                                                selectedInvoice
                                            );
                                        }}
                                    >
                                        <ListChecks className="w-4 h-4 mr-2" />
                                        Pago por Items
                                    </Button>
                                )}
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
                title="Eliminar Factura"
                description="¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer y eliminará todos los pagos asociados."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDeleteInvoice}
            />

            {/* Confirm Delete Payment Dialog */}
            <ConfirmDialog
                open={!!deletePaymentConfirm}
                onClose={() => setDeletePaymentConfirm(null)}
                title="¿Eliminar pago?"
                description={`Se eliminará el pago de ${formatCurrency(
                    deletePaymentConfirm?.amount || 0
                )}. El saldo de la factura será recalculado automáticamente.`}
                confirmText="Eliminar Pago"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={() => handleDeletePayment(deletePaymentConfirm?.id)}
            />

            {/* Payment Items Modal */}
            <PaymentItemsModal
                isOpen={isPaymentItemsModalOpen}
                onClose={() => {
                    setIsPaymentItemsModalOpen(false);
                    setSelectedInvoice(null);
                }}
                invoice={selectedInvoice}
                banks={banks}
                onPaymentSuccess={handlePaymentItemsSuccess}
            />

            {/* Payment Detail Modal */}
            <PaymentDetailModal
                isOpen={isPaymentDetailModalOpen}
                onClose={() => {
                    setIsPaymentDetailModalOpen(false);
                    setSelectedPayment(null);
                }}
                payment={selectedPayment}
                onUpdate={() => {
                    // Recargar el detalle de la factura para obtener el comprobante actualizado
                    if (selectedInvoice) {
                        fetchInvoiceDetails(selectedInvoice.id);
                    }
                }}
            />
        </div>
    );
}

export default AccountStatements;
