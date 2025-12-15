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
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
    });

    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: getTodayDate(),
        payment_method: "transferencia",
        reference: "",
        notes: "",
        payment_proof: null,
    });

    // Credit Note form
    const [creditNoteForm, setCreditNoteForm] = useState({
        amount: "",
        note_number: "",
        reason: "",
        issue_date: getTodayDate(),
        pdf_file: null,
    });

    useEffect(() => {
        fetchClients();
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
    }, [clientIdFromUrl, clients]);

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

    const fetchInvoiceDetails = async (invoiceId) => {
        try {
            const response = await axios.get(`/orders/invoices/${invoiceId}/`);
            setSelectedInvoice(response.data);
        } catch (error) {
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

                const params = {
                    year: selectedYear,
                    status: statusFilter,
                    search: searchQuery,
                    ...filters
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
            if (paymentForm.reference)
                formData.append("reference", paymentForm.reference);
            if (paymentForm.notes) formData.append("notes", paymentForm.notes);
            if (paymentForm.payment_proof)
                formData.append("payment_proof", paymentForm.payment_proof);

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
            // Refresh details if open
            if (isDetailModalOpen && selectedInvoice) {
                fetchInvoiceDetails(selectedInvoice.id);
            }
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al registrar pago"
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddCreditNote = async (e) => {
        e.preventDefault();
        if (!selectedInvoice || isSubmitting) return;

        try {
            setIsSubmitting(true);

            const formData = new FormData();
            formData.append("amount", creditNoteForm.amount);
            formData.append("note_number", creditNoteForm.note_number);
            formData.append("reason", creditNoteForm.reason);
            formData.append("issue_date", creditNoteForm.issue_date);
            if (creditNoteForm.pdf_file)
                formData.append("pdf_file", creditNoteForm.pdf_file);

            await axios.post(
                `/orders/invoices/${selectedInvoice.id}/add_credit_note/`,
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            toast.success("Nota de crédito registrada exitosamente");
            setIsCreditNoteModalOpen(false);
            setCreditNoteForm({
                amount: "",
                note_number: "",
                reason: "",
                issue_date: getTodayDate(),
                pdf_file: null,
            });
            fetchInvoices(selectedClient.id);
            fetchStatement(selectedClient.id);
            if (isDetailModalOpen && selectedInvoice) {
                fetchInvoiceDetails(selectedInvoice.id);
            }
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al registrar nota de crédito"
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

    const openCreditNoteModal = (invoice) => {
        setSelectedInvoice(invoice);
        setCreditNoteForm({
            ...creditNoteForm,
            amount: "", // Default empty, user decides
        });
        setIsCreditNoteModalOpen(true);
    };

    const handleDeleteInvoice = async () => {
        if (!deleteConfirm.id) return;

        try {
            await axios.delete(`/orders/invoices/${deleteConfirm.id}/`);
            toast.success("Factura eliminada correctamente");
            setDeleteConfirm({ open: false, id: null });
            if (selectedClient) {
                fetchInvoices(selectedClient.id);
                fetchStatement(selectedClient.id);
            }
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al eliminar factura"
            );
        }
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
            days30: { count: 0, amount: 0, invoices: [] }, // 31-60 días
            days60: { count: 0, amount: 0, invoices: [] }, // 61-90 días
            days90: { count: 0, amount: 0, invoices: [] }, // 91+ días
        };

        invoices
            .filter(
                (inv) =>
                    inv.status !== "paid" &&
                    inv.status !== "cancelled" &&
                    parseFloat(inv.balance) > 0
            )
            .forEach((inv) => {
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
                    {row.service_order ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/service-orders/${row.service_order}`);
                            }}
                            className="font-mono text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                            {row.service_order_number}
                        </button>
                    ) : (
                        <span className="font-mono text-xs font-medium text-slate-700">
                            {row.service_order_number || "—"}
                        </span>
                    )}
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
            header: "PDF",
            accessor: "pdf_file",
            className: "w-16 text-center",
            cell: (row) =>
                row.pdf_file ? (
                    <div className="relative group">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.pdf_file, "_blank");
                            }}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            title="Ver factura PDF (click para ver, click derecho para descargar)"
                            onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                // Descargar PDF
                                const link = document.createElement("a");
                                link.href = row.pdf_file;
                                link.setAttribute(
                                    "download",
                                    `factura_${
                                        row.invoice_number || row.id
                                    }.pdf`
                                );
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                                toast.success("Descargando factura...");
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
                    {/* Registrar pago - Solo si no está pagada o cancelada */}
                    {row.status !== "paid" && row.status !== "cancelled" && (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openPaymentModal(row);
                                }}
                                className="text-gray-500 hover:text-amber-600"
                                title="Registrar pago"
                            >
                                <Banknote className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openCreditNoteModal(row);
                                }}
                                className="text-gray-500 hover:text-purple-600"
                                title="Registrar Nota de Crédito"
                            >
                                <FileMinus className="w-4 h-4" />
                            </Button>
                        </>
                    )}

                    {/* Ver detalles */}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(row);
                            setIsDetailModalOpen(true);
                        }}
                        className="text-gray-500 hover:text-blue-600"
                        title="Ver detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>

                    {/* Eliminar - Solo si no está pagada */}
                    {row.status !== "paid" && (
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
                    )}
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
                    className="font-mono text-sm font-semibold text-brand-600 hover:text-brand-800 hover:underline"
                >
                    {row.order_number}
                </button>
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
                    <SelectERP
                        value={selectedYear}
                        onChange={(val) => setSelectedYear(val)}
                        options={YEAR_OPTIONS}
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.id}
                        size="sm"
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
                            onClick={() =>
                                setIsExportMenuOpen(!isExportMenuOpen)
                            }
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
                                            onClick={() =>
                                                handleExportExcel("full")
                                            }
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
                                                    Exportar todas las facturas
                                                    del año {selectedYear}
                                                </p>
                                            </div>
                                        </button>

                                        {/* Exportar Solo Facturas Filtradas */}
                                        <button
                                            onClick={() =>
                                                handleExportExcel("filtered")
                                            }
                                            disabled={
                                                filteredInvoices.length === 0
                                            }
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
                                                    Exportar{" "}
                                                    {filteredInvoices.length}{" "}
                                                    factura(s) visible(s)
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
                                                    onClick={() => window.open(`tel:${selectedClient.phone}`)}
                                                >
                                                    <Phone className="w-4 h-4 mr-2" />
                                                    {selectedClient.phone}
                                                </Button>
                                            )}
                                            {selectedClient.email && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => window.open(`mailto:${selectedClient.email}`)}
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
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Corriente</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(statement.aging.current)}
                                                </div>
                                            </div>
                                            {/* 1-30 */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">1-30 Días</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(statement.aging['1-30'])}
                                                </div>
                                            </div>
                                            {/* 31-60 */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">31-60 Días</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(statement.aging['31-60'])}
                                                </div>
                                            </div>
                                            {/* 61-90 */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">61-90 Días</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(statement.aging['61-90'])}
                                                </div>
                                            </div>
                                            {/* 90+ */}
                                            <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="w-2 h-2 rounded-full bg-red-600"></span>
                                                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">+90 Días</span>
                                                </div>
                                                <div className="text-xl font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(statement.aging['90+'])}
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
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-9"
                                                />
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                                className={cn(isFiltersOpen && "bg-slate-100")}
                                            >
                                                <Filter className="w-4 h-4 mr-2" />
                                                Filtros
                                                {activeFiltersCount > 0 && (
                                                    <Badge variant="primary" className="ml-2 px-1.5 py-0.5 h-5">
                                                        {activeFiltersCount}
                                                    </Badge>
                                                )}
                                            </Button>
                                        </div>
                                        <div className="min-w-[180px]">
                                            <SelectERP
                                                value={statusFilter}
                                                onChange={(val) => setStatusFilter(val)}
                                                options={STATUS_OPTIONS}
                                                getOptionLabel={(opt) => opt.name}
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
                                            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 space-y-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <Filter className="w-4 h-4 text-blue-600" />
                                                        <h4 className="text-sm font-semibold text-gray-900">
                                                            Filtros Avanzados
                                                        </h4>
                                                        {activeFiltersCount >
                                                            0 && (
                                                            <span className="text-xs text-blue-600 font-medium">
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
                                                <div className="pt-2 border-t border-blue-100">
                                                    <p className="text-xs text-gray-600">
                                                        Mostrando{" "}
                                                        <span className="font-semibold text-blue-600">
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
                        <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                        Factura a Pagar
                                    </div>
                                    <div className="font-mono text-xl font-bold text-slate-900">
                                        {selectedInvoice.invoice_number}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline">
                                            {selectedInvoice.invoice_type ||
                                                "DTE"}
                                        </Badge>
                                        {selectedInvoice.service_order_number && (
                                            <span className="text-xs text-slate-600">
                                                OS:{" "}
                                                {
                                                    selectedInvoice.service_order_number
                                                }
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                        Saldo Pendiente
                                    </div>
                                    <div className="font-bold text-3xl text-slate-900 tabular-nums">
                                        {formatCurrency(
                                            selectedInvoice.balance
                                        )}
                                    </div>
                                    {selectedInvoice.total_amount && (
                                        <div className="text-xs text-slate-500 mt-1">
                                            Total:{" "}
                                            {formatCurrency(
                                                selectedInvoice.total_amount
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección 1: Datos del Pago */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                                1
                            </span>
                            Datos del Pago
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
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
                                <p className="text-xs text-slate-500 leading-5">
                                    Máximo:{" "}
                                    {formatCurrency(
                                        selectedInvoice?.balance || 0
                                    )}
                                </p>
                            </div>
                            <div className="space-y-1">
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
                                <div className="text-xs leading-5 invisible">
                                    Spacer
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Sección 2: Información de Transacción */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
                                2
                            </span>
                            Información de Transacción
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200 items-start">
                            <div className="space-y-1">
                                <Label>Método de Pago</Label>
                                <SelectERP
                                    label={null}
                                    value={paymentForm.payment_method}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_method: val,
                                        })
                                    }
                                    options={[
                                        {
                                            id: "transferencia",
                                            name: "Transferencia Bancaria",
                                        },
                                        { id: "efectivo", name: "Efectivo" },
                                        { id: "cheque", name: "Cheque" },
                                        {
                                            id: "tarjeta",
                                            name: "Tarjeta de Crédito/Débito",
                                        },
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    required
                                    getOptionValue={(opt) => opt.id}
                                />
                                <div className="text-xs leading-5 invisible">
                                    placeholder
                                </div>
                            </div>
                            <div className="space-y-1">
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
                                <p className="text-xs text-slate-500 leading-5">
                                    Número de transferencia, cheque, etc.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-100" />

                    {/* Sección 3: Comprobante */}
                    <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold">
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
                                Sube el comprobante de pago (transferencia,
                                captura, recibo, etc.)
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
                        <Button type="submit" disabled={isSubmitting}>
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

            {/* Credit Note Modal */}
            <Modal
                isOpen={isCreditNoteModalOpen}
                onClose={() => {
                    setIsCreditNoteModalOpen(false);
                    setSelectedInvoice(null);
                }}
                title="Registrar Nota de Crédito"
                size="2xl"
            >
                <form onSubmit={handleAddCreditNote} className="space-y-6">
                    {/* Información de Factura */}
                    {selectedInvoice && (
                        <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                        Aplicar a Factura
                                    </div>
                                    <div className="font-mono text-xl font-bold text-slate-900">
                                        {selectedInvoice.invoice_number}
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Badge variant="outline">
                                            {selectedInvoice.invoice_type || "DTE"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                        Saldo Actual
                                    </div>
                                    <div className="font-bold text-3xl text-slate-900 tabular-nums">
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Número de Nota de Crédito *</Label>
                            <Input
                                value={creditNoteForm.note_number}
                                onChange={(e) => setCreditNoteForm({ ...creditNoteForm, note_number: e.target.value })}
                                placeholder="Ej: NC-00123"
                                className="font-mono"
                                required
                            />
                        </div>
                        <div>
                            <Label>Fecha de Emisión *</Label>
                            <Input
                                type="date"
                                value={creditNoteForm.issue_date}
                                onChange={(e) => setCreditNoteForm({ ...creditNoteForm, issue_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Monto a Acreditar *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedInvoice?.balance}
                                value={creditNoteForm.amount}
                                onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })}
                                className="pl-7 font-mono text-lg"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            El monto no puede exceder el saldo pendiente ({formatCurrency(selectedInvoice?.balance || 0)})
                        </p>
                    </div>

                    <div>
                        <Label>Motivo / Razón *</Label>
                        <Input
                            value={creditNoteForm.reason}
                            onChange={(e) => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })}
                            placeholder="Ej: Devolución de mercadería, Error en facturación..."
                            required
                        />
                    </div>

                    <div>
                        <Label>Archivo PDF (Opcional)</Label>
                        <FileUpload
                            accept=".pdf"
                            onFileChange={(file) => setCreditNoteForm({ ...creditNoteForm, pdf_file: file })}
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreditNoteModalOpen(false);
                                setSelectedInvoice(null);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-purple-600 hover:bg-purple-700 text-white">
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <FileMinus className="w-4 h-4 mr-2" />
                                    Registrar Nota de Crédito
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
                                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                        Monto Pagado
                                    </div>
                                    <div className="text-xl font-bold text-slate-900 tabular-nums">
                                        {formatCurrency(
                                            selectedInvoice.paid_amount || 0
                                        )}
                                    </div>
                                </div>
                                {parseFloat(selectedInvoice.credited_amount || 0) > 0 && (
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                            Notas de Crédito
                                        </div>
                                        <div className="text-xl font-bold text-slate-900 tabular-nums">
                                            {formatCurrency(
                                                selectedInvoice.credited_amount || 0
                                            )}
                                        </div>
                                    </div>
                                )}
                                <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                        Saldo Pendiente
                                    </div>
                                    <div className={cn(
                                        "text-xl font-bold tabular-nums",
                                        parseFloat(selectedInvoice.balance) > 0 ? "text-red-600" : "text-slate-900"
                                    )}>
                                        {formatCurrency(
                                            selectedInvoice.balance || 0
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Document */}
                        {selectedInvoice.pdf_file && (
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Documento Fiscal
                                </h4>
                                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md group hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                {selectedInvoice.invoice_type || "DTE"} - {selectedInvoice.invoice_number}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Documento PDF
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            window.open(
                                                selectedInvoice.pdf_file,
                                                "_blank"
                                            )
                                        }
                                        className="bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Ver Documento
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Credit Note History Table */}
                        {selectedInvoice.credit_notes && selectedInvoice.credit_notes.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                                    <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide flex items-center gap-2">
                                        <FileMinus className="w-4 h-4" />
                                        Notas de Crédito Aplicadas
                                    </h4>
                                </div>
                                <table className="w-full text-sm">
                                    <thead className="bg-white text-slate-500 font-medium text-xs uppercase border-b border-slate-100">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left">Número</th>
                                            <th className="px-4 py-2.5 text-left">Fecha</th>
                                            <th className="px-4 py-2.5 text-left">Motivo</th>
                                            <th className="px-4 py-2.5 text-right">Monto</th>
                                            <th className="px-4 py-2.5 text-center w-16">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {selectedInvoice.credit_notes.map((nc) => (
                                            <tr key={nc.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-2.5 font-mono font-medium text-slate-900">
                                                    {nc.note_number}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600">
                                                    {formatDate(nc.issue_date, { format: 'short' })}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-600 max-w-[200px] truncate" title={nc.reason}>
                                                    {nc.reason}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-purple-700">
                                                    -{formatCurrency(nc.amount)}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    {nc.pdf_file ? (
                                                        <button 
                                                            onClick={() => window.open(nc.pdf_file, '_blank')}
                                                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 rounded transition-all"
                                                            title="Ver Documento"
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

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
        </div>
    );
}

export default AccountStatements;
