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
    FileUpload,
} from "./ui";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, getTodayDate } from "../lib/utils";

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

    // Datos
    const [providerInvoices, setProviderInvoices] = useState([]);
    const [expandedInvoice, setExpandedInvoice] = useState(null);
    const [clientCharges, setClientCharges] = useState([]);
    const [providers, setProviders] = useState([]);
    const [availableCharges, setAvailableCharges] = useState([]);

    // UI State
    const [showAddCostModal, setShowAddCostModal] = useState(false);
    const [showAllocateModal, setShowAllocateModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Formulario de costo directo (ProviderInvoice)
    const [directCostForm, setDirectCostForm] = useState({
        invoice_number: "",
        provider: "",
        total_amount: "",
        issue_date: getTodayDate(),
        notes: "",
    });
    const [directCostFile, setDirectCostFile] = useState(null);

    // Formulario de cargo a cliente (Transfer)
    const [chargeForm, setChargeForm] = useState({
        provider: "",
        beneficiary_name: "",
        description: "",
        amount: "",
        invoice_number: "",
        ccf: "",
        transaction_date: getTodayDate(),
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
            const [invoicesRes, transfersRes, providersRes] = await Promise.all([
                api.get(`/transfers/provider-invoices/by_service_order/?service_order=${orderId}`),
                api.get(`/transfers/transfers/?service_order=${orderId}&transfer_type=cargos`),
                api.get("/catalogs/providers/"),
            ]);
            setProviderInvoices(invoicesRes.data || []);
            setClientCharges(transfersRes.data || []);
            setProviders(providersRes.data || []);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAvailableCharges = async (invoiceId) => {
        try {
            const response = await api.get(`/transfers/provider-invoices/${invoiceId}/available_charges/`);
            setAvailableCharges(response.data.available_charges || []);
            return response.data;
        } catch (error) {
            console.error("Error fetching available charges:", error);
            return { available_charges: [] };
        }
    };

    // === HANDLERS COSTO DIRECTO ===
    const handleOpenEditDirectCost = (invoice) => {
        setDirectCostForm({
            invoice_number: invoice.invoice_number || "",
            provider: invoice.provider ? String(invoice.provider) : "",
            total_amount: invoice.total_amount || "",
            issue_date: invoice.issue_date || getTodayDate(),
            notes: invoice.notes || "",
        });
        setEditingId(invoice.id);
        setIsEditing(true);
        setActiveSubTab("direct");
        setShowAddCostModal(true);
    };

    const handleSaveDirectCost = async () => {
        if (!directCostForm.invoice_number || !directCostForm.provider || !directCostForm.total_amount) {
            toast.error("Complete los campos requeridos");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("invoice_number", directCostForm.invoice_number);
            formData.append("provider", directCostForm.provider);
            formData.append("total_amount", parseFloat(directCostForm.total_amount));
            formData.append("issue_date", directCostForm.issue_date);
            formData.append("service_order", orderId);
            if (directCostForm.notes) formData.append("notes", directCostForm.notes);
            if (directCostFile) formData.append("invoice_file", directCostFile);

            if (isEditing) {
                await api.patch(`/transfers/provider-invoices/${editingId}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Costo directo actualizado");
            } else {
                await api.post("/transfers/provider-invoices/", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Costo directo registrado");
            }

            setShowAddCostModal(false);
            resetDirectCostForm();
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al procesar");
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
    const handleOpenEditCharge = (charge) => {
        setChargeForm({
            provider: charge.provider ? String(charge.provider) : "",
            beneficiary_name: charge.beneficiary_name || "",
            description: charge.description || "",
            amount: charge.amount || "",
            invoice_number: charge.invoice_number || "",
            ccf: charge.ccf || "",
            transaction_date: charge.transaction_date || getTodayDate(),
            customer_iva_type: charge.customer_iva_type || "no_sujeto",
            notes: charge.notes || "",
        });
        setEditingId(charge.id);
        setIsEditing(true);
        setActiveSubTab("charges");
        setShowAddCostModal(true);
    };

    const handleSaveClientCharge = async () => {
        if (!chargeForm.provider || !chargeForm.amount || !chargeForm.description) {
            toast.error("Complete los campos requeridos");
            return;
        }

        try {
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
            
            if (chargeForm.beneficiary_name) formData.append("beneficiary_name", chargeForm.beneficiary_name);
            if (chargeForm.invoice_number) formData.append("invoice_number", chargeForm.invoice_number);
            if (chargeForm.ccf) formData.append("ccf", chargeForm.ccf);
            if (chargeForm.notes) formData.append("notes", chargeForm.notes);
            if (chargeFile) formData.append("invoice_file", chargeFile);

            if (isEditing) {
                await api.patch(`/transfers/transfers/${editingId}/`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Cargo a cliente actualizado");
            } else {
                formData.append("status", "pendiente");
                await api.post("/transfers/transfers/", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                toast.success("Cargo a cliente registrado");
            }

            setShowAddCostModal(false);
            resetChargeForm();
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al procesar");
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
            await api.post(`/transfers/provider-invoices/${selectedInvoice.id}/allocate_cost/`, {
                order_charge_id: parseInt(allocateForm.order_charge_id),
                cost_amount: parseFloat(allocateForm.cost_amount),
                description: allocateForm.description,
            });
            toast.success("Costo vinculado al servicio");
            setShowAllocateModal(false);
            resetAllocateForm();
            fetchData();
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al vincular");
        }
    };

    const handleDeleteAllocation = async (allocationId) => {
        try {
            await api.delete(`/transfers/cost-allocations/${allocationId}/`);
            toast.success("Vinculación eliminada");
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
            issue_date: getTodayDate(),
            notes: "",
        });
        setDirectCostFile(null);
        setIsEditing(false);
        setEditingId(null);
    };

    const resetChargeForm = () => {
        setChargeForm({
            provider: "",
            beneficiary_name: "",
            description: "",
            amount: "",
            invoice_number: "",
            ccf: "",
            transaction_date: getTodayDate(),
            customer_iva_type: "no_sujeto",
            notes: "",
        });
        setChargeFile(null);
        setIsEditing(false);
        setEditingId(null);
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
                        onClick={() => {
                            resetDirectCostForm();
                            resetChargeForm();
                            setShowAddCostModal(true);
                        }}
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
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex gap-2 text-sm text-slate-700">
                            <Package className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-slate-900">Costos Directos:</strong>{" "}
                                Facturas de proveedor revendidas al cliente con margen. Deben vincularse a servicios.
                            </div>
                        </div>
                    </div>

                    {providerInvoices.length > 0 && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Costo Total</div>
                                <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">{formatCurrency(directCostTotals.totalCost)}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Venta Estimada</div>
                                <div className="text-lg font-bold text-emerald-600 tabular-nums mt-1">{formatCurrency(directCostTotals.totalSale)}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Ganancia Bruta</div>
                                <div className="text-lg font-bold text-blue-600 tabular-nums mt-1">{formatCurrency(directCostTotals.profit)}</div>
                            </div>
                            <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Por Asignar</div>
                                <div className="text-lg font-bold text-slate-400 tabular-nums mt-1">{formatCurrency(directCostTotals.unallocated)}</div>
                            </div>
                        </div>
                    )}

                    {providerInvoices.length === 0 ? (
                        <EmptyState icon={Package} title="Sin costos directos" description="No hay facturas de proveedor registradas" />
                    ) : (
                        <div className="space-y-2">
                            {providerInvoices.map((invoice) => (
                                <div key={invoice.id} className="border border-slate-200 rounded bg-white overflow-hidden shadow-sm">
                                    <div
                                        className="flex items-center justify-between px-4 py-3 bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => toggleExpanded(invoice.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            {expandedInvoice === invoice.id ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                                            <div className="p-1.5 bg-white border border-slate-200 rounded-md">
                                                <Building className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900 font-mono uppercase">{invoice.invoice_number}</div>
                                                <div className="text-[11px] text-slate-500 font-medium uppercase tracking-wide flex items-center gap-2">
                                                    <span>{invoice.provider_name}</span>
                                                    {invoice.notes && (
                                                        <>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="normal-case text-slate-400 italic font-normal truncate max-w-[300px]">{invoice.notes}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right mr-2">
                                                <div className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(invoice.total_amount)}</div>
                                                <div className="text-[10px] text-slate-400 font-medium">{invoice.issue_date}</div>
                                            </div>
                                            {getStatusBadge(invoice.status)}
                                        </div>
                                    </div>

                                    {expandedInvoice === invoice.id && (
                                        <div className="border-t border-slate-200 p-4 animate-in slide-in-from-top-2 duration-200">
                                            <div className="mb-5 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">
                                                    <span>Asignado: <span className="text-slate-900">{formatCurrency(invoice.allocated_amount)}</span></span>
                                                    <span>Disponible: <span className="text-emerald-600">{formatCurrency(invoice.unallocated_amount)}</span></span>
                                                </div>
                                                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                    <div className="h-full bg-slate-900 rounded-full transition-all duration-500" style={{ width: `${(invoice.allocated_amount / invoice.total_amount) * 100}%` }} />
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-4">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                    <Link2 className="w-3 h-3" /> Desglose de Servicios
                                                </div>
                                                {invoice.allocations && invoice.allocations.filter(a => !a.is_deleted).length > 0 ? (
                                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                                        <table className="w-full text-xs">
                                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                                <tr>
                                                                    <th className="text-left py-2 px-3 font-bold text-slate-600 uppercase tracking-wider">Servicio</th>
                                                                    <th className="text-right py-2 px-3 font-bold text-slate-600 uppercase tracking-wider">Costo</th>
                                                                    <th className="text-right py-2 px-3 font-bold text-slate-600 uppercase tracking-wider">Venta</th>
                                                                    <th className="text-right py-2 px-3 font-bold text-slate-600 uppercase tracking-wider">Margen</th>
                                                                    <th className="w-10"></th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                                {invoice.allocations.filter(a => !a.is_deleted).map((alloc) => (
                                                                    <tr key={alloc.id} className="hover:bg-slate-50 transition-colors">
                                                                        <td className="py-2 px-3">
                                                                            <div className="font-semibold text-slate-800">{alloc.order_charge_service_name}</div>
                                                                            {alloc.description && <div className="text-[10px] text-slate-500 italic">{alloc.description}</div>}
                                                                        </td>
                                                                        <td className="py-2 px-3 text-right font-medium text-slate-600 tabular-nums">{formatCurrency(alloc.cost_amount)}</td>
                                                                        <td className="py-2 px-3 text-right font-bold text-emerald-600 tabular-nums">{formatCurrency(alloc.sale_price)}</td>
                                                                        <td className="py-2 px-3 text-right">
                                                                            <Badge variant={alloc.profit >= 0 ? "success" : "danger"} size="xs" className="font-bold tabular-nums">
                                                                                {alloc.margin_percentage?.toFixed(1)}%
                                                                            </Badge>
                                                                        </td>
                                                                        {!isClosed && (
                                                                            <td className="py-2 px-3 text-right">
                                                                                {!alloc.is_billed && (
                                                                                    <button 
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setConfirmDialog({
                                                                                                open: true,
                                                                                                type: "allocation",
                                                                                                id: alloc.id,
                                                                                                message: "El costo será desvinculado del servicio."
                                                                                            });
                                                                                        }}
                                                                                        className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                                                                    >
                                                                                        <Unlink className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                        )}
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <div className="text-center py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                                                        <p className="text-xs text-slate-500 font-medium">No hay servicios vinculados a este costo aún</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Acciones */}
                                            {!isClosed && (
                                                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                                                    {(() => {
                                                        const isLockedByBilling = invoice.status === 'facturado' || 
                                                            (invoice.allocations && invoice.allocations.some(a => !a.is_deleted && a.is_billed));
                                                        
                                                        return (
                                                            <>
                                                                <div className="flex gap-2">
                                                                    {parseFloat(invoice.unallocated_amount) > 0 && (
                                                                        <Button
                                                                            variant="secondary"
                                                                            size="xs"
                                                                            onClick={() => openAllocateModal(invoice)}
                                                                            className="gap-1.5 h-8 font-bold uppercase tracking-wide px-3"
                                                                            disabled={isLockedByBilling}
                                                                        >
                                                                            <Link2 className="w-3 h-3" /> Vincular Servicio
                                                                        </Button>
                                                                    )}
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="xs"
                                                                        onClick={() => handleOpenEditDirectCost(invoice)}
                                                                        className="text-slate-600 hover:text-slate-900 h-8"
                                                                        disabled={isLockedByBilling}
                                                                    >
                                                                        <Edit className="w-3.5 h-3.5 mr-1.5" /> Editar
                                                                    </Button>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="xs"
                                                                    onClick={() => setConfirmDialog({
                                                                        open: true,
                                                                        type: "invoice",
                                                                        id: invoice.id,
                                                                        message: "La factura y sus asignaciones serán eliminadas."
                                                                    })}
                                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8"
                                                                    disabled={isLockedByBilling}
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Eliminar
                                                                </Button>
                                                            </>
                                                        );
                                                    })()}
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
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="flex gap-2 text-sm text-slate-700">
                            <Receipt className="w-4 h-4 text-slate-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <strong className="text-slate-900">Cargos a Clientes:</strong>{" "}
                                Gastos facturados a nombre del cliente. Se cobran al costo sin margen de ganancia.
                            </div>
                        </div>
                    </div>

                    {clientCharges.length > 0 && (
                        <div className="bg-white border border-slate-200 rounded-lg p-3 w-fit shadow-sm">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Reembolsos</div>
                            <div className="text-lg font-bold text-slate-900 tabular-nums mt-0.5">{formatCurrency(clientChargeTotals.total)}</div>
                        </div>
                    )}

                    {clientCharges.length === 0 ? (
                        <EmptyState icon={Receipt} title="Sin cargos a clientes" description="No hay reembolsos registrados" />
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-wider">Concepto</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-wider">Proveedor</th>
                                        <th className="text-left py-3 px-4 font-bold text-slate-600 uppercase tracking-wider">Factura</th>
                                        <th className="text-right py-3 px-4 font-bold text-slate-600 uppercase tracking-wider">Monto</th>
                                        <th className="text-center py-3 px-4 font-bold text-slate-600 uppercase tracking-wider">Estado</th>
                                        {!isClosed && <th className="w-24"></th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {clientCharges.map((charge) => (
                                        <tr key={charge.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-800">{charge.description}</div>
                                                <div className="text-[10px] text-slate-400 font-medium mt-0.5">{charge.transaction_date}</div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 font-medium">{charge.provider_name}</td>
                                            <td className="py-3 px-4 text-slate-500 font-mono">{charge.invoice_number || "—"}</td>
                                            <td className="py-3 px-4 text-right font-bold text-slate-900 tabular-nums">{formatCurrency(charge.amount)}</td>
                                            <td className="py-3 px-4 text-center">{getStatusBadge(charge.billing_status || charge.status)}</td>
                                            {!isClosed && (
                                                <td className="py-3 px-4">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() => handleOpenEditCharge(charge)}
                                                            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-md transition-colors"
                                                            disabled={charge.billing_status === 'facturado'}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDialog({
                                                                open: true,
                                                                type: "charge",
                                                                id: charge.id,
                                                                message: "Se eliminará este cargo a cliente."
                                                            })}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md transition-colors"
                                                            disabled={charge.billing_status === 'facturado'}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
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

            {/* Modal Agregar/Editar Costo */}
            <Modal
                isOpen={showAddCostModal}
                onClose={() => {
                    setShowAddCostModal(false);
                    resetDirectCostForm();
                    resetChargeForm();
                }}
                title={isEditing
                    ? (activeSubTab === "direct" ? "Editar Costo Directo" : "Editar Cargo a Cliente")
                    : (activeSubTab === "direct" ? "Registrar Costo Directo" : "Registrar Cargo a Cliente")
                }
                size="2xl"
            >
                <div className="space-y-6">
                    <div className="relative overflow-hidden bg-slate-50 border border-slate-200 rounded-lg">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-900" />
                        <div className="p-4 flex items-center gap-3">
                            <div className="flex-shrink-0 w-8 h-8 rounded-md bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                {activeSubTab === "direct" ? <Package className="w-4 h-4 text-slate-600" /> : <Receipt className="w-4 h-4 text-slate-600" />}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 uppercase tracking-widest">
                                    {activeSubTab === "direct" ? "Costo Directo de OS" : "Cargo Reembolsable a Cliente"}
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    {activeSubTab === "direct" 
                                        ? "Factura de proveedor que será vinculada a servicios específicos."
                                        : "Gasto pagado a nombre del cliente que se cobrará al costo neto."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {activeSubTab === "direct" && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-400" /> Detalle Financiero
                                </h4>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Proveedor <span className="text-red-500">*</span></Label>
                                        <Select
                                            value={directCostForm.provider}
                                            onChange={(val) => setDirectCostForm({ ...directCostForm, provider: val })}
                                            options={providers}
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                            searchable
                                            placeholder="Seleccione proveedor..."
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="sm:col-span-2">
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Concepto / Descripción <span className="text-red-500">*</span></Label>
                                            <Input
                                                value={directCostForm.notes}
                                                onChange={(e) => setDirectCostForm({ ...directCostForm, notes: e.target.value })}
                                                placeholder="Ej: Flete Marítimo, Cuadrilla..."
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Monto Solicitado <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={directCostForm.total_amount}
                                                    onChange={(e) => setDirectCostForm({ ...directCostForm, total_amount: e.target.value })}
                                                    placeholder="0.00"
                                                    className="pl-7 font-mono font-bold text-slate-900"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Fecha de Emisión</Label>
                                            <Input type="date" value={directCostForm.issue_date} onChange={(e) => setDirectCostForm({ ...directCostForm, issue_date: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" /> Documentación de Soporte
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">N° Factura <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={directCostForm.invoice_number}
                                            onChange={(e) => setDirectCostForm({ ...directCostForm, invoice_number: e.target.value })}
                                            placeholder="Ej: FAC-001"
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">Adjuntar Archivo</Label>
                                        <FileUpload
                                            accept=".pdf,.jpg,.jpeg,.png"
                                            onFileChange={(file) => setDirectCostFile(file)}
                                            helperText="PDF, JPG o PNG - Máx. 5MB"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === "charges" && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <div className="w-1 h-1 rounded-full bg-slate-400" /> Detalle del Reembolso
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Proveedor <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={chargeForm.provider}
                                                onChange={(val) => setChargeForm({ ...chargeForm, provider: val })}
                                                options={providers}
                                                getOptionLabel={(opt) => opt.name}
                                                getOptionValue={(opt) => opt.id}
                                                searchable
                                                placeholder="Seleccione proveedor..."
                                            />
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Beneficiario (Si aplica)</Label>
                                            <Input
                                                value={chargeForm.beneficiary_name}
                                                onChange={(e) => setChargeForm({ ...chargeForm, beneficiary_name: e.target.value })}
                                                placeholder="Nombre del beneficiario"
                                            />
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Concepto del Cargo <span className="text-red-500">*</span></Label>
                                        <Input value={chargeForm.description} onChange={(e) => setChargeForm({ ...chargeForm, description: e.target.value })} placeholder="Ej: Pago de muelle..." />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Monto <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                                <Input type="number" step="0.01" value={chargeForm.amount} onChange={(e) => setChargeForm({ ...chargeForm, amount: e.target.value })} placeholder="0.00" className="pl-7 font-mono font-bold text-slate-900" />
                                            </div>
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Fecha</Label>
                                            <Input type="date" value={chargeForm.transaction_date} onChange={(e) => setChargeForm({ ...chargeForm, transaction_date: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block text-xs font-bold text-slate-700 uppercase tracking-wide">Tratamiento IVA</Label>
                                            <Select
                                                value={chargeForm.customer_iva_type}
                                                onChange={(val) => setChargeForm({ ...chargeForm, customer_iva_type: val })}
                                                options={[{ value: "no_sujeto", label: "No Sujeto" }, { value: "gravado", label: "Gravado (13%)" }]}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
                                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <Receipt className="w-3.5 h-3.5" /> Documentación de Soporte
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">N° Factura / CCF</Label>
                                        <Input value={chargeForm.invoice_number} onChange={(e) => setChargeForm({ ...chargeForm, invoice_number: e.target.value })} placeholder="Opcional" className="font-mono text-sm" />
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-xs font-bold text-slate-600 uppercase tracking-wide">Adjuntar Archivo</Label>
                                        <FileUpload accept=".pdf,.jpg,.jpeg,.png" onFileChange={(file) => setChargeFile(file)} helperText="PDF, JPG o PNG - Máx. 5MB" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <ModalFooter className="mt-6 border-t pt-4">
                    <Button type="button" variant="ghost" onClick={() => setShowAddCostModal(false)} className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Cancelar</Button>
                    <Button type="button" onClick={activeSubTab === "direct" ? handleSaveDirectCost : handleSaveClientCharge} className="bg-slate-900 hover:bg-black text-white shadow-lg shadow-slate-200 px-8 h-10 font-bold uppercase tracking-widest text-[10px]">
                        {isEditing ? "Guardar Cambios" : "Registrar Costo"}
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal Vincular a Servicio */}
            <Modal isOpen={showAllocateModal && !!selectedInvoice} onClose={() => setShowAllocateModal(false)} title="Vincular a Servicio" size="md">
                {selectedInvoice && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="text-xs text-slate-500 mb-1">Factura Seleccionada</div>
                        <div className="font-semibold text-slate-900">{selectedInvoice.invoice_number}</div>
                        <div className="text-sm text-slate-600 mt-0.5">Disponible: <span className="font-medium text-emerald-600">{formatCurrency(selectedInvoice.unallocated_amount)}</span></div>
                    </div>
                )}
                <div className="space-y-5">
                    <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">Servicio a Vincular <span className="text-red-600">*</span></Label>
                        <Select value={allocateForm.order_charge_id} onChange={(val) => setAllocateForm({ ...allocateForm, order_charge_id: val })} options={availableCharges} getOptionLabel={(opt) => `${opt.service_name} - ${formatCurrency(opt.subtotal)}`} getOptionValue={(opt) => opt.id} placeholder="Seleccione servicio..." />
                        {availableCharges.length === 0 && (
                            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700">No hay servicios disponibles. Agregue servicios primero.</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">Costo a Asignar <span className="text-red-600">*</span></Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">$</span>
                            <Input type="number" step="0.01" value={allocateForm.cost_amount} onChange={(e) => setAllocateForm({ ...allocateForm, cost_amount: e.target.value })} placeholder="0.00" className="pl-8" />
                        </div>
                    </div>
                    <div>
                        <Label className="mb-1.5 block text-sm font-medium text-slate-700">Descripción</Label>
                        <Input value={allocateForm.description} onChange={(e) => setAllocateForm({ ...allocateForm, description: e.target.value })} placeholder="Ej: Cuadrilla portuaria" />
                    </div>
                </div>
                <ModalFooter>
                    <Button type="button" variant="ghost" onClick={() => setShowAllocateModal(false)} className="text-slate-500 font-semibold">Cancelar</Button>
                    <Button type="button" onClick={handleAllocateCost} disabled={availableCharges.length === 0} className="bg-slate-900 hover:bg-slate-800 text-white min-w-[140px]">Vincular Servicio</Button>
                </ModalFooter>
            </Modal>

            {/* Confirm Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                title="Confirmar Eliminación"
                message={confirmDialog.message}
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
                onConfirm={() => {
                    if (confirmDialog.type === "invoice") handleDeleteDirectCost(confirmDialog.id);
                    else if (confirmDialog.type === "allocation") handleDeleteAllocation(confirmDialog.id);
                    else if (confirmDialog.type === "charge") handleDeleteClientCharge(confirmDialog.id);
                    setConfirmDialog({ open: false, type: null, id: null, message: "" });
                }}
                onCancel={() => setConfirmDialog({ open: false, type: null, id: null, message: "" })}
            />
        </div>
    );
};

export default CostsTab;