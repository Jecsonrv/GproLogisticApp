import React, { useState, useEffect } from "react";
import {
    Plus,
    Trash2,
    Edit,
    Save,
    X,
    FileText,
    Building,
    AlertCircle,
    ChevronDown,
    ChevronRight,
    Link2,
    Unlink,
    DollarSign,
    TrendingUp,
    Receipt,
    Package,
    Upload,
    Eye,
} from "lucide-react";
import {
    Button,
    Card,
    CardContent,
    Input,
    Select,
    Label,
    Badge,
    ConfirmDialog,
    EmptyState,
    Modal,
    ModalFooter,
} from "./ui";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";

/**
 * CostsTab - Pestaña unificada de Costos de la Orden
 *
 * Maneja dos tipos de costos:
 * 1. Costos Directos: Facturas de proveedor que se revenden al cliente con margen
 * 2. Cargos a Clientes (Reembolsos): Gastos pass-through que se facturan al costo
 */
const CostsTab = ({ orderId, onUpdate, isClosed = false }) => {
    const [activeSubTab, setActiveSubTab] = useState("direct"); // "direct" o "charges"
    const [loading, setLoading] = useState(true);

    // Costos Directos (ProviderInvoice)
    const [providerInvoices, setProviderInvoices] = useState([]);
    const [expandedInvoice, setExpandedInvoice] = useState(null);

    // Cargos a Clientes (Transfer type='cargos')
    const [clientCharges, setClientCharges] = useState([]);

    // Catálogos
    const [providers, setProviders] = useState([]);
    const [banks, setBanks] = useState([]);

    // Modales
    const [showAddCostModal, setShowAddCostModal] = useState(false);
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);
    const [availableCharges, setAvailableCharges] = useState([]);

    // Formulario de costo directo
    const [directCostForm, setDirectCostForm] = useState({
        invoice_number: "",
        provider: "",
        total_amount: "",
        issue_date: new Date().toISOString().split("T")[0],
        notes: "",
    });
    const [directCostFile, setDirectCostFile] = useState(null);

    // Formulario de cargo a cliente
    const [chargeForm, setChargeForm] = useState({
        provider: "",
        description: "",
        amount: "",
        invoice_number: "",
        transaction_date: new Date().toISOString().split("T")[0],
        customer_iva_type: "no_sujeto",
        notes: "",
    });
    const [chargeFile, setChargeFile] = useState(null);

    // Formulario de asignación
    const [allocateForm, setAllocateForm] = useState({
        order_charge_id: "",
        cost_amount: "",
        description: "",
    });

    // Confirm dialog
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        type: null,
        id: null,
        message: "",
    });

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [invoicesRes, transfersRes, providersRes, banksRes] =
                await Promise.all([
                    api.get(
                        `/transfers/provider-invoices/by_service_order/?service_order=${orderId}`
                    ),
                    api.get(
                        `/transfers/transfers/?service_order=${orderId}&transfer_type=cargos`
                    ),
                    api.get("/catalogs/providers/"),
                    api.get("/catalogs/banks/"),
                ]);
            setProviderInvoices(invoicesRes.data || []);
            setClientCharges(transfersRes.data || []);
            setProviders(providersRes.data || []);
            setBanks(banksRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableCharges = async (invoiceId) => {
        try {
            const response = await api.get(
                `/transfers/provider-invoices/${invoiceId}/available_charges/`
            );
            setAvailableCharges(response.data.available_charges || []);
            return response.data;
        } catch (error) {
            console.error("Error fetching available charges:", error);
            return { available_charges: [] };
        }
    };

    // === HANDLERS COSTO DIRECTO ===
    const handleAddDirectCost = async () => {
        if (
            !directCostForm.invoice_number ||
            !directCostForm.provider ||
            !directCostForm.total_amount
        ) {
            toast.error("Complete los campos requeridos");
            return;
        }

        try {
            // Usar FormData para poder enviar archivo
            const formData = new FormData();
            formData.append("invoice_number", directCostForm.invoice_number);
            formData.append("provider", directCostForm.provider);
            formData.append(
                "total_amount",
                parseFloat(directCostForm.total_amount)
            );
            formData.append("issue_date", directCostForm.issue_date);
            formData.append("service_order", orderId);
            if (directCostForm.notes) {
                formData.append("notes", directCostForm.notes);
            }
            if (directCostFile) {
                formData.append("invoice_file", directCostFile);
            }

            await api.post("/transfers/provider-invoices/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Costo directo registrado");
            setShowAddCostModal(false);
            resetDirectCostForm();
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al registrar");
        }
    };

    const handleDeleteDirectCost = async (invoiceId) => {
        try {
            await api.delete(`/transfers/provider-invoices/${invoiceId}/`);
            toast.success("Costo directo eliminado");
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al eliminar");
        }
    };

    // === HANDLERS CARGO A CLIENTE ===
    const handleAddClientCharge = async () => {
        if (
            !chargeForm.provider ||
            !chargeForm.amount ||
            !chargeForm.description
        ) {
            toast.error("Complete los campos requeridos");
            return;
        }

        try {
            // Usar FormData para poder enviar archivo
            const formData = new FormData();
            formData.append("service_order", orderId);
            formData.append("provider", chargeForm.provider);
            formData.append("description", chargeForm.description);
            formData.append("amount", parseFloat(chargeForm.amount));
            formData.append("transaction_date", chargeForm.transaction_date);
            formData.append("customer_iva_type", chargeForm.customer_iva_type);
            formData.append("transfer_type", "cargos");
            formData.append("is_pass_through", "true");
            formData.append("customer_markup_percentage", "0");
            formData.append("status", "pendiente");
            if (chargeForm.invoice_number) {
                formData.append("invoice_number", chargeForm.invoice_number);
            }
            if (chargeFile) {
                formData.append("invoice_file", chargeFile);
            }

            await api.post("/transfers/transfers/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success("Cargo a cliente registrado");
            setShowAddCostModal(false);
            resetChargeForm();
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al registrar");
        }
    };

    const handleDeleteClientCharge = async (chargeId) => {
        try {
            await api.delete(`/transfers/transfers/${chargeId}/`);
            toast.success("Cargo eliminado");
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al eliminar");
        }
    };

    // === HANDLERS ASIGNACIÓN ===
    const handleAllocateCost = async () => {
        if (!allocateForm.order_charge_id || !allocateForm.cost_amount) {
            toast.error("Seleccione un servicio y monto");
            return;
        }

        try {
            await api.post(
                `/transfers/provider-invoices/${selectedInvoice.id}/allocate_cost/`,
                {
                    order_charge_id: parseInt(allocateForm.order_charge_id),
                    cost_amount: parseFloat(allocateForm.cost_amount),
                    description: allocateForm.description,
                }
            );
            toast.success("Costo vinculado al servicio");
            setShowAllocateModal(false);
            resetAllocateForm();
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.warning) {
                toast.error(errorData.message, { duration: 5000 });
            } else {
                toast.error(errorData?.error || "Error al vincular");
            }
        }
    };

    const handleDeleteAllocation = async (allocationId) => {
        try {
            await api.delete(`/transfers/cost-allocations/${allocationId}/`);
            toast.success("Vinculacion eliminada");
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al eliminar");
        }
    };

    // === RESETS ===
    const resetDirectCostForm = () => {
        setDirectCostForm({
            invoice_number: "",
            provider: "",
            total_amount: "",
            issue_date: new Date().toISOString().split("T")[0],
            notes: "",
        });
        setDirectCostFile(null);
    };

    const resetChargeForm = () => {
        setChargeForm({
            provider: "",
            description: "",
            amount: "",
            invoice_number: "",
            transaction_date: new Date().toISOString().split("T")[0],
            customer_iva_type: "no_sujeto",
            notes: "",
        });
        setChargeFile(null);
    };

    const resetAllocateForm = () => {
        setAllocateForm({
            order_charge_id: "",
            cost_amount: "",
            description: "",
        });
        setSelectedInvoice(null);
    };

    const openAllocateModal = async (invoice) => {
        setSelectedInvoice(invoice);
        await fetchAvailableCharges(invoice.id);
        setAllocateForm({
            ...allocateForm,
            cost_amount: invoice.unallocated_amount,
        });
        setShowAllocateModal(true);
    };

    const toggleExpanded = (invoiceId) => {
        setExpandedInvoice(expandedInvoice === invoiceId ? null : invoiceId);
    };

    // === CALCULOS ===
    const directCostTotals = providerInvoices.reduce(
        (acc, inv) => {
            acc.totalCost += parseFloat(inv.total_amount || 0);
            acc.allocated += parseFloat(inv.allocated_amount || 0);
            acc.unallocated += parseFloat(inv.unallocated_amount || 0);
            const summary = inv.profit_summary || {};
            acc.totalSale += summary.total_sale || 0;
            acc.profit += summary.profit || 0;
            return acc;
        },
        { totalCost: 0, allocated: 0, unallocated: 0, totalSale: 0, profit: 0 }
    );

    const clientChargeTotals = clientCharges.reduce(
        (acc, charge) => {
            acc.total += parseFloat(charge.amount || 0);
            return acc;
        },
        { total: 0 }
    );

    const getStatusBadge = (status) => {
        const styles = {
            pendiente: "bg-slate-100 text-slate-700 border-slate-200",
            parcial: "bg-slate-100 text-slate-700 border-slate-300",
            asignado: "bg-slate-100 text-slate-800 border-slate-300",
            facturado: "bg-slate-100 text-slate-700 border-slate-300",
            aprobado: "bg-slate-100 text-slate-700 border-slate-300",
            pagado: "bg-slate-100 text-slate-800 border-slate-300",
        };
        const labels = {
            pendiente: "Pendiente",
            parcial: "Parcial",
            asignado: "Asignado",
            facturado: "Facturado",
            aprobado: "Aprobado",
            pagado: "Pagado",
        };
        return (
            <span
                className={`px-2 py-0.5 text-xs font-medium rounded border ${
                    styles[status] || styles.pendiente
                }`}
            >
                {labels[status] || status}
            </span>
        );
    };

    if (loading) {
        return (
            <div className="animate-pulse space-y-4">
                <div className="h-10 bg-slate-200 rounded w-1/3"></div>
                <div className="h-32 bg-slate-200 rounded"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con botón agregar */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-slate-800">
                        Costos de la Orden
                    </h3>
                    <p className="text-sm text-slate-500">
                        {isClosed
                            ? "La orden está cerrada - solo lectura"
                            : "Registre costos directos y cargos a clientes"}
                    </p>
                </div>
                {!isClosed && (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddCostModal(true)}
                        className="gap-1.5"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Costo
                    </Button>
                )}
            </div>

            {/* Sub-tabs */}
            <div className="border-b border-slate-200">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveSubTab("direct")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                            activeSubTab === "direct"
                                ? "border-slate-900 text-slate-900"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Costos Directos
                            {providerInvoices.length > 0 && (
                                <span className="bg-slate-200 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                                    {providerInvoices.length}
                                </span>
                            )}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveSubTab("charges")}
                        className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                            activeSubTab === "charges"
                                ? "border-slate-900 text-slate-900"
                                : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        <div className="flex items-center gap-2">
                            <Receipt className="w-4 h-4" />
                            Cargos a Clientes
                            {clientCharges.length > 0 && (
                                <span className="bg-slate-200 text-slate-600 text-xs px-1.5 py-0.5 rounded-full">
                                    {clientCharges.length}
                                </span>
                            )}
                        </div>
                    </button>
                </nav>
            </div>

            {/* Contenido Sub-tab: Costos Directos */}
            {activeSubTab === "direct" && (
                <div className="space-y-4">
                    {/* Info box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex gap-2 text-sm text-slate-700">
                            <Package className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-slate-900">
                                    Costos Directos:
                                </strong>{" "}
                                Facturas de proveedor revendidas al cliente con
                                margen. Deben vincularse a servicios.
                            </div>
                        </div>
                    </div>

                    {/* KPIs */}
                    {providerInvoices.length > 0 && (
                        <div className="grid grid-cols-4 gap-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                    Costo Total
                                </div>
                                <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">
                                    {formatCurrency(directCostTotals.totalCost)}
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-300 rounded-lg p-3">
                                <div className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                                    Venta Estimada
                                </div>
                                <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">
                                    {formatCurrency(directCostTotals.totalSale)}
                                </div>
                            </div>
                            <div className="bg-slate-100 border border-slate-300 rounded-lg p-3">
                                <div className="text-xs text-slate-600 font-medium uppercase tracking-wide">
                                    Margen
                                </div>
                                <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">
                                    {formatCurrency(directCostTotals.profit)}
                                </div>
                            </div>
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">
                                    Pendiente
                                </div>
                                <div className="text-lg font-bold text-slate-700 tabular-nums mt-1">
                                    {formatCurrency(
                                        directCostTotals.unallocated
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Lista de facturas */}
                    {providerInvoices.length === 0 ? (
                        <EmptyState
                            icon={Package}
                            title="Sin costos directos"
                            description="No hay facturas de proveedor registradas"
                        />
                    ) : (
                        <div className="space-y-2">
                            {providerInvoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="border border-slate-200 rounded bg-white overflow-hidden"
                                >
                                    {/* Header */}
                                    <div
                                        className="flex items-center justify-between px-4 py-3 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() =>
                                            toggleExpanded(invoice.id)
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedInvoice === invoice.id ? (
                                                <ChevronDown className="w-4 h-4 text-slate-400" />
                                            ) : (
                                                <ChevronRight className="w-4 h-4 text-slate-400" />
                                            )}
                                            <Building className="w-4 h-4 text-slate-500" />
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">
                                                    {invoice.invoice_number}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {invoice.provider_name}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-slate-900 tabular-nums">
                                                    {formatCurrency(
                                                        invoice.total_amount
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {invoice.issue_date}
                                                </div>
                                            </div>
                                            {getStatusBadge(invoice.status)}
                                        </div>
                                    </div>

                                    {/* Expandido */}
                                    {expandedInvoice === invoice.id && (
                                        <div className="border-t border-slate-200 p-4">
                                            {/* Barra de progreso */}
                                            <div className="mb-4">
                                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                                    <span>
                                                        Asignado:{" "}
                                                        {formatCurrency(
                                                            invoice.allocated_amount
                                                        )}
                                                    </span>
                                                    <span>
                                                        Disponible:{" "}
                                                        {formatCurrency(
                                                            invoice.unallocated_amount
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full transition-all"
                                                        style={{
                                                            width: `${
                                                                (invoice.allocated_amount /
                                                                    invoice.total_amount) *
                                                                100
                                                            }%`,
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Servicios vinculados */}
                                            {invoice.allocations &&
                                            invoice.allocations.length > 0 ? (
                                                <div className="space-y-2 mb-4">
                                                    <div className="text-xs font-semibold text-slate-600 uppercase">
                                                        Servicios Vinculados
                                                    </div>
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-slate-50">
                                                            <tr>
                                                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-600">
                                                                    Servicio
                                                                </th>
                                                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600">
                                                                    Costo
                                                                </th>
                                                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600">
                                                                    Venta
                                                                </th>
                                                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-600">
                                                                    Margen
                                                                </th>
                                                                <th className="w-10"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {invoice.allocations
                                                                .filter(
                                                                    (a) =>
                                                                        !a.is_deleted
                                                                )
                                                                .map(
                                                                    (alloc) => (
                                                                        <tr
                                                                            key={
                                                                                alloc.id
                                                                            }
                                                                            className="border-t border-slate-100"
                                                                        >
                                                                            <td className="py-2 px-3">
                                                                                <div className="font-medium text-slate-800">
                                                                                    {
                                                                                        alloc.order_charge_service_name
                                                                                    }
                                                                                </div>
                                                                                {alloc.description && (
                                                                                    <div className="text-xs text-slate-500">
                                                                                        {
                                                                                            alloc.description
                                                                                        }
                                                                                    </div>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-3 text-right font-medium text-slate-700 tabular-nums">
                                                                                {formatCurrency(
                                                                                    alloc.cost_amount
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-3 text-right font-medium text-emerald-600 tabular-nums">
                                                                                {formatCurrency(
                                                                                    alloc.sale_price
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 px-3 text-right">
                                                                                <span
                                                                                    className={`font-medium tabular-nums ${
                                                                                        alloc.profit >=
                                                                                        0
                                                                                            ? "text-emerald-600"
                                                                                            : "text-red-600"
                                                                                    }`}
                                                                                >
                                                                                    {formatCurrency(
                                                                                        alloc.profit
                                                                                    )}
                                                                                </span>
                                                                                <span className="text-xs text-slate-500 ml-1">
                                                                                    (
                                                                                    {alloc.margin_percentage?.toFixed(
                                                                                        1
                                                                                    )}
                                                                                    %)
                                                                                </span>
                                                                            </td>
                                                                            {!isClosed && (
                                                                                <td className="py-2 px-3">
                                                                                    {!alloc.is_billed && (
                                                                                        <button
                                                                                            onClick={(
                                                                                                e
                                                                                            ) => {
                                                                                                e.stopPropagation();
                                                                                                setConfirmDialog(
                                                                                                    {
                                                                                                        open: true,
                                                                                                        type: "allocation",
                                                                                                        id: alloc.id,
                                                                                                        message:
                                                                                                            "El costo será desvinculado del servicio.",
                                                                                                    }
                                                                                                );
                                                                                            }}
                                                                                            className="p-1 text-slate-400 hover:text-red-600"
                                                                                        >
                                                                                            <Unlink className="w-4 h-4" />
                                                                                        </button>
                                                                                    )}
                                                                                </td>
                                                                            )}
                                                                        </tr>
                                                                    )
                                                                )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 text-sm text-slate-500">
                                                    Sin servicios vinculados
                                                </div>
                                            )}

                                            {/* Acciones - Solo si no está cerrada */}
                                            {!isClosed && (
                                                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                                    <div className="flex gap-2">
                                                        {parseFloat(
                                                            invoice.unallocated_amount
                                                        ) > 0 && (
                                                            <Button
                                                                variant="secondary"
                                                                size="sm"
                                                                onClick={() =>
                                                                    openAllocateModal(
                                                                        invoice
                                                                    )
                                                                }
                                                                className="gap-1.5"
                                                            >
                                                                <Link2 className="w-3.5 h-3.5" />
                                                                Vincular a Servicio
                                                            </Button>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() =>
                                                            setConfirmDialog({
                                                                open: true,
                                                                type: "invoice",
                                                                id: invoice.id,
                                                                message:
                                                                    "La factura y sus asignaciones serán eliminadas.",
                                                            })
                                                        }
                                                        className="text-red-600 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Contenido Sub-tab: Cargos a Clientes */}
            {activeSubTab === "charges" && (
                <div className="space-y-4">
                    {/* Info box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex gap-2 text-sm text-slate-700">
                            <Receipt className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-slate-900">
                                    Cargos a Clientes:
                                </strong>{" "}
                                Gastos facturados a nombre del cliente. Se
                                cobran al costo sin margen de ganancia.
                            </div>
                        </div>
                    </div>

                    {/* Total */}
                    {clientCharges.length > 0 && (
                        <div className="bg-slate-50 border border-slate-200 rounded p-3 w-fit">
                            <div className="text-xs text-slate-500 font-medium">
                                Total Reembolsos
                            </div>
                            <div className="text-lg font-bold text-slate-900 tabular-nums">
                                {formatCurrency(clientChargeTotals.total)}
                            </div>
                        </div>
                    )}

                    {/* Lista */}
                    {clientCharges.length === 0 ? (
                        <EmptyState
                            icon={Receipt}
                            title="Sin cargos a clientes"
                            description="No hay reembolsos registrados"
                        />
                    ) : (
                        <div className="border border-slate-200 rounded-md overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                                            Descripcion
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                                            Proveedor
                                        </th>
                                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                                            Factura
                                        </th>
                                        <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                                            Monto
                                        </th>
                                        <th className="text-center py-3 px-4 text-xs font-semibold text-slate-600 uppercase">
                                            Estado
                                        </th>
                                        {!isClosed && <th className="w-16"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientCharges.map((charge) => (
                                        <tr
                                            key={charge.id}
                                            className="hover:bg-slate-50"
                                        >
                                            <td className="py-3 px-4">
                                                <div className="font-medium text-slate-800">
                                                    {charge.description}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {charge.transaction_date}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {charge.provider_name}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 font-mono text-xs">
                                                {charge.invoice_number || "-"}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">
                                                {formatCurrency(charge.amount)}
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                                {getStatusBadge(
                                                    charge.billing_status ||
                                                        charge.status
                                                )}
                                            </td>
                                            {!isClosed && (
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() =>
                                                            setConfirmDialog({
                                                                open: true,
                                                                type: "charge",
                                                                id: charge.id,
                                                                message:
                                                                    "Se eliminara este cargo a cliente.",
                                                            })
                                                        }
                                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Modal Agregar Costo */}
            <Modal
                isOpen={showAddCostModal}
                onClose={() => {
                    setShowAddCostModal(false);
                    resetDirectCostForm();
                    resetChargeForm();
                }}
                title={
                    activeSubTab === "direct"
                        ? "Agregar Costo Directo"
                        : "Agregar Cargo a Cliente"
                }
                size="lg"
            >
                <div className="space-y-5">
                    {/* Info del tipo seleccionado */}
                    <div
                        className={`p-3.5 rounded-lg border flex items-start gap-2.5 ${
                            activeSubTab === "direct"
                                ? "bg-slate-50 border-slate-200"
                                : "bg-slate-50 border-slate-200"
                        }`}
                    >
                        {activeSubTab === "direct" ? (
                            <Package className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <Receipt className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm text-slate-700">
                            {activeSubTab === "direct"
                                ? "Factura de proveedor revendida al cliente con margen de ganancia."
                                : "Gasto facturado a nombre del cliente sin margen de ganancia."}
                        </p>
                    </div>

                    {/* Formulario Costo Directo */}
                    {activeSubTab === "direct" && (
                        <div className="space-y-5">
                            {/* Sección: Información del Proveedor */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building className="w-3.5 h-3.5" />
                                    Información del Proveedor
                                </h4>
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Proveedor{" "}
                                        <span className="text-red-600">*</span>
                                    </Label>
                                    <Select
                                        value={directCostForm.provider}
                                        onChange={(val) =>
                                            setDirectCostForm({
                                                ...directCostForm,
                                                provider: val,
                                            })
                                        }
                                        options={providers}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                        searchable
                                        placeholder="Seleccione proveedor..."
                                    />
                                </div>
                            </div>

                            {/* Sección: Datos de la Factura */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="w-3.5 h-3.5" />
                                    Datos de la Factura
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            No. Factura{" "}
                                            <span className="text-red-600">
                                                *
                                            </span>
                                        </Label>
                                        <Input
                                            value={
                                                directCostForm.invoice_number
                                            }
                                            onChange={(e) =>
                                                setDirectCostForm({
                                                    ...directCostForm,
                                                    invoice_number:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="FAC-001"
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            Fecha de Emisión
                                        </Label>
                                        <Input
                                            type="date"
                                            value={directCostForm.issue_date}
                                            onChange={(e) =>
                                                setDirectCostForm({
                                                    ...directCostForm,
                                                    issue_date: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Monto Total{" "}
                                        <span className="text-red-600">*</span>
                                    </Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                            $
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={directCostForm.total_amount}
                                            onChange={(e) =>
                                                setDirectCostForm({
                                                    ...directCostForm,
                                                    total_amount:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="0.00"
                                            className="pl-8"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Información Adicional */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    Información Adicional
                                </h4>
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Notas
                                    </Label>
                                    <Input
                                        value={directCostForm.notes}
                                        onChange={(e) =>
                                            setDirectCostForm({
                                                ...directCostForm,
                                                notes: e.target.value,
                                            })
                                        }
                                        placeholder="Notas adicionales..."
                                    />
                                </div>
                                {/* Upload de comprobante */}
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Comprobante
                                    </Label>
                                    {directCostFile ? (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                <span className="text-sm text-slate-700 truncate">
                                                    {directCostFile.name}
                                                </span>
                                                <span className="text-xs text-slate-500 flex-shrink-0">
                                                    (
                                                    {(
                                                        directCostFile.size /
                                                        1024
                                                    ).toFixed(1)}{" "}
                                                    KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setDirectCostFile(null)
                                                }
                                                className="text-slate-400 hover:text-red-500 p-1 transition-colors rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all group">
                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                            <div className="text-center">
                                                <span className="text-sm font-medium text-slate-700 block">
                                                    Subir factura o comprobante
                                                </span>
                                                <span className="text-xs text-slate-500 mt-1 block">
                                                    PDF, JPG o PNG (máx 5MB)
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => {
                                                    if (
                                                        e.target.files &&
                                                        e.target.files[0]
                                                    ) {
                                                        setDirectCostFile(
                                                            e.target.files[0]
                                                        );
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Formulario Cargo a Cliente */}
                    {activeSubTab === "charges" && (
                        <div className="space-y-5">
                            {/* Sección: Información del Proveedor */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Building className="w-3.5 h-3.5" />
                                    Información del Proveedor
                                </h4>
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Proveedor{" "}
                                        <span className="text-red-600">*</span>
                                    </Label>
                                    <Select
                                        value={chargeForm.provider}
                                        onChange={(val) =>
                                            setChargeForm({
                                                ...chargeForm,
                                                provider: val,
                                            })
                                        }
                                        options={providers}
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                        searchable
                                        placeholder="Seleccione proveedor..."
                                    />
                                </div>
                            </div>

                            {/* Sección: Datos del Cargo */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" />
                                    Datos del Cargo
                                </h4>
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Descripción{" "}
                                        <span className="text-red-600">*</span>
                                    </Label>
                                    <Input
                                        value={chargeForm.description}
                                        onChange={(e) =>
                                            setChargeForm({
                                                ...chargeForm,
                                                description: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: Muellaje, Almacenaje..."
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            Monto{" "}
                                            <span className="text-red-600">
                                                *
                                            </span>
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={chargeForm.amount}
                                                onChange={(e) =>
                                                    setChargeForm({
                                                        ...chargeForm,
                                                        amount: e.target.value,
                                                    })
                                                }
                                                placeholder="0.00"
                                                className="pl-8"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            No. Factura
                                        </Label>
                                        <Input
                                            value={chargeForm.invoice_number}
                                            onChange={(e) =>
                                                setChargeForm({
                                                    ...chargeForm,
                                                    invoice_number:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="Opcional"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            Fecha
                                        </Label>
                                        <Input
                                            type="date"
                                            value={chargeForm.transaction_date}
                                            onChange={(e) =>
                                                setChargeForm({
                                                    ...chargeForm,
                                                    transaction_date:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                            Tratamiento IVA
                                        </Label>
                                        <Select
                                            value={chargeForm.customer_iva_type}
                                            onChange={(val) =>
                                                setChargeForm({
                                                    ...chargeForm,
                                                    customer_iva_type: val,
                                                })
                                            }
                                            options={[
                                                {
                                                    value: "no_sujeto",
                                                    label: "No Sujeto",
                                                },
                                                {
                                                    value: "gravado",
                                                    label: "Gravado (13%)",
                                                },
                                            ]}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Sección: Información Adicional */}
                            <div className="space-y-3">
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Upload className="w-3.5 h-3.5" />
                                    Documentos
                                </h4>
                                {/* Upload de comprobante */}
                                <div>
                                    <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                                        Comprobante
                                    </Label>
                                    {chargeFile ? (
                                        <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                                                <span className="text-sm text-slate-700 truncate">
                                                    {chargeFile.name}
                                                </span>
                                                <span className="text-xs text-slate-500 flex-shrink-0">
                                                    (
                                                    {(
                                                        chargeFile.size / 1024
                                                    ).toFixed(1)}{" "}
                                                    KB)
                                                </span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setChargeFile(null)
                                                }
                                                className="text-slate-400 hover:text-red-500 p-1 transition-colors rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-all group">
                                            <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                                            <div className="text-center">
                                                <span className="text-sm font-medium text-slate-700 block">
                                                    Subir factura o comprobante
                                                </span>
                                                <span className="text-xs text-slate-500 mt-1 block">
                                                    PDF, JPG o PNG (máx 5MB)
                                                </span>
                                            </div>
                                            <input
                                                type="file"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => {
                                                    if (
                                                        e.target.files &&
                                                        e.target.files[0]
                                                    ) {
                                                        setChargeFile(
                                                            e.target.files[0]
                                                        );
                                                    }
                                                }}
                                                className="hidden"
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setShowAddCostModal(false);
                            resetDirectCostForm();
                            resetChargeForm();
                        }}
                        className="text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={
                            activeSubTab === "direct"
                                ? handleAddDirectCost
                                : handleAddClientCharge
                        }
                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px]"
                    >
                        Guardar Costo
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal Vincular a Servicio */}
            <Modal
                isOpen={showAllocateModal && !!selectedInvoice}
                onClose={() => {
                    setShowAllocateModal(false);
                    resetAllocateForm();
                }}
                title="Vincular a Servicio"
                size="md"
            >
                {selectedInvoice && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1">
                            Factura Seleccionada
                        </div>
                        <div className="font-semibold text-slate-900">
                            {selectedInvoice.invoice_number}
                        </div>
                        <div className="text-sm text-slate-600 mt-0.5">
                            Disponible:{" "}
                            <span className="font-medium text-emerald-600">
                                {formatCurrency(
                                    selectedInvoice.unallocated_amount
                                )}
                            </span>
                        </div>
                    </div>
                )}
                <div className="space-y-5">
                    <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Servicio a Vincular{" "}
                            <span className="text-red-600">*</span>
                        </Label>
                        <Select
                            value={allocateForm.order_charge_id}
                            onChange={(val) =>
                                setAllocateForm({
                                    ...allocateForm,
                                    order_charge_id: val,
                                })
                            }
                            options={availableCharges}
                            getOptionLabel={(opt) =>
                                `${opt.service_name} - ${formatCurrency(
                                    opt.subtotal
                                )}`
                            }
                            getOptionValue={(opt) => opt.id}
                            placeholder="Seleccione servicio..."
                        />
                        {availableCharges.length === 0 && (
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">
                                    No hay servicios disponibles. Agregue
                                    servicios en la calculadora primero.
                                </p>
                            </div>
                        )}
                    </div>
                    <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Costo a Asignar{" "}
                            <span className="text-red-600">*</span>
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                $
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                value={allocateForm.cost_amount}
                                onChange={(e) =>
                                    setAllocateForm({
                                        ...allocateForm,
                                        cost_amount: e.target.value,
                                    })
                                }
                                placeholder="0.00"
                                className="pl-8"
                            />
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                            Máximo disponible:{" "}
                            <span className="font-medium">
                                {selectedInvoice
                                    ? formatCurrency(
                                          selectedInvoice.unallocated_amount
                                      )
                                    : "$0.00"}
                            </span>
                        </p>
                    </div>
                    <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">
                            Descripción
                        </Label>
                        <Input
                            value={allocateForm.description}
                            onChange={(e) =>
                                setAllocateForm({
                                    ...allocateForm,
                                    description: e.target.value,
                                })
                            }
                            placeholder="Ej: Cuadrilla portuaria"
                        />
                    </div>

                    {/* Preview */}
                    {allocateForm.order_charge_id &&
                        allocateForm.cost_amount && (
                            <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 rounded-lg p-4 space-y-3 border border-slate-200">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                                    <TrendingUp className="w-3.5 h-3.5" />
                                    Vista Previa del Margen
                                </div>
                                {(() => {
                                    const charge = availableCharges.find(
                                        (c) =>
                                            c.id ===
                                            parseInt(
                                                allocateForm.order_charge_id
                                            )
                                    );
                                    if (!charge) return null;
                                    const cost =
                                        parseFloat(allocateForm.cost_amount) ||
                                        0;
                                    const sale = charge.subtotal;
                                    const profit = sale - cost;
                                    const margin =
                                        cost > 0
                                            ? ((profit / cost) * 100).toFixed(1)
                                            : 0;
                                    return (
                                        <>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="bg-white rounded-lg p-3 border border-slate-200">
                                                    <div className="text-xs text-slate-500 mb-1">
                                                        Costo
                                                    </div>
                                                    <div className="text-lg font-bold text-slate-900 tabular-nums">
                                                        {formatCurrency(cost)}
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded-lg p-3 border border-emerald-200">
                                                    <div className="text-xs text-emerald-600 mb-1">
                                                        Venta
                                                    </div>
                                                    <div className="text-lg font-bold text-emerald-600 tabular-nums">
                                                        {formatCurrency(sale)}
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded-lg p-3 border border-blue-200">
                                                    <div className="text-xs text-blue-600 mb-1">
                                                        Ganancia
                                                    </div>
                                                    <div
                                                        className={`text-lg font-bold tabular-nums ${
                                                            profit >= 0
                                                                ? "text-blue-600"
                                                                : "text-red-600"
                                                        }`}
                                                    >
                                                        {formatCurrency(profit)}
                                                    </div>
                                                    <div className="text-xs text-slate-500 mt-0.5">
                                                        {margin}% margen
                                                    </div>
                                                </div>
                                            </div>
                                            {cost > sale && (
                                                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                                                    <p className="text-sm text-red-700">
                                                        <strong>
                                                            Advertencia:
                                                        </strong>{" "}
                                                        El costo es mayor al
                                                        precio de venta. Esto
                                                        generará pérdida.
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                </div>
                <ModalFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setShowAllocateModal(false);
                            resetAllocateForm();
                        }}
                        className="text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-100"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAllocateCost}
                        disabled={availableCharges.length === 0}
                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Vincular Servicio
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                title="Confirmar Eliminacion"
                message={confirmDialog.message}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={() => {
                    if (confirmDialog.type === "invoice") {
                        handleDeleteDirectCost(confirmDialog.id);
                    } else if (confirmDialog.type === "allocation") {
                        handleDeleteAllocation(confirmDialog.id);
                    } else if (confirmDialog.type === "charge") {
                        handleDeleteClientCharge(confirmDialog.id);
                    }
                    setConfirmDialog({
                        open: false,
                        type: null,
                        id: null,
                        message: "",
                    });
                }}
                onCancel={() =>
                    setConfirmDialog({
                        open: false,
                        type: null,
                        id: null,
                        message: "",
                    })
                }
            />
        </div>
    );
};

export default CostsTab;
