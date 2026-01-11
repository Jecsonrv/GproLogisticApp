import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Banknote,
    FileText,
    AlertTriangle,
    AlertCircle,
    CheckCircle,
    Clock,
    Eye,
    Search,
    Filter,
    Download,
    Upload,
    Building2,
    Calendar,
    X,
    XCircle,
    FileSpreadsheet,
    RefreshCw,
    DollarSign,
    CalendarClock,
    Receipt,
    Pencil,
    Edit2,
    Trash2,
    Info,
    MoreHorizontal,
    ArrowUpRight,
    ListChecks,
    Briefcase,
    Truck,
    FileMinus,
    Hash,
    TrendingDown,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import Modal, { ModalFooter } from "../components/ui/Modal";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import ExportButton from "../components/ui/ExportButton";
import {
    FileUpload,
    SelectERP,
    ConfirmDialog,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    Skeleton,
    SkeletonTable,
} from "../components/ui";
import api from "../lib/axios";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import toast from "react-hot-toast";
import InvoiceItemsEditor from "../components/InvoiceItemsEditor";
import BillingWizard from "../components/BillingWizard";
import PaymentItemsModal from "../components/PaymentItemsModal";
import PaymentDetailModal from "../components/PaymentDetailModal";
import CreditNoteModal from "../components/CreditNoteModal";

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

/**
 * Invoicing - Módulo de Facturación y CXC
 * Design System Corporativo GPRO - REDISEÑADO FINAL
 * Bloque Estratégico (Arriba) | Bloque Operativo (Abajo)
 */

// Configuración de estados de factura - Paleta Mate Profesional
const INVOICE_STATUS_CONFIG = {
    pending: {
        label: "Pendiente",
        className: "bg-white border-slate-200 text-slate-600",
        icon: Clock,
        iconColor: "text-amber-500",
    },
    partial: {
        label: "Parcial",
        className: "bg-white border-slate-200 text-slate-700",
        icon: CalendarClock,
        iconColor: "text-blue-500",
    },
    paid: {
        label: "Pagada",
        className: "bg-white border-slate-200 text-slate-900 font-medium",
        icon: CheckCircle,
        iconColor: "text-emerald-600",
    },
    overdue: {
        label: "Vencida",
        className: "bg-red-50 border-red-100 text-red-700",
        icon: AlertTriangle,
        iconColor: "text-red-600",
    },
    cancelled: {
        label: "Anulada",
        className: "bg-slate-50 border-transparent text-slate-400",
        icon: XCircle,
        iconColor: "text-slate-400",
    },
};

