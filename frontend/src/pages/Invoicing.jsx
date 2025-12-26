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
import { FileUpload, SelectERP, ConfirmDialog, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, Skeleton, SkeletonTable } from "../components/ui";
import api from "../lib/axios";
import { cn, formatCurrency, formatDate, getTodayDate } from "../lib/utils";
import toast from "react-hot-toast";
import InvoiceItemsEditor from "../components/InvoiceItemsEditor";

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
    const config = INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.pending;
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
        DTE: { label: "DTE", className: "text-slate-600 bg-slate-100 border-transparent" },
        FEX: { label: "FEX", className: "text-indigo-600 bg-indigo-50 border-indigo-100" },
        INTL: { label: "INTL", className: "text-teal-600 bg-teal-50 border-teal-100" },
    };
    const c = config[type] || config.DTE;
    return (
        <span className={cn("inline-flex items-center px-1.5 py-0.5 text-[10px] font-bold rounded border", c.className)}>
            {c.label}
        </span>
    );
};

// ============================================
// KPI CARD - REFINED
// ============================================
const KPICard = ({
    label,
    value,
    subtext,
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
                {subtext && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5 truncate">
                        {subtext}
                    </p>
                )}
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">
                {Icon && <Icon className="w-6 h-6 text-slate-400" />}
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
        pending_count: 0,
        paid_count: 0,
        overdue_count: 0,
        partial_count: 0,
    });

    // UI State
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [isEditingCN, setIsEditingCN] = useState(false);
    const [editingCNId, setEditingCNId] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
        type: null, // 'invoice' | 'credit-note'
    });

    // Billable items state
    const [billableItems, setBillableItems] = useState([]);
    const [selectedItemIds, setSelectedItemIds] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);

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

    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: getTodayDate(),
        payment_method: "transferencia",
        reference: "",
        notes: "",
    });

    // Generate invoice form
    const [generateForm, setGenerateForm] = useState({
        service_order: "",
        client: "",
        client_name: "",
        invoice_date: getTodayDate(),
        due_date: "",
        invoice_number: "",
        invoice_type: "DTE", // DTE, FEX, CCF
        total_amount: "",
        invoice_file: null,
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

    // Credit Note form
    const [creditNoteForm, setCreditNoteForm] = useState({
        amount: "",
        note_number: "",
        reason: "",
        issue_date: getTodayDate(),
        pdf_file: null,
    });

    // Data fetching
    useEffect(() => {
        fetchInvoices();
        fetchCreditNotes();
        fetchSummary();
        fetchClients();
        fetchAllServiceOrders();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await api.get("/orders/invoices/");
            setInvoices(response.data);
        } catch (error) {
            toast.error("No se pudieron cargar las facturas.");
        } finally {
            setLoading(false);
        }
    };

    const fetchCreditNotes = async () => {
        try {
            const response = await api.get("/orders/credit-notes/");
            setCreditNotes(response.data);
        } catch (error) {
            console.error("Error al cargar notas de crédito");
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await api.get("/orders/invoices/summary/");
            setSummary(response.data);
        } catch (error) {
            console.error("Error loading summary");
        }
    };

    const fetchClients = async () => {
        try {
            const response = await api.get("/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Error loading clients");
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

    // Calculate totals based on selected items (for invoice generation)
    const selectedTotals = useMemo(() => {
        let subtotal = 0;
        let iva = 0;
        let total = 0;

        billableItems.forEach((item) => {
            if (selectedItemIds.includes(item.id)) {
                subtotal += parseFloat(item.amount || 0);
                iva += parseFloat(item.iva || 0);
                total += parseFloat(item.total || 0);
            }
        });

        return { subtotal, iva, total };
    }, [billableItems, selectedItemIds]);

    // Auto-update total amount when selected items change
    useEffect(() => {
        if (billableItems.length > 0 && selectedItemIds.length > 0) {
            const roundedTotal = Math.round(selectedTotals.total * 100) / 100;
            setGenerateForm((prev) => ({
                ...prev,
                total_amount: roundedTotal.toFixed(2),
            }));
        }
    }, [selectedTotals, billableItems.length, selectedItemIds.length]);

    // Fetch billable items for a service order
    const fetchBillableItems = async (orderId) => {
        if (!orderId) {
            setBillableItems([]);
            setSelectedItemIds([]);
            return;
        }

        try {
            setLoadingItems(true);
            const response = await api.get(
                `/orders/service-orders/${orderId}/billable_items/`
            );
            // El endpoint devuelve {items: [], summary: {}}
            const items = response.data.items || [];
            setBillableItems(items);
            // Select all items by default
            setSelectedItemIds(items.map((item) => item.id));
        } catch (error) {
            console.error("Error fetching billable items:", error);
            toast.error("No se pudieron cargar los items facturables.");
            setBillableItems([]);
            setSelectedItemIds([]);
        } finally {
            setLoadingItems(false);
        }
    };

    // Handlers
    const handleServiceOrderSelect = (orderId) => {
        const selectedOrder = allServiceOrders.find((o) => o.id === orderId);
        if (!selectedOrder) {
            setGenerateForm({
                ...generateForm,
                service_order: "",
                client: "",
                client_name: "",
                total_amount: "",
                due_date: "",
            });
            setBillableItems([]);
            setSelectedItemIds([]);
            return;
        }

        const client = clients.find((c) => c.id === selectedOrder.client);
        let dueDate = "";
        if (client && client.credit_days > 0) {
            const invoiceDate = new Date(generateForm.invoice_date);
            invoiceDate.setDate(invoiceDate.getDate() + client.credit_days);
            dueDate = invoiceDate.toISOString().split("T")[0];
        }

        setGenerateForm({
            ...generateForm,
            service_order: orderId,
            client: selectedOrder.client,
            client_name: selectedOrder.client_name || client?.name || "",
            total_amount: selectedOrder.total_amount || "",
            due_date: dueDate,
        });

        // Fetch billable items for this order
        fetchBillableItems(orderId);
    };

    const handleOpenEditCNModal = (nc) => {
        setLoading(true);
        api.get(`/orders/invoices/${nc.invoice_id}/`)
            .then((res) => {
                setSelectedInvoice(res.data);
                setCreditNoteForm({
                    amount: nc.amount,
                    note_number: nc.note_number,
                    reason: nc.reason,
                    issue_date: nc.issue_date,
                    pdf_file: null,
                });
                setEditingCNId(nc.id);
                setIsEditingCN(true);
                setIsCreditNoteModalOpen(true);
            })
            .catch(() => toast.error("No se pudieron cargar los datos para edición."))
            .finally(() => setLoading(false));
    };

    const handleSubmitCreditNote = async (e) => {
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

            if (isEditingCN) {
                await api.patch(
                    `/orders/credit-notes/${editingCNId}/`,
                    formData,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                    }
                );
                toast.success("La nota de crédito ha sido actualizada correctamente.");
            } else {
                await api.post(
                    `/orders/invoices/${selectedInvoice.id}/add_credit_note/`,
                    formData,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                    }
                );
                toast.success("La nota de crédito ha sido registrada correctamente.");
            }

            setIsCreditNoteModalOpen(false);
            setCreditNoteForm({
                amount: "",
                note_number: "",
                reason: "",
                issue_date: getTodayDate(),
                pdf_file: null,
            });
            setIsEditingCN(false);
            setEditingCNId(null);
            fetchInvoices();
            fetchCreditNotes();
            fetchSummary();
            if (isDetailModalOpen && selectedInvoice) {
                handleViewInvoiceDetails(selectedInvoice.id);
            }
        } catch (error) {
            toast.error(
                error.response?.data?.error ||
                    "No se pudo procesar la nota de crédito."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleOpenPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentForm({
            amount: invoice.balance,
            payment_date: getTodayDate(),
            payment_method: "transferencia",
            reference: "",
            notes: "",
        });
        setIsPaymentModalOpen(true);
    };

    const handleOpenEditModal = (invoice) => {
        setSelectedInvoice(invoice);
        setEditForm({
            id: invoice.id,
            invoice_number: invoice.invoice_number || "",
            invoice_type: invoice.invoice_type || "DTE",
            issue_date: invoice.issue_date || "",
            due_date: invoice.due_date || "",
            total_amount: invoice.total_amount || "",
            notes: invoice.notes || "",
            pdf_file: null,
            client_name: invoice.client_name,
            service_order_number: invoice.service_order_number,
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateInvoice = async () => {
        if (
            !editForm.invoice_number ||
            !editForm.issue_date
        ) {
            toast.error("Complete los campos requeridos");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("invoice_number", editForm.invoice_number);
            formData.append("invoice_type", editForm.invoice_type);
            formData.append("issue_date", editForm.issue_date);
            formData.append("notes", editForm.notes);

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
        } catch (error) {
            toast.error(
                error.response?.data?.error || "No se pudo actualizar la factura."
            );
            console.error(error);
        }
    };

    const handleAddPayment = async () => {
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error("Ingrese un monto válido");
            return;
        }

        try {
            await api.post(
                `/orders/invoices/${selectedInvoice.id}/add_payment/`,
                paymentForm
            );
            toast.success("El pago ha sido registrado correctamente.");
            fetchInvoices();
            fetchSummary();
            setIsPaymentModalOpen(false);
        } catch (error) {
            toast.error(
                error.response?.data?.error || "No se pudo registrar el pago."
            );
        }
    };

    const handleGenerateInvoice = async () => {
        if (!generateForm.service_order) {
            toast.error("Debe seleccionar una orden de servicio");
            return;
        }

        if (selectedItemIds.length === 0) {
            toast.error("Debe seleccionar al menos un item para facturar");
            return;
        }

        try {
            // Separate items by type
            const selectedItems = billableItems.filter((item) =>
                selectedItemIds.includes(item.id)
            );
            const chargeIds = selectedItems
                .filter((item) => item.type === "service")
                .map((item) => item.original_id);
            const transferIds = selectedItems
                .filter((item) => item.type === "expense")
                .map((item) => item.original_id);

            const formData = new FormData();
            formData.append("service_order", generateForm.service_order);

            // Only append invoice_number if it has a value
            if (
                generateForm.invoice_number &&
                generateForm.invoice_number.trim() !== ""
            ) {
                formData.append(
                    "invoice_number",
                    generateForm.invoice_number.trim()
                );
            }

            formData.append("invoice_type", generateForm.invoice_type);
            formData.append("issue_date", generateForm.invoice_date);
            formData.append("total_amount", generateForm.total_amount);

            // Add selected item IDs - each as separate entries
            chargeIds.forEach((id) => formData.append("charge_ids", id));
            transferIds.forEach((id) => formData.append("transfer_ids", id));

            if (generateForm.due_date) {
                formData.append("due_date", generateForm.due_date);
            }
            if (generateForm.invoice_file) {
                formData.append("pdf_file", generateForm.invoice_file);
            }

            const response = await api.post("/orders/invoices/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            const invoiceNumber = response.data.invoice_number || "sin número";
            toast.success(
                `La pre-factura ${invoiceNumber} ha sido registrada correctamente. Puede editarla antes de emitir el DTE.`,
                { duration: 5000 }
            );
            fetchInvoices();
            fetchSummary();
            fetchAllServiceOrders();
            setIsGenerateModalOpen(false);
            resetGenerateForm();
        } catch (error) {
            toast.error(
                error.response?.data?.error || "No se pudo registrar la factura."
            );
            console.error(error);
        }
    };

    const resetGenerateForm = () => {
        setGenerateForm({
            service_order: "",
            client: "",
            client_name: "",
            invoice_date: getTodayDate(),
            due_date: "",
            invoice_number: "",
            invoice_type: "DTE",
            total_amount: "",
            invoice_file: null,
        });
        setBillableItems([]);
        setSelectedItemIds([]);
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
        const dataToExport = exportType === "filtered" ? filteredInvoices : invoices;

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
            const filename = exportType === "filtered"
                ? `GPRO_CXC_Filtradas_${timestamp}.xlsx`
                : `GPRO_CXC_${timestamp}.xlsx`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            const message = exportType === "filtered"
                ? `${dataToExport.length} factura(s) exportada(s)`
                : "Todas las facturas exportadas correctamente";
            toast.success(message);
        } catch (error) {
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
            setDeleteConfirm({ open: false, id: null });
            fetchInvoices();
            fetchSummary();
        } catch (error) {
            toast.error(
                error.response?.data?.error || "No se pudo eliminar la factura."
            );
        }
    };

    const handleDeleteCreditNote = async () => {
        if (!deleteConfirm.id) return;

        try {
            await api.delete(`/orders/credit-notes/${deleteConfirm.id}/`);
            toast.success("La nota de crédito ha sido eliminada.");
            setDeleteConfirm({ open: false, id: null, type: null });
            fetchCreditNotes();
            fetchInvoices();
            fetchSummary();
        } catch (error) {
            toast.error("No se pudo eliminar la nota de crédito.");
        }
    };

    const handleViewInvoiceDetails = async (invoiceId) => {
        try {
            const response = await api.get(`/orders/invoices/${invoiceId}/`);
            setSelectedInvoice(response.data);
            setIsDetailModalOpen(true);
        } catch (error) {
            toast.error("No se pudieron cargar los detalles de la factura.");
        }
    };

    // Credit Note columns
    const ncColumns = [
        {
            header: "No. Nota de Crédito",
            accessor: "note_number",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col py-1">
                    <span className="font-mono font-semibold text-slate-700 text-sm">
                        {row.note_number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {formatDate(row.issue_date, { format: 'short' })}
                    </span>
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
                        onClick={() => handleViewInvoiceDetails(row.invoice_id)}
                        className="font-mono text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline text-left w-fit"
                    >
                        {row.invoice_number}
                    </button>
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-[180px] mt-0.5" title={row.client_name}>
                        {row.client_name}
                    </span>
                </div>
            ),
        },
        {
            header: "Motivo / Razón",
            accessor: "reason",
            sortable: false,
            render: (row) => (
                <div className="max-w-xs py-1">
                    <span
                        className="text-xs text-slate-600 font-medium line-clamp-2"
                        title={row.reason}
                    >
                        {row.reason}
                    </span>
                </div>
            ),
        },
        {
            header: "Monto",
            accessor: "amount",
            sortable: false,
            render: (row) => (
                <div className="text-right py-1">
                    <span className="font-bold text-purple-700 tabular-nums text-sm">
                        -{formatCurrency(row.amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[120px] text-center",
            headerClassName: "text-center",
            sortable: false,
            render: (row) => (
                <div className="grid grid-cols-3 gap-1 w-full max-w-[100px] mx-auto">
                    <div className="flex justify-center">
                        {row.pdf_file ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(row.pdf_file, "_blank");
                                }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Ver PDF"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
                    <div className="flex justify-center">
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
                    </div>
                    <div className="flex justify-center">
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
                                navigate(`/service-orders/${row.service_order}`);
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
                    <div className="font-medium text-slate-700 text-sm truncate" title={row.client_name}>
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
                    {row.issue_date
                        ? new Date(
                              row.issue_date + "T00:00:00"
                          ).toLocaleDateString("es-SV", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                          })
                        : "-"}
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
                                {new Date(
                                    row.due_date + "T00:00:00"
                                ).toLocaleDateString("es-SV", {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                })}
                            </div>
                            {row.days_overdue > 0 && (
                                <div className="text-[9px] text-red-600 font-bold uppercase tracking-tight">
                                    {row.days_overdue}d vencida
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
                    <div className={cn(
                        "text-sm font-semibold tabular-nums tracking-tight",
                        row.paid_amount > 0 ? "text-emerald-700" : "text-slate-300"
                    )}>
                        {row.paid_amount > 0 ? formatCurrency(row.paid_amount) : "—"}
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
                        {parseFloat(row.balance) > 0.01 ? formatCurrency(row.balance) : <span className="flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> $0.00</span>}
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
            className: "w-[160px] text-center",
            headerClassName: "text-center",
            sortable: false,
            render: (row) => (
                <div className="grid grid-cols-4 gap-1 w-full max-w-[140px] mx-auto">
                    <div className="flex justify-center">
                        {parseFloat(row.balance) > 0.01 && row.status !== "cancelled" ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentModal(row);
                                }}
                                title="Registrar Pago"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                            >
                                <Banknote className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoiceDetails(row.id);
                            }}
                            title="Ver Detalle"
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        {!row.is_dte_issued ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenEditModal(row);
                                }}
                                title="Editar Factura"
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
                    <div className="flex justify-center">
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
        <div className="space-y-6 animate-in fade-in duration-500 mt-2">
            
            {/* Bloque Estratégico (KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Total facturado"
                    value={formatCurrency(summary.total_invoiced)}
                    icon={Receipt}
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
                <KPICard
                    label="Cartera vencida"
                    value={formatCurrency(summary.total_overdue)}
                    subtext={`${summary.overdue_count || 0} facturas`}
                    icon={AlertTriangle}
                />
                <KPICard
                    label="Pagos parciales"
                    value={summary.partial_count || 0}
                    subtext="En proceso"
                    icon={CalendarClock}
                />
            </div>

            {/* Bloque Operativo (Tabla + Herramientas) */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Barra de Herramientas Unificada */}
                <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row items-center justify-between gap-4 bg-slate-50/30">
                    
                    {/* Izquierda: Tabs + Buscador + Filtro */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 flex-1 w-full xl:max-w-4xl">
                        
                        {/* Tabs Integradas */}
                        <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50 shrink-0 w-full sm:w-auto">
                            <button
                                onClick={() => setActiveTab("invoices")}
                                className={cn(
                                    "flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
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
                                    "flex-1 sm:flex-none px-4 py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                    activeTab === "credit-notes"
                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                Notas Crédito
                            </button>
                        </div>

                        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                        {/* Search & Filter */}
                        <div className="flex items-center gap-2 flex-1 w-full">
                            <div className="relative flex-1 group">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                <input
                                    placeholder={activeTab === "invoices" ? "Buscar factura, cliente, OS..." : "Buscar nota crédito..."}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                                />
                            </div>
                            {activeTab === "invoices" && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                    className={cn(
                                        "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all",
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
                            )}
                        </div>
                    </div>

                    {/* Derecha: Botones de Acción */}
                    <div className="flex items-center gap-3 w-full xl:w-auto justify-end">
                        <div className="h-6 w-px bg-slate-200 hidden xl:block" />

                        <ExportButton
                            onExportAll={() => handleExportExcel("all")}
                            onExportFiltered={() => handleExportExcel("filtered")}
                            filteredCount={filteredInvoices.length}
                            totalCount={invoices.length}
                            isExporting={isExporting}
                            allLabel="Todas las Facturas"
                            allDescription="Exportar el registro completo de facturas"
                            filteredLabel="Facturas Filtradas"
                            filteredDescription="Exportar solo las facturas visibles actualmente"
                        />

                        <Button
                            size="sm"
                            onClick={() => setIsGenerateModalOpen(true)}
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nueva Factura
                        </Button>
                    </div>
                </div>

                {/* Advanced Filters Panel */}
                {isFiltersOpen && activeTab === "invoices" && (
                    <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <SelectERP
                                label="Cliente"
                                value={filters.client}
                                onChange={(val) => setFilters({ ...filters, client: val })}
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
                                onChange={(val) => setFilters({ ...filters, status: val })}
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
                                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                                        placeholder="Desde"
                                    />
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
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
                            onRowClick={(row) => handleViewInvoiceDetails(row.id)}
                            emptyMessage="No se encontraron facturas registradas."
                        />
                    ) : (
                        <DataTable
                            data={creditNotes}
                            columns={ncColumns}
                            loading={loading}
                            emptyMessage="No hay notas de crédito registradas."
                            searchable={false} // Managed by global search
                        />
                    )}
                </div>
            </div>

            {/* ... Modals (Credit Note, Payment, Generate, Edit, Detail) ... */}
            {/* The rest of the modal code is preserved but hidden for brevity in this replace block since it wasn't modified stylistically beyond standard components */}
            
            {/* Credit Note Modal */}
            <Modal
                isOpen={isCreditNoteModalOpen}
                onClose={() => {
                    setIsCreditNoteModalOpen(false);
                    setSelectedInvoice(null);
                    setIsEditingCN(false);
                    setEditingCNId(null);
                    setCreditNoteForm({
                        amount: "",
                        note_number: "",
                        reason: "",
                        issue_date: getTodayDate(),
                        pdf_file: null,
                    });
                }}
                title={isEditingCN ? "Editar Nota de Crédito" : "Registrar Nota de Crédito"}
                size="2xl"
            >
                <form onSubmit={handleSubmitCreditNote} className="space-y-6">
                    {selectedInvoice && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Receipt className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Factura Origen</p>
                                        <p className="text-sm font-bold text-slate-700 font-mono">
                                            {selectedInvoice.invoice_number}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Pendiente</p>
                                    <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                                        {formatCurrency(selectedInvoice.balance)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                            Detalle de la Nota de Crédito
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">Número de Nota de Crédito *</Label>
                                <Input
                                    value={creditNoteForm.note_number}
                                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, note_number: e.target.value })}
                                    placeholder="Ej: NC-00123"
                                    className="font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha de Emisión *</Label>
                                <Input
                                    type="date"
                                    value={creditNoteForm.issue_date}
                                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, issue_date: e.target.value })}
                                    required
                                />
                            </div>
                            
                            <div className="md:col-span-2">
                                <Label className="mb-1.5 block">Monto a Acreditar *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={isEditingCN ? undefined : selectedInvoice?.balance}
                                        value={creditNoteForm.amount}
                                        onChange={(e) => setCreditNoteForm({ ...creditNoteForm, amount: e.target.value })}
                                        className="pl-7 font-mono font-bold text-slate-900"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                <p className="text-[10px] text-slate-500 mt-1.5">
                                    {isEditingCN 
                                        ? "El monto no puede superar el saldo pendiente ajustable." 
                                        : `Máximo acreditable: ${formatCurrency(selectedInvoice?.balance || 0)}`}
                                </p>
                            </div>

                            <div className="md:col-span-2">
                                <Label className="mb-1.5 block">Motivo / Razón *</Label>
                                <Input
                                    value={creditNoteForm.reason}
                                    onChange={(e) => setCreditNoteForm({ ...creditNoteForm, reason: e.target.value })}
                                    placeholder="Ej: Devolución parcial de servicios, error en precio..."
                                    required
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="mb-1.5 block">Documento Digital (PDF)</Label>
                                <FileUpload
                                    accept=".pdf"
                                    onFileChange={(file) => setCreditNoteForm({ ...creditNoteForm, pdf_file: file })}
                                    helperText="Suba la copia digital de la nota de crédito"
                                />
                            </div>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setIsCreditNoteModalOpen(false);
                                setSelectedInvoice(null);
                                setIsEditingCN(false);
                            }}
                            className="text-slate-500 font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-100 transition-all active:scale-95 min-w-[160px]"
                        >
                            {isSubmitting ? "Procesando..." : isEditingCN ? "Actualizar Nota" : "Registrar Nota"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Registrar Abono / Cancelación"
                size="lg"
            >
                {selectedInvoice && (
                    <div className="space-y-6">
                        {/* Invoice Summary */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                        <Building2 className="w-5 h-5 text-slate-500" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cliente</p>
                                        <p className="text-sm font-bold text-slate-700 truncate max-w-[240px]">
                                            {selectedInvoice.client_name}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                            DOC: {selectedInvoice.invoice_number}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Saldo Pendiente</p>
                                    <p className="text-2xl font-black text-red-600 tabular-nums tracking-tight">
                                        {formatCurrency(selectedInvoice.balance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Detalles del Recibo
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <Label className="mb-1.5 block">Monto a Recibir *</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={selectedInvoice.balance}
                                            value={paymentForm.amount}
                                            onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                            className="pl-7 font-mono font-bold text-slate-900 text-lg"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">Fecha de Cobro *</Label>
                                    <Input
                                        type="date"
                                        value={paymentForm.payment_date}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label className="mb-1.5 block">Método de Pago</Label>
                                    <SelectERP
                                        value={paymentForm.payment_method}
                                        onChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                                        options={[
                                            { id: "transferencia", name: "Transferencia Bancaria" },
                                            { id: "efectivo", name: "Efectivo" },
                                            { id: "cheque", name: "Cheque" },
                                            { id: "deposito", name: "Depósito Bancario" },
                                            { id: "tarjeta", name: "Tarjeta" },
                                        ]}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">Referencia / Comprobante</Label>
                                    <Input
                                        value={paymentForm.reference}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                        placeholder="Ej: TRANS-9988"
                                    />
                                </div>

                                <div className="md:col-span-2">
                                    <Label className="mb-1.5 block">Observaciones</Label>
                                    <Input
                                        value={paymentForm.notes}
                                        onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                                        placeholder="Detalles adicionales..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Payment Impact Preview */}
                        {paymentForm.amount && parseFloat(paymentForm.amount) > 0 && (
                            <div className="bg-slate-900 rounded-xl p-5 text-white shadow-lg">
                                <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nuevo Saldo Proyectado</span>
                                    <span className="text-2xl font-black tabular-nums">
                                        {formatCurrency(Math.max(0, parseFloat(selectedInvoice.balance) - parseFloat(paymentForm.amount || 0)))}
                                    </span>
                                </div>
                                {parseFloat(selectedInvoice.balance) - parseFloat(paymentForm.amount || 0) <= 0.01 && (
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <CheckCircle className="w-4 h-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Factura será marcada como pagada</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <ModalFooter>
                            <Button
                                variant="ghost"
                                onClick={() => setIsPaymentModalOpen(false)}
                                className="text-slate-500 font-semibold"
                            >
                                Cancelar
                            </Button>
                            <Button 
                                onClick={handleAddPayment}
                                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95 min-w-[160px]"
                            >
                                <Banknote className="w-4 h-4 mr-2" />
                                Confirmar Cobro
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>

            {/* Generate Invoice Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => {
                    setIsGenerateModalOpen(false);
                    resetGenerateForm();
                }}
                title="Nueva Pre-factura"
                size="3xl"
            >
                <div className="space-y-6">
                    {/* Section 1: Origen */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Selección de Orden
                        </h4>
                        
                        <div className="grid grid-cols-1 gap-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                                <SelectERP
                                    label="Orden de Servicio"
                                    value={generateForm.service_order}
                                    onChange={handleServiceOrderSelect}
                                    options={[
                                        { id: "", name: "Seleccionar orden de servicio..." },
                                        ...allServiceOrders.map((o) => ({
                                            id: o.id,
                                            name: `${o.order_number} - ${o.client_name} - ${formatCurrency(o.total_amount || 0)}`,
                                        })),
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    placeholder="Buscar por número de OS o cliente..."
                                    required
                                />

                                {generateForm.client_name && (
                                    <div className="mt-6 md:mt-0 p-3 bg-slate-50 border border-slate-200 rounded-md flex items-center gap-3">
                                        <div className="p-2 bg-white border border-slate-200 rounded-full shrink-0">
                                            <Building2 className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-0.5">Cliente de Facturación</span>
                                            <p className="text-sm font-bold text-slate-900 truncate" title={generateForm.client_name}>{generateForm.client_name}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Items to Bill */}
                    {generateForm.service_order && (
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pt-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Conceptos Facturables
                            </h4>

                            {loadingItems ? (
                                <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
                                    <RefreshCw className="animate-spin h-8 w-8 text-slate-400 mx-auto mb-3" />
                                    <p className="text-sm text-slate-500 font-medium">Cargando items disponibles...</p>
                                </div>
                            ) : billableItems.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                                    <div className="p-3 bg-white rounded-full mb-3 border border-slate-200 shadow-sm">
                                        <CheckCircle className="w-6 h-6 text-slate-300" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-900">Sin cargos pendientes</p>
                                    <p className="text-xs text-slate-500 mt-1">Todos los conceptos de esta orden ya han sido facturados.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Items Table - ERP Style */}
                                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                                        <div className="overflow-x-auto max-h-[300px]">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="w-12 p-3 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedItemIds.length === billableItems.length && billableItems.length > 0}
                                                                onChange={(e) => setSelectedItemIds(e.target.checked ? billableItems.map((i) => i.id) : [])}
                                                                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                                            />
                                                        </th>
                                                        <th className="text-left p-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider">Detalle del Concepto</th>
                                                        <th className="text-right p-3 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-32">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {billableItems.map((item) => {
                                                        const isSelected = selectedItemIds.includes(item.id);
                                                        return (
                                                            <tr
                                                                key={item.id}
                                                                className={cn("transition-colors cursor-pointer", isSelected ? "bg-blue-50/30" : "hover:bg-slate-50")}
                                                                onClick={() => {
                                                                    setSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
                                                                }}
                                                            >
                                                                <td className="p-3 text-center">
                                                                    <input type="checkbox" checked={isSelected} readOnly className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
                                                                </td>
                                                                <td className="p-3">
                                                                    <div className="flex flex-col">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border", item.type === "service" ? "bg-slate-100 text-slate-700 border-slate-200" : "bg-indigo-50 text-indigo-700 border-indigo-100")}>
                                                                                {item.type === "service" ? "Honorario" : "Reembolsable"}
                                                                            </span>
                                                                            <span className="text-xs font-semibold text-slate-700">{item.description}</span>
                                                                        </div>
                                                                        {item.notes && <span className="text-[10px] text-slate-400 font-medium italic">{item.notes}</span>}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                                                                    {formatCurrency(item.total)}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Totals Preview */}
                                    <div className="flex justify-end pt-2">
                                        <div className="w-72 bg-slate-900 rounded-xl p-5 text-white shadow-lg">
                                            <div className="space-y-2 border-b border-white/10 pb-3 mb-3">
                                                <div className="flex justify-between text-xs text-slate-400">
                                                    <span>Base Imponible:</span>
                                                    <span className="font-mono tabular-nums">{formatCurrency(selectedTotals.subtotal)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs text-slate-400">
                                                    <span>IVA (13%):</span>
                                                    <span className="font-mono tabular-nums">{formatCurrency(selectedTotals.iva)}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-black uppercase tracking-widest text-slate-200">Total a Facturar:</span>
                                                <span className="text-2xl font-black tabular-nums">{formatCurrency(selectedTotals.total)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Section 3: Documentación */}
                    <div className="pt-2">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Datos del Documento
                        </h4>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="md:col-span-2 grid grid-cols-2 gap-5">
                                <div>
                                    <Label className="mb-1.5 block">N° de Factura / Pre-correlativo</Label>
                                    <Input
                                        value={generateForm.invoice_number}
                                        onChange={(e) => setGenerateForm({ ...generateForm, invoice_number: e.target.value })}
                                        placeholder="Opcional"
                                        className="font-mono uppercase"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">Tipo de Documento</Label>
                                    <SelectERP
                                        value={generateForm.invoice_type}
                                        onChange={(val) => setGenerateForm({ ...generateForm, invoice_type: val })}
                                        options={INVOICE_TYPE_OPTIONS}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="mb-1.5 block">Fecha de Emisión</Label>
                                <Input
                                    type="date"
                                    value={generateForm.invoice_date}
                                    onChange={(e) => setGenerateForm({ ...generateForm, invoice_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha de Vencimiento</Label>
                                <Input
                                    type="date"
                                    value={generateForm.due_date}
                                    onChange={(e) => setGenerateForm({ ...generateForm, due_date: e.target.value })}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <Label className="mb-1.5 block">Copia Digital (PDF)</Label>
                                <FileUpload
                                    accept=".pdf"
                                    onFileChange={(file) => setGenerateForm({ ...generateForm, invoice_file: file })}
                                    helperText="Adjunte el documento digital si ya fue emitido"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsGenerateModalOpen(false);
                            resetGenerateForm();
                        }}
                        className="text-slate-500 font-semibold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerateInvoice}
                        disabled={selectedItemIds.length === 0 || isSubmitting}
                        className="bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[160px]"
                    >
                        {isSubmitting ? "Procesando..." : "Generar Pre-factura"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Invoice Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Factura"
                size="lg"
            >
                <div className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Datos Generales
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">Número de Factura *</Label>
                                <Input
                                    value={editForm.invoice_number}
                                    onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                                    className="font-mono uppercase"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Tipo de Documento *</Label>
                                <SelectERP
                                    value={editForm.invoice_type}
                                    onChange={(val) => setEditForm({ ...editForm, invoice_type: val })}
                                    options={INVOICE_TYPE_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha de Emisión *</Label>
                                <Input
                                    type="date"
                                    value={editForm.issue_date}
                                    onChange={(e) => setEditForm({ ...editForm, issue_date: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha de Vencimiento</Label>
                                <Input
                                    type="date"
                                    value={editForm.due_date}
                                    onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-slate-100" />

                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Información Adicional
                        </h4>
                        <div className="space-y-4">
                            <div>
                                <Label className="mb-1.5 block">Notas Internas</Label>
                                <Input
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                    placeholder="Observaciones sobre la factura..."
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Copia Digital (PDF)</Label>
                                <FileUpload
                                    accept=".pdf"
                                    onFileChange={(file) => setEditForm({ ...editForm, pdf_file: file })}
                                    helperText="Reemplazar archivo existente"
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
                    <Button onClick={handleUpdateInvoice} className="bg-amber-600 text-white hover:bg-amber-700">
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
                    <InvoiceItemsEditor
                        invoice={selectedInvoice}
                        onUpdate={() => {
                            fetchInvoices();
                            fetchSummary();
                        }}
                    />
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
        </div>
    );
};

export default Invoicing;
