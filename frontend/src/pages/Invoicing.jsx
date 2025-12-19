import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Banknote,
    FileText,
    AlertTriangle,
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
    Trash2,
    Info,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    StatCard,
    MetricCard,
} from "../components/ui/Card";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Label } from "../components/ui/Label";
import Modal, { ModalFooter } from "../components/ui/Modal";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { FileUpload, SelectERP, ConfirmDialog } from "../components/ui";
import api from "../lib/axios";
import { cn, formatCurrency, formatDate, getTodayDate } from "../lib/utils";
import toast from "react-hot-toast";
import InvoiceItemsEditor from "../components/InvoiceItemsEditor";

/**
 * Invoicing - Módulo de Facturación y CXC
 * Design System Corporativo GPRO - REDISEÑADO
 * Enfocado en gestión administrativa de facturación (no fiscal)
 */

// Configuración de estados de factura
const INVOICE_STATUS_CONFIG = {
    pending: {
        label: "Pendiente",
        variant: "warning",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
    },
    partial: {
        label: "Pago Parcial",
        variant: "info",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
    },
    paid: {
        label: "Pagada",
        variant: "success",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    overdue: {
        label: "Vencida",
        variant: "danger",
        bgColor: "bg-red-50",
        textColor: "text-red-700",
        borderColor: "border-red-200",
        dotColor: "bg-red-500",
    },
    cancelled: {
        label: "Anulada",
        variant: "default",
        bgColor: "bg-slate-50",
        textColor: "text-slate-600",
        borderColor: "border-slate-200",
        dotColor: "bg-slate-400",
    },
};

// Componente de Badge de Estado
const InvoiceStatusBadge = ({ status }) => {
    const config =
        INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.pending;
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border",
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

// Opciones de Tipo de Factura
const INVOICE_TYPE_OPTIONS = [
    { id: "DTE", name: "DTE - Documento Tributario Electrónico" },
    { id: "FEX", name: "FEX - Factura de Exportación" },
    { id: "CCF", name: "CCF - Comprobante de Crédito Fiscal" },
];

// Badge de Tipo de Factura
const InvoiceTypeBadge = ({ type }) => {
    const config = {
        DTE: {
            label: "DTE",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            borderColor: "border-blue-200",
        },
        FEX: {
            label: "FEX",
            bgColor: "bg-purple-50",
            textColor: "text-purple-700",
            borderColor: "border-purple-200",
        },
        CCF: {
            label: "CCF",
            bgColor: "bg-emerald-50",
            textColor: "text-emerald-700",
            borderColor: "border-emerald-200",
        },
    };
    const c = config[type] || config.DTE;
    return (
        <span
            className={cn(
                "inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded border",
                c.bgColor,
                c.textColor,
                c.borderColor
            )}
        >
            {c.label}
        </span>
    );
};

// Componente KPI Card - Estilo limpio similar a Service Orders
const KPICard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    variant = "default",
}) => {
    const variants = {
        default: "text-slate-900",
        primary: "text-brand-600",
        success: "text-emerald-600",
        warning: "text-amber-600",
        danger: "text-red-600",
    };

    return (
        <Card>
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            {title}
                        </p>
                        <p
                            className={cn(
                                "text-2xl font-semibold mt-1.5",
                                variants[variant]
                            )}
                        >
                            {value}
                        </p>
                        {subtitle && (
                            <p className="text-xs text-slate-400 mt-1">
                                {subtitle}
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
            toast.error("Error al cargar facturas");
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
            toast.error("Error al cargar órdenes de servicio");
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
            toast.error("Error al cargar items facturables");
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
            .catch(() => toast.error("Error al cargar datos para edición"))
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
                toast.success("Nota de crédito actualizada exitosamente");
            } else {
                await api.post(
                    `/orders/invoices/${selectedInvoice.id}/add_credit_note/`,
                    formData,
                    {
                        headers: { "Content-Type": "multipart/form-data" },
                    }
                );
                toast.success("Nota de crédito registrada exitosamente");
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
                    "Error al procesar nota de crédito"
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

            toast.success("Factura actualizada exitosamente");
            fetchInvoices();
            fetchSummary();
            setIsEditModalOpen(false);
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al actualizar factura"
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
            toast.success("Pago registrado exitosamente");
            fetchInvoices();
            fetchSummary();
            setIsPaymentModalOpen(false);
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al registrar pago"
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

            // Debug: Log what we're sending
            console.log("Sending invoice with:");
            console.log("- Service Order:", generateForm.service_order);
            console.log("- Charge IDs:", chargeIds);
            console.log("- Transfer IDs:", transferIds);
            console.log("- Total Amount:", generateForm.total_amount);

            const response = await api.post("/orders/invoices/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            console.log("Invoice created successfully:", response.data);

            const invoiceNumber = response.data.invoice_number || "sin número";
            toast.success(
                `Pre-factura ${invoiceNumber} registrada exitosamente. Puede editar los items antes de marcar como DTE emitido.`,
                { duration: 5000 }
            );
            fetchInvoices();
            fetchSummary();
            fetchAllServiceOrders();
            setIsGenerateModalOpen(false);
            resetGenerateForm();
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al registrar factura"
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

    const handleExportExcel = async () => {
        if (filteredInvoices.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await api.get("/orders/invoices/export_excel/", {
                responseType: "blob",
                params: filters,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toLocaleDateString("en-CA");
            link.setAttribute("download", `GPRO_CXC_${timestamp}.xlsx`);
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

    const handleDeleteInvoice = async () => {
        if (!deleteConfirm.id) return;

        try {
            await api.delete(`/orders/invoices/${deleteConfirm.id}/`);
            toast.success("Factura eliminada correctamente");
            setDeleteConfirm({ open: false, id: null });
            fetchInvoices();
            fetchSummary();
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al eliminar factura"
            );
        }
    };

    const handleDeleteCreditNote = async () => {
        if (!deleteConfirm.id) return;

        try {
            await api.delete(`/orders/credit-notes/${deleteConfirm.id}/`);
            toast.success("Nota de crédito eliminada correctamente");
            setDeleteConfirm({ open: false, id: null, type: null });
            fetchCreditNotes();
            fetchInvoices();
            fetchSummary();
        } catch (error) {
            toast.error("Error al eliminar nota de crédito");
        }
    };

    const handleViewInvoiceDetails = async (invoiceId) => {
        try {
            const response = await api.get(`/orders/invoices/${invoiceId}/`);
            setSelectedInvoice(response.data);
            setIsDetailModalOpen(true);
        } catch (error) {
            toast.error("Error al cargar detalles de la factura");
        }
    };

    // Credit Note columns
    const ncColumns = [
        {
            header: "Número NC",
            accessor: "note_number",
            render: (row) => (
                <span className="font-mono font-medium text-purple-700 text-sm">
                    {row.note_number}
                </span>
            ),
        },
        {
            header: "Factura",
            accessor: "invoice_number",
            render: (row) => (
                <div>
                    <button
                        onClick={() => handleViewInvoiceDetails(row.invoice_id)}
                        className="font-mono text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                    >
                        {row.invoice_number}
                    </button>
                    <div className="text-xs text-slate-500">
                        {row.client_name}
                    </div>
                </div>
            ),
        },
        {
            header: "Fecha",
            accessor: "issue_date",
            render: (row) => (
                <span className="text-sm text-slate-700">
                    {formatDate(row.issue_date, { format: "short" })}
                </span>
            ),
        },
        {
            header: "Motivo",
            accessor: "reason",
            render: (row) => (
                <span
                    className="text-sm text-slate-600 max-w-xs truncate block"
                    title={row.reason}
                >
                    {row.reason}
                </span>
            ),
        },
        {
            header: "Monto Acreditado",
            accessor: "amount",
            render: (row) => (
                <div className="text-right">
                    <span className="font-semibold text-purple-700 tabular-nums">
                        -{formatCurrency(row.amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-24 text-right",
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    {row.pdf_file && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                window.open(row.pdf_file, "_blank");
                            }}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Ver PDF"
                        >
                            <FileText className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditCNModal(row);
                        }}
                        className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                        title="Editar Nota de Crédito"
                    >
                        <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({
                                open: true,
                                id: row.id,
                                type: "credit-note",
                            });
                        }}
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Eliminar Nota de Crédito"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    // Table columns
    const columns = [
        {
            header: "Doc.",
            accessor: "invoice_number",
            render: (row) => (
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-brand-600 text-sm">
                            {row.invoice_number}
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
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline mt-0.5 font-medium block text-left"
                        >
                            OS: {row.service_order_number}
                        </button>
                    )}
                </div>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            render: (row) => (
                <div>
                    <div className="font-medium text-slate-900 text-sm">
                        {row.client_name}
                    </div>
                    {row.ccf && (
                        <div className="text-xs text-slate-500">
                            CCF: {row.ccf}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Emisión",
            accessor: "issue_date",
            render: (row) => (
                <div className="text-sm text-slate-700">
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
            render: (row) => (
                <div>
                    {row.due_date ? (
                        <>
                            <div
                                className={cn(
                                    "text-sm font-medium",
                                    row.days_overdue > 0
                                        ? "text-red-600"
                                        : "text-slate-700"
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
                                <div className="text-xs text-red-600 font-medium">
                                    {row.days_overdue} días vencida
                                </div>
                            )}
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">
                            Sin vencimiento
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Total",
            accessor: "total_amount",
            render: (row) => (
                <div className="text-right">
                    <div className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.total_amount)}
                    </div>
                </div>
            ),
        },
        {
            header: "Pagado",
            accessor: "paid_amount",
            render: (row) => (
                <div className="text-right">
                    <div className="text-sm text-emerald-600 tabular-nums font-medium">
                        {formatCurrency(row.paid_amount || 0)}
                    </div>
                </div>
            ),
        },
        {
            header: "Saldo",
            accessor: "balance",
            render: (row) => (
                <div className="text-right">
                    <div
                        className={cn(
                            "font-bold tabular-nums",
                            parseFloat(row.balance) > 0
                                ? "text-red-600"
                                : "text-emerald-600"
                        )}
                    >
                        {formatCurrency(row.balance)}
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
            header: "Factura PDF",
            accessor: "pdf_file",
            className: "w-16 text-center",
            headerClassName: "text-center",
            render: (row) =>
                row.pdf_file ? (
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(row.pdf_file, "_blank");
                        }}
                        title="Ver Factura (PDF)"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                        <FileText className="h-4 w-4" />
                    </Button>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                ),
        },
        {
            header: "Acciones",
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    {parseFloat(row.balance) > 0 &&
                        row.status !== "cancelled" && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentModal(row);
                                }}
                                title="Registrar Pago"
                                className="text-gray-500 hover:text-emerald-600"
                            >
                                <Banknote className="w-4 h-4" />
                            </Button>
                        )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewInvoiceDetails(row.id);
                        }}
                        title="Ver Detalle"
                        className="text-gray-500 hover:text-blue-600"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(row);
                        }}
                        title="Editar Factura"
                        className="text-gray-500 hover:text-amber-600"
                    >
                        <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirm({ open: true, id: row.id });
                        }}
                        title="Eliminar"
                        className="text-gray-400 hover:text-red-600"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Cuentas por Cobrar (CXC)
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Control administrativo de facturación, abonos y saldos
                        pendientes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchInvoices}
                        disabled={loading}
                        size="sm"
                    >
                        <RefreshCw
                            className={cn(
                                "w-4 h-4 mr-1.5",
                                loading && "animate-spin"
                            )}
                        />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExporting || filteredInvoices.length === 0}
                        size="sm"
                    >
                        <FileSpreadsheet
                            className={cn(
                                "w-4 h-4 mr-1.5",
                                isExporting && "animate-bounce"
                            )}
                        />
                        Exportar
                    </Button>
                    <Button onClick={() => setIsGenerateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Nueva Pre-factura
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    title="Total Facturado"
                    value={formatCurrency(summary.total_invoiced)}
                    icon={Receipt}
                    variant="primary"
                />
                <KPICard
                    title="Saldo Pendiente"
                    value={formatCurrency(summary.total_pending)}
                    subtitle={`${summary.pending_count || 0} facturas`}
                    icon={DollarSign}
                    variant="warning"
                />
                <KPICard
                    title="Total Cobrado"
                    value={formatCurrency(summary.total_collected)}
                    subtitle={`${summary.paid_count || 0} pagadas`}
                    icon={CheckCircle}
                    variant="success"
                />
                <KPICard
                    title="Cuentas Vencidas"
                    value={formatCurrency(summary.total_overdue)}
                    subtitle={`${summary.overdue_count || 0} vencidas`}
                    icon={AlertTriangle}
                    variant="danger"
                />
                <KPICard
                    title="Pagos Parciales"
                    value={summary.partial_count || 0}
                    subtitle="En proceso de cobro"
                    icon={CalendarClock}
                    variant="default"
                />
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab("invoices")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === "invoices"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                >
                    Facturas
                </button>
                <button
                    onClick={() => setActiveTab("credit-notes")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all",
                        activeTab === "credit-notes"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                    )}
                >
                    Notas de Crédito
                </button>
            </div>

            {/* Search and Filters Card */}
            {activeTab === "invoices" && (
                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            {/* Search Bar - Rediseñada */}
                            <div className="flex items-center gap-3 flex-1 max-w-2xl">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar por factura, cliente, CCF, orden de servicio..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="pl-10 pr-10"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <Button
                                    variant={
                                        isFiltersOpen ? "default" : "outline"
                                    }
                                    onClick={() =>
                                        setIsFiltersOpen(!isFiltersOpen)
                                    }
                                    className="shrink-0"
                                >
                                    <Filter className="w-4 h-4 mr-1.5" />
                                    Filtros
                                    {activeFiltersCount > 0 && (
                                        <Badge
                                            variant="primary"
                                            className="ml-2 px-1.5 py-0.5 h-5 text-xs"
                                        >
                                            {activeFiltersCount}
                                        </Badge>
                                    )}
                                </Button>
                            </div>

                            {/* Quick Stats */}
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-slate-500">
                                    Mostrando{" "}
                                    <span className="font-semibold text-slate-900">
                                        {filteredInvoices.length}
                                    </span>{" "}
                                    de{" "}
                                    <span className="font-semibold text-slate-900">
                                        {invoices.length}
                                    </span>{" "}
                                    facturas
                                </span>
                            </div>
                        </div>
                    </CardHeader>

                    {/* Advanced Filters Panel */}
                    {isFiltersOpen && (
                        <CardContent className="pt-0 pb-4 border-t border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg mt-4">
                                {/* Cliente */}
                                <div>
                                    <SelectERP
                                        label="Cliente"
                                        value={filters.client}
                                        onChange={(val) =>
                                            setFilters({
                                                ...filters,
                                                client: val,
                                            })
                                        }
                                        options={clients}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                        searchable
                                        clearable
                                        placeholder="Todos los clientes"
                                        size="sm"
                                    />
                                </div>

                                {/* Estado */}
                                <div>
                                    <SelectERP
                                        label="Estado"
                                        value={filters.status}
                                        onChange={(val) =>
                                            setFilters({
                                                ...filters,
                                                status: val,
                                            })
                                        }
                                        options={[
                                            {
                                                id: "pending",
                                                name: "Pendiente",
                                            },
                                            {
                                                id: "partial",
                                                name: "Pago Parcial",
                                            },
                                            { id: "paid", name: "Pagada" },
                                            { id: "overdue", name: "Vencida" },
                                            {
                                                id: "cancelled",
                                                name: "Anulada",
                                            },
                                        ]}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                        clearable
                                        placeholder="Todos los estados"
                                        size="sm"
                                    />
                                </div>

                                {/* Fecha de Emisión */}
                                <div>
                                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                        Fecha de Emisión
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
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

                                {/* Fecha de Vencimiento */}
                                <div>
                                    <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                        Fecha de Vencimiento
                                    </Label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Input
                                            type="date"
                                            value={filters.dueDateFrom}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    dueDateFrom: e.target.value,
                                                })
                                            }
                                            placeholder="Desde"
                                        />
                                        <Input
                                            type="date"
                                            value={filters.dueDateTo}
                                            onChange={(e) =>
                                                setFilters({
                                                    ...filters,
                                                    dueDateTo: e.target.value,
                                                })
                                            }
                                            placeholder="Hasta"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Clear Filters */}
                            {activeFiltersCount > 0 && (
                                <div className="flex justify-end mt-3">
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
                            )}
                        </CardContent>
                    )}

                    {/* Table */}
                    <CardContent className="px-5 pb-5 pt-0">
                        <DataTable
                            data={filteredInvoices}
                            columns={columns}
                            loading={loading}
                            searchable={false}
                            onRowClick={(row) => {
                                handleViewInvoiceDetails(row.id);
                            }}
                            emptyMessage="No se encontraron facturas"
                        />
                    </CardContent>
                </Card>
            )}

            {/* Credit Notes View */}
            {activeTab === "credit-notes" && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Historial de Notas de Crédito
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0">
                        <DataTable
                            data={creditNotes}
                            columns={ncColumns}
                            loading={loading}
                            emptyMessage="No hay notas de crédito registradas"
                            searchable={true}
                            searchPlaceholder="Buscar NC, factura o motivo..."
                        />
                    </CardContent>
                </Card>
            )}

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
                title={
                    isEditingCN
                        ? "Editar Nota de Crédito"
                        : "Registrar Nota de Crédito"
                }
                size="2xl"
            >
                <form onSubmit={handleSubmitCreditNote} className="space-y-6">
                    {selectedInvoice && (
                        <div className="p-5 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                        Factura Afectada
                                    </div>
                                    <div className="font-mono text-xl font-bold text-slate-900">
                                        {selectedInvoice.invoice_number}
                                    </div>
                                </div>
                                <div className="text-left sm:text-right">
                                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">
                                        Saldo Actual
                                    </div>
                                    <div className="font-bold text-3xl text-slate-900 tabular-nums">
                                        {formatCurrency(
                                            selectedInvoice.balance
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label>Número de Nota de Crédito *</Label>
                            <Input
                                value={creditNoteForm.note_number}
                                onChange={(e) =>
                                    setCreditNoteForm({
                                        ...creditNoteForm,
                                        note_number: e.target.value,
                                    })
                                }
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
                                onChange={(e) =>
                                    setCreditNoteForm({
                                        ...creditNoteForm,
                                        issue_date: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Monto a Acreditar *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                $
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={
                                    isEditingCN
                                        ? undefined
                                        : selectedInvoice?.balance
                                }
                                value={creditNoteForm.amount}
                                onChange={(e) =>
                                    setCreditNoteForm({
                                        ...creditNoteForm,
                                        amount: e.target.value,
                                    })
                                }
                                className="pl-7 font-mono text-lg"
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                            {isEditingCN
                                ? "El monto no puede superar el saldo pendiente ajustable."
                                : `El monto no puede exceder el saldo pendiente (${formatCurrency(
                                      selectedInvoice?.balance || 0
                                  )})`}
                        </p>
                    </div>

                    <div>
                        <Label>Motivo / Razón *</Label>
                        <Input
                            value={creditNoteForm.reason}
                            onChange={(e) =>
                                setCreditNoteForm({
                                    ...creditNoteForm,
                                    reason: e.target.value,
                                })
                            }
                            placeholder="Ej: Devolución, Error en facturación..."
                            required
                        />
                    </div>

                    <div>
                        <Label>Archivo PDF (Opcional)</Label>
                        <FileUpload
                            accept=".pdf"
                            onFileChange={(file) =>
                                setCreditNoteForm({
                                    ...creditNoteForm,
                                    pdf_file: file,
                                })
                            }
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setIsCreditNoteModalOpen(false);
                                setSelectedInvoice(null);
                                setIsEditingCN(false);
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isSubmitting ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                    Procesando...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4 mr-2" />
                                    {isEditingCN
                                        ? "Actualizar Nota"
                                        : "Registrar Nota"}
                                </>
                            )}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Registrar Pago / Abono"
                size="lg"
            >
                {selectedInvoice && (
                    <div className="space-y-4">
                        {/* Invoice Summary */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                                        Factura
                                    </p>
                                    <p className="font-mono font-semibold text-slate-900">
                                        {selectedInvoice.invoice_number}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                                        Cliente
                                    </p>
                                    <p className="font-medium text-slate-900">
                                        {selectedInvoice.client_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                                        Total Facturado
                                    </p>
                                    <p className="font-semibold text-slate-900">
                                        {formatCurrency(
                                            selectedInvoice.total_amount
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                                        Saldo Actual
                                    </p>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatCurrency(
                                            selectedInvoice.balance
                                        )}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Form */}
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Monto del Pago *"
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedInvoice.balance}
                                value={paymentForm.amount}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        amount: e.target.value,
                                    })
                                }
                                required
                            />
                            <Input
                                label="Fecha de Pago *"
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

                        <div className="grid grid-cols-2 gap-4">
                            <SelectERP
                                label="Método de Pago"
                                value={paymentForm.payment_method}
                                onChange={(value) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_method: value,
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
                                        id: "deposito",
                                        name: "Depósito Bancario",
                                    },
                                    { id: "tarjeta", name: "Tarjeta" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                required
                            />
                            <Input
                                label="Referencia / No. Comprobante"
                                value={paymentForm.reference}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        reference: e.target.value,
                                    })
                                }
                                placeholder="Ej: TRF-12345"
                            />
                        </div>

                        <Input
                            label="Notas"
                            value={paymentForm.notes}
                            onChange={(e) =>
                                setPaymentForm({
                                    ...paymentForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Observaciones del pago..."
                        />

                        {/* Payment Preview */}
                        {paymentForm.amount &&
                            parseFloat(paymentForm.amount) > 0 && (
                                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600">
                                            Saldo Actual:
                                        </span>
                                        <span className="font-semibold text-slate-900 tabular-nums">
                                            {formatCurrency(
                                                selectedInvoice.balance
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600">
                                            Monto del Pago:
                                        </span>
                                        <span className="font-semibold text-slate-900 tabular-nums">
                                            -{" "}
                                            {formatCurrency(
                                                paymentForm.amount || 0
                                            )}
                                        </span>
                                    </div>
                                    <div className="pt-2 border-t border-slate-300">
                                        <div className="flex justify-between items-center">
                                            <span className="font-semibold text-slate-700">
                                                Nuevo Saldo:
                                            </span>
                                            <span className="text-xl font-bold text-slate-900 tabular-nums">
                                                {formatCurrency(
                                                    Math.max(
                                                        0,
                                                        parseFloat(
                                                            selectedInvoice.balance
                                                        ) -
                                                            parseFloat(
                                                                paymentForm.amount ||
                                                                    0
                                                            )
                                                    )
                                                )}
                                            </span>
                                        </div>
                                        {parseFloat(selectedInvoice.balance) -
                                            parseFloat(
                                                paymentForm.amount || 0
                                            ) <=
                                            0 && (
                                            <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                La factura quedará completamente
                                                pagada
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                )}

                <ModalFooter>
                    <Button
                        variant="outline"
                        onClick={() => setIsPaymentModalOpen(false)}
                    >
                        Cancelar
                    </Button>
                    <Button onClick={handleAddPayment}>
                        <Banknote className="w-4 h-4 mr-1.5" />
                        Registrar Pago
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Generate Invoice Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => {
                    setIsGenerateModalOpen(false);
                    resetGenerateForm();
                }}
                title="Registrar Pre-factura (Editable)"
                size="2xl"
            >
                <div className="space-y-5">
                    {/* Service Order Selection */}
                    <div className="bg-white border border-slate-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">
                            Orden de Servicio
                        </h3>

                        <SelectERP
                            label="Orden de Servicio"
                            value={generateForm.service_order}
                            onChange={handleServiceOrderSelect}
                            options={[
                                {
                                    id: "",
                                    name: "Seleccionar orden de servicio...",
                                },
                                ...allServiceOrders.map((o) => ({
                                    id: o.id,
                                    name: `${o.order_number} - ${
                                        o.client_name
                                    } - ${formatCurrency(o.total_amount || 0)}`,
                                })),
                            ]}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            placeholder="Seleccionar orden de servicio..."
                            required
                        />

                        {generateForm.client_name && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                <span className="font-medium text-slate-600">
                                    Cliente:
                                </span>
                                <span className="text-slate-900 font-semibold">
                                    {generateForm.client_name}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Items to Bill */}
                    {generateForm.service_order && (
                        <div className="bg-white border border-slate-200 rounded-lg p-4">
                            <h3 className="text-sm font-semibold text-slate-900 mb-3">
                                Items a Facturar
                            </h3>

                            {loadingItems ? (
                                <div className="text-center py-6">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-2"></div>
                                    <p className="text-sm text-slate-500">
                                        Cargando items disponibles...
                                    </p>
                                </div>
                            ) : billableItems.length === 0 ? (
                                <div className="text-center py-6 bg-amber-50 rounded-lg border border-amber-200">
                                    <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                                    <p className="text-sm text-amber-700 font-medium">
                                        No hay items disponibles para facturar
                                        en esta orden
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Items Table */}
                                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white mb-4 shadow-sm">
                                        <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="w-10 p-2.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={
                                                                    selectedItemIds.length ===
                                                                        billableItems.length &&
                                                                    billableItems.length >
                                                                        0
                                                                }
                                                                onChange={(
                                                                    e
                                                                ) => {
                                                                    if (
                                                                        e.target
                                                                            .checked
                                                                    ) {
                                                                        setSelectedItemIds(
                                                                            billableItems.map(
                                                                                (
                                                                                    i
                                                                                ) =>
                                                                                    i.id
                                                                            )
                                                                        );
                                                                    } else {
                                                                        setSelectedItemIds(
                                                                            []
                                                                        );
                                                                    }
                                                                }}
                                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                            />
                                                        </th>
                                                        <th className="text-left p-2.5 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-20">
                                                            Tipo
                                                        </th>
                                                        <th className="text-left p-2.5 font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                                                            Descripción
                                                        </th>
                                                        <th className="text-right p-2.5 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-28">
                                                            Subtotal
                                                        </th>
                                                        <th className="text-right p-2.5 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                                                            IVA
                                                        </th>
                                                        <th className="text-right p-2.5 font-bold text-slate-600 uppercase text-[10px] tracking-wider w-32">
                                                            Total
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {billableItems.map(
                                                        (item) => {
                                                            const isSelected =
                                                                selectedItemIds.includes(
                                                                    item.id
                                                                );
                                                            return (
                                                                <tr
                                                                    key={
                                                                        item.id
                                                                    }
                                                                    className={cn(
                                                                        "transition-colors cursor-pointer group",
                                                                        isSelected
                                                                            ? "bg-blue-50/40"
                                                                            : "hover:bg-slate-50"
                                                                    )}
                                                                    onClick={() => {
                                                                        setSelectedItemIds(
                                                                            (
                                                                                prev
                                                                            ) =>
                                                                                prev.includes(
                                                                                    item.id
                                                                                )
                                                                                    ? prev.filter(
                                                                                          (
                                                                                              id
                                                                                          ) =>
                                                                                              id !==
                                                                                              item.id
                                                                                      )
                                                                                    : [
                                                                                          ...prev,
                                                                                          item.id,
                                                                                      ]
                                                                        );
                                                                    }}
                                                                >
                                                                    <td className="p-2.5 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={
                                                                                isSelected
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                e.stopPropagation();
                                                                                setSelectedItemIds(
                                                                                    (
                                                                                        prev
                                                                                    ) =>
                                                                                        prev.includes(
                                                                                            item.id
                                                                                        )
                                                                                            ? prev.filter(
                                                                                                  (
                                                                                                      id
                                                                                                  ) =>
                                                                                                      id !==
                                                                                                      item.id
                                                                                              )
                                                                                            : [
                                                                                                  ...prev,
                                                                                                  item.id,
                                                                                              ]
                                                                                );
                                                                            }}
                                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                    </td>
                                                                    <td className="p-2.5">
                                                                        <Badge
                                                                            variant={
                                                                                item.type ===
                                                                                "service"
                                                                                    ? "default"
                                                                                    : "secondary"
                                                                            }
                                                                            className="text-[10px] px-1.5 py-0 uppercase"
                                                                        >
                                                                            {item.type ===
                                                                            "service"
                                                                                ? "Servicio"
                                                                                : "Gasto"}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="p-2.5 text-slate-700 font-medium">
                                                                        {
                                                                            item.description
                                                                        }
                                                                    </td>
                                                                    <td className="p-2.5 text-right text-slate-600 tabular-nums">
                                                                        {formatCurrency(
                                                                            item.amount
                                                                        )}
                                                                    </td>
                                                                    <td className="p-2.5 text-right text-slate-500 tabular-nums">
                                                                        {item.iva >
                                                                        0
                                                                            ? formatCurrency(
                                                                                  item.iva
                                                                              )
                                                                            : "-"}
                                                                    </td>
                                                                    <td className="p-2.5 text-right text-slate-900 font-bold tabular-nums">
                                                                        {formatCurrency(
                                                                            item.total
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    {/* Totals Summary */}
                                    {selectedItemIds.length > 0 && (
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-sm font-semibold text-slate-700">
                                                    Resumen de Selección
                                                </span>
                                                <span className="text-xs bg-white px-2 py-1 rounded border border-slate-200 text-slate-500 font-medium">
                                                    {selectedItemIds.length} de{" "}
                                                    {billableItems.length}{" "}
                                                    items
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Subtotal</span>
                                                    <span className="text-lg font-semibold text-slate-700 tabular-nums">
                                                        {formatCurrency(selectedTotals.subtotal)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">IVA Total</span>
                                                    <span className="text-lg font-semibold text-slate-700 tabular-nums">
                                                        {formatCurrency(selectedTotals.iva)}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Total Facturar</span>
                                                    <span className="text-2xl font-black text-slate-900 tabular-nums">
                                                        {formatCurrency(selectedTotals.total)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* Invoice Details */}
                    {generateForm.service_order &&
                        selectedItemIds.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                                    Información de la Factura
                                </h3>

                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Input
                                                label="Número de Factura / CCF"
                                                value={
                                                    generateForm.invoice_number
                                                }
                                                onChange={(e) =>
                                                    setGenerateForm({
                                                        ...generateForm,
                                                        invoice_number:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="Auto: PRE-00001-2025"
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                Dejar en blanco para
                                                auto-generar
                                            </p>
                                        </div>

                                        <SelectERP
                                            label="Tipo de Documento *"
                                            value={generateForm.invoice_type}
                                            onChange={(e) =>
                                                setGenerateForm({
                                                    ...generateForm,
                                                    invoice_type:
                                                        e.target.value,
                                                })
                                            }
                                            options={INVOICE_TYPE_OPTIONS}
                                            required
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Input
                                            label="Fecha de Emisión *"
                                            type="date"
                                            value={generateForm.invoice_date}
                                            onChange={(e) => {
                                                const newDate = e.target.value;
                                                setGenerateForm((prev) => {
                                                    let newDueDate =
                                                        prev.due_date;
                                                    if (prev.service_order) {
                                                        const selectedOrder =
                                                            allServiceOrders.find(
                                                                (o) =>
                                                                    o.id ===
                                                                    prev.service_order
                                                            );
                                                        if (selectedOrder) {
                                                            const client =
                                                                clients.find(
                                                                    (c) =>
                                                                        c.id ===
                                                                        selectedOrder.client
                                                                );
                                                            if (
                                                                client &&
                                                                client.credit_days >
                                                                    0
                                                            ) {
                                                                const invoiceDate =
                                                                    new Date(
                                                                        newDate
                                                                    );
                                                                invoiceDate.setDate(
                                                                    invoiceDate.getDate() +
                                                                        client.credit_days
                                                                );
                                                                newDueDate =
                                                                    invoiceDate
                                                                        .toISOString()
                                                                        .split(
                                                                            "T"
                                                                        )[0];
                                                            }
                                                        }
                                                    }
                                                    return {
                                                        ...prev,
                                                        invoice_date: newDate,
                                                        due_date: newDueDate,
                                                    };
                                                });
                                            }}
                                            required
                                        />

                                        <div>
                                            <Input
                                                label="Fecha de Vencimiento"
                                                type="date"
                                                value={generateForm.due_date}
                                                onChange={(e) =>
                                                    setGenerateForm({
                                                        ...generateForm,
                                                        due_date:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                            {generateForm.due_date && (
                                                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Calculada según días de
                                                    crédito del cliente
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <Input
                                            label="Monto Total (Calculado Automáticamente)"
                                            type="text"
                                            value={
                                                generateForm.total_amount
                                                    ? formatCurrency(
                                                          parseFloat(
                                                              generateForm.total_amount
                                                          )
                                                      )
                                                    : "$0.00"
                                            }
                                            disabled
                                            className="bg-slate-100 cursor-not-allowed"
                                        />
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Info className="w-3 h-3" />
                                            El monto se calcula automáticamente
                                            según los items seleccionados
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                    {/* Attachment */}
                    {generateForm.service_order &&
                        selectedItemIds.length > 0 && (
                            <div className="bg-white border border-slate-200 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-slate-700 mb-3">
                                    Adjuntar Documento{" "}
                                    <span className="text-slate-400">
                                        (Opcional)
                                    </span>
                                </h3>

                                <FileUpload
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onFileChange={(file) =>
                                        setGenerateForm({
                                            ...generateForm,
                                            invoice_file: file,
                                        })
                                    }
                                    label="Subir Factura PDF"
                                    helperText="Formatos aceptados: PDF, JPG, PNG (máx. 5MB)"
                                />

                                {generateForm.invoice_file && (
                                    <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 bg-white rounded-lg p-2.5 border border-slate-200">
                                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                                        <span className="text-slate-600">
                                            Archivo:
                                        </span>
                                        <span className="font-medium text-slate-900">
                                            {generateForm.invoice_file.name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setIsGenerateModalOpen(false);
                            resetGenerateForm();
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGenerateInvoice}
                        disabled={
                            !generateForm.service_order ||
                            selectedItemIds.length === 0
                        }
                    >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Registrar Pre-factura
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Edit Invoice Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="Editar Factura"
                size="2xl"
            >
                <div className="space-y-4">
                    {/* Invoice Details */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                                <FileText className="w-4 h-4 text-brand-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Información de la Factura
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {editForm.client_name} -{" "}
                                    {editForm.service_order_number}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Número de Factura / CCF *"
                                    value={editForm.invoice_number}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            invoice_number: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: 001-001-0000001234"
                                    required
                                />

                                <SelectERP
                                    label="Tipo de Documento *"
                                    value={editForm.invoice_type}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            invoice_type: e.target.value,
                                        })
                                    }
                                    options={INVOICE_TYPE_OPTIONS}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Input
                                    label="Fecha de Emisión *"
                                    type="date"
                                    value={editForm.issue_date}
                                    onChange={(e) =>
                                        setEditForm({
                                            ...editForm,
                                            issue_date: e.target.value,
                                        })
                                    }
                                    required
                                />

                                <Input
                                    label="Fecha de Vencimiento"
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

                            <Input
                                label="Monto Total (Calculado)"
                                type="number"
                                step="0.01"
                                min="0"
                                value={editForm.total_amount}
                                placeholder="0.00"
                                disabled
                                className="bg-slate-100 cursor-not-allowed opacity-75"
                            />
                            <p className="text-xs text-slate-500 -mt-2">
                                El monto se calcula automáticamente según los items. Edite los items en el detalle para cambiarlo.
                            </p>

                            <Input
                                label="Notas"
                                value={editForm.notes}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        notes: e.target.value,
                                    })
                                }
                                placeholder="Observaciones adicionales..."
                            />
                        </div>
                    </div>

                    {/* Attachment */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                <Upload className="w-4 h-4 text-slate-600" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Actualizar Documento (Opcional)
                            </h3>
                        </div>

                        <FileUpload
                            accept=".pdf,.jpg,.jpeg,.png"
                            onFileChange={(file) =>
                                setEditForm({
                                    ...editForm,
                                    pdf_file: file,
                                })
                            }
                            label="Subir Nuevo Archivo PDF"
                            helperText="Formatos aceptados: PDF, JPG, PNG (máx. 5MB)"
                        />

                        {editForm.pdf_file && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 bg-white rounded-lg p-2.5 border border-slate-200">
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                                <span className="text-slate-600">
                                    Archivo nuevo:
                                </span>
                                <span className="font-medium text-slate-900">
                                    {editForm.pdf_file.name}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <ModalFooter>
                    <Button
                        variant="ghost"
                        onClick={() => setIsEditModalOpen(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleUpdateInvoice}
                        disabled={
                            !editForm.invoice_number ||
                            !editForm.issue_date
                        }
                    >
                        <CheckCircle className="w-4 h-4 mr-1.5" />
                        Actualizar Factura
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Detalle: ${selectedInvoice?.invoice_number || ""}`}
                size="2xl"
            >
                {selectedInvoice && (
                    <div className="space-y-5">
                        {/* Header Info */}
                        <div className="grid grid-cols-2 gap-6 p-5 bg-white rounded-xl border border-slate-200 shadow-sm">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Cliente
                                </p>
                                <p className="text-base font-medium text-slate-900">
                                    {selectedInvoice.client_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Estado
                                </p>
                                <InvoiceStatusBadge
                                    status={selectedInvoice.status}
                                />
                                {selectedInvoice.days_overdue > 0 && (
                                    <p className="text-xs text-red-600 font-medium mt-1">
                                        Vencida hace{" "}
                                        {selectedInvoice.days_overdue} días
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Fecha de Emisión
                                </p>
                                <p className="text-sm font-medium text-slate-900">
                                    {new Date(
                                        selectedInvoice.issue_date + "T00:00:00"
                                    ).toLocaleDateString("es-SV", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                    Fecha de Vencimiento
                                </p>
                                <p
                                    className={cn(
                                        "text-sm font-medium",
                                        selectedInvoice.days_overdue > 0
                                            ? "text-red-600"
                                            : "text-slate-900"
                                    )}
                                >
                                    {selectedInvoice.due_date
                                        ? new Date(
                                              selectedInvoice.due_date +
                                                  "T00:00:00"
                                          ).toLocaleDateString("es-SV", {
                                              weekday: "long",
                                              year: "numeric",
                                              month: "long",
                                              day: "numeric",
                                          })
                                        : "Sin vencimiento"}
                                </p>
                            </div>
                            {selectedInvoice.service_order_number && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        Orden de Servicio
                                    </p>
                                    <p className="font-mono font-medium text-brand-600">
                                        {selectedInvoice.service_order_number}
                                    </p>
                                </div>
                            )}
                            {selectedInvoice.ccf && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                        CCF
                                    </p>
                                    <p className="font-mono font-medium text-slate-900">
                                        {selectedInvoice.ccf}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Total Facturado
                                </p>
                                <p className="text-xl font-bold text-slate-900 tabular-nums">
                                    {formatCurrency(
                                        selectedInvoice.total_amount
                                    )}
                                </p>
                            </div>
                            <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Total Pagado
                                </p>
                                <p className="text-xl font-bold text-emerald-700 tabular-nums">
                                    {formatCurrency(
                                        selectedInvoice.paid_amount || 0
                                    )}
                                </p>
                            </div>
                            <div className="px-4 py-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Saldo Pendiente
                                </p>
                                <p
                                    className={cn(
                                        "text-xl font-bold tabular-nums",
                                        parseFloat(selectedInvoice.balance) > 0
                                            ? "text-red-700"
                                            : "text-slate-900"
                                    )}
                                >
                                    {formatCurrency(selectedInvoice.balance)}
                                </p>
                            </div>
                        </div>

                        {/* Items Facturados con Editor */}
                        <InvoiceItemsEditor
                            invoice={selectedInvoice}
                            onUpdate={() => {
                                handleViewInvoiceDetails(selectedInvoice.id);
                                fetchInvoices();
                                fetchSummary();
                            }}
                            onDeleted={() => {
                                // Cerrar modal y refrescar listas
                                setIsDetailModalOpen(false);
                                setSelectedInvoice(null);
                                fetchInvoices();
                                fetchSummary();
                            }}
                        />

                        {/* Payment History */}
                        <div className="pt-2">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-50 rounded-md">
                                    <Banknote className="h-4 w-4 text-emerald-600" />
                                </div>
                                Historial de Pagos
                            </h3>
                            {selectedInvoice.payments &&
                            selectedInvoice.payments.length > 0 ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Método
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                                    Referencia
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {selectedInvoice.payments.map(
                                                (payment, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="hover:bg-slate-50"
                                                    >
                                                        <td className="px-4 py-3 text-sm text-slate-900">
                                                            {new Date(
                                                                payment.payment_date +
                                                                    "T00:00:00"
                                                            ).toLocaleDateString(
                                                                "es-SV"
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-emerald-600 tabular-nums">
                                                            {formatCurrency(
                                                                payment.amount
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                                                            {
                                                                payment.payment_method
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                                                            {payment.reference ||
                                                                "-"}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                                    <Clock className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-600">
                                        No hay pagos registrados
                                    </p>
                                    {parseFloat(selectedInvoice.balance) >
                                        0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3"
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenPaymentModal(
                                                    selectedInvoice
                                                );
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Registrar Primer Pago
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <ModalFooter>
                    <div className="flex w-full justify-end gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setIsDetailModalOpen(false)}
                        >
                            Cerrar
                        </Button>
                        {selectedInvoice?.pdf_file && (
                            <Button
                                className="bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 shadow-sm"
                                onClick={() =>
                                    window.open(
                                        selectedInvoice.pdf_file,
                                        "_blank"
                                    )
                                }
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Ver Factura
                            </Button>
                        )}
                        {selectedInvoice &&
                            parseFloat(selectedInvoice.balance) > 0 && (
                                <Button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        handleOpenPaymentModal(selectedInvoice);
                                    }}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-transparent shadow-sm"
                                >
                                    <Banknote className="w-4 h-4 mr-2" />
                                    Registrar Pago
                                </Button>
                            )}
                    </div>
                </ModalFooter>
            </Modal>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onClose={() =>
                    setDeleteConfirm({ open: false, id: null, type: null })
                }
                onConfirm={() => {
                    if (deleteConfirm.type === "credit-note") {
                        handleDeleteCreditNote();
                    } else {
                        handleDeleteInvoice();
                    }
                }}
                title={
                    deleteConfirm.type === "credit-note"
                        ? "Eliminar Nota de Crédito"
                        : "Eliminar Factura"
                }
                description={
                    deleteConfirm.type === "credit-note"
                        ? "¿Estás seguro de que deseas eliminar esta nota de crédito? El saldo de la factura será restaurado."
                        : "¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer."
                }
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default Invoicing;
