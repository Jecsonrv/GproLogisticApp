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
    Plus,
    Eye,
    Receipt,
    Clock,
    CheckCircle2,
    AlertCircle,
    XCircle,
    RefreshCw,
    Building2,
    Calendar,
    Banknote,
    ArrowDownCircle,
    ArrowUpCircle,
    User,
    ChevronRight,
    Printer,
    Mail,
    Phone,
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
    EmptyState,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn } from "../lib/utils";

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

// ============================================
// KPI CARD COMPONENT
// ============================================
const KPICard = ({ label, value, subtext, icon: Icon, variant = "default", onClick }) => {
    const variants = {
        default: "text-slate-900",
        primary: "text-blue-600",
        success: "text-emerald-600",
        warning: "text-amber-600",
        danger: "text-red-600",
    };

    const iconBg = {
        default: "bg-slate-100",
        primary: "bg-blue-100",
        success: "bg-emerald-100",
        warning: "bg-amber-100",
        danger: "bg-red-100",
    };

    return (
        <Card
            className={cn(
                "hover:shadow-md transition-all",
                onClick && "cursor-pointer hover:border-blue-300"
            )}
            onClick={onClick}
        >
            <CardContent className="p-5">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-500">{label}</p>
                        <p className={cn("text-2xl font-bold tabular-nums", variants[variant])}>
                            {value}
                        </p>
                        {subtext && (
                            <p className="text-xs text-gray-400">{subtext}</p>
                        )}
                    </div>
                    {Icon && (
                        <div className={cn("p-3 rounded-xl", iconBg[variant])}>
                            <Icon className={cn("w-5 h-5", variants[variant])} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

// ============================================
// CLIENT CARD COMPONENT
// ============================================
const ClientCard = ({ client, isSelected, onClick }) => {
    const hasOverdue = client.overdue_amount > 0;
    const utilizationPercent = client.credit_limit > 0
        ? Math.min((client.credit_used / client.credit_limit) * 100, 100)
        : 0;

    return (
        <div
            onClick={onClick}
            className={cn(
                "p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                isSelected
                    ? "border-blue-500 bg-blue-50/50 shadow-md"
                    : "border-gray-200 hover:border-gray-300 bg-white"
            )}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                        isSelected ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600"
                    )}>
                        {client.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-900 text-sm leading-tight">
                            {client.name}
                        </h3>
                        <p className="text-xs text-slate-500">{client.nit}</p>
                    </div>
                </div>
                {hasOverdue && (
                    <Badge variant="danger" className="text-xs">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Vencido
                    </Badge>
                )}
            </div>

            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Saldo Pendiente</span>
                    <span className={cn(
                        "font-semibold",
                        client.total_pending > 0 ? "text-amber-600" : "text-emerald-600"
                    )}>
                        {formatCurrency(client.total_pending || 0)}
                    </span>
                </div>

                {client.credit_limit > 0 && (
                    <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Crédito Utilizado</span>
                            <span className="text-slate-600">
                                {utilizationPercent.toFixed(0)}%
                            </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                    </div>
                )}
            </div>
        </div>
    );
};

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
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statusFilter, setStatusFilter] = useState("");
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: "transferencia",
        reference: "",
        notes: "",
    });

    // Invoice form (para control)
    const [invoiceForm, setInvoiceForm] = useState({
        invoice_number: "",
        invoice_type: "CCF",
        issue_date: new Date().toISOString().split('T')[0],
        due_date: "",
        total_amount: "",
        notes: "",
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
                        const stmtRes = await axios.get(`/clients/${client.id}/account_statement/`);
                        return {
                            ...client,
                            credit_used: stmtRes.data.credit_used || 0,
                            total_pending: stmtRes.data.credit_used || 0,
                            overdue_amount: 0, // Se calculará después si es necesario
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
            const response = await axios.get(`/clients/${clientId}/account_statement/`, {
                params: { year: selectedYear }
            });
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
                params: { client: clientId }
            });
            setInvoices(response.data || []);
        } catch (error) {
            console.error("Error fetching invoices:", error);
            setInvoices([]);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedClient) {
            toast.error("Seleccione un cliente primero");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get(
                `/clients/${selectedClient.id}/export_statement_excel/`,
                {
                    responseType: "blob",
                    params: { year: selectedYear },
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `estado_cuenta_${selectedClient.name}_${selectedYear}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Estado de cuenta exportado");
        } catch (error) {
            toast.error("Error al exportar");
        } finally {
            setIsExporting(false);
        }
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();
        if (!selectedInvoice || isSubmitting) return;

        try {
            setIsSubmitting(true);
            await axios.post(`/orders/invoices/${selectedInvoice.id}/add_payment/`, paymentForm);
            toast.success("Pago registrado exitosamente");
            setIsPaymentModalOpen(false);
            setPaymentForm({
                amount: "",
                payment_date: new Date().toISOString().split('T')[0],
                payment_method: "transferencia",
                reference: "",
                notes: "",
            });
            fetchInvoices(selectedClient.id);
            fetchStatement(selectedClient.id);
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al registrar pago");
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
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matches =
                    inv.invoice_number?.toLowerCase().includes(query) ||
                    inv.service_order_number?.toLowerCase().includes(query);
                if (!matches) return false;
            }
            if (statusFilter && inv.status !== statusFilter) return false;
            return true;
        });
    }, [invoices, searchQuery, statusFilter]);

    // Client KPIs
    const clientKPIs = useMemo(() => {
        if (!statement) return null;

        return {
            creditLimit: statement.credit_limit || 0,
            creditUsed: statement.credit_used || 0,
            creditAvailable: statement.available_credit || 0,
            pendingOrders: statement.total_pending_orders || 0,
            totalInvoiced: invoices.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0),
            totalPaid: invoices.reduce((sum, inv) => sum + parseFloat(inv.paid_amount || 0), 0),
            totalPending: invoices
                .filter(inv => inv.status !== 'paid' && inv.status !== 'cancelled')
                .reduce((sum, inv) => sum + parseFloat(inv.balance || 0), 0),
        };
    }, [statement, invoices]);

    // Invoice columns
    const invoiceColumns = [
        {
            header: "Factura",
            accessor: "invoice_number",
            cell: (row) => (
                <div>
                    <div className="font-mono text-sm font-semibold text-gray-900">
                        {row.invoice_number || "Sin número"}
                    </div>
                    <div className="text-xs text-gray-500">
                        {row.invoice_type || "DTE"}
                    </div>
                </div>
            ),
        },
        {
            header: "OS",
            accessor: "service_order_number",
            cell: (row) => (
                <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
                    {row.service_order_number || "—"}
                </span>
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
                const isOverdue = row.due_date && new Date(row.due_date) < new Date() && row.status !== 'paid';
                return (
                    <div className={cn(
                        "text-sm",
                        isOverdue ? "text-red-600 font-medium" : "text-gray-700"
                    )}>
                        {row.due_date ? formatDate(row.due_date, { format: "short" }) : "—"}
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
                <div className={cn(
                    "text-right font-semibold tabular-nums",
                    parseFloat(row.balance) > 0 ? "text-amber-600" : "text-emerald-600"
                )}>
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
                <div className="flex items-center justify-end gap-1">
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
                    {row.status !== 'paid' && row.status !== 'cancelled' && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                openPaymentModal(row);
                            }}
                            className="text-gray-500 hover:text-emerald-600"
                            title="Registrar pago"
                        >
                            <Banknote className="w-4 h-4" />
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
            cell: (row) => row.eta ? formatDate(row.eta, { format: "short" }) : "—",
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
            header: "PO",
            accessor: "po",
            cell: (row) => row.po || "—",
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
            <div className="space-y-6 p-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                            <Skeleton key={i} className="h-28" />
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
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
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="w-32"
                        >
                            {[2025, 2024, 2023, 2022].map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </Select>
                        <Button
                            variant="outline"
                            onClick={handleExportExcel}
                            disabled={isExporting || !selectedClient}
                        >
                            <Download className={cn("w-4 h-4 mr-2", isExporting && "animate-bounce")} />
                            Exportar
                        </Button>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar de Clientes */}
                    <div className="lg:col-span-3 space-y-4">
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
                                        onChange={(e) => setClientSearchQuery(e.target.value)}
                                        className="pl-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto pr-1">
                                    {filteredClients.map((client) => (
                                        <ClientCard
                                            key={client.id}
                                            client={client}
                                            isSelected={selectedClient?.id === client.id}
                                            onClick={() => setSelectedClient(client)}
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
                                            Selecciona un cliente de la lista para ver su estado de cuenta,
                                            historial de facturas y registrar pagos.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                {/* Client Header */}
                                <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
                                    <CardContent className="p-6">
                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center font-bold text-2xl">
                                                    {selectedClient.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h2 className="text-xl font-bold">
                                                        {selectedClient.name}
                                                    </h2>
                                                    <div className="flex items-center gap-4 mt-1 text-slate-300 text-sm">
                                                        <span>NIT: {selectedClient.nit}</span>
                                                        {selectedClient.payment_condition && (
                                                            <Badge variant="outline" className="border-white/30 text-white">
                                                                {selectedClient.payment_condition === 'credito' ? 'Crédito' : 'Contado'}
                                                            </Badge>
                                                        )}
                                                        {selectedClient.credit_days > 0 && (
                                                            <span>{selectedClient.credit_days} días</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {selectedClient.phone && (
                                                    <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
                                                        <Phone className="w-4 h-4 mr-2" />
                                                        {selectedClient.phone}
                                                    </Button>
                                                )}
                                                {selectedClient.email && (
                                                    <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10">
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
                                            value={formatCurrency(clientKPIs.creditLimit)}
                                            icon={CreditCard}
                                            variant="primary"
                                        />
                                        <KPICard
                                            label="Crédito Utilizado"
                                            value={formatCurrency(clientKPIs.creditUsed)}
                                            icon={TrendingUp}
                                            variant="warning"
                                        />
                                        <KPICard
                                            label="Crédito Disponible"
                                            value={formatCurrency(clientKPIs.creditAvailable)}
                                            icon={TrendingDown}
                                            variant={clientKPIs.creditAvailable > 0 ? "success" : "danger"}
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
                                                    {statement.pending_invoices.length} orden(es)
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
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
                                    <CardHeader>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                            <CardTitle className="text-base flex items-center gap-2">
                                                <Receipt className="w-5 h-5 text-blue-500" />
                                                Cuentas por Cobrar (Facturas)
                                            </CardTitle>
                                            <div className="flex items-center gap-2">
                                                <div className="relative flex-1 min-w-[200px]">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                    <Input
                                                        placeholder="Buscar factura..."
                                                        value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)}
                                                        className="pl-9 text-sm"
                                                    />
                                                </div>
                                                <Select
                                                    value={statusFilter}
                                                    onChange={(e) => setStatusFilter(e.target.value)}
                                                    className="w-40"
                                                >
                                                    <option value="">Todos los estados</option>
                                                    <option value="pending">Pendientes</option>
                                                    <option value="partial">Pago Parcial</option>
                                                    <option value="paid">Pagadas</option>
                                                    <option value="overdue">Vencidas</option>
                                                </Select>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-0">
                                        {filteredInvoices.length > 0 ? (
                                            <DataTable
                                                data={filteredInvoices}
                                                columns={invoiceColumns}
                                            />
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                                <p>No hay facturas registradas para este cliente</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Resumen de Pagos */}
                                {invoices.length > 0 && (
                                    <Card>
                                        <CardContent className="p-4">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div className="p-3 bg-slate-50 rounded-lg">
                                                    <div className="text-xs text-slate-500 mb-1">Total Facturado</div>
                                                    <div className="text-lg font-bold text-slate-900">
                                                        {formatCurrency(clientKPIs?.totalInvoiced || 0)}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-emerald-50 rounded-lg">
                                                    <div className="text-xs text-emerald-600 mb-1">Total Cobrado</div>
                                                    <div className="text-lg font-bold text-emerald-600">
                                                        {formatCurrency(clientKPIs?.totalPaid || 0)}
                                                    </div>
                                                </div>
                                                <div className="p-3 bg-amber-50 rounded-lg">
                                                    <div className="text-xs text-amber-600 mb-1">Por Cobrar</div>
                                                    <div className="text-lg font-bold text-amber-600">
                                                        {formatCurrency(clientKPIs?.totalPending || 0)}
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
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => {
                    setIsPaymentModalOpen(false);
                    setSelectedInvoice(null);
                }}
                title="Registrar Pago / Abono"
                size="lg"
            >
                <form onSubmit={handleAddPayment} className="space-y-5">
                    {selectedInvoice && (
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="text-sm text-slate-500">Factura</div>
                                    <div className="font-mono font-semibold">
                                        {selectedInvoice.invoice_number}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-slate-500">Saldo Pendiente</div>
                                    <div className="font-bold text-lg text-amber-600">
                                        {formatCurrency(selectedInvoice.balance)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Monto del Pago *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={selectedInvoice?.balance}
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                placeholder="0.00"
                                required
                            />
                        </div>
                        <div>
                            <Label>Fecha de Pago *</Label>
                            <Input
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Método de Pago</Label>
                            <Select
                                value={paymentForm.payment_method}
                                onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                            >
                                <option value="transferencia">Transferencia</option>
                                <option value="efectivo">Efectivo</option>
                                <option value="cheque">Cheque</option>
                                <option value="tarjeta">Tarjeta</option>
                            </Select>
                        </div>
                        <div>
                            <Label>Referencia / No. Documento</Label>
                            <Input
                                value={paymentForm.reference}
                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                placeholder="Ej: TRF-12345"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Notas</Label>
                        <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            placeholder="Observaciones del pago..."
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
                            {isSubmitting ? "Registrando..." : "Registrar Pago"}
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
                        <div className="flex items-start justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 rounded-xl border">
                            <div>
                                <div className="text-sm text-slate-500">Factura</div>
                                <div className="text-2xl font-bold font-mono text-slate-900">
                                    {selectedInvoice.invoice_number || "Sin número"}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">{selectedInvoice.invoice_type || "DTE"}</Badge>
                                    <StatusBadge status={selectedInvoice.status} />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-500">Total</div>
                                <div className="text-2xl font-bold text-slate-900">
                                    {formatCurrency(selectedInvoice.total_amount)}
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
                                        {selectedInvoice.service_order_number || "—"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Emisión
                                    </div>
                                    <div className="text-sm">
                                        {formatDate(selectedInvoice.issue_date, { format: "long" })}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Vencimiento
                                    </div>
                                    <div className="text-sm">
                                        {selectedInvoice.due_date
                                            ? formatDate(selectedInvoice.due_date, { format: "long" })
                                            : "—"}
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-emerald-50 rounded-lg">
                                    <div className="text-xs font-semibold text-emerald-600 uppercase mb-1">
                                        Monto Pagado
                                    </div>
                                    <div className="text-xl font-bold text-emerald-600">
                                        {formatCurrency(selectedInvoice.paid_amount || 0)}
                                    </div>
                                </div>
                                <div className="p-4 bg-amber-50 rounded-lg">
                                    <div className="text-xs font-semibold text-amber-600 uppercase mb-1">
                                        Saldo Pendiente
                                    </div>
                                    <div className="text-xl font-bold text-amber-600">
                                        {formatCurrency(selectedInvoice.balance || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment History */}
                        {selectedInvoice.payments && selectedInvoice.payments.length > 0 && (
                            <div>
                                <div className="text-sm font-semibold text-slate-900 mb-3">
                                    Historial de Pagos
                                </div>
                                <div className="space-y-2">
                                    {selectedInvoice.payments.map((payment, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                <div>
                                                    <div className="text-sm font-medium">
                                                        {formatCurrency(payment.amount)}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {payment.payment_method} • {payment.reference || "Sin referencia"}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {formatDate(payment.payment_date, { format: "short" })}
                                            </div>
                                        </div>
                                    ))}
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
                            {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
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
