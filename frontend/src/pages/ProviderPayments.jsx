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
    FileX,
    RotateCcw,
    Info,
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
    PromptDialog,
} from "../components/ui";
import ExportButton from "../components/ui/ExportButton";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn, getTodayDate } from "../lib/utils";

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
    } catch (e) {
        return dateStr;
    }
};

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

// Configuración de estados de Notas de Crédito - Paleta Profesional
const NC_STATUS_CONFIG = {
    pendiente: {
        label: "Pendiente",
        className: "bg-white border-slate-200 text-slate-600",
        icon: Clock,
    },
    parcial: {
        label: "Parcial",
        className: "bg-white border-slate-200 text-slate-700",
        icon: CreditCard,
    },
    aplicada: {
        label: "Aplicada",
        className: "bg-white border-slate-200 text-slate-900 font-medium",
        icon: CheckCircle2,
    },
    anulada: {
        label: "Anulada",
        className: "bg-slate-50 border-transparent text-slate-400",
        icon: XCircle,
    },
};

const NC_REASON_OPTIONS = [
    { id: "devolucion", name: "Devolución de Mercancía" },
    { id: "descuento", name: "Descuento Comercial" },
    { id: "error_factura", name: "Error en Factura Original" },
    { id: "bonificacion", name: "Bonificación" },
    { id: "ajuste_precio", name: "Ajuste de Precio" },
    { id: "garantia", name: "Reclamo por Garantía" },
    { id: "otro", name: "Otro" },
];

