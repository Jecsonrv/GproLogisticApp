import React, { useState, useEffect } from "react";
import {
    Plus,
    Trash2,
    Check,
    X,
    Download,
    Eye,
    Upload,
    AlertCircle,
    DollarSign,
    Edit,
    FileText,
} from "lucide-react";
import {
    Button,
    DataTable,
    EmptyState,
    ConfirmDialog,
    Label,
    Input,
    Select,
} from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate, getTodayDate } from "../lib/utils";

/**
 * ProviderPaymentsTab - Gestión completa de Pagos a Proveedores
 * Incluye: Costos Directos, Cargos a Clientes, Gastos de Operación
 */
const ProviderPaymentsTab = ({ orderId, onUpdate }) => {
    const [payments, setPayments] = useState([]);
    const [providers, setProviders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAddingPayment, setIsAddingPayment] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingPaymentId, setEditingPaymentId] = useState(null);
    const [existingInvoiceFile, setExistingInvoiceFile] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
        action: null,
    });

    const [paymentForm, setPaymentForm] = useState({
        transfer_type: "costos",
        amount: "",
        description: "",
        provider: "",
        payment_method: "",
        beneficiary_name: "",
        bank: "",
        ccf: "",
        invoice_number: "",
        invoice_file: null,
        transaction_date: getTodayDate(),
        notes: "",
    });

    // Opciones formateadas para los selects
    const transferTypeOptions = [
        { id: "costos", name: "Costo Directo" },
        { id: "cargos", name: "Cargo a Cliente" },
        { id: "admin", name: "Gasto de Operación" },
    ];

    const paymentMethodOptions = [
        { id: "", name: "Seleccionar..." },
        { id: "transferencia", name: "Transferencia Bancaria" },
        { id: "efectivo", name: "Efectivo" },
        { id: "cheque", name: "Cheque" },
        { id: "tarjeta", name: "Tarjeta" },
    ];

    const providerOptions = [
        { id: "", name: "Seleccionar proveedor..." },
        ...providers
            .filter(
                (p) =>
                    !p.name.toLowerCase().includes("legacy") &&
                    !p.name.toLowerCase().includes("terceros")
            )
            .map((p) => ({ id: String(p.id), name: p.name })),
    ];

    const bankOptions = [
        { id: "", name: "Seleccionar banco..." },
        ...banks.map((b) => ({ id: String(b.id), name: b.name })),
    ];

    useEffect(() => {
        fetchPayments();
        fetchProviders();
        fetchBanks();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const fetchPayments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/transfers/?service_order=${orderId}`
            );
            setPayments(response.data);
        } catch (error) {
            console.error("Error loading payments:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProviders = async () => {
        try {
            const response = await axios.get("/catalogs/providers/");
            setProviders(response.data);
        } catch (_error) {
            console.error("Error loading providers");
        }
    };

    const fetchBanks = async () => {
        try {
            const response = await axios.get("/catalogs/banks/");
            setBanks(response.data);
        } catch (_error) {
            console.error("Error loading banks");
        }
    };

    const handleEditPayment = (payment) => {
        console.log("=== DATOS DEL PAGO PARA EDITAR ===", payment);
        console.log("provider:", payment.provider);
        console.log("bank:", payment.bank);
        console.log("service_order:", payment.service_order);

        setPaymentForm({
            transfer_type: payment.transfer_type || "costos",
            amount: payment.amount || "",
            description: payment.description || "",
            provider: payment.provider ? String(payment.provider) : "",
            payment_method: payment.payment_method || "",
            beneficiary_name: payment.beneficiary_name || "",
            bank: payment.bank ? String(payment.bank) : "",
            ccf: payment.ccf || "",
            invoice_number: payment.invoice_number || "",
            invoice_file: null, // No cargamos el archivo existente
            transaction_date: payment.transaction_date
                ? payment.transaction_date.split("T")[0]
                : getTodayDate(),
            notes: payment.notes || "",
        });
        setExistingInvoiceFile(payment.invoice_file || null);
        setEditingPaymentId(payment.id);
        setIsEditing(true);
        setIsAddingPayment(true);
    };

    const handleAddPayment = async (e) => {
        e.preventDefault();

        try {
            const formData = new FormData();
            formData.append("service_order", orderId);
            formData.append("transfer_type", paymentForm.transfer_type);
            formData.append("amount", paymentForm.amount);
            formData.append("description", paymentForm.description);
            formData.append("transaction_date", paymentForm.transaction_date);
            formData.append("notes", paymentForm.notes);

            if (paymentForm.provider)
                formData.append("provider", paymentForm.provider);
            if (paymentForm.payment_method)
                formData.append("payment_method", paymentForm.payment_method);
            if (paymentForm.beneficiary_name)
                formData.append(
                    "beneficiary_name",
                    paymentForm.beneficiary_name
                );
            if (paymentForm.bank) formData.append("bank", paymentForm.bank);
            if (paymentForm.ccf) formData.append("ccf", paymentForm.ccf);
            if (paymentForm.invoice_number)
                formData.append("invoice_number", paymentForm.invoice_number);
            if (paymentForm.invoice_file)
                formData.append("invoice_file", paymentForm.invoice_file);

            if (isEditing) {
                // Actualizar pago existente
                await axios.patch(`/transfers/${editingPaymentId}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Pago actualizado exitosamente");
            } else {
                // Crear nuevo pago
                await axios.post("/transfers/", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Pago a proveedor registrado exitosamente");
            }

            setIsAddingPayment(false);
            setIsEditing(false);
            setEditingPaymentId(null);
            resetForm();
            fetchPayments();
            if (onUpdate) onUpdate();
        } catch (error) {
            const errorMessage =
                error.response?.data?.error ||
                error.response?.data?.detail ||
                (isEditing
                    ? "Error al actualizar pago"
                    : "Error al registrar pago");
            toast.error(errorMessage);
        }
    };

    const handleApprove = (paymentId) => {
        setConfirmDialog({ open: true, id: paymentId, action: "approve" });
    };

    const confirmApprove = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null, action: null });

        try {
            await axios.patch(`/transfers/${id}/`, { status: "aprobado" });
            toast.success("Pago aprobado exitosamente");
            fetchPayments();
            if (onUpdate) onUpdate();
        } catch (_error) {
            toast.error("Error al aprobar pago");
        }
    };

    const handleMarkAsPaid = (paymentId) => {
        setConfirmDialog({ open: true, id: paymentId, action: "paid" });
    };

    const confirmMarkAsPaid = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null, action: null });

        try {
            await axios.patch(`/transfers/${id}/`, {
                status: "pagado",
                payment_date: getTodayDate(),
            });
            toast.success("Pago marcado como pagado exitosamente");
            fetchPayments();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error("Error al marcar como pagado");
        }
    };

    const handleDelete = (paymentId) => {
        setConfirmDialog({ open: true, id: paymentId, action: "delete" });
    };

    const confirmDelete = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null, action: null });

        try {
            await axios.delete(`/transfers/${id}/`);
            toast.success("Pago eliminado exitosamente");
            fetchPayments();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error("Error al eliminar pago");
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validar tamaño (5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("El archivo no debe superar los 5MB");
                return;
            }
            // Validar tipo
            const validTypes = [
                "application/pdf",
                "image/jpeg",
                "image/png",
                "image/jpg",
            ];
            if (!validTypes.includes(file.type)) {
                toast.error("Solo se permiten archivos PDF, JPG o PNG");
                return;
            }
            setPaymentForm({ ...paymentForm, invoice_file: file });
        }
    };

    const resetForm = () => {
        setPaymentForm({
            transfer_type: "costos",
            amount: "",
            description: "",
            provider: "",
            payment_method: "",
            beneficiary_name: "",
            bank: "",
            ccf: "",
            invoice_number: "",
            invoice_file: null,
            transaction_date: getTodayDate(),
            notes: "",
        });
        setIsEditing(false);
        setEditingPaymentId(null);
        setExistingInvoiceFile(null);
    };

    const getStatusBadge = (status) => {
        const config = {
            pendiente: { label: "Pendiente", className: "badge-warning" },
            aprobado: { label: "Aprobado", className: "badge-info" },
            pagado: { label: "Pagado", className: "badge-success" },
            provisionada: { label: "Provisionada", className: "badge-default" },
        };
        const { label, className } = config[status] || config.pendiente;
        return <span className={className}>{label}</span>;
    };

    const getTypeBadge = (type) => {
        const config = {
            costos: { label: "Costo Directo", className: "badge-danger" },
            cargos: { label: "Cargo a Cliente", className: "badge-success" },
            admin: { label: "Gasto de Operación", className: "badge-default" },
            terceros: { label: "Terceros (Legacy)", className: "badge-info" },
            propios: { label: "Propios (Legacy)", className: "badge-warning" },
        };
        const { label, className } = config[type] || {
            label: type,
            className: "badge-default",
        };
        return <span className={className}>{label}</span>;
    };

    const columns = [
        {
            header: "Tipo",
            accessor: "transfer_type",
            className: "w-36",
            cell: (row) => getTypeBadge(row.transfer_type),
        },
        {
            header: "Proveedor",
            accessor: "provider_name",
            cell: (row) => (
                <span className="text-slate-900 font-medium">
                    {row.provider_name || row.beneficiary_name || "-"}
                </span>
            ),
        },
        {
            header: "Descripción",
            accessor: "description",
            cell: (row) => (
                <span className="text-sm text-slate-600 line-clamp-2">
                    {row.description}
                </span>
            ),
        },
        {
            header: "Monto/Tipo",
            accessor: "amount",
            className: "w-32 text-right",
            cell: (row) => (
                <div className="text-right">
                    <div className="font-semibold tabular-nums text-slate-900">
                        {formatCurrency(row.amount)}
                    </div>
                    {row.payment_method && (
                        <div className="text-xs text-slate-500 mt-0.5">
                            {row.payment_method === "efectivo" && "Efectivo"}
                            {row.payment_method === "transferencia" &&
                                "Transferencia"}
                            {row.payment_method === "cheque" && "Cheque"}
                            {row.payment_method === "tarjeta" && "Tarjeta"}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Banco",
            accessor: "bank_name",
            className: "w-32",
            cell: (row) => (
                <span className="text-sm text-slate-700">
                    {row.bank_name || <span className="text-slate-400">—</span>}
                </span>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            className: "w-28",
            cell: (row) => getStatusBadge(row.status),
        },
        {
            header: "Fecha",
            accessor: "transaction_date",
            className: "w-28",
            cell: (row) => {
                const [year, month, day] = row.transaction_date.split("-");
                return (
                    <span className="text-sm text-slate-600">
                        {`${day}/${month}/${year}`}
                    </span>
                );
            },
        },
        {
            header: "Comp.",
            accessor: "invoice_file",
            className: "w-20 text-center",
            cell: (row) =>
                row.invoice_file ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            window.open(row.invoice_file, "_blank");
                        }}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // Descargar usando axios
                            axios
                                .get(`/transfers/${row.id}/download_invoice/`, {
                                    responseType: "blob",
                                })
                                .then((response) => {
                                    const url = window.URL.createObjectURL(
                                        new Blob([response.data])
                                    );
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.setAttribute(
                                        "download",
                                        `comprobante_${
                                            row.invoice_number || row.id
                                        }.pdf`
                                    );
                                    document.body.appendChild(link);
                                    link.click();
                                    link.remove();
                                    window.URL.revokeObjectURL(url);
                                    toast.success("Descargando comprobante...");
                                })
                                .catch((error) => {
                                    toast.error(
                                        "Error al descargar comprobante"
                                    );
                                });
                        }}
                        className="inline-flex items-center justify-center p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors"
                        title="Click: Ver | Click derecho: Descargar"
                    >
                        <FileText className="w-4 h-4" />
                    </button>
                ) : (
                    <span className="text-slate-400 text-xs">—</span>
                ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-44",
            cell: (row) => (
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => handleEditPayment(row)}
                        className="p-1.5 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                        title="Editar"
                    >
                        <Edit className="w-4 h-4" />
                    </button>
                    {row.status === "pendiente" && (
                        <button
                            onClick={() => handleApprove(row.id)}
                            className="p-1.5 text-success-600 hover:text-success-700 hover:bg-success-50 rounded transition-colors"
                            title="Aprobar"
                        >
                            <Check className="w-4 h-4" />
                        </button>
                    )}
                    {row.status === "aprobado" && (
                        <button
                            onClick={() => handleMarkAsPaid(row.id)}
                            className="p-1.5 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors"
                            title="Marcar como pagado"
                        >
                            <DollarSign className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => handleDelete(row.id)}
                        className="p-1.5 text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded transition-colors"
                        title="Eliminar"
                        disabled={row.status === "pagado"}
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    // Calcular totales por tipo
    const totals = {
        costos: payments
            .filter((p) => p.transfer_type === "costos")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        cargos: payments
            .filter((p) => p.transfer_type === "cargos")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        admin: payments
            .filter((p) => p.transfer_type === "admin")
            .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
        total: payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0),
    };

    return (
        <div className="space-y-5">
            {/* Header con resumen */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            Pagos a Proveedores
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Registro de costos, cargos y gastos operativos
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setIsAddingPayment(!isAddingPayment)}
                        className="bg-brand-600 hover:bg-brand-700"
                    >
                        {isAddingPayment ? (
                            <>
                                <X className="w-4 h-4 mr-1.5" /> Cancelar
                            </>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-1.5" /> Registrar
                                Pago
                            </>
                        )}
                    </Button>
                </div>

                {/* Resumen de totales */}
                <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Costos Directos
                        </div>
                        <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                            {formatCurrency(totals.costos)}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Cargos a Clientes
                        </div>
                        <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                            {formatCurrency(totals.cargos)}
                        </div>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                            Gastos de Operación
                        </div>
                        <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                            {formatCurrency(totals.admin)}
                        </div>
                    </div>
                    <div className="bg-brand-50 p-3 rounded-lg border border-brand-200">
                        <div className="text-xs font-medium text-brand-700 uppercase tracking-wide">
                            Total General
                        </div>
                        <div className="text-lg font-bold text-brand-900 mt-1 tabular-nums">
                            {formatCurrency(totals.total)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Formulario de registro */}
            {isAddingPayment && (
                <div className="bg-white border border-slate-200 rounded-lg p-5">
                    <h4 className="text-sm font-semibold text-slate-900 mb-4">
                        {isEditing
                            ? "Editar Pago a Proveedor"
                            : "Nuevo Pago a Proveedor"}
                    </h4>
                    <form onSubmit={handleAddPayment} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            {/* Tipo de Gasto */}
                            <div>
                                <Label className="label-corporate label-required">
                                    Tipo de Gasto
                                </Label>
                                <Select
                                    value={paymentForm.transfer_type}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            transfer_type: val,
                                        })
                                    }
                                    options={transferTypeOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    {paymentForm.transfer_type === "costos" &&
                                        "Gastos para ejecutar servicio de cliente"}
                                    {paymentForm.transfer_type === "cargos" &&
                                        "Facturable al cliente"}
                                    {paymentForm.transfer_type === "admin" &&
                                        "No vinculado a OS"}
                                </p>
                            </div>

                            {/* Monto */}
                            <div>
                                <Label className="label-corporate label-required">
                                    Monto
                                </Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            amount: e.target.value,
                                        })
                                    }
                                    required
                                    className="input-corporate"
                                    placeholder="0.00"
                                />
                            </div>

                            {/* Fecha */}
                            <div>
                                <Label className="label-corporate label-required">
                                    Fecha de Transacción
                                </Label>
                                <Input
                                    type="date"
                                    value={paymentForm.transaction_date}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            transaction_date: e.target.value,
                                        })
                                    }
                                    required
                                    className="input-corporate"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Proveedor */}
                            <div>
                                <Label className="label-corporate">
                                    Proveedor
                                </Label>
                                <Select
                                    value={paymentForm.provider}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            provider: val,
                                        })
                                    }
                                    options={providerOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    placeholder="Seleccionar proveedor..."
                                />
                            </div>

                            {/* Beneficiario */}
                            <div>
                                <Label className="label-corporate">
                                    Nombre del Beneficiario
                                </Label>
                                <Input
                                    type="text"
                                    value={paymentForm.beneficiary_name}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            beneficiary_name: e.target.value,
                                        })
                                    }
                                    className="input-corporate"
                                    placeholder="Si no está en catálogo"
                                />
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <Label className="label-corporate label-required">
                                Descripción
                            </Label>
                            <textarea
                                value={paymentForm.description}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        description: e.target.value,
                                    })
                                }
                                required
                                className="input-corporate min-h-[80px] resize-none"
                                placeholder="Detalle del pago..."
                            />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {/* Método de Pago */}
                            <div>
                                <Label className="label-corporate">
                                    Método de Pago
                                </Label>
                                <Select
                                    value={paymentForm.payment_method}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            payment_method: val,
                                        })
                                    }
                                    options={paymentMethodOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    placeholder="Seleccionar..."
                                />
                            </div>

                            {/* Banco */}
                            <div>
                                <Label className="label-corporate">Banco</Label>
                                <Select
                                    value={paymentForm.bank}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            bank: val,
                                        })
                                    }
                                    options={bankOptions}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    placeholder="Seleccionar banco..."
                                />
                            </div>

                            {/* Número de Factura/CCF */}
                            <div>
                                <Label className="label-corporate">
                                    Número de Factura/CCF
                                </Label>
                                <Input
                                    type="text"
                                    value={paymentForm.invoice_number}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            invoice_number: e.target.value,
                                        })
                                    }
                                    className="input-corporate"
                                    placeholder="Ej: F-2025-001 o CCF-123456"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Comprobante de Crédito Fiscal o número de
                                    factura
                                </p>
                            </div>
                        </div>

                        {/* Comprobante */}
                        <div>
                            <Label className="label-corporate">
                                Comprobante de Pago
                            </Label>
                            {isEditing && existingInvoiceFile && (
                                <div className="mt-1 mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                                    <span className="text-sm text-slate-700">
                                        Archivo actual
                                    </span>
                                    <a
                                        href={existingInvoiceFile}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1"
                                    >
                                        <Eye className="w-4 h-4" />
                                        Ver archivo
                                    </a>
                                </div>
                            )}
                            <div className="mt-1">
                                <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-colors">
                                    <Upload className="w-5 h-5 text-slate-400 mr-2" />
                                    <span className="text-sm text-slate-600">
                                        {paymentForm.invoice_file
                                            ? paymentForm.invoice_file.name
                                            : isEditing && existingInvoiceFile
                                            ? "Click para reemplazar archivo (PDF, JPG, PNG - Max 5MB)"
                                            : "Click para subir archivo (PDF, JPG, PNG - Max 5MB)"}
                                    </span>
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                {isEditing && existingInvoiceFile
                                    ? "Opcional. Solo sube un archivo si deseas reemplazar el existente."
                                    : "Opcional. Puedes subirlo después si aún no tienes el comprobante."}
                            </p>
                        </div>

                        {/* Notas */}
                        <div>
                            <Label className="label-corporate">
                                Notas Adicionales
                            </Label>
                            <textarea
                                value={paymentForm.notes}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        notes: e.target.value,
                                    })
                                }
                                className="input-corporate min-h-[60px] resize-none"
                                placeholder="Información adicional..."
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddingPayment(false);
                                    resetForm();
                                }}
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                {isEditing
                                    ? "Actualizar Pago"
                                    : "Registrar Pago"}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Tabla de pagos */}
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {payments.length > 0 ? (
                    <DataTable columns={columns} data={payments} />
                ) : (
                    <div className="py-12">
                        <EmptyState
                            icon={DollarSign}
                            title="Sin pagos registrados"
                            description="Registra los pagos a proveedores relacionados con esta orden"
                            action={
                                <Button
                                    size="sm"
                                    onClick={() => setIsAddingPayment(true)}
                                    className="bg-brand-600 hover:bg-brand-700"
                                >
                                    <Plus className="w-4 h-4 mr-1.5" />
                                    Registrar Primer Pago
                                </Button>
                            }
                        />
                    </div>
                )}
            </div>

            {/* Confirm Dialogs */}
            <ConfirmDialog
                open={confirmDialog.open && confirmDialog.action === "approve"}
                onClose={() =>
                    setConfirmDialog({ open: false, id: null, action: null })
                }
                onConfirm={confirmApprove}
                title="¿Aprobar este pago?"
                description="El pago será marcado como aprobado y podrá ser ejecutado."
                confirmText="Aprobar"
                cancelText="Cancelar"
                variant="primary"
            />

            <ConfirmDialog
                open={confirmDialog.open && confirmDialog.action === "paid"}
                onClose={() =>
                    setConfirmDialog({ open: false, id: null, action: null })
                }
                onConfirm={confirmMarkAsPaid}
                title="¿Marcar como pagado?"
                description="El pago será registrado como ejecutado con la fecha actual."
                confirmText="Marcar como Pagado"
                cancelText="Cancelar"
                variant="primary"
            />

            <ConfirmDialog
                open={confirmDialog.open && confirmDialog.action === "delete"}
                onClose={() =>
                    setConfirmDialog({ open: false, id: null, action: null })
                }
                onConfirm={confirmDelete}
                title="¿Eliminar este pago?"
                description="Esta acción no se puede deshacer. El pago será eliminado permanentemente."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default ProviderPaymentsTab;
