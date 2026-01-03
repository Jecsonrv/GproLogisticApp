import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Search,
    RefreshCw,
    Download,
    Truck,
    Clock,
    DollarSign,
    CheckCircle2,
    AlertCircle,
    FileText,
    Calendar,
    Filter,
    Eye,
    X,
    Upload,
    CreditCard,
    FileMinus,
    Banknote,
    Trash2,
    Lock as LockIcon,
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
    Modal,
    ModalFooter,
    FileUpload,
    Skeleton,
    SkeletonTable,
    ConfirmDialog,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, cn, getTodayDate } from "../lib/utils";

// ============================================
// HELPERS
// ============================================
const formatDateSafe = (dateStr, variant = "short") => {
    if (!dateStr) return "—";
    try {
        const dateOnly = String(dateStr).split("T")[0];
        const parts = dateOnly.split("-");
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
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

// ============================================
// STATUS CONFIGURATION
// ============================================
const TRANSFER_STATUS = {
    pendiente: {
        label: "Pendiente",
        bgColor: "bg-amber-50",
        textColor: "text-amber-700",
        borderColor: "border-amber-200",
        dotColor: "bg-amber-500",
    },
    aprobado: {
        label: "Aprobado",
        bgColor: "bg-blue-50",
        textColor: "text-blue-700",
        borderColor: "border-blue-200",
        dotColor: "bg-blue-500",
    },
    parcial: {
        label: "Pago Parcial",
        bgColor: "bg-orange-50",
        textColor: "text-orange-700",
        borderColor: "border-orange-200",
        dotColor: "bg-orange-500",
    },
    pagado: {
        label: "Pagado",
        bgColor: "bg-emerald-50",
        textColor: "text-emerald-700",
        borderColor: "border-emerald-200",
        dotColor: "bg-emerald-500",
    },
    provisionada: {
        label: "Provisionada",
        bgColor: "bg-slate-50",
        textColor: "text-slate-600",
        borderColor: "border-slate-200",
        dotColor: "bg-slate-400",
    },
};

const StatusBadge = ({ status }) => {
    const config = TRANSFER_STATUS[status] || TRANSFER_STATUS.pendiente;
    return (
        <span
            className={cn(
                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                config.bgColor,
                config.textColor,
                config.borderColor
            )}
        >
            <span
                className={cn(
                    "w-1.5 h-1.5 rounded-full mr-1.5",
                    config.dotColor
                )}
            />
            {config.label}
        </span>
    );
};

// ============================================
// PROVIDER CARD COMPONENT (Sidebar)
// ============================================
const ProviderCard = ({ provider, isSelected, onClick }) => {
    const hasDebt = provider.total_debt > 0;

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
                        {provider.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-900 text-sm leading-tight truncate">
                            {provider.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                            {provider.nit || "Sin NIT"}
                        </p>
                    </div>
                </div>
                {hasDebt && (
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                    </div>
                )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-500">Deuda pendiente</span>
                    <span className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(provider.total_debt || 0)}
                    </span>
                </div>
            </div>
        </div>
    );
};

// ============================================
// CONSTANTS
// ============================================
const NC_REASON_OPTIONS = [
    { id: "devolucion", name: "Devolución de Mercancía" },
    { id: "descuento", name: "Descuento Comercial" },
    { id: "error_factura", name: "Error en Factura Original" },
    { id: "bonificacion", name: "Bonificación" },
    { id: "ajuste_precio", name: "Ajuste de Precio" },
    { id: "garantia", name: "Reclamo por Garantía" },
    { id: "otro", name: "Otro" },
];

const ProviderStatements = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const providerIdFromUrl = searchParams.get("provider");

    // Data
    const [providers, setProviders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState(null);
    const [statement, setStatement] = useState(null);
    const [selectedTransfer, setSelectedTransfer] = useState(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [loadingStatement, setLoadingStatement] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isBatchPaymentModalOpen, setIsBatchPaymentModalOpen] = useState(false);
    const [isCreditNoteModalOpen, setIsCreditNoteModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedTransferIds, setSelectedTransferIds] = useState([]);
    const [paymentToDelete, setPaymentToDelete] = useState(null);

    // Forms
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: getTodayDate(),
        payment_method: "transferencia",
        bank: "",
        reference: "",
        notes: "",
        proof_file: null,
    });

    const [batchPaymentForm, setBatchPaymentForm] = useState({
        total_amount: "",
        payment_date: getTodayDate(),
        payment_method: "transferencia",
        bank: "",
        reference: "",
        notes: "",
        proof_file: null,
    });

    const [creditNoteForm, setCreditNoteForm] = useState({
        amount: "",
        note_number: "",
        reason: "otro",
        reason_detail: "",
        issue_date: getTodayDate(),
        received_date: getTodayDate(),
        pdf_file: null,
    });

    useEffect(() => {
        fetchProviders();
        fetchBanks();
    }, []);

    useEffect(() => {
        if (selectedProvider) {
            fetchStatement(selectedProvider.id);
            setSelectedTransferIds([]); // Clear selection on provider change
        }
    }, [selectedProvider, selectedYear]);

    // ... (fetch functions remain the same)

    const fetchProviders = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/catalogs/providers/");

            // Enriquecer proveedores con información de deuda
            const enrichedProviders = await Promise.all(
                response.data.map(async (provider) => {
                    try {
                        const stmtRes = await axios.get(
                            `/catalogs/providers/${provider.id}/account_statement/`
                        );
                        return {
                            ...provider,
                            total_debt: stmtRes.data.total_debt || 0,
                        };
                    } catch {
                        return {
                            ...provider,
                            total_debt: 0,
                        };
                    }
                })
            );
            setProviders(enrichedProviders);

            if (providerIdFromUrl) {
                const found = enrichedProviders.find(
                    (p) => p.id === parseInt(providerIdFromUrl)
                );
                if (found) setSelectedProvider(found);
            }
        } catch {
            toast.error("Error al cargar proveedores");
        } finally {
            setLoading(false);
        }
    };

    const fetchBanks = async () => {
        try {
            const response = await axios.get("/catalogs/banks/");
            setBanks(response.data);
        } catch {
            // Silencioso
        }
    };

    const fetchStatement = async (providerId) => {
        try {
            setLoadingStatement(true);
            const response = await axios.get(
                `/catalogs/providers/${providerId}/account_statement/`,
                { params: { year: selectedYear } }
            );
            setStatement(response.data);
        } catch (error) {
            toast.error("Error al cargar estado de cuenta");
        } finally {
            setLoadingStatement(false);
        }
    };

    const fetchTransferDetails = async (transferId) => {
        try {
            const response = await axios.get(
                `/transfers/transfers/${transferId}/detail_with_payments/`
            );
            setSelectedTransfer(response.data);
        } catch (error) {
            toast.error("Error al cargar detalles");
        }
    };

    // Selection Logic
    const toggleSelectAll = (checked) => {
        if (checked && statement?.transfers) {
            const payableTransfers = statement.transfers
                .filter(t => (t.status === "aprobado" || t.status === "parcial") && t.balance > 0)
                .map(t => t.id);
            setSelectedTransferIds(payableTransfers);
        } else {
            setSelectedTransferIds([]);
        }
    };

    const toggleSelectRow = (id, checked) => {
        if (checked) {
            setSelectedTransferIds(prev => [...prev, id]);
        } else {
            setSelectedTransferIds(prev => prev.filter(tid => tid !== id));
        }
    };

    const handleOpenBatchPayment = () => {
        if (selectedTransferIds.length === 0) {
            toast.error("Selecciona al menos una factura para pagar");
            return;
        }

        // Validate all selected transfers are from the same provider
        const selectedTransfers = statement.transfers.filter(t => selectedTransferIds.includes(t.id));

        if (selectedTransfers.length === 0) {
            toast.error("No se encontraron las facturas seleccionadas");
            return;
        }

        // Validate all have balance
        const withoutBalance = selectedTransfers.filter(t => !t.balance || parseFloat(t.balance) <= 0);
        if (withoutBalance.length > 0) {
            toast.error("Algunas facturas seleccionadas no tienen saldo pendiente");
            return;
        }

        // Calculate total amount
        const totalAmount = selectedTransfers.reduce((sum, t) => sum + parseFloat(t.balance || 0), 0);

        if (totalAmount <= 0) {
            toast.error("El monto total a pagar debe ser mayor a cero");
            return;
        }

        setBatchPaymentForm({
            total_amount: totalAmount.toFixed(2),
            payment_date: getTodayDate(),
            payment_method: "transferencia",
            bank: "",
            reference: "",
            notes: "",
            proof_file: null,
        });

        setIsBatchPaymentModalOpen(true);
    };

    const handleRegisterBatchPayment = async (e) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const formData = new FormData();
            
            // Add basic fields
            formData.append('transfer_ids', JSON.stringify(selectedTransferIds));
            Object.keys(batchPaymentForm).forEach((key) => {
                if (batchPaymentForm[key] !== null) {
                    formData.append(key, batchPaymentForm[key]);
                }
            });

            await axios.post(
                `/transfers/batch-payments/create_batch_payment/`,
                formData,
                { 
                    headers: { "Content-Type": "multipart/form-data" },
                    _skipErrorToast: true,
                }
            );

            toast.success("Pago agrupado registrado exitosamente");
            setIsBatchPaymentModalOpen(false);
            setSelectedTransferIds([]);
            fetchStatement(selectedProvider.id);

            // Reset form
            setBatchPaymentForm({
                total_amount: "",
                payment_date: getTodayDate(),
                payment_method: "transferencia",
                bank: "",
                reference: "",
                notes: "",
                proof_file: null,
            });
        } catch (error) {
            const errorMsg = error.response?.data?.error || error.response?.data?.message || "Error al registrar pago agrupado";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRegisterPayment = async (e) => {
        e.preventDefault();
        if (!selectedTransfer) return;

        try {
            setIsSubmitting(true);
            const formData = new FormData();
            Object.keys(paymentForm).forEach((key) => {
                if (paymentForm[key] !== null) {
                    formData.append(key, paymentForm[key]);
                }
            });

            await axios.post(
                `/transfers/transfers/${selectedTransfer.id}/register_payment/`,
                formData,
                { 
                    headers: { "Content-Type": "multipart/form-data" },
                    _skipErrorToast: true,
                }
            );

            toast.success("Pago registrado exitosamente");
            setIsPaymentModalOpen(false);
            fetchStatement(selectedProvider.id);

            // Reset form
            setPaymentForm({
                amount: "",
                payment_date: getTodayDate(),
                payment_method: "transferencia",
                bank: "",
                reference: "",
                notes: "",
                proof_file: null,
            });
        } catch (error) {
            const errorData = error.response?.data;
            const errorMsg = 
                errorData?.transfer || 
                errorData?.error || 
                "Error al registrar pago";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;

        try {
            await axios.delete(`/transfers/transfer-payments/${paymentToDelete.id}/`);
            toast.success("Pago eliminado exitosamente");
            setPaymentToDelete(null);

            // Recargar el estado de cuenta
            if (selectedProvider) {
                await loadProviderStatement(selectedProvider.id, selectedYear);
            }
        } catch (error) {
            // El interceptor ya maneja el error
        }
    };

    const handleRegisterCreditNote = async (e) => {
        e.preventDefault();
        if (!selectedTransfer || !selectedProvider) return;

        try {
            setIsSubmitting(true);

            // 1. Crear la Nota de Crédito
            const formData = new FormData();
            formData.append("provider", selectedProvider.id);
            formData.append("original_transfer", selectedTransfer.id);
            formData.append("note_number", creditNoteForm.note_number);
            formData.append("amount", creditNoteForm.amount);
            formData.append("issue_date", creditNoteForm.issue_date);
            formData.append("received_date", creditNoteForm.received_date);
            formData.append("reason", creditNoteForm.reason);
            if (creditNoteForm.reason_detail) formData.append("reason_detail", creditNoteForm.reason_detail);
            if (creditNoteForm.pdf_file) formData.append("pdf_file", creditNoteForm.pdf_file);

            const createResponse = await axios.post("/transfers/provider-credit-notes/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
                _skipErrorToast: true,
            });

            const creditNoteId = createResponse.data.id;

            // 2. Aplicar la Nota de Crédito a la factura seleccionada
            // Calcular monto a aplicar: menor entre monto NC y saldo factura
            const ncAmount = parseFloat(creditNoteForm.amount);
            const transferBalance = parseFloat(selectedTransfer.balance);
            const amountToApply = Math.min(ncAmount, transferBalance);

            if (amountToApply > 0) {
                await axios.post(`/transfers/provider-credit-notes/${creditNoteId}/apply/`, {
                    applications: [{
                        transfer_id: selectedTransfer.id,
                        amount: amountToApply,
                        notes: `Aplicación inmediata desde estado de cuenta`
                    }]
                }, {
                    _skipErrorToast: true
                });
            }

            toast.success("Nota de crédito registrada y aplicada exitosamente");
            setIsCreditNoteModalOpen(false);
            fetchStatement(selectedProvider.id);

            // Reset form
            setCreditNoteForm({
                amount: "",
                note_number: "",
                reason: "otro",
                reason_detail: "",
                issue_date: getTodayDate(),
                received_date: getTodayDate(),
                pdf_file: null,
            });
        } catch (error) {
            const errorMsg = error.response?.data?.error ||
                error.response?.data?.note_number?.[0] ||
                "Error al registrar nota de crédito";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const openPaymentModal = (transfer) => {
        setSelectedTransfer(transfer);
        setPaymentForm((prev) => ({
            ...prev,
            amount: transfer.balance, // Default to balance amount
        }));
        setIsPaymentModalOpen(true);
    };

    const openCreditNoteModal = (transfer) => {
        setSelectedTransfer(transfer);
        setCreditNoteForm(prev => ({
            ...prev,
            amount: transfer.balance, // Sugerir el saldo pendiente
            note_number: "",
            issue_date: getTodayDate(),
            received_date: getTodayDate(),
            reason: "otro",
            reason_detail: "",
            pdf_file: null
        }));
        setIsCreditNoteModalOpen(true);
    };

    // ... (rest of the file)

    const openDetailModal = async (transfer) => {
        await fetchTransferDetails(transfer.id);
        setIsDetailModalOpen(true);
    };

    const filteredProviders = useMemo(() => {
        return providers.filter(
            (p) =>
                p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.nit?.includes(searchQuery)
        );
    }, [providers, searchQuery]);

    const columns = [
        {
            header: "",
            accessor: "select",
            className: "w-12",
            sortable: false,
            cell: (row) => {
                // Solo permitir selección si está aprobado o parcial y tiene saldo
                const isPayable = (row.status === "aprobado" || row.status === "parcial") && row.balance > 0;
                return (
                    <div
                        className="flex items-center justify-center py-2"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <input
                            type="checkbox"
                            disabled={!isPayable}
                            checked={selectedTransferIds.includes(row.id)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                                if (isPayable) {
                                    toggleSelectRow(row.id, e.target.checked);
                                }
                            }}
                            className={cn(
                                "w-4 h-4 rounded border-2 transition-all",
                                isPayable
                                    ? "border-gray-400 text-slate-700 hover:border-slate-900 focus:ring-2 focus:ring-slate-900 focus:ring-offset-1 cursor-pointer hover:scale-110"
                                    : "border-gray-200 bg-gray-100 opacity-30 cursor-not-allowed"
                            )}
                            title={isPayable ? "Seleccionar para pago múltiple" : "Esta factura ya está pagada o no tiene saldo pendiente"}
                        />
                    </div>
                );
            }
        },
        {
            header: "Fecha",
            accessor: "transaction_date",
            cell: (row) => formatDateSafe(row.transaction_date),
        },
        {
            header: "Factura Prov.",
            accessor: "invoice_number",
            cell: (row) => (
                <span className="font-mono text-sm">{row.invoice_number}</span>
            ),
        },
        {
            header: "Orden de Servicio",
            accessor: "service_order",
            cell: (row) => (
                row.service_order_id ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/service-orders/${row.service_order_id}`);
                        }}
                        className="font-medium text-slate-700 hover:text-slate-900 hover:underline"
                    >
                        {row.service_order}
                    </button>
                ) : (
                    <span className="font-medium text-slate-500">
                        {row.service_order}
                    </span>
                )
            ),
        },
        {
            header: "Tipo",
            accessor: "type",
            cell: (row) => <Badge variant="outline">{row.type}</Badge>,
        },
        {
            header: "Total",
            accessor: "amount",
            cell: (row) => (
                <div className="text-right font-semibold text-gray-900 tabular-nums">
                    {formatCurrency(row.amount)}
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
            accessor: "invoice_file",
            className: "w-16 text-center",
            cell: (row) =>
                row.invoice_file ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(row.invoice_file, "_blank");
                        }}
                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                        title="Ver factura PDF"
                    >
                        <FileText className="w-4 h-4" />
                    </Button>
                ) : (
                    <span className="text-gray-400 text-xs">—</span>
                ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            cell: (row) => (
                <div className="flex items-center justify-end gap-1">
                    {row.status !== "pagado" && (
                        <>
                            {(row.status === "aprobado" || row.status === "parcial") ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openPaymentModal(row);
                                    }}
                                    className="text-gray-500 hover:text-amber-600"
                                    title="Registrar Pago"
                                >
                                    <Banknote className="w-4 h-4" />
                                </Button>
                            ) : (
                                <span className="p-2 text-slate-300 cursor-not-allowed" title="Requiere aprobación">
                                    <LockIcon className="w-4 h-4" />
                                </span>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openCreditNoteModal(row);
                                }}
                                className="text-gray-500 hover:text-purple-600"
                                title="Nota de Crédito"
                            >
                                <FileMinus className="w-4 h-4" />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(row);
                        }}
                        className="text-gray-500 hover:text-slate-900"
                        title="Ver Detalles"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>
                </div>
            ),
        },
    ];

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-end gap-2">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-28" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar Skeleton */}
                    <div className="lg:col-span-3 space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <div className="space-y-2">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Skeleton key={i} className="h-16 w-full rounded-lg" />
                            ))}
                        </div>
                    </div>

                    {/* Main Content Skeleton */}
                    <div className="lg:col-span-9 space-y-6">
                        {/* Header Provider */}
                        <Skeleton className="h-32 w-full rounded-xl" />

                        {/* Aging */}
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Skeleton key={i} className="h-20 rounded-lg" />
                            ))}
                        </div>

                        {/* Table */}
                        <SkeletonTable rows={5} columns={6} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end gap-2">
                <SelectERP
                    value={selectedYear}
                    onChange={setSelectedYear}
                    options={Array.from({ length: 5 }, (_, i) => {
                        const year = new Date().getFullYear() - i;
                        return { id: year, name: String(year) };
                    })}
                    getOptionLabel={(o) => o.name}
                    getOptionValue={(o) => o.id}
                    size="sm"
                    className="w-24"
                />
                <Button
                    variant="outline"
                    onClick={() => fetchStatement(selectedProvider?.id)}
                    disabled={!selectedProvider}
                >
                    <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Sidebar Proveedores */}
                <div className="lg:col-span-3">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Truck className="w-4 h-4" />
                                Proveedores
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar proveedor..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="pl-9 text-sm"
                                />
                            </div>
                            <div className="space-y-2 max-h-[calc(100vh-350px)] overflow-y-auto pr-1">
                                {filteredProviders.map((provider) => (
                                    <ProviderCard
                                        key={provider.id}
                                        provider={provider}
                                        isSelected={
                                            selectedProvider?.id === provider.id
                                        }
                                        onClick={() =>
                                            setSelectedProvider(provider)
                                        }
                                    />
                                ))}
                                {filteredProviders.length === 0 && (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        No se encontraron proveedores
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Contenido Principal */}
                <div className="lg:col-span-9 space-y-6">
                    {!selectedProvider ? (
                        <Card>
                            <CardContent className="py-16">
                                <div className="text-center">
                                    <Truck className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Selecciona un Proveedor
                                    </h3>
                                    <p className="text-gray-500 max-w-md mx-auto">
                                        Selecciona un proveedor de la lista para
                                        ver su estado de cuenta, historial de
                                        facturas y registrar pagos.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (
                        <>
                            {/* Header Provider */}
                            <Card>
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-semibold text-slate-700">
                                                {selectedProvider.name}
                                            </h2>
                                            <p className="text-slate-500 text-sm mt-1">
                                                NIT: {selectedProvider.nit}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-slate-500 uppercase">
                                                Deuda Total
                                            </div>
                                            <div className="text-3xl font-bold text-red-600 tabular-nums">
                                                {statement
                                                    ? formatCurrency(
                                                          statement.total_debt
                                                      )
                                                    : "..."}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Aging */}
                            {statement?.aging && (
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
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
                            )}

                            {/* Transfers Table */}
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle>
                                            Historial de Movimientos ({selectedYear})
                                        </CardTitle>
                                        {statement?.transfers && statement.transfers.some(t => (t.status === "aprobado" || t.status === "parcial") && t.balance > 0) && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const payableTransfers = statement.transfers
                                                        .filter(t => t.status !== "pagado" && t.balance > 0)
                                                        .map(t => t.id);
                                                    if (selectedTransferIds.length === payableTransfers.length) {
                                                        setSelectedTransferIds([]);
                                                    } else {
                                                        setSelectedTransferIds(payableTransfers);
                                                    }
                                                }}
                                                className={selectedTransferIds.length > 0 ? "border-blue-500 text-blue-700" : ""}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                {selectedTransferIds.length > 0 ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                                            </Button>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <DataTable
                                        columns={columns}
                                        data={statement?.transfers || []}
                                        loading={loadingStatement}
                                        emptyMessage="No hay movimientos registrados en el período seleccionado"
                                    />
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Registrar Pago a Proveedor"
                size="lg"
            >
                <form onSubmit={handleRegisterPayment} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Monto a Pagar *</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="pl-9"
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            amount: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
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

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Método de Pago *</Label>
                            <SelectERP
                                value={paymentForm.payment_method}
                                onChange={(val) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_method: val,
                                        bank:
                                            val === "efectivo"
                                                ? ""
                                                : paymentForm.bank,
                                    })
                                }
                                options={[
                                    {
                                        id: "transferencia",
                                        name: "Transferencia Bancaria",
                                    },
                                    { id: "cheque", name: "Cheque" },
                                    { id: "efectivo", name: "Efectivo" },
                                    { id: "tarjeta", name: "Tarjeta" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>
                        <div>
                            <Label>Referencia / No. Cheque</Label>
                            <Input
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
                    </div>

                    {/* Banco - Solo visible para transferencia, cheque o tarjeta */}
                    {["transferencia", "cheque", "tarjeta"].includes(
                        paymentForm.payment_method
                    ) && (
                        <div>
                            <Label>Banco *</Label>
                            <SelectERP
                                value={paymentForm.bank}
                                onChange={(val) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        bank: val,
                                    })
                                }
                                options={[
                                    { id: "", name: "Seleccionar banco" },
                                    ...banks.map((b) => ({
                                        id: String(b.id),
                                        name: b.name,
                                    })),
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                                clearable
                                helperText="Cuenta bancaria desde donde se realizará el pago"
                            />
                        </div>
                    )}

                    <div>
                        <Label>Comprobante (Opcional)</Label>
                        <FileUpload
                            accept=".pdf,.jpg,.png"
                            onChange={(file) =>
                                setPaymentForm({
                                    ...paymentForm,
                                    proof_file: file,
                                })
                            }
                            value={paymentForm.proof_file}
                        />
                    </div>

                    <div>
                        <Label>Notas</Label>
                        <Input
                            value={paymentForm.notes}
                            onChange={(e) =>
                                setPaymentForm({
                                    ...paymentForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Observaciones adicionales..."
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsPaymentModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Registrando..." : "Registrar Pago"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Credit Note Modal */}
            <Modal
                isOpen={isCreditNoteModalOpen}
                onClose={() => setIsCreditNoteModalOpen(false)}
                title="Registrar Nota de Crédito"
                size="lg"
            >
                <form onSubmit={handleRegisterCreditNote} className="space-y-6">
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                            <FileMinus className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">Aplicación Inmediata</h4>
                            <p className="text-sm text-slate-600 mt-1">
                                La nota de crédito se registrará y aplicará automáticamente a la factura <span className="font-mono font-medium text-slate-900">{selectedTransfer?.invoice_number}</span>.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <Label className="mb-1.5 block">N° Nota de Crédito *</Label>
                            <Input
                                value={creditNoteForm.note_number}
                                onChange={(e) =>
                                    setCreditNoteForm({
                                        ...creditNoteForm,
                                        note_number: e.target.value,
                                    })
                                }
                                placeholder="Ej: NC-001"
                                required
                            />
                        </div>
                        <div>
                            <Label className="mb-1.5 block">Monto Total *</Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    className="pl-7 font-bold text-slate-900"
                                    value={creditNoteForm.amount}
                                    onChange={(e) =>
                                        setCreditNoteForm({
                                            ...creditNoteForm,
                                            amount: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1">
                                Saldo factura: {selectedTransfer ? formatCurrency(selectedTransfer.balance) : '$0.00'}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <Label className="mb-1.5 block">Fecha de Emisión *</Label>
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
                        <div>
                            <Label className="mb-1.5 block">Fecha de Recepción</Label>
                            <Input
                                type="date"
                                value={creditNoteForm.received_date}
                                onChange={(e) =>
                                    setCreditNoteForm({
                                        ...creditNoteForm,
                                        received_date: e.target.value,
                                    })
                                }
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="sm:col-span-2">
                            <Label className="mb-1.5 block">Motivo *</Label>
                            <SelectERP
                                value={creditNoteForm.reason}
                                onChange={(val) => setCreditNoteForm({ ...creditNoteForm, reason: val })}
                                options={NC_REASON_OPTIONS}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label className="mb-1.5 block">Detalle del Motivo</Label>
                            <Input
                                value={creditNoteForm.reason_detail}
                                onChange={(e) => setCreditNoteForm({ ...creditNoteForm, reason_detail: e.target.value })}
                                placeholder="Ej: Mercancía dañada en el envío..."
                            />
                        </div>
                    </div>

                    <div>
                        <Label className="mb-1.5 block">Documento PDF (Opcional)</Label>
                        <FileUpload
                            accept=".pdf"
                            onChange={(file) =>
                                setCreditNoteForm({
                                    ...creditNoteForm,
                                    pdf_file: file,
                                })
                            }
                            value={creditNoteForm.pdf_file}
                            helperText="Adjuntar copia digital de la nota de crédito"
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsCreditNoteModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px]"
                        >
                            {isSubmitting
                                ? "Procesando..."
                                : "Registrar y Aplicar"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Detalle de Gasto"
                size="2xl"
            >
                {selectedTransfer ? (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-start justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <div>
                                <div className="text-sm text-slate-500">
                                    Factura Proveedor
                                </div>
                                <div className="text-2xl font-bold font-mono text-slate-900">
                                    {selectedTransfer.invoice_number ||
                                        "Sin número"}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Badge variant="outline">
                                        {selectedTransfer.type || "Gasto"}
                                    </Badge>
                                    <StatusBadge
                                        status={selectedTransfer.status}
                                    />
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-sm text-slate-500">
                                    Total
                                </div>
                                <div className="text-2xl font-semibold text-slate-700 tabular-nums">
                                    {formatCurrency(selectedTransfer.amount)}
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
                                        {selectedTransfer.service_order_number ||
                                            "Gasto Administrativo"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Fecha de Transacción
                                    </div>
                                    <div className="text-sm">
                                        {formatDateSafe(
                                            selectedTransfer.transaction_date,
                                            "long"
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-semibold text-slate-500 uppercase mb-1">
                                        Descripción
                                    </div>
                                    <div className="text-sm">
                                        {selectedTransfer.description || "—"}
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
                                            selectedTransfer.paid_amount || 0
                                        )}
                                    </div>
                                </div>
                                {parseFloat(
                                    selectedTransfer.credited_amount || 0
                                ) > 0 && (
                                    <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                            Notas de Crédito
                                        </div>
                                        <div className="text-xl font-semibold text-slate-700 tabular-nums">
                                            {formatCurrency(
                                                selectedTransfer.credited_amount ||
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
                                                selectedTransfer.balance
                                            ) > 0
                                                ? "text-red-600"
                                                : "text-slate-900"
                                        )}
                                    >
                                        {formatCurrency(
                                            selectedTransfer.balance || 0
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Invoice Document */}
                        {selectedTransfer.invoice_file && (
                            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Documento Factura
                                </h4>
                                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-md group hover:border-slate-300 transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white border border-slate-200 rounded flex items-center justify-center text-slate-400 group-hover:text-slate-600 transition-colors">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">
                                                Factura{" "}
                                                {
                                                    selectedTransfer.invoice_number
                                                }
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Documento PDF
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            window.open(
                                                selectedTransfer.invoice_file,
                                                "_blank",
                                                "noopener,noreferrer"
                                            );
                                        }}
                                        type="button"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Ver PDF
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Historial de Pagos */}
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Historial de Pagos
                            </h4>
                            {selectedTransfer.payments &&
                            selectedTransfer.payments.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-600">
                                            <tr>
                                                <th className="px-4 py-2 font-medium">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-2 font-medium">
                                                    Método
                                                </th>
                                                <th className="px-4 py-2 font-medium">
                                                    Referencia
                                                </th>
                                                <th className="px-4 py-2 text-right font-medium">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-2 text-center font-medium">
                                                    Comprobante
                                                </th>
                                                <th className="px-4 py-2 text-center font-medium w-20">
                                                    Acción
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedTransfer.payments.map(
                                                (payment) => (
                                                    <tr
                                                        key={payment.id}
                                                        className="hover:bg-slate-50"
                                                    >
                                                        <td className="px-4 py-2 text-slate-700">
                                                            {formatDateSafe(
                                                                payment.payment_date
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 capitalize text-slate-700">
                                                            {
                                                                payment.payment_method
                                                            }
                                                        </td>
                                                        <td className="px-4 py-2 font-mono text-xs text-slate-600">
                                                            {payment.reference_number ||
                                                                "—"}
                                                        </td>
                                                        <td className="px-4 py-2 text-right font-semibold text-emerald-600 tabular-nums">
                                                            {formatCurrency(
                                                                payment.amount
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {payment.proof_file ? (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        window.open(
                                                                            payment.proof_file,
                                                                            "_blank"
                                                                        );
                                                                    }}
                                                                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                                    title="Ver comprobante de pago"
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </Button>
                                                            ) : (
                                                                <span className="text-slate-400">
                                                                    —
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPaymentToDelete(payment);
                                                                }}
                                                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                title="Eliminar pago"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg text-sm">
                                    No hay pagos registrados
                                </div>
                            )}
                        </div>

                        {/* Notas de Crédito */}
                        {selectedTransfer.credit_notes &&
                            selectedTransfer.credit_notes.length > 0 && (
                                <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                                    <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                                        <FileMinus className="w-4 h-4" /> Notas
                                        de Crédito
                                    </h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-slate-50 text-slate-700">
                                                <tr>
                                                    <th className="px-4 py-2 font-medium">
                                                        Fecha
                                                    </th>
                                                    <th className="px-4 py-2 font-medium">
                                                        No. Nota
                                                    </th>
                                                    <th className="px-4 py-2 font-medium">
                                                        Motivo
                                                    </th>
                                                    <th className="px-4 py-2 text-right font-medium">
                                                        Monto
                                                    </th>
                                                    <th className="px-4 py-2 text-center font-medium">
                                                        PDF
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {selectedTransfer.credit_notes.map(
                                                    (nc) => (
                                                        <tr
                                                            key={nc.id}
                                                            className="hover:bg-slate-50/50"
                                                        >
                                                            <td className="px-4 py-2 text-slate-700">
                                                                {formatDateSafe(
                                                                    nc.payment_date
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 font-mono text-xs text-slate-600">
                                                                {
                                                                    nc.reference_number
                                                                }
                                                            </td>
                                                            <td className="px-4 py-2 text-slate-700">
                                                                {nc.notes ||
                                                                    "—"}
                                                            </td>
                                                            <td className="px-4 py-2 text-right font-semibold text-slate-700 tabular-nums">
                                                                -
                                                                {formatCurrency(
                                                                    nc.amount
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2 text-center">
                                                                {nc.proof_file ? (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(
                                                                            e
                                                                        ) => {
                                                                            e.stopPropagation();
                                                                            window.open(
                                                                                nc.proof_file,
                                                                                "_blank"
                                                                            );
                                                                        }}
                                                                        className="text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                                                                        title="Ver nota de crédito"
                                                                    >
                                                                        <FileText className="w-4 h-4" />
                                                                    </Button>
                                                                ) : (
                                                                    <span className="text-slate-400">
                                                                        —
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    )
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                    </div>
                ) : (
                    <div className="p-4 text-center">Cargando detalles...</div>
                )}
            </Modal>

            {/* Bulk Action Bar */}
            {selectedTransferIds.length > 0 && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-medium text-sm">
                            {selectedTransferIds.length} {selectedTransferIds.length === 1 ? 'factura seleccionada' : 'facturas seleccionadas'}
                        </span>
                    </div>
                    <div className="h-4 w-px bg-slate-700" />
                    <Button
                        size="sm"
                        onClick={handleOpenBatchPayment}
                        className="bg-white text-slate-900 hover:bg-slate-100"
                    >
                        <Banknote className="w-4 h-4 mr-2" />
                        Pagar Selección
                    </Button>
                    <button
                        onClick={() => setSelectedTransferIds([])}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Limpiar selección"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            )}

            {/* Batch Payment Modal */}
            <Modal
                isOpen={isBatchPaymentModalOpen}
                onClose={() => setIsBatchPaymentModalOpen(false)}
                title={`Pago Múltiple - ${selectedProvider?.name || ''}`}
                size="xl"
            >
                <form onSubmit={handleRegisterBatchPayment} className="space-y-6">
                    {/* Resumen de Facturas */}
                    <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                        <div className="px-4 py-3 bg-slate-100 border-b border-slate-200">
                            <h4 className="font-semibold text-sm text-slate-900">
                                Facturas Seleccionadas ({selectedTransferIds.length})
                            </h4>
                        </div>
                        <div className="max-h-48 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 sticky top-0">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">OS</th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Factura</th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-600">Saldo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {statement?.transfers
                                        ?.filter(t => selectedTransferIds.includes(t.id))
                                        .map((transfer) => (
                                            <tr key={transfer.id} className="hover:bg-slate-50">
                                                <td className="px-3 py-2 font-mono text-xs">{transfer.service_order || 'Sin OS'}</td>
                                                <td className="px-3 py-2 font-mono text-xs">{transfer.invoice_number || '-'}</td>
                                                <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatCurrency(transfer.balance)}</td>
                                            </tr>
                                        ))}
                                </tbody>
                                <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                    <tr>
                                        <td colSpan="2" className="px-3 py-2 text-right font-semibold text-slate-700">Total:</td>
                                        <td className="px-3 py-2 text-right font-bold text-lg text-slate-700">
                                            {formatCurrency(batchPaymentForm.total_amount || 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="px-4 py-2 border-t border-dashed border-slate-300 bg-slate-50/50">
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-slate-400" />
                                El monto se distribuirá automáticamente por orden de fecha (FIFO).
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Monto Total a Pagar *</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    className="pl-9"
                                    value={batchPaymentForm.total_amount}
                                    onChange={(e) =>
                                        setBatchPaymentForm({
                                            ...batchPaymentForm,
                                            total_amount: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Fecha de Pago *</Label>
                            <Input
                                type="date"
                                value={batchPaymentForm.payment_date}
                                onChange={(e) =>
                                    setBatchPaymentForm({
                                        ...batchPaymentForm,
                                        payment_date: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Método de Pago *</Label>
                            <SelectERP
                                value={batchPaymentForm.payment_method}
                                onChange={(val) =>
                                    setBatchPaymentForm({
                                        ...batchPaymentForm,
                                        payment_method: val,
                                        bank: val === "efectivo" ? "" : batchPaymentForm.bank,
                                    })
                                }
                                options={[
                                    { id: "transferencia", name: "Transferencia Bancaria" },
                                    { id: "cheque", name: "Cheque" },
                                    { id: "efectivo", name: "Efectivo" },
                                    { id: "tarjeta", name: "Tarjeta" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                            />
                        </div>
                        <div>
                            <Label>Referencia / No. Cheque</Label>
                            <Input
                                value={batchPaymentForm.reference}
                                onChange={(e) =>
                                    setBatchPaymentForm({
                                        ...batchPaymentForm,
                                        reference: e.target.value,
                                    })
                                }
                                placeholder="Ej: LOTE-001"
                            />
                        </div>
                    </div>

                    {["transferencia", "cheque", "tarjeta"].includes(batchPaymentForm.payment_method) && (
                        <div>
                            <Label>Banco *</Label>
                            <SelectERP
                                value={batchPaymentForm.bank}
                                onChange={(val) =>
                                    setBatchPaymentForm({
                                        ...batchPaymentForm,
                                        bank: val,
                                    })
                                }
                                options={[
                                    { id: "", name: "Seleccionar banco" },
                                    ...banks.map((b) => ({
                                        id: String(b.id),
                                        name: b.name,
                                    })),
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                                clearable
                            />
                        </div>
                    )}

                    <div>
                        <Label>Comprobante Global (Opcional)</Label>
                        <FileUpload
                            accept=".pdf,.jpg,.png"
                            onChange={(file) =>
                                setBatchPaymentForm({
                                    ...batchPaymentForm,
                                    proof_file: file,
                                })
                            }
                            value={batchPaymentForm.proof_file}
                        />
                    </div>

                    <div>
                        <Label>Notas</Label>
                        <Input
                            value={batchPaymentForm.notes}
                            onChange={(e) =>
                                setBatchPaymentForm({
                                    ...batchPaymentForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Observaciones para el lote..."
                        />
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsBatchPaymentModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Procesando..." : "Registrar Pago Agrupado"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Confirm Delete Payment Dialog */}
            <ConfirmDialog
                open={!!paymentToDelete}
                onClose={() => setPaymentToDelete(null)}
                onConfirm={handleDeletePayment}
                title="Eliminar Pago"
                description={`¿Está seguro que desea eliminar este pago de ${paymentToDelete ? formatCurrency(paymentToDelete.amount) : ''}? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                variant="danger"
            />
        </div>
    );
};

export default ProviderStatements;