// Componente de Badge de Estado - Estilo Sobrio
const InvoiceStatusBadge = ({ status }) => {
    const config =
        INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.pending;
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

// Opciones de Tipo de Factura
const INVOICE_TYPE_OPTIONS = [
    { id: "DTE", name: "DTE - Documento Tributario Electrónico" },
    { id: "FEX", name: "FEX - Factura de Exportación" },
    { id: "INTL", name: "Factura Internacional" },
];

// Badge de Tipo de Factura - Estilo Minimalista
const InvoiceTypeBadge = ({ type }) => {
    const config = {
        DTE: {
            label: "DTE",
            className: "text-slate-600 bg-slate-100 border-transparent",
        },
        FEX: {
            label: "FEX",
            className: "text-indigo-600 bg-indigo-50 border-indigo-100",
        },
        INTL: {
            label: "INTL",
            className: "text-teal-600 bg-teal-50 border-teal-100",
        },
    };
    const c = config[type] || config.DTE;
    return (
        <span
            className={cn(
                "inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded border",
                c.className
            )}
        >
            {c.label}
        </span>
    );
};

// ============================================
// KPI CARD - REFINED
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

const Invoicing = () => {
    const navigate = useNavigate();
    // Data State
    const [invoices, setInvoices] = useState([]);
    const [creditNotes, setCreditNotes] = useState([]);
    const [clients, setClients] = useState([]);
    const [banks, setBanks] = useState([]);
    const [allServiceOrders, setAllServiceOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [activeTab, setActiveTab] = useState("invoices");

    // Summary/KPIs
    const [summary, setSummary] = useState({
        total_invoiced: "0",
        total_pending: "0",
        total_collected: "0",
        total_overdue: "0",
        total_services: "0",
        total_third_party_expenses: "0",
        pending_count: 0,
        paid_count: 0,
        overdue_count: 0,
        partial_count: 0,
    });

    // UI State
    const [isPaymentItemsModalOpen, setIsPaymentItemsModalOpen] =
        useState(false);
    const [isPaymentDetailModalOpen, setIsPaymentDetailModalOpen] =
        useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isBillingWizardOpen, setIsBillingWizardOpen] = useState(false);
    const [selectedServiceOrderForBilling, setSelectedServiceOrderForBilling] =
        useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [editingCreditNote, setEditingCreditNote] = useState(null);
    const [isSelectInvoiceForNCOpen, setIsSelectInvoiceForNCOpen] =
        useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
        type: null, // 'invoice' | 'credit-note'
    });

    // Search and Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        client: "",
        status: "",
        dateFrom: "",
        dateTo: "",
        dueDateFrom: "",
        dueDateTo: "",
    });

    // Edit invoice form
    const [editForm, setEditForm] = useState({
        id: null,
        invoice_number: "",
        invoice_type: "DTE",
        issue_date: "",
        due_date: "",
        total_amount: "",
        notes: "",
        pdf_file: null,
        client_name: "",
        service_order_number: "",
    });

    // Data fetching
    useEffect(() => {
        fetchInvoices();
        fetchCreditNotes();
        fetchSummary();
        fetchClients();
        fetchAllServiceOrders();
        fetchBanks();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await api.get("/orders/invoices/");
            setInvoices(response.data);
        } catch {
            toast.error("No se pudieron cargar las facturas.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCreditNotes = async () => {
        try {
            const response = await api.get("/orders/credit-notes/");
            setCreditNotes(response.data);
        } catch {
            console.error("Error al cargar notas de crédito");
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await api.get("/orders/invoices/summary/");
            setSummary(response.data);
        } catch {
            console.error("Error loading summary");
        }
    };

    const fetchClients = async () => {
        try {
            const response = await api.get("/clients/");
            setClients(response.data);
        } catch {
            console.error("Error loading clients");
        }
    };

    const fetchBanks = async () => {
        try {
            const response = await api.get("/catalogs/banks/");
            setBanks(response.data);
        } catch {
            console.error("Error loading banks");
        }
    };

    const fetchAllServiceOrders = async () => {
        try {
            const response = await api.get("/orders/service-orders/", {
                params: { facturado: false },
            });
            const ordersWithAmount = response.data.filter(
                (order) =>
                    order.total_amount && parseFloat(order.total_amount) > 0
            );
            setAllServiceOrders(ordersWithAmount);
        } catch (error) {
            toast.error("No se pudieron cargar las órdenes de servicio.");
            console.error(error);
        }
    };

    // Filtered invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((invoice) => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesSearch =
                    invoice.invoice_number?.toLowerCase().includes(query) ||
                    invoice.client_name?.toLowerCase().includes(query) ||
                    invoice.ccf?.toLowerCase().includes(query) ||
                    invoice.service_order_number?.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Client filter
            if (
                filters.client &&
                invoice.client_id !== parseInt(filters.client)
            ) {
                return false;
            }

            // Status filter
            if (filters.status && invoice.status !== filters.status) {
                return false;
            }

            // Issue date range filter
            if (filters.dateFrom) {
                const invoiceDate = new Date(invoice.issue_date);
                const fromDate = new Date(filters.dateFrom);
                if (invoiceDate < fromDate) return false;
            }
            if (filters.dateTo) {
                const invoiceDate = new Date(invoice.issue_date);
                const toDate = new Date(filters.dateTo);
                toDate.setHours(23, 59, 59);
                if (invoiceDate > toDate) return false;
            }

            // Due date range filter
            if (filters.dueDateFrom && invoice.due_date) {
                const dueDate = new Date(invoice.due_date);
                const fromDate = new Date(filters.dueDateFrom);
                if (dueDate < fromDate) return false;
            }
            if (filters.dueDateTo && invoice.due_date) {
                const dueDate = new Date(invoice.due_date);
                const toDate = new Date(filters.dueDateTo);
                toDate.setHours(23, 59, 59);
                if (dueDate > toDate) return false;
            }

            return true;
        });
    }, [invoices, searchQuery, filters]);

    // Active filters count
    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.client) count++;
        if (filters.status) count++;
        if (filters.dateFrom) count++;
        if (filters.dateTo) count++;
        if (filters.dueDateFrom) count++;
        if (filters.dueDateTo) count++;
        return count;
    }, [filters]);

    const handleOpenEditCNModal = (nc) => {
        setLoading(true);
        api.get(`/orders/invoices/${nc.invoice_id}/`)
            .then((res) => {
                setSelectedInvoice(res.data);
                setEditingCreditNote(nc);
                setIsCreditNoteModalOpen(true);
            })
            .catch(() =>
                toast.error("No se pudieron cargar los datos para edición.")
            )
            .finally(() => setLoading(false));
    };

    // Abrir modal de NC para una factura (desde tabla de facturas)
    const handleOpenCreditNoteModal = (invoice) => {
        setSelectedInvoice(invoice);
        setEditingCreditNote(null);
        setIsCreditNoteModalOpen(true);
    };

    const handleCreditNoteSuccess = () => {
        fetchInvoices();
        fetchCreditNotes();
        fetchSummary();
        if (isDetailModalOpen && selectedInvoice) {
            handleViewInvoiceDetails(selectedInvoice.id);
        }
    };

    const handleOpenPaymentItemsModal = (invoice) => {
        setSelectedInvoice(invoice);
        setIsPaymentItemsModalOpen(true);
    };

    const handlePaymentItemsSuccess = () => {
        fetchInvoices();
        fetchSummary();
    };

    const handleOpenEditModal = (invoice) => {
        setSelectedInvoice(invoice);
        setEditForm({
            id: invoice.id,
            invoice_number: invoice.invoice_number || "",
            dte_number: invoice.dte_number || "",
            invoice_type: invoice.invoice_type || "DTE",
            issue_date: invoice.issue_date || "",
            due_date: invoice.due_date || "",
            total_amount: invoice.total_amount || "",
            notes: invoice.notes || "",
            pdf_file: null,
            client_name: invoice.client_name,
            service_order_number: invoice.service_order_number,
            is_dte_issued: invoice.is_dte_issued || false,
            generation_code: invoice.generation_code || "",
            reception_stamp: invoice.reception_stamp || "",
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateInvoice = async () => {
        if (!editForm.invoice_number || !editForm.issue_date) {
            toast.error("Complete los campos requeridos");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("invoice_number", editForm.invoice_number);
            formData.append("invoice_type", editForm.invoice_type);
            formData.append("issue_date", editForm.issue_date);
            formData.append("notes", editForm.notes);
            
            if (editForm.generation_code) {
                formData.append("generation_code", editForm.generation_code);
            }
            if (editForm.reception_stamp) {
                formData.append("reception_stamp", editForm.reception_stamp);
            }

            if (editForm.dte_number) {
                formData.append("dte_number", editForm.dte_number);
            }
            if (editForm.due_date) {
                formData.append("due_date", editForm.due_date);
            }
            if (editForm.pdf_file) {
                formData.append("pdf_file", editForm.pdf_file);
            }

            await api.patch(`/orders/invoices/${editForm.id}/`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("La factura ha sido actualizada correctamente.");
            fetchInvoices();
            fetchSummary();
            setIsEditModalOpen(false);
        } catch {
            // El interceptor de axios ya muestra el toast de error
        }
    };

    const clearFilters = () => {
        setFilters({
            client: "",
            status: "",
            dateFrom: "",
            dateTo: "",
            dueDateFrom: "",
            dueDateTo: "",
        });
        setSearchQuery("");
    };

    const handleExportExcel = async (exportType = "all") => {
        const dataToExport =
            exportType === "filtered" ? filteredInvoices : invoices;

        if (dataToExport.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);

            const params = exportType === "filtered" ? filters : {};

            const response = await api.get("/orders/invoices/export_excel/", {
                responseType: "blob",
                params: params,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toLocaleDateString("en-CA");
            const filename =
                exportType === "filtered"
                    ? `GPRO_CXC_Filtradas_${timestamp}.xlsx`
                    : `GPRO_CXC_${timestamp}.xlsx`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            const message =
                exportType === "filtered"
                    ? `${dataToExport.length} factura(s) exportada(s)`
                    : "Todas las facturas exportadas correctamente";
            toast.success(message);
        } catch {
            toast.error("No se pudo exportar el archivo.");
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteInvoice = async () => {
        if (!deleteConfirm.id) return;

        try {
            await api.delete(`/orders/invoices/${deleteConfirm.id}/`);
            toast.success("La factura ha sido eliminada.");
            fetchInvoices();
            fetchSummary();
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setDeleteConfirm({ open: false, id: null });
        }
    };

    const handleDeleteCreditNote = async () => {
        if (!deleteConfirm.id) return;

        try {
            await api.delete(`/orders/credit-notes/${deleteConfirm.id}/`);
            toast.success("La nota de crédito ha sido eliminada.");
            fetchCreditNotes();
            fetchInvoices();
            fetchSummary();
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setDeleteConfirm({ open: false, id: null, type: null });
        }
    };

    const handleViewInvoiceDetails = async (invoiceId) => {
        try {
            const response = await api.get(`/orders/invoices/${invoiceId}/`);
            setSelectedInvoice(response.data);
            setIsDetailModalOpen(true);
        } catch {
            toast.error("No se pudieron cargar los detalles de la factura.");
        }
    };

    // Calcular resumen de NC
    const creditNotesSummary = useMemo(() => {
        const total = creditNotes.reduce(
            (sum, nc) => sum + parseFloat(nc.amount || 0),
            0
        );
        const thisMonth = creditNotes.filter((nc) => {
            const ncDate = new Date(nc.issue_date);
            const now = new Date();
            return (
                ncDate.getMonth() === now.getMonth() &&
                ncDate.getFullYear() === now.getFullYear()
            );
        });
        const thisMonthTotal = thisMonth.reduce(
            (sum, nc) => sum + parseFloat(nc.amount || 0),
            0
        );
        return {
            count: creditNotes.length,
            total,
            thisMonthCount: thisMonth.length,
            thisMonthTotal,
        };
    }, [creditNotes]);

    // Credit Note columns - Diseño Profesional ERP
    const ncColumns = [
        {
            header: "Nota de Crédito",
            accessor: "note_number",
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-3 py-1.5">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                        <FileMinus className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                        <span className="font-mono font-bold text-slate-800 text-sm block">
                            {row.note_number}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateSafe(row.issue_date)}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "Factura Afectada",
            accessor: "invoice_number",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col py-1">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoiceDetails(row.invoice_id);
                        }}
                        className="font-mono text-xs font-bold text-slate-700 hover:text-slate-900 hover:underline text-left w-fit flex items-center gap-1"
                    >
                        {row.invoice_number}
                        <ArrowUpRight className="w-3 h-3 opacity-50" />
                    </button>
                    <span
                        className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] mt-0.5"
                        title={row.client_name}
                    >
                        {row.client_name}
                    </span>
                </div>
            ),
        },
        {
            header: "Motivo",
            accessor: "reason",
            sortable: false,
            render: (row) => (
                <div className="max-w-[220px] py-1">
                    <span
                        className="text-xs text-slate-600 font-medium line-clamp-2 leading-relaxed"
                        title={row.reason}
                    >
                        {row.reason || "Sin especificar"}
                    </span>
                </div>
            ),
        },
        {
            header: "Monto Acreditado",
            accessor: "amount",
            className: "text-right",
            headerClassName: "text-right",
            sortable: false,
            render: (row) => (
                <div className="text-right py-1">
                    <span className="font-bold text-slate-700 tabular-nums text-sm bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        -{formatCurrency(row.amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Registrado por",
            accessor: "created_by_name",
            sortable: false,
            render: (row) => (
                <div className="py-1">
                    <span className="text-xs text-slate-600 font-medium">
                        {row.created_by_name || "Sistema"}
                    </span>
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[110px] text-center",
            headerClassName: "text-center",
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-center gap-0.5">
                    {row.pdf_file ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.pdf_file, "_blank");
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Ver documento"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="w-7" />
                    )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditCNModal(row);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                        title="Editar"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                                open: true,
                                id: row.id,
                                type: "credit-note",
                            });
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Eliminar"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Table columns - Estructura Original con Refinamiento Profesional
    const columns = [
        {
            header: "Documento",
            accessor: "invoice_number",
            sortable: false,
            render: (row) => (
                <div className="py-1">
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-700 text-xs tracking-tighter">
                            {row.invoice_number || "Sin asignar"}
                        </span>
                        <InvoiceTypeBadge type={row.invoice_type} />
                    </div>
                    {row.service_order_number && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(
                                    `/service-orders/${row.service_order}`
                                );
                            }}
                            className="text-[10px] text-slate-700 hover:text-slate-900 font-semibold flex items-center gap-1 mt-0.5"
                        >
                            {row.service_order_number}
                            <ArrowUpRight className="w-2.5 h-2.5 opacity-50" />
                        </button>
                    )}
                </div>
            ),
        },
        {
            header: "Cliente",
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
                    {row.ccf && (
                        <div className="text-[10px] text-slate-400 font-mono tracking-tighter">
                            CCF: {row.ccf}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Emisión",
            accessor: "issue_date",
            sortable: false,
            render: (row) => (
                <div className="text-[11px] text-slate-500 font-medium tabular-nums py-1">
                    {formatDateSafe(row.issue_date)}
                </div>
            ),
        },
        {
            header: "Vencimiento",
            accessor: "due_date",
            sortable: false,
            render: (row) => (
                <div className="py-1">
                    {row.due_date ? (
                        <>
                            <div
                                className={cn(
                                    "text-[11px] font-semibold tabular-nums",
                                    row.days_overdue > 0
                                        ? "text-red-600"
                                        : "text-slate-500"
                                )}
                            >
                                {formatDateSafe(row.due_date)}
                            </div>
                            {row.days_overdue > 0 && (
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
            ),
        },
        {
            header: "Importe Total",
            accessor: "total_amount",
            className: "w-[140px]",
            headerClassName: "text-right",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col items-end text-right">
                    <div className="font-semibold text-slate-700 tabular-nums text-sm tracking-tight">
                        {formatCurrency(row.total_amount)}
                    </div>
                    {row.retencion > 0 && (
                        <div className="text-[10px] text-amber-700 font-medium tabular-nums bg-amber-50 px-1.5 rounded border border-amber-100 mt-0.5">
                            -{formatCurrency(row.retencion)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Pagado",
            accessor: "paid_amount",
            className: "w-[140px]",
            headerClassName: "text-right",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col items-end text-right">
                    <div
                        className={cn(
                            "text-sm font-semibold tabular-nums tracking-tight",
                            row.paid_amount > 0
                                ? "text-emerald-700"
                                : "text-slate-300"
                        )}
                    >
                        {row.paid_amount > 0
                            ? formatCurrency(row.paid_amount)
                            : "—"}
                    </div>
                </div>
            ),
        },
        {
            header: "Saldo",
            accessor: "balance",
            className: "w-[140px]",
            headerClassName: "text-right",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col items-end text-right">
                    <div
                        className={cn(
                            "font-semibold tabular-nums text-sm tracking-tight",
                            parseFloat(row.balance) > 0.01
                                ? "text-slate-700"
                                : "text-emerald-600"
                        )}
                    >
                        {parseFloat(row.balance) > 0.01 ? (
                            formatCurrency(row.balance)
                        ) : (
                            <span className="flex items-center justify-center gap-1">
                                <CheckCircle className="w-3 h-3" /> $0.00
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            sortable: false,
            render: (row) => <InvoiceStatusBadge status={row.status} />,
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[220px] text-center",
            headerClassName: "text-center",
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-center gap-0.5">
                    {/* Ver PDF */}
                    {row.pdf_file ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.pdf_file, "_blank");
                            }}
                            title="Ver PDF"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            <FileText className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="w-7" />
                    )}
                    {/* Pago por Items */}
                    {parseFloat(row.balance) > 0.01 &&
                    row.status !== "cancelled" ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentItemsModal(row);
                            }}
                            title="Registrar Pago"
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                            <ListChecks className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="w-7" />
                    )}
                    {/* Nota de Crédito */}
                    {parseFloat(row.balance) > 0.01 &&
                    row.status !== "cancelled" ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCreditNoteModal(row);
                            }}
                            title="Agregar Nota de Crédito"
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                        >
                            <FileMinus className="w-4 h-4" />
                        </button>
                    ) : (
                        <div className="w-7" />
                    )}
                    {/* Ver Detalle */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoiceDetails(row.id);
                        }}
                        title="Ver Detalle"
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                    </button>
                    {/* Editar */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(row);
                        }}
                        title={
                            row.is_dte_issued
                                ? "Editar Factura (DTE Emitido)"
                                : "Editar Factura"
                        }
                        className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Eliminar */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, id: row.id });
                        }}
                        title="Eliminar"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    if (loading && invoices.length === 0) {
        return (
            <div className="space-y-6 mt-2">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <SkeletonTable rows={10} columns={8} />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 mt-1 sm:mt-2">
            {/* Bloque Estratégico (KPIs) - Responsive: 2 cols móvil, 3 tablet, 5 desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                <KPICard
                    label="Total facturado"
                    value={formatCurrency(summary.total_invoiced)}
                    icon={Receipt}
                />
                <KPICard
                    label="Facturación Servicios"
                    value={formatCurrency(summary.total_services)}
                    subtext="Propios y Tercerizados"
                    icon={Briefcase}
                />
                <KPICard
                    label="Gastos a Terceros"
                    value={formatCurrency(summary.total_third_party_expenses)}
                    subtext="Cargos a cliente"
                    icon={Truck}
                />
                <KPICard
                    label="Por cobrar"
                    value={formatCurrency(summary.total_pending)}
                    subtext={`${summary.pending_count || 0} facturas`}
                    icon={DollarSign}
                />
                <KPICard
                    label="Recuperado"
                    value={formatCurrency(summary.total_collected)}
                    subtext={`${summary.paid_count || 0} pagadas`}
                    icon={CheckCircle}
                />
            </div>

            {/* Indicador de Notas de Crédito - Sutil y compacto */}
            {(summary.total_credited > 0 || summary.credit_notes_count > 0) && (
                <div className="flex items-center justify-end gap-4 px-1">
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-md">
                            <FileMinus className="w-3.5 h-3.5 text-slate-500" />
                            <span className="font-medium text-slate-700">
                                {summary.credit_notes_count ||
                                    creditNotes.length}{" "}
                                NC
                            </span>
                            <span className="text-slate-600">
                                -
                                {formatCurrency(
                                    summary.total_credited ||
                                        creditNotesSummary.total
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Bloque Operativo (Tabla + Herramientas) */}
            <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Barra de Herramientas - Responsive */}
                <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/30">
                    {/* Fila principal: Tabs + Búsqueda + Acciones (en desktop todo en una fila) */}
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                        {/* Izquierda: Tabs + Búsqueda + Filtros */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-3xl">
                            {/* Tabs */}
                            <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50 w-full sm:w-auto shrink-0">
                                <button
                                    onClick={() => setActiveTab("invoices")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                        activeTab === "invoices"
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    Facturas
                                </button>
                                <button
                                    onClick={() => setActiveTab("credit-notes")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                        activeTab === "credit-notes"
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    N. Crédito
                                </button>
                            </div>

                            <div className="h-6 w-px bg-slate-200 hidden sm:block shrink-0" />

                            {/* Búsqueda + Filtros */}
                            <div className="flex items-center gap-2 flex-1">
                                <div className="relative flex-1 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                    <input
                                        placeholder={
                                            activeTab === "invoices"
                                                ? "Buscar factura, cliente, OS..."
                                                : "Buscar nota crédito..."
                                        }
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                                    />
                                </div>
                                {activeTab === "invoices" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setIsFiltersOpen(!isFiltersOpen)
                                        }
                                        className={cn(
                                            "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all h-10 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap",
                                            isFiltersOpen &&
                                                "ring-2 ring-slate-900/5 border-slate-900 bg-slate-50"
                                        )}
                                    >
                                        <Filter className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-2 text-slate-500" />
                                        <span className="hidden sm:inline">
                                            Filtros
                                        </span>
                                        {activeFiltersCount > 0 && (
                                            <span className="ml-1 sm:ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-full">
                                                {activeFiltersCount}
                                            </span>
                                        )}
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Derecha: Acciones */}
                        <div className="flex items-center gap-2 sm:gap-3 justify-end shrink-0">
                            {activeTab === "invoices" ? (
                                <>
                                    <ExportButton
                                        onExportAll={() =>
                                            handleExportExcel("all")
                                        }
                                        onExportFiltered={() =>
                                            handleExportExcel("filtered")
                                        }
                                        filteredCount={filteredInvoices.length}
                                        totalCount={invoices.length}
                                        isExporting={isExporting}
                                        allLabel="Todas las Facturas"
                                        allDescription="Exportar registro completo"
                                        filteredLabel="Filtradas"
                                        filteredDescription="Solo visibles"
                                    />

                                    <Button
                                        size="sm"
                                        onClick={() =>
                                            setIsGenerateModalOpen(true)
                                        }
                                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-10 sm:h-9 px-3 sm:px-4 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                                        Generar Factura
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        setIsSelectInvoiceForNCOpen(true)
                                    }
                                    className="bg-slate-800 hover:bg-slate-900 text-white shadow-sm h-10 sm:h-9 px-3 sm:px-4 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <FileMinus className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                                    Nueva Nota de Crédito
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Advanced Filters Panel */}
                {isFiltersOpen && activeTab === "invoices" && (
                    <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                                placeholder="Todos los clientes"
                            />

                            <SelectERP
                                label="Estado"
                                value={filters.status}
                                onChange={(val) =>
                                    setFilters({ ...filters, status: val })
                                }
                                options={[
                                    { id: "pending", name: "Pendiente" },
                                    { id: "partial", name: "Pago Parcial" },
                                    { id: "paid", name: "Pagada" },
                                    { id: "overdue", name: "Vencida" },
                                    { id: "cancelled", name: "Anulada" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                                placeholder="Todos los estados"
                            />

                            <div>
                                <Label className="text-xs font-bold text-slate-500 mb-1.5 block uppercase tracking-wider">
                                    Rango de Fechas
                                </Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        type="date"
                                        value={filters.dateFrom}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                dateFrom: e.target.value,
                                            })
                                        }
                                        placeholder="Desde"
                                    />
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) =>
                                            setFilters({
                                                ...filters,
                                                dateTo: e.target.value,
                                            })
                                        }
                                        placeholder="Hasta"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-5">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                                <XCircle className="w-4 h-4 mr-1.5" />
                                Limpiar Filtros
                            </Button>
                        </div>
                    </div>
                )}

                <div className="relative min-h-[400px]">
                    {activeTab === "invoices" ? (
                        <DataTable
                            data={filteredInvoices}
                            columns={columns}
                            loading={loading}
                            searchable={false}
                            onRowClick={(row) =>
                                handleViewInvoiceDetails(row.id)
                            }
                            emptyMessage="No se encontraron facturas registradas."
                        />
                    ) : (
                        <div className="space-y-0">
                            {/* Header de NC con estadísticas */}
                            <div className="px-4 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                                            <FileMinus className="w-5 h-5 text-slate-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-800">
                                                Notas de Crédito Emitidas
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Ajustes y devoluciones aplicados
                                                a facturas
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-center px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Total NC
                                            </p>
                                            <p className="text-lg font-bold text-slate-800 tabular-nums">
                                                {creditNotesSummary.count}
                                            </p>
                                        </div>
                                        <div className="text-center px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Este Mes
                                            </p>
                                            <p className="text-lg font-bold text-slate-700 tabular-nums">
                                                {formatCurrency(
                                                    creditNotesSummary.thisMonthTotal
                                                )}
                                            </p>
                                        </div>
                                        <div className="text-center px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                                Acumulado
                                            </p>
                                            <p className="text-lg font-bold text-slate-800 tabular-nums">
                                                {formatCurrency(
                                                    creditNotesSummary.total
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <DataTable
                                data={creditNotes}
                                columns={ncColumns}
                                loading={loading}
                                emptyMessage={
                                    <div className="py-12 text-center">
                                        <FileMinus className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                                        <p className="text-slate-500 font-medium">
                                            No hay notas de crédito registradas
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Las notas de crédito se crean desde
                                            el detalle de cada factura
                                        </p>
                                    </div>
                                }
                                searchable={false}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* ... Modals (Credit Note, Payment, Generate, Edit, Detail) ... */}
            {/* The rest of the modal code is preserved but hidden for brevity in this replace block since it wasn't modified stylistically beyond standard components */}

            {/* Select Invoice for Credit Note Modal */}
            <Modal
                isOpen={isSelectInvoiceForNCOpen}
                onClose={() => setIsSelectInvoiceForNCOpen(false)}
                title="Seleccionar Factura"
                size="md"
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Seleccione la factura a la cual desea aplicar una nota
                        de crédito. Solo se muestran facturas activas.
                    </p>
                    <SelectERP
                        label="Factura"
                        placeholder="Buscar por número de factura, cliente u orden de servicio..."
                        options={invoices.filter(
                            (inv) => inv.status !== "cancelled"
                        )}
                        getOptionLabel={(inv) => {
                            const osInfo = inv.service_order_number
                                ? ` | OS: ${inv.service_order_number}`
                                : "";
                            return `${inv.invoice_number} - ${
                                inv.client_name
                            }${osInfo} (${formatCurrency(inv.total_amount)})`;
                        }}
                        getOptionValue={(inv) => inv.id}
                        onChange={(val) => {
                            const invoice = invoices.find((i) => i.id === val);
                            if (invoice) {
                                setIsSelectInvoiceForNCOpen(false);
                                handleOpenCreditNoteModal(invoice);
                            }
                        }}
                        searchable
                    />
                </div>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setIsSelectInvoiceForNCOpen(false)}
                    >
                        Cancelar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Credit Note Modal Component */}
            <CreditNoteModal
                isOpen={isCreditNoteModalOpen}
                onClose={() => {
                    setIsCreditNoteModalOpen(false);
                    setEditingCreditNote(null);
                }}
                invoice={selectedInvoice}
                editingCreditNote={editingCreditNote}
                onSuccess={handleCreditNoteSuccess}
            />

            {/* Select Service Order Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => {
                    setIsGenerateModalOpen(false);
                    setSelectedServiceOrderForBilling(null);
                }}
                title="Generar Factura"
                size="lg"
            >
                <div className="space-y-5">
                    <p className="text-sm text-slate-600">
                        Seleccione la orden de servicio para la cual desea
                        generar una factura.
                    </p>

                    <div>
                        <Label className="mb-1.5 block">
                            Orden de Servicio
                        </Label>
                        <SelectERP
                            value={selectedServiceOrderForBilling?.id || ""}
                            onChange={(val) => {
                                const order = allServiceOrders.find(
                                    (o) => String(o.id) === String(val)
                                );
                                setSelectedServiceOrderForBilling(
                                    order || null
                                );
                            }}
                            options={[
                                {
                                    id: "",
                                    name: "Seleccionar orden de servicio...",
                                },
                                ...allServiceOrders.map((o) => ({
                                    id: o.id,
                                    name: `${o.order_number} - ${o.client_name}`,
                                })),
                            ]}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            placeholder="Buscar por número de OS o cliente..."
                        />
                    </div>

                    {selectedServiceOrderForBilling && (
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Receipt className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            Orden Seleccionada
                                        </p>
                                        <p className="text-sm font-bold text-slate-900">
                                            {
                                                selectedServiceOrderForBilling.order_number
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500">
                                        Cliente
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700">
                                        {
                                            selectedServiceOrderForBilling.client_name
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsGenerateModalOpen(false);
                            setSelectedServiceOrderForBilling(null);
                        }}
                        className="text-slate-500 font-semibold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => {
                            setIsGenerateModalOpen(false);
                            setIsBillingWizardOpen(true);
                        }}
                        disabled={!selectedServiceOrderForBilling}
                        className="bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px]"
                    >
                        Continuar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Billing Wizard */}
            <BillingWizard
                isOpen={isBillingWizardOpen}
                onClose={() => {
                    setIsBillingWizardOpen(false);
                    setSelectedServiceOrderForBilling(null);
                }}
                serviceOrder={selectedServiceOrderForBilling}
                onInvoiceCreated={() => {
                    fetchInvoices();
                    fetchSummary();
                    fetchAllServiceOrders();
                }}
            />

            {/* Edit Invoice Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={
                    editForm.is_dte_issued
                        ? "Editar Factura (DTE Emitido)"
                        : "Editar Factura"
                }
                size="lg"
            >
                <div className="space-y-6">
                    {/* Alerta para DTE emitido */}
                    {editForm.is_dte_issued && (
                        <div className="bg-slate-100 border border-slate-300 rounded-xl p-4 flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                                <Info className="w-4 h-4 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Documento fiscal emitido
                                </p>
                                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                                    Campos editables: número de factura, número
                                    de DTE, fecha de vencimiento, notas y
                                    archivo PDF.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Resumen de la factura */}
                    {selectedInvoice && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Receipt className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            Orden de Servicio
                                        </p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {editForm.service_order_number}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Cliente
                                    </p>
                                    <p className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">
                                        {editForm.client_name}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Datos del Documento
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">
                                    Número de Factura *
                                </Label>
                                <Input
                                    value={editForm.invoice_number}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            invoice_number: e.target.value,
                                        })
                                    }
                                    className="font-mono uppercase"
                                    required
                                />
                            </div>
                            <div>
                                <Label
                                    className={cn(
                                        "mb-1.5 block",
                                        editForm.is_dte_issued &&
                                            "text-slate-400"
                                    )}
                                >
                                    Tipo de Documento *
                                    {editForm.is_dte_issued && (
                                        <span className="text-[10px] ml-2">
                                            (bloqueado)
                                        </span>
                                    )}
                                </Label>
                                <SelectERP
                                    value={editForm.invoice_type}
                                    onChange={(val) =>
                                        setEditForm({
                                            ...editForm,
                                            invoice_type: val,
                                        })
                                    }
                                    options={INVOICE_TYPE_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    disabled={editForm.is_dte_issued}
                                    required
                                />
                            </div>
                            <div>
                                <Label
                                    className={cn(
                                        "mb-1.5 block",
                                        editForm.is_dte_issued &&
                                            "text-slate-400"
                                    )}
                                >
                                    Fecha de Emisión *
                                    {editForm.is_dte_issued && (
                                        <span className="text-[10px] ml-2">
                                            (bloqueado)
                                        </span>
                                    )}
                                </Label>
                                <Input
                                    type="date"
                                    value={editForm.issue_date}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            issue_date: e.target.value,
                                        })
                                    }
                                    disabled={editForm.is_dte_issued}
                                    className={
                                        editForm.is_dte_issued
                                            ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                                            : ""
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">
                                    Fecha de Vencimiento
                                </Label>
                                <Input
                                    type="date"
                                    value={editForm.due_date}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            due_date: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Datos Fiscales DTE */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Datos Fiscales (DTE El Salvador)
                        </h4>
                        <div className="grid grid-cols-1 gap-5">
                            <div>
                                <Label className="mb-1.5 block">
                                    Código de Generación
                                </Label>
                                <Input
                                    value={editForm.generation_code}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            generation_code: e.target.value,
                                        })
                                    }
                                    className="font-mono uppercase"
                                    placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">
                                    Sello de Recepción
                                </Label>
                                <Input
                                    value={editForm.reception_stamp}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            reception_stamp: e.target.value,
                                        })
                                    }
                                    className="font-mono"
                                    placeholder="Sello de Hacienda..."
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Información Adicional
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-1.5 block">
                                    Notas Internas
                                </Label>
                                <Input
                                    value={editForm.notes}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            notes: e.target.value,
                                        })
                                    }
                                    placeholder="Observaciones sobre la factura..."
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">
                                    Copia Digital (PDF)
                                </Label>
                                <FileUpload
                                    accept=".pdf"
                                    onFileChange={(file) =>
                                        setEditForm({
                                            ...editForm,
                                            pdf_file: file,
                                        })
                                    }
                                    helperText={
                                        editForm.is_dte_issued
                                            ? "Puede actualizar el PDF del DTE emitido"
                                            : "Reemplazar archivo existente"
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setIsEditModalOpen(false)}
                        className="text-slate-500 font-semibold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdateInvoice}
                        className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px]"
                    >
                        Guardar Cambios
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
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
                                    <Badge
                                        variant={
                                            selectedInvoice.status === "paid"
                                                ? "success"
                                                : selectedInvoice.status ===
                                                  "partial"
                                                ? "warning"
                                                : selectedInvoice.status ===
                                                  "overdue"
                                                ? "danger"
                                                : "default"
                                        }
                                    >
                                        {selectedInvoice.status === "paid"
                                            ? "Pagada"
                                            : selectedInvoice.status ===
                                              "partial"
                                            ? "Pago Parcial"
                                            : selectedInvoice.status ===
                                              "overdue"
                                            ? "Vencida"
                                            : selectedInvoice.status ===
                                              "cancelled"
                                            ? "Anulada"
                                            : "Pendiente"}
                                    </Badge>
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
                                            className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors flex items-center gap-1 group"
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
                                invoice={selectedInvoice}
                                onUpdate={() => {
                                    fetchInvoices();
                                    fetchSummary();
                                    if (selectedInvoice?.id) {
                                        handleViewInvoiceDetails(
                                            selectedInvoice.id
                                        );
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
                                onClick={() => setIsDetailModalOpen(false)}
                            >
                                Cerrar
                            </Button>
                            {selectedInvoice.status !== "paid" &&
                                selectedInvoice.status !== "cancelled" && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setIsDetailModalOpen(false);
                                            handleOpenPaymentItemsModal(
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

            <ConfirmDialog
                open={deleteConfirm.open}
                onClose={() =>
                    setDeleteConfirm({ open: false, id: null, type: null })
                }
                onConfirm={
                    deleteConfirm.type === "credit-note"
                        ? handleDeleteCreditNote
                        : handleDeleteInvoice
                }
                title={
                    deleteConfirm.type === "credit-note"
                        ? "¿Eliminar Nota de Crédito?"
                        : "¿Eliminar Factura?"
                }
                description="Esta acción no se puede deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
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
                        handleViewInvoiceDetails(selectedInvoice.id);
                    }
                }}
            />
        </div>
    );
};

export default Invoicing;
