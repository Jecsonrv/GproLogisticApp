import React, { useState, useEffect, useMemo } from "react";
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
    TrendingUp,
    TrendingDown,
    FileSpreadsheet,
    RefreshCw,
    ChevronDown,
    DollarSign,
    CalendarClock,
    Receipt,
    ArrowUpRight,
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
import Select from "../components/ui/Select";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import { FileUpload } from "../components/ui";
import api from "../lib/axios";
import { cn, formatCurrency, formatDate, getTodayDate } from "../lib/utils";
import toast from "react-hot-toast";

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
    const config = INVOICE_STATUS_CONFIG[status] || INVOICE_STATUS_CONFIG.pending;
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

// Componente KPI Card mejorado
const KPICard = ({ title, value, subtitle, icon: Icon, variant = "default", trend, trendValue }) => {
    const variants = {
        default: {
            bg: "bg-white",
            iconBg: "bg-slate-100",
            iconColor: "text-slate-600",
            valueColor: "text-slate-900",
        },
        primary: {
            bg: "bg-brand-50",
            iconBg: "bg-brand-100",
            iconColor: "text-brand-600",
            valueColor: "text-brand-900",
        },
        success: {
            bg: "bg-emerald-50",
            iconBg: "bg-emerald-100",
            iconColor: "text-emerald-600",
            valueColor: "text-emerald-900",
        },
        warning: {
            bg: "bg-amber-50",
            iconBg: "bg-amber-100",
            iconColor: "text-amber-600",
            valueColor: "text-amber-900",
        },
        danger: {
            bg: "bg-red-50",
            iconBg: "bg-red-100",
            iconColor: "text-red-600",
            valueColor: "text-red-900",
        },
    };

    const style = variants[variant] || variants.default;

    return (
        <Card className={cn("border", style.bg)}>
            <CardContent className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                            {title}
                        </p>
                        <p className={cn("text-2xl font-bold tabular-nums tracking-tight", style.valueColor)}>
                            {value}
                        </p>
                        {(subtitle || trend) && (
                            <div className="flex items-center gap-2 mt-1.5">
                                {trend && (
                                    <span className={cn(
                                        "inline-flex items-center text-xs font-medium",
                                        trend === "up" ? "text-emerald-600" : "text-red-600"
                                    )}>
                                        {trend === "up" ? (
                                            <TrendingUp className="w-3 h-3 mr-0.5" />
                                        ) : (
                                            <TrendingDown className="w-3 h-3 mr-0.5" />
                                        )}
                                        {trendValue}
                                    </span>
                                )}
                                {subtitle && (
                                    <span className="text-xs text-slate-500">{subtitle}</span>
                                )}
                            </div>
                        )}
                    </div>
                    {Icon && (
                        <div className={cn("flex-shrink-0 p-2.5 rounded-lg", style.iconBg)}>
                            <Icon className={cn("w-5 h-5", style.iconColor)} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

const Invoicing = () => {
    // Data State
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [allServiceOrders, setAllServiceOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

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
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

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
        total_amount: "",
        invoice_file: null,
    });

    // Data fetching
    useEffect(() => {
        fetchInvoices();
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
                (order) => order.total_amount && parseFloat(order.total_amount) > 0
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
            if (filters.client && invoice.client_id !== parseInt(filters.client)) {
                return false;
            }

            // Status filter
            if (filters.status && invoice.status !== filters.status) {
                return false;
            }

            // Issue date range filter
            if (filters.dateFrom) {
                const invoiceDate = new Date(invoice.invoice_date);
                const fromDate = new Date(filters.dateFrom);
                if (invoiceDate < fromDate) return false;
            }
            if (filters.dateTo) {
                const invoiceDate = new Date(invoice.invoice_date);
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
            toast.error(error.response?.data?.error || "Error al registrar pago");
        }
    };

    const handleGenerateInvoice = async () => {
        if (
            !generateForm.service_order ||
            !generateForm.invoice_number ||
            !generateForm.total_amount
        ) {
            toast.error("Complete todos los campos requeridos");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("service_order", generateForm.service_order);
            formData.append("invoice_number", generateForm.invoice_number);
            formData.append("issue_date", generateForm.invoice_date);
            formData.append("total_amount", generateForm.total_amount);

            if (generateForm.due_date) {
                formData.append("due_date", generateForm.due_date);
            }
            if (generateForm.invoice_file) {
                formData.append("invoice_file", generateForm.invoice_file);
            }

            const response = await api.post("/orders/invoices/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success(`Factura ${response.data.invoice_number} registrada exitosamente`);
            fetchInvoices();
            fetchSummary();
            fetchAllServiceOrders();
            setIsGenerateModalOpen(false);
            resetGenerateForm();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al registrar factura");
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
            total_amount: "",
            invoice_file: null,
        });
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

    // Table columns
    const columns = [
        {
            header: "Factura",
            accessor: "invoice_number",
            render: (row) => (
                <div>
                    <div className="font-mono font-semibold text-brand-600 text-sm">
                        {row.invoice_number}
                    </div>
                    {row.service_order_number && (
                        <div className="text-xs text-slate-500 mt-0.5">
                            OS: {row.service_order_number}
                        </div>
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
                        <div className="text-xs text-slate-500">CCF: {row.ccf}</div>
                    )}
                </div>
            ),
        },
        {
            header: "Emisión",
            accessor: "invoice_date",
            render: (row) => (
                <div className="text-sm text-slate-700">
                    {new Date(row.invoice_date + "T00:00:00").toLocaleDateString("es-SV", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                    })}
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
                            <div className={cn(
                                "text-sm font-medium",
                                row.days_overdue > 0 ? "text-red-600" : "text-slate-700"
                            )}>
                                {new Date(row.due_date + "T00:00:00").toLocaleDateString("es-SV", {
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
                        <span className="text-xs text-slate-400">Sin vencimiento</span>
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
                            parseFloat(row.balance) > 0 ? "text-red-600" : "text-emerald-600"
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
            header: "",
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    {parseFloat(row.balance) > 0 && row.status !== "cancelled" && (
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentModal(row);
                            }}
                            title="Registrar Pago"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                            <Banknote className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(row);
                            setIsDetailModalOpen(true);
                        }}
                        title="Ver Detalle"
                        className="text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                    >
                        <Eye className="h-4 w-4" />
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
                        Control administrativo de facturación, abonos y saldos pendientes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={fetchInvoices}
                        disabled={loading}
                        size="sm"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-1.5", loading && "animate-spin")} />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExporting || filteredInvoices.length === 0}
                        size="sm"
                    >
                        <FileSpreadsheet className={cn("w-4 h-4 mr-1.5", isExporting && "animate-bounce")} />
                        Exportar
                    </Button>
                    <Button onClick={() => setIsGenerateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-1.5" />
                        Nueva Factura
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
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

            {/* Search and Filters Card */}
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
                                    onChange={(e) => setSearchQuery(e.target.value)}
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
                                variant={isFiltersOpen ? "default" : "outline"}
                                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                className="shrink-0"
                            >
                                <Filter className="w-4 h-4 mr-1.5" />
                                Filtros
                                {activeFiltersCount > 0 && (
                                    <Badge variant="primary" className="ml-2 px-1.5 py-0.5 h-5 text-xs">
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
                                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                    Cliente
                                </Label>
                                <Select
                                    value={filters.client}
                                    onChange={(val) => setFilters({ ...filters, client: val })}
                                    options={clients}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    placeholder="Todos los clientes"
                                />
                            </div>

                            {/* Estado */}
                            <div>
                                <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                    Estado
                                </Label>
                                <Select
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
                                    placeholder="Todos los estados"
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
                                            setFilters({ ...filters, dateFrom: e.target.value })
                                        }
                                        placeholder="Desde"
                                    />
                                    <Input
                                        type="date"
                                        value={filters.dateTo}
                                        onChange={(e) =>
                                            setFilters({ ...filters, dateTo: e.target.value })
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
                                            setFilters({ ...filters, dueDateFrom: e.target.value })
                                        }
                                        placeholder="Desde"
                                    />
                                    <Input
                                        type="date"
                                        value={filters.dueDateTo}
                                        onChange={(e) =>
                                            setFilters({ ...filters, dueDateTo: e.target.value })
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
                            setSelectedInvoice(row);
                            setIsDetailModalOpen(true);
                        }}
                        emptyMessage="No se encontraron facturas"
                    />
                </CardContent>
            </Card>

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
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Factura</p>
                                    <p className="font-mono font-semibold text-slate-900">
                                        {selectedInvoice.invoice_number}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Cliente</p>
                                    <p className="font-medium text-slate-900">
                                        {selectedInvoice.client_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Total Facturado</p>
                                    <p className="font-semibold text-slate-900">
                                        {formatCurrency(selectedInvoice.total_amount)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Saldo Actual</p>
                                    <p className="text-xl font-bold text-red-600">
                                        {formatCurrency(selectedInvoice.balance)}
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
                                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                                }
                                required
                            />
                            <Input
                                label="Fecha de Pago *"
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={(e) =>
                                    setPaymentForm({ ...paymentForm, payment_date: e.target.value })
                                }
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Método de Pago *"
                                value={paymentForm.payment_method}
                                onChange={(value) =>
                                    setPaymentForm({ ...paymentForm, payment_method: value })
                                }
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
                            <Input
                                label="Referencia / No. Comprobante"
                                value={paymentForm.reference}
                                onChange={(e) =>
                                    setPaymentForm({ ...paymentForm, reference: e.target.value })
                                }
                                placeholder="Ej: TRF-12345"
                            />
                        </div>

                        <Input
                            label="Notas"
                            value={paymentForm.notes}
                            onChange={(e) =>
                                setPaymentForm({ ...paymentForm, notes: e.target.value })
                            }
                            placeholder="Observaciones del pago..."
                        />

                        {/* Payment Preview */}
                        {paymentForm.amount && parseFloat(paymentForm.amount) > 0 && (
                            <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600">Saldo Actual:</span>
                                    <span className="font-medium tabular-nums">
                                        {formatCurrency(selectedInvoice.balance)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600">Monto del Pago:</span>
                                    <span className="font-medium text-emerald-600 tabular-nums">
                                        - {formatCurrency(paymentForm.amount || 0)}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-emerald-200">
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-slate-900">Nuevo Saldo:</span>
                                        <span className={cn(
                                            "text-xl font-bold tabular-nums",
                                            parseFloat(selectedInvoice.balance) - parseFloat(paymentForm.amount || 0) <= 0
                                                ? "text-emerald-600"
                                                : "text-amber-600"
                                        )}>
                                            {formatCurrency(
                                                Math.max(0, parseFloat(selectedInvoice.balance) - parseFloat(paymentForm.amount || 0))
                                            )}
                                        </span>
                                    </div>
                                    {parseFloat(selectedInvoice.balance) - parseFloat(paymentForm.amount || 0) <= 0 && (
                                        <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                            <CheckCircle className="w-3.5 h-3.5" />
                                            La factura quedará completamente pagada
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="success" onClick={handleAddPayment}>
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
                title="Registrar Factura de Venta"
                size="2xl"
            >
                <div className="space-y-4">
                    {/* Step 1: Service Order */}
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                                1
                            </div>
                            <h3 className="text-sm font-semibold text-slate-900">
                                Seleccionar Orden de Servicio
                            </h3>
                        </div>

                        <Select
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
                            required
                        />

                        {generateForm.client_name && (
                            <div className="mt-3 flex items-center gap-2 text-sm text-slate-700 bg-white rounded-lg p-3 border border-slate-200">
                                <Building2 className="w-4 h-4 text-slate-500" />
                                <span className="font-medium text-slate-600">Cliente:</span>
                                <span className="text-slate-900 font-semibold">{generateForm.client_name}</span>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Invoice Details */}
                    {generateForm.service_order && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-semibold">
                                    2
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Información de la Factura
                                </h3>
                            </div>

                            <div className="space-y-3">
                                <Input
                                    label="Número de Factura / CCF *"
                                    value={generateForm.invoice_number}
                                    onChange={(e) =>
                                        setGenerateForm({
                                            ...generateForm,
                                            invoice_number: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: 001-001-0000001234"
                                    required
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <Input
                                        label="Fecha de Emisión *"
                                        type="date"
                                        value={generateForm.invoice_date}
                                        onChange={(e) => {
                                            const newDate = e.target.value;
                                            setGenerateForm((prev) => {
                                                let newDueDate = prev.due_date;
                                                if (prev.service_order) {
                                                    const selectedOrder = allServiceOrders.find(
                                                        (o) => o.id === prev.service_order
                                                    );
                                                    if (selectedOrder) {
                                                        const client = clients.find(
                                                            (c) => c.id === selectedOrder.client
                                                        );
                                                        if (client && client.credit_days > 0) {
                                                            const invoiceDate = new Date(newDate);
                                                            invoiceDate.setDate(
                                                                invoiceDate.getDate() + client.credit_days
                                                            );
                                                            newDueDate = invoiceDate.toISOString().split("T")[0];
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
                                                    due_date: e.target.value,
                                                })
                                            }
                                        />
                                        {generateForm.due_date && (
                                            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                                <CheckCircle className="w-3 h-3" />
                                                Calculada según días de crédito del cliente
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <Input
                                    label="Monto Total *"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={generateForm.total_amount}
                                    onChange={(e) =>
                                        setGenerateForm({
                                            ...generateForm,
                                            total_amount: e.target.value,
                                        })
                                    }
                                    placeholder="0.00"
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Attachment */}
                    {generateForm.service_order && (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-6 h-6 rounded-full bg-slate-400 text-white flex items-center justify-center text-xs font-semibold">
                                    3
                                </div>
                                <h3 className="text-sm font-semibold text-slate-900">
                                    Adjuntar Documento (Opcional)
                                </h3>
                            </div>

                            <FileUpload
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(file) =>
                                    setGenerateForm({ ...generateForm, invoice_file: file })
                                }
                                value={generateForm.invoice_file}
                                helperText="Formatos aceptados: PDF, JPG, PNG (máx. 5MB)"
                            />

                            {generateForm.invoice_file && (
                                <div className="mt-2 flex items-center gap-2 text-sm text-slate-700 bg-white rounded-lg p-2.5 border border-slate-200">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span className="text-slate-600">Archivo:</span>
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
                            !generateForm.invoice_number ||
                            !generateForm.total_amount
                        }
                    >
                        <Upload className="w-4 h-4 mr-1.5" />
                        Registrar Factura
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
                        <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Cliente
                                </p>
                                <p className="text-base font-semibold text-slate-900">
                                    {selectedInvoice.client_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Estado
                                </p>
                                <InvoiceStatusBadge status={selectedInvoice.status} />
                                {selectedInvoice.days_overdue > 0 && (
                                    <p className="text-xs text-red-600 font-medium mt-1">
                                        Vencida hace {selectedInvoice.days_overdue} días
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Fecha de Emisión
                                </p>
                                <p className="text-sm font-medium text-slate-900">
                                    {new Date(
                                        selectedInvoice.invoice_date + "T00:00:00"
                                    ).toLocaleDateString("es-SV", {
                                        weekday: "long",
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                    })}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                    Fecha de Vencimiento
                                </p>
                                <p className={cn(
                                    "text-sm font-medium",
                                    selectedInvoice.days_overdue > 0 ? "text-red-600" : "text-slate-900"
                                )}>
                                    {selectedInvoice.due_date
                                        ? new Date(
                                              selectedInvoice.due_date + "T00:00:00"
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
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Orden de Servicio
                                    </p>
                                    <p className="font-mono font-semibold text-brand-600">
                                        {selectedInvoice.service_order_number}
                                    </p>
                                </div>
                            )}
                            {selectedInvoice.ccf && (
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
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
                            <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                                <p className="text-xs text-brand-600 font-medium mb-1">Total Facturado</p>
                                <p className="text-2xl font-bold text-brand-900 tabular-nums">
                                    {formatCurrency(selectedInvoice.total_amount)}
                                </p>
                            </div>
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                                <p className="text-xs text-emerald-600 font-medium mb-1">Total Pagado</p>
                                <p className="text-2xl font-bold text-emerald-900 tabular-nums">
                                    {formatCurrency(selectedInvoice.paid_amount || 0)}
                                </p>
                            </div>
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                                <p className="text-xs text-red-600 font-medium mb-1">Saldo Pendiente</p>
                                <p className="text-2xl font-bold text-red-900 tabular-nums">
                                    {formatCurrency(selectedInvoice.balance)}
                                </p>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-brand-600" />
                                Historial de Pagos
                            </h3>
                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Método
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Referencia
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {selectedInvoice.payments.map((payment, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-sm text-slate-900">
                                                        {new Date(
                                                            payment.payment_date + "T00:00:00"
                                                        ).toLocaleDateString("es-SV")}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600 tabular-nums">
                                                        {formatCurrency(payment.amount)}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">
                                                        {payment.payment_method}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                                                        {payment.reference || "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                                    <Clock className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-600">No hay pagos registrados</p>
                                    {parseFloat(selectedInvoice.balance) > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-3"
                                            onClick={() => {
                                                setIsDetailModalOpen(false);
                                                handleOpenPaymentModal(selectedInvoice);
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
                    <Button variant="ghost" onClick={() => setIsDetailModalOpen(false)}>
                        Cerrar
                    </Button>
                    {selectedInvoice && parseFloat(selectedInvoice.balance) > 0 && (
                        <Button
                            variant="success"
                            onClick={() => {
                                setIsDetailModalOpen(false);
                                handleOpenPaymentModal(selectedInvoice);
                            }}
                        >
                            <Banknote className="w-4 h-4 mr-1.5" />
                            Registrar Pago
                        </Button>
                    )}
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Invoicing;