const NCStatusBadge = ({ status }) => {
    const config = NC_STATUS_CONFIG[status] || NC_STATUS_CONFIG.pendiente;
    const Icon = config.icon;
    return (
        <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border shadow-sm",
            config.className
        )}>
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {config.label}
        </span>
    );
};

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
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
                <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate" title={label}>
                    {label}
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 tabular-nums tracking-tight truncate">
                    {value}
                </p>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100 flex-shrink-0">
                {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-slate-400" />}
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
    const [creditNotes, setCreditNotes] = useState([]);
    const [serviceOrders, setServiceOrders] = useState([]);
    const [providers, setProviders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [clients, setClients] = useState([]);

    // UI state
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("gastos");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [isExporting, setIsExporting] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({
        open: false,
        id: null,
        type: null, // 'payment' | 'credit-note'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Credit Note states
    const [isNCModalOpen, setIsNCModalOpen] = useState(false);
    const [isNCDetailModalOpen, setIsNCDetailModalOpen] = useState(false);
    const [isApplyNCModalOpen, setIsApplyNCModalOpen] = useState(false);
    const [isVoidNCDialogOpen, setIsVoidNCDialogOpen] = useState(false);
    const [selectedNC, setSelectedNC] = useState(null);
    const [ncForm, setNCForm] = useState({
        provider: "",
        transfer: "", // Factura a la que aplica la NC
        note_number: "",
        amount: "",
        issue_date: getTodayDate(),
        received_date: getTodayDate(),
        reason: "otro",
        reason_detail: "",
        pdf_file: null,
    });
    const [pendingTransfers, setPendingTransfers] = useState([]);
    const [providerTransfers, setProviderTransfers] = useState([]); // Facturas del proveedor seleccionado
    const [applyFormData, setApplyFormData] = useState([]);

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
        fetchCreditNotes();
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

    const fetchCreditNotes = async () => {
        try {
            const response = await axios.get("/transfers/provider-credit-notes/");
            setCreditNotes(response.data || []);
        } catch {
            console.error("Error al cargar notas de crédito");
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [ordersRes, providersRes, banksRes, clientsRes] =
                await Promise.all([
                    axios.get("/orders/service-orders/"),
                    axios.get("/catalogs/providers/"),
                    axios.get("/catalogs/banks/"),
                    axios.get("/clients/active/"),
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

            toast.success("Gasto registrado exitosamente");
            setIsCreateModalOpen(false);
            resetForm();
            fetchPayments();
        } catch {
            // El interceptor de axios ya muestra el toast de error
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

            toast.success("Gasto actualizado exitosamente");
            setIsCreateModalOpen(false);
            resetForm();
            fetchPayments();
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteConfirm.id) return;

        try {
            if (deleteConfirm.type === 'credit-note') {
                await axios.delete(`/transfers/provider-credit-notes/${deleteConfirm.id}/`);
                toast.success("Nota de crédito eliminada correctamente");
                fetchCreditNotes();
            } else {
                await axios.delete(`/transfers/transfers/${deleteConfirm.id}/`);
                toast.success("Gasto eliminado correctamente");
                fetchPayments();
            }
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setDeleteConfirm({ open: false, id: null, type: null });
        }
    };

    // =========================================
    // CREDIT NOTE HANDLERS
    // =========================================
    const resetNCForm = () => {
        setNCForm({
            provider: "",
            transfer: "",
            note_number: "",
            amount: "",
            issue_date: getTodayDate(),
            received_date: getTodayDate(),
            reason: "otro",
            reason_detail: "",
            pdf_file: null,
        });
        setProviderTransfers([]);
        setSelectedNC(null);
    };

    // Cargar facturas del proveedor seleccionado para NC
    const fetchProviderTransfersForNC = async (providerId) => {
        if (!providerId) {
            setProviderTransfers([]);
            return;
        }
        try {
            const response = await axios.get("/transfers/transfers/", {
                params: { provider: providerId }
            });
            // Filtrar solo las que tienen saldo o están pendientes/aprobadas
            const transfers = (response.data || []).filter(t =>
                t.provider === parseInt(providerId) || t.provider?.id === parseInt(providerId)
            );
            setProviderTransfers(transfers);
        } catch {
            setProviderTransfers([]);
        }
    };

    const handleCreateNC = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            formData.append("provider", ncForm.provider);
            formData.append("note_number", ncForm.note_number);
            formData.append("amount", ncForm.amount);
            formData.append("issue_date", ncForm.issue_date);
            formData.append("received_date", ncForm.received_date);
            formData.append("reason", ncForm.reason);
            if (ncForm.transfer) formData.append("original_transfer", ncForm.transfer);
            if (ncForm.reason_detail) formData.append("reason_detail", ncForm.reason_detail);
            if (ncForm.pdf_file) formData.append("pdf_file", ncForm.pdf_file);

            await axios.post("/transfers/provider-credit-notes/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                _skipErrorToast: true,
            });

            toast.success("Nota de crédito registrada correctamente");
            setIsNCModalOpen(false);
            resetNCForm();
            fetchCreditNotes();
            fetchPayments(); // Refrescar pagos también
        } catch (error) {
            const errorMsg = error.response?.data?.error ||
                error.response?.data?.note_number?.[0] ||
                "Error al registrar nota de crédito";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewNCDetail = async (nc) => {
        try {
            const response = await axios.get(`/transfers/provider-credit-notes/${nc.id}/`);
            setSelectedNC(response.data);
            setIsNCDetailModalOpen(true);
        } catch {
            toast.error("Error al cargar detalles de la nota de crédito");
        }
    };

    const fetchPendingTransfers = async (providerId) => {
        try {
            const response = await axios.get(`/transfers/provider-credit-notes/pending_for_provider/`, {
                params: { provider_id: providerId }
            });
            setPendingTransfers(response.data.pending_transfers || []);
        } catch {
            setPendingTransfers([]);
        }
    };

    const openApplyNCModal = async (nc) => {
        setSelectedNC(nc);
        await fetchPendingTransfers(nc.provider);
        setApplyFormData([]);
        setIsApplyNCModalOpen(true);
    };

    const handleApplyNC = async () => {
        if (!selectedNC || !selectedNC.id || applyFormData.length === 0) return;

        const applications = applyFormData
            .filter(app => app.amount && parseFloat(app.amount) > 0)
            .map(app => ({
                transfer_id: app.transfer_id,
                amount: parseFloat(app.amount),
                notes: app.notes || ""
            }));

        if (applications.length === 0) {
            toast.error("Debe ingresar al menos un monto a aplicar");
            return;
        }

        try {
            setIsSubmitting(true);
            await axios.post(`/transfers/provider-credit-notes/${selectedNC.id}/apply/`, {
                applications
            }, {
                _skipErrorToast: true
            });

            toast.success("Nota de crédito aplicada correctamente");
            setIsApplyNCModalOpen(false);
            setSelectedNC(null);
            setApplyFormData([]);
            fetchCreditNotes();
            fetchPayments();
        } catch (error) {
            const errorData = error.response?.data;
            const errorMsg = errorData?.error || "Error al aplicar nota de crédito";
            const errorDetail = Array.isArray(errorData?.detail)
                ? errorData.detail.join(", ")
                : errorData?.detail;

            if (errorDetail) {
                toast.error(
                    <div>
                        <p className="font-semibold">{errorMsg}</p>
                        <p className="text-sm opacity-90 mt-1">{errorDetail}</p>
                    </div>,
                    { duration: 5000 }
                );
            } else {
                toast.error(errorMsg);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVoidNC = async (reason) => {
        if (!selectedNC || !selectedNC.id) return;

        try {
            setIsSubmitting(true);
            await axios.post(`/transfers/provider-credit-notes/${selectedNC.id}/void/`, {
                reason
            }, {
                _skipErrorToast: true
            });

            toast.success("Nota de crédito anulada correctamente");
            setIsNCDetailModalOpen(false);
            setSelectedNC(null);
            fetchCreditNotes();
            fetchPayments();
        } catch (error) {
            const errorMsg = error.response?.data?.error || "Error al anular nota de crédito";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
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

        if (!(payFormData.invoice_file instanceof File)) {
            toast.error("Debe adjuntar el comprobante de pago");
            return;
        }

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
                    _skipErrorToast: true,
                }
            );
            
            toast.success("Pago registrado exitosamente");
            setIsPayModalOpen(false);
            fetchPayments();
        } catch (error) {
             const errorData = error.response?.data;
             const errorMsg =
                errorData?.transfer || // Priorizar mensaje de validación de modelo
                errorData?.error ||
                errorData?.message ||
                "Error al registrar pago";
            
            // Si es un objeto de errores (validación de formulario), mostrar el primero
            if (typeof errorData === 'object' && !errorData.transfer && !errorData.error) {
                 const firstError = Object.values(errorData)[0];
                 toast.error(Array.isArray(firstError) ? firstError[0] : errorMsg);
            } else {
                 toast.error(errorMsg);
            }
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

    const handleApprove = async (payment) => {
        try {
            await axios.patch(`/transfers/transfers/${payment.id}/`,
                { status: 'aprobado' },
                { _skipErrorToast: true }
            );
            toast.success("Gasto aprobado correctamente");
            fetchPayments();
            setIsDetailModalOpen(false);
            setSelectedPayment(null);
        } catch (error) {
            const errorData = error.response?.data;
            const errorMsg = errorData?.error || "Error al aprobar el gasto";
            const errorDetail = errorData?.detail;

            if (errorDetail) {
                toast.error(
                    <div>
                        <p className="font-semibold">{errorMsg}</p>
                        <p className="text-sm opacity-90 mt-1">{errorDetail}</p>
                    </div>,
                    { duration: 5000 }
                );
            } else {
                toast.error(errorMsg);
            }
        }
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
                        {formatDateSafe(row.transaction_date)}
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
                        {(row.status === "aprobado" || row.status === "parcial") ? (
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
                        ) : row.status === "pendiente" ? (
                            <span 
                                className="p-1.5 text-slate-300 cursor-not-allowed"
                                title="Requiere Aprobación"
                            >
                                <LockIcon className="w-4 h-4" />
                            </span>
                        ) : null}
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
                                setDeleteConfirm({ open: true, id: row.id, type: 'payment' });
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

    // Columnas para tabla de Notas de Crédito
    const ncColumns = [
        {
            header: "N° Nota de Crédito",
            accessor: "note_number",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col py-1">
                    <span className="font-mono font-semibold text-slate-700 text-sm">
                        {row.note_number}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {formatDateSafe(row.issue_date)}
                    </span>
                </div>
            ),
        },
        {
            header: "Proveedor / Factura",
            accessor: "provider_name",
            sortable: false,
            cell: (row) => (
                <div className="py-1">
                    <div className="font-medium text-slate-700 text-sm truncate max-w-[200px]" title={row.provider_name}>
                        {row.provider_name}
                    </div>
                    {row.original_transfer_info ? (
                        <span className="text-[10px] text-slate-500 font-medium">
                            Factura: {row.original_transfer_info.invoice_number || `#${row.original_transfer_info.id}`}
                        </span>
                    ) : (
                        <span className="text-[10px] text-slate-400">
                            Sin factura asociada
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Monto Total",
            accessor: "amount",
            className: "w-[130px]",
            headerClassName: "text-right",
            sortable: false,
            cell: (row) => (
                <div className="text-right py-1">
                    <span className="font-bold text-slate-700 tabular-nums text-sm">
                        {formatCurrency(row.amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Aplicado",
            accessor: "applied_amount",
            className: "w-[130px]",
            headerClassName: "text-right",
            sortable: false,
            cell: (row) => (
                <div className="text-right py-1">
                    <span className={cn(
                        "font-semibold tabular-nums text-sm",
                        parseFloat(row.applied_amount) > 0 ? "text-slate-700" : "text-slate-300"
                    )}>
                        {parseFloat(row.applied_amount) > 0 ? formatCurrency(row.applied_amount) : "—"}
                    </span>
                </div>
            ),
        },
        {
            header: "Disponible",
            accessor: "available_amount",
            className: "w-[130px]",
            headerClassName: "text-right",
            sortable: false,
            cell: (row) => (
                <div className="text-right py-1">
                    <span className={cn(
                        "font-bold tabular-nums text-sm",
                        parseFloat(row.available_amount) > 0 ? "text-slate-900" : "text-slate-400"
                    )}>
                        {formatCurrency(row.available_amount)}
                    </span>
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            className: "w-[130px]",
            sortable: false,
            cell: (row) => <NCStatusBadge status={row.status} />,
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[140px] text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="grid grid-cols-4 gap-1 w-full max-w-[130px] mx-auto">
                    <div className="flex justify-center">
                        {row.status !== 'aplicada' && row.status !== 'anulada' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openApplyNCModal(row);
                                }}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                                title="Aplicar NC"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleViewNCDetail(row);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Ver Detalle"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        {row.pdf_file ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(row.pdf_file, "_blank");
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                title="Ver PDF"
                            >
                                <FileText className="w-4 h-4" />
                            </button>
                        ) : (
                            <div className="w-7" />
                        )}
                    </div>
                    <div className="flex justify-center">
                        {row.status === 'pendiente' && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeleteConfirm({ open: true, id: row.id, type: 'credit-note' });
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
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
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <SkeletonTable rows={10} columns={7} />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 mt-1 sm:mt-2">

            {/* Bloque Superior (Estratégico): KPIs - Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
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

            {/* Bloque Inferior (Operativo): Tabla + Herramientas */}
            <div className="bg-white border border-slate-200 rounded-lg sm:rounded-xl shadow-sm overflow-hidden flex flex-col">

                {/* Barra de Herramientas Unificada */}
                <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50/30">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">

                        {/* Izquierda: Tabs + Búsqueda + Filtros */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 lg:max-w-3xl">
                            {/* Tabs */}
                            <div className="flex bg-slate-100/80 p-1 rounded-lg border border-slate-200/50 w-full sm:w-auto shrink-0">
                                <button
                                    onClick={() => setActiveTab("gastos")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                        activeTab === "gastos"
                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200/50"
                                            : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    )}
                                >
                                    Gastos
                                </button>
                                <button
                                    onClick={() => setActiveTab("nc")}
                                    className={cn(
                                        "flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-1.5 text-xs font-bold rounded-md transition-all uppercase tracking-wide",
                                        activeTab === "nc"
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
                                        type="text"
                                        placeholder={activeTab === "gastos" ? "Buscar gasto, proveedor, OS..." : "Buscar nota crédito..."}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2.5 sm:py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                                    />
                                </div>
                                {activeTab === "gastos" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                                        className={cn(
                                            "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all h-10 sm:h-9 px-2.5 sm:px-3 whitespace-nowrap",
                                            isFiltersOpen && "ring-2 ring-slate-900/5 border-slate-900 bg-slate-50"
                                        )}
                                    >
                                        <Filter className="w-4 h-4 sm:w-3.5 sm:h-3.5 sm:mr-2 text-slate-500" />
                                        <span className="hidden sm:inline">Filtros</span>
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
                            {activeTab === "gastos" && (
                                <ExportButton
                                    onExportAll={() => handleExportExcel("all")}
                                    onExportFiltered={() => handleExportExcel("filtered")}
                                    filteredCount={filteredPayments.length}
                                    totalCount={payments.length}
                                    isExporting={isExporting}
                                    allLabel="Todos los Pagos"
                                    allDescription="Exportar registro completo"
                                    filteredLabel="Filtrados"
                                    filteredDescription="Solo visibles"
                                />
                            )}

                            <Button
                                size="sm"
                                onClick={() => activeTab === "gastos" ? setIsCreateModalOpen(true) : setIsNCModalOpen(true)}
                                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-10 sm:h-9 px-3 sm:px-4 transition-all active:scale-95 whitespace-nowrap"
                            >
                                <Plus className="w-4 h-4 sm:w-3.5 sm:h-3.5 mr-1.5 sm:mr-2" />
                                {activeTab === "gastos" ? "Nuevo Gasto" : "Nueva NC"}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Advanced Filters Panel - Solo para Gastos */}
                {isFiltersOpen && activeTab === "gastos" && (
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

                {/* Contenido de las Tablas */}
                <div className="relative min-h-[400px]">
                    {activeTab === "gastos" ? (
                        <DataTable
                            data={filteredPayments}
                            columns={columns}
                            loading={loading}
                            searchable={false}
                            onRowClick={openDetailModal}
                            emptyMessage="No se encontraron movimientos financieros con los criterios actuales."
                        />
                    ) : (
                        <DataTable
                            data={creditNotes}
                            columns={ncColumns}
                            loading={loading}
                            searchable={false}
                            onRowClick={handleViewNCDetail}
                            emptyMessage="No hay notas de crédito registradas"
                        />
                    )}
                </div>
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
                                    {formatDateSafe(selectedPayment.transaction_date, "long")}
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

                        {/* Notas de Crédito Aplicadas */}
                        {selectedPayment.credit_notes_applied && selectedPayment.credit_notes_applied.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-3">
                                    Notas de Crédito Aplicadas
                                </label>
                                <div className="space-y-2">
                                    {selectedPayment.credit_notes_applied.map((nc) => (
                                        <div
                                            key={nc.id}
                                            className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                                                    <CreditCard className="w-4 h-4 text-slate-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-700 font-mono">
                                                        {nc.note_number}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {nc.reason} • {nc.issue_date ? formatDate(nc.issue_date) : "—"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 tabular-nums">
                                                        {formatCurrency(nc.amount)}
                                                    </p>
                                                    <NCStatusBadge status={nc.status} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Botones de Acción */}
                        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
                            <div>
                                {selectedPayment.status === 'pendiente' && (
                                    <Button
                                        onClick={() => handleApprove(selectedPayment)}
                                        className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Aprobar Gasto
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <Button variant="outline" onClick={() => setIsDetailModalOpen(false)}>
                                    Cerrar
                                </Button>
                                <Button
                                    onClick={() => {
                                        setIsDetailModalOpen(false);
                                        openEditModal(selectedPayment);
                                    }}
                                    className="bg-slate-900 text-white hover:bg-slate-800"
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Editar
                                </Button>
                            </div>
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
                                    <Label className="mb-1.5 block" required>Comprobante de Pago</Label>
                                    <FileUpload
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onFileChange={(file) => setPayFormData({ ...payFormData, invoice_file: file })}
                                        helperText="Adjuntar comprobante de transferencia o cheque (requerido)"
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

            {/* Void Credit Note Dialog */}
            <PromptDialog
                open={isVoidNCDialogOpen}
                onClose={() => setIsVoidNCDialogOpen(false)}
                onConfirm={handleVoidNC}
                title="Anular Nota de Crédito"
                description="Por favor, ingrese el motivo de la anulación. Esta acción es irreversible y revertirá todas las aplicaciones."
                label="Motivo de Anulación"
                placeholder="Ej: Error en el monto, duplicidad..."
                confirmText="Anular NC"
                confirmVariant="destructive"
                required
            />

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={deleteConfirm.open}
                onClose={() => setDeleteConfirm({ open: false, id: null, type: null })}
                title="Confirmar Eliminación"
                description={deleteConfirm.type === 'credit-note'
                    ? "¿Estás seguro de que deseas eliminar esta nota de crédito? Esta acción es permanente."
                    : "¿Estás seguro de que deseas eliminar este registro financiero? Esta acción es permanente y afectará los reportes mensuales."
                }
                confirmText="Eliminar Permanentemente"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={handleDelete}
            />

            {/* Modal Nueva Nota de Crédito */}
            <Modal
                isOpen={isNCModalOpen}
                onClose={() => {
                    setIsNCModalOpen(false);
                    resetNCForm();
                }}
                title="Registrar Nota de Crédito de Proveedor"
                size="3xl"
            >
                <form onSubmit={handleCreateNC} className="space-y-6">
                    {/* Section 1: Proveedor y Factura */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Documento de Origen
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">Proveedor *</Label>
                                <SelectERP
                                    value={ncForm.provider}
                                    onChange={(val) => {
                                        setNCForm({ ...ncForm, provider: val, transfer: "" });
                                        fetchProviderTransfersForNC(val);
                                    }}
                                    options={providerOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    placeholder="Seleccionar proveedor"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Factura Original *</Label>
                                <SelectERP
                                    value={ncForm.transfer}
                                    onChange={(val) => setNCForm({ ...ncForm, transfer: val })}
                                    options={[
                                        { id: "", name: "Seleccionar factura..." },
                                        ...providerTransfers.map(t => ({
                                            id: String(t.id),
                                            name: `${t.invoice_number || `ID-${t.id}`} - ${formatCurrency(t.amount)} - ${t.description?.substring(0, 30) || 'Sin descripción'}...`
                                        }))
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    disabled={!ncForm.provider}
                                    placeholder={ncForm.provider ? "Seleccionar factura..." : "Primero seleccione proveedor"}
                                />
                                {ncForm.provider && providerTransfers.length === 0 && (
                                    <p className="text-xs text-amber-600 mt-1.5 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" />
                                        Este proveedor no tiene facturas registradas
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Mostrar info de la factura seleccionada */}
                        {ncForm.transfer && (
                            <div className="mt-4 p-4 bg-slate-100 border border-slate-300 rounded-lg">
                                {(() => {
                                    const selectedTransfer = providerTransfers.find(t => String(t.id) === ncForm.transfer);
                                    if (!selectedTransfer) return null;
                                    return (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Factura Seleccionada</p>
                                                <p className="text-sm font-medium text-slate-800">
                                                    {selectedTransfer.invoice_number || `ID-${selectedTransfer.id}`}
                                                </p>
                                                <p className="text-xs text-slate-600 mt-0.5">{selectedTransfer.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-slate-500">Monto Original</p>
                                                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(selectedTransfer.amount)}</p>
                                                {parseFloat(selectedTransfer.balance) < parseFloat(selectedTransfer.amount) && (
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Saldo: {formatCurrency(selectedTransfer.balance)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Datos de la NC */}
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2 pt-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Datos de la Nota de Crédito
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                            <div>
                                <Label className="mb-1.5 block">N° Nota de Crédito *</Label>
                                <Input
                                    value={ncForm.note_number}
                                    onChange={(e) => setNCForm({ ...ncForm, note_number: e.target.value })}
                                    placeholder="Ej: NC-001-2025"
                                    className="font-mono"
                                    required
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Monto de la NC *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        value={ncForm.amount}
                                        onChange={(e) => setNCForm({ ...ncForm, amount: e.target.value })}
                                        placeholder="0.00"
                                        className="pl-7 font-mono font-bold text-slate-900"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha de Emisión</Label>
                                <Input
                                    type="date"
                                    value={ncForm.issue_date}
                                    onChange={(e) => setNCForm({ ...ncForm, issue_date: e.target.value })}
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Fecha de Recepción</Label>
                                <Input
                                    type="date"
                                    value={ncForm.received_date}
                                    onChange={(e) => setNCForm({ ...ncForm, received_date: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Motivo */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <FileX className="w-3.5 h-3.5" />
                            Motivo de la Nota de Crédito
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <Label className="mb-1.5 block">Razón *</Label>
                                <SelectERP
                                    value={ncForm.reason}
                                    onChange={(val) => setNCForm({ ...ncForm, reason: val })}
                                    options={NC_REASON_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block">Detalle / Observaciones</Label>
                                <Input
                                    value={ncForm.reason_detail}
                                    onChange={(e) => setNCForm({ ...ncForm, reason_detail: e.target.value })}
                                    placeholder="Descripción adicional..."
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <Label className="mb-1.5 block">Adjuntar PDF de la NC (Opcional)</Label>
                                <FileUpload
                                    accept=".pdf"
                                    onFileChange={(file) => setNCForm({ ...ncForm, pdf_file: file })}
                                    helperText="PDF del documento original"
                                />
                            </div>
                        </div>
                    </div>

                    <ModalFooter className="px-0 pb-0">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setIsNCModalOpen(false);
                                resetNCForm();
                            }}
                            className="text-slate-500 font-semibold"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !ncForm.provider || !ncForm.transfer || !ncForm.note_number || !ncForm.amount}
                            className="bg-slate-900 text-white hover:bg-black min-w-[160px] shadow-lg shadow-slate-200 transition-all active:scale-95"
                        >
                            {isSubmitting ? "Registrando..." : "Registrar NC"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Modal Detalle NC */}
            <Modal
                isOpen={isNCDetailModalOpen}
                onClose={() => {
                    setIsNCDetailModalOpen(false);
                    setSelectedNC(null);
                }}
                title="Detalle de Nota de Crédito"
                size="2xl"
            >
                {selectedNC && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700">
                            <div>
                                <p className="text-xs font-medium text-slate-400 mb-1">Monto Total</p>
                                <h2 className="text-3xl font-bold text-white tabular-nums">
                                    {formatCurrency(selectedNC.amount)}
                                </h2>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <NCStatusBadge status={selectedNC.status} />
                                <div className="text-xs text-slate-300 font-mono">
                                    {selectedNC.note_number}
                                </div>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Proveedor</label>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center">
                                        <Building2 className="w-4 h-4 text-slate-600" />
                                    </div>
                                    <p className="text-sm font-semibold text-slate-700">{selectedNC.provider_name}</p>
                                </div>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Motivo</label>
                                <p className="text-sm font-medium text-slate-700">
                                    {NC_REASON_OPTIONS.find(r => r.id === selectedNC.reason)?.name || selectedNC.reason}
                                </p>
                                {selectedNC.reason_detail && (
                                    <p className="text-xs text-slate-500 mt-1">{selectedNC.reason_detail}</p>
                                )}
                            </div>
                        </div>

                        {/* Factura Original */}
                        {selectedNC.original_transfer_info && (
                            <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">
                                    Factura Original Asociada
                                </label>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                            {selectedNC.original_transfer_info.invoice_number || `#${selectedNC.original_transfer_info.id}`}
                                        </p>
                                        <p className="text-xs text-slate-600 mt-0.5">{selectedNC.original_transfer_info.description}</p>
                                    </div>
                                    <span className="text-sm font-bold text-slate-900 tabular-nums">
                                        {formatCurrency(selectedNC.original_transfer_info.amount)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Montos */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Monto Total</label>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(selectedNC.amount)}</p>
                            </div>
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 text-center">
                                <label className="text-xs font-semibold text-slate-500 uppercase block mb-1">Aplicado</label>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(selectedNC.applied_amount)}</p>
                            </div>
                            <div className="bg-slate-100 rounded-lg p-4 border border-slate-300 text-center">
                                <label className="text-xs font-semibold text-slate-600 uppercase block mb-1">Disponible</label>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">{formatCurrency(selectedNC.available_amount)}</p>
                            </div>
                        </div>

                        {/* Aplicaciones */}
                        {selectedNC.applications && selectedNC.applications.length > 0 && (
                            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-3">
                                    Aplicaciones Realizadas
                                </label>
                                <div className="space-y-2">
                                    {selectedNC.applications.map((app, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                                            <div>
                                                <p className="text-sm font-medium text-slate-700">
                                                    Factura: {app.transfer_invoice_number || `#${app.transfer}`}
                                                </p>
                                                <p className="text-xs text-slate-500">{formatDate(app.applied_at)}</p>
                                            </div>
                                            <span className="text-sm font-bold text-slate-900 tabular-nums">
                                                {formatCurrency(app.amount)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info Anulación */}
                        {selectedNC.status === 'anulada' && (
                            <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
                                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide block mb-2">
                                    Información de Anulación
                                </label>
                                <p className="text-sm text-slate-700">{selectedNC.void_reason}</p>
                                <p className="text-xs text-slate-500 mt-2">
                                    Anulada el {formatDate(selectedNC.voided_at)} por {selectedNC.voided_by_name}
                                </p>
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-200">
                            <div>
                                {selectedNC.status !== 'aplicada' && selectedNC.status !== 'anulada' && (
                                    <Button
                                        onClick={() => {
                                            setIsNCDetailModalOpen(false);
                                            openApplyNCModal(selectedNC);
                                        }}
                                        className="bg-slate-900 text-white hover:bg-slate-800"
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Aplicar NC
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {selectedNC.status !== 'anulada' && (
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsVoidNCDialogOpen(true)}
                                        className="text-slate-600 border-slate-300 hover:bg-slate-100"
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Anular NC
                                    </Button>
                                )}
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setIsNCDetailModalOpen(false);
                                        setSelectedNC(null);
                                    }}
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal Aplicar NC */}
            <Modal
                isOpen={isApplyNCModalOpen}
                onClose={() => {
                    setIsApplyNCModalOpen(false);
                    setSelectedNC(null);
                    setApplyFormData([]);
                    setPendingTransfers([]);
                }}
                title="Aplicar Nota de Crédito"
                size="3xl"
            >
                {selectedNC && (
                    <div className="space-y-6">
                        {/* Resumen NC */}
                        <div className="bg-slate-100 rounded-xl p-5 border border-slate-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-medium text-slate-500 mb-1">Nota de Crédito</p>
                                    <p className="font-mono font-bold text-lg text-slate-900">{selectedNC.note_number}</p>
                                    <p className="text-sm text-slate-600 mt-1">{selectedNC.provider_name}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-medium text-slate-500 mb-1">Saldo Disponible</p>
                                    <p className="text-2xl font-bold tabular-nums text-slate-900">{formatCurrency(selectedNC.available_amount)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Facturas Pendientes */}
                        <div>
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Receipt className="w-3.5 h-3.5" />
                                Facturas Pendientes del Proveedor
                            </h4>

                            {pendingTransfers.length === 0 ? (
                                <div className="bg-slate-50 rounded-lg p-6 text-center border border-slate-200">
                                    <FileX className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600">No hay facturas pendientes de este proveedor</p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    <table className="w-full">
                                        <thead className="bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Factura</th>
                                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Descripción</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Saldo</th>
                                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase w-[140px]">Aplicar</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {pendingTransfers.map((transfer) => {
                                                const appData = applyFormData.find(a => a.transfer_id === transfer.id) || { amount: '' };
                                                return (
                                                    <tr key={transfer.id} className="hover:bg-slate-50/50">
                                                        <td className="px-4 py-3">
                                                            <span className="font-mono text-sm font-medium text-slate-700">
                                                                {transfer.invoice_number || `ID-${transfer.id}`}
                                                            </span>
                                                            <span className="text-xs text-slate-400 block mt-0.5">
                                                                {formatDate(transfer.transaction_date, { format: 'short' })}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className="text-sm text-slate-600 truncate block max-w-[200px]" title={transfer.description}>
                                                                {transfer.description}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="font-bold text-slate-700 tabular-nums">
                                                                {formatCurrency(transfer.balance)}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="relative">
                                                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                                                <input
                                                                    type="number"
                                                                    step="0.01"
                                                                    min="0"
                                                                    max={Math.min(parseFloat(transfer.balance), parseFloat(selectedNC.available_amount))}
                                                                    value={appData.amount}
                                                                    onChange={(e) => {
                                                                        const newValue = e.target.value;
                                                                        setApplyFormData(prev => {
                                                                            const existing = prev.find(a => a.transfer_id === transfer.id);
                                                                            if (existing) {
                                                                                return prev.map(a =>
                                                                                    a.transfer_id === transfer.id
                                                                                        ? { ...a, amount: newValue }
                                                                                        : a
                                                                                );
                                                                            } else {
                                                                                return [...prev, { transfer_id: transfer.id, amount: newValue, notes: '' }];
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="w-full pl-6 pr-2 py-1.5 text-sm font-mono border border-slate-200 rounded-md focus:border-slate-400 focus:outline-none text-right"
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Resumen de lo que se va a aplicar */}
                        {applyFormData.length > 0 && (
                            <div className="bg-slate-100 rounded-lg p-4 border border-slate-300">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-slate-700">Total a Aplicar:</span>
                                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                                        {formatCurrency(applyFormData.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0))}
                                    </span>
                                </div>
                            </div>
                        )}

                        <ModalFooter className="px-0 pb-0">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                    setIsApplyNCModalOpen(false);
                                    setSelectedNC(null);
                                    setApplyFormData([]);
                                }}
                                className="text-slate-500 font-semibold"
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handleApplyNC}
                                disabled={isSubmitting || applyFormData.filter(a => parseFloat(a.amount) > 0).length === 0}
                                className="bg-slate-900 text-white hover:bg-slate-800 min-w-[160px]"
                            >
                                {isSubmitting ? "Aplicando..." : "Confirmar Aplicación"}
                            </Button>
                        </ModalFooter>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default ProviderPayments;