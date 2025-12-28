import React, { useState, useEffect, useCallback } from "react";
import {
    Edit2,
    Trash2,
    Check,
    X,
    AlertCircle,
    FileCheck,
    History,
    Plus,
    Package,
    Banknote,
    FileText,
    ExternalLink,
} from "lucide-react";
import { Button, Input, Badge, ConfirmDialog, Modal, ModalFooter, PromptDialog } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, formatDate } from "../lib/utils";

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

/**
 * InvoiceItemsEditor - Permite editar las líneas de una pre-factura
 * Solo funciona si la factura NO tiene DTE emitido
 */
const InvoiceItemsEditor = ({
    invoice,
    onUpdate,
    onDeleted,
    className = "",
}) => {
    const [editingItem, setEditingItem] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [saving, setSaving] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [showAddItems, setShowAddItems] = useState(false);
    const [availableItems, setAvailableItems] = useState([]);
    const [loadingAvailable, setLoadingAvailable] = useState(false);
    const [selectedItemsToAdd, setSelectedItemsToAdd] = useState([]);
    const [confirmRemove, setConfirmRemove] = useState(null); // {id, type, description}
    const [showDtePrompt, setShowDtePrompt] = useState(false);
    const [confirmDeletePayment, setConfirmDeletePayment] = useState(null); // {id, amount}

    const isEditable = invoice?.is_editable && !invoice?.is_dte_issued;

    const billedCharges = invoice?.billed_charges || [];
    const billedExpenses = invoice?.billed_expenses || [];
    const hasNoItems =
        billedCharges.length === 0 && billedExpenses.length === 0;

    const fetchAvailableItems = useCallback(async () => {
        if (!invoice?.id) return;
        try {
            setLoadingAvailable(true);
            const response = await axios.get(
                `/orders/invoices/${invoice.id}/available_items/`
            );
            setAvailableItems(response.data);
        } catch {
            toast.error("Error al cargar items disponibles");
        } finally {
            setLoadingAvailable(false);
        }
    }, [invoice?.id]);

    // Cargar items disponibles cuando se abre el panel
    useEffect(() => {
        if (showAddItems && invoice?.id) {
            fetchAvailableItems();
        }
    }, [showAddItems, invoice?.id, fetchAvailableItems]);

    const handleToggleItemToAdd = (item) => {
        const key = `${item.type}_${item.id}`;
        setSelectedItemsToAdd((prev) => {
            if (prev.includes(key)) {
                return prev.filter((k) => k !== key);
            } else {
                return [...prev, key];
            }
        });
    };

    const handleAddSelectedItems = async () => {
        if (selectedItemsToAdd.length === 0) {
            toast.error("Seleccione al menos un item");
            return;
        }

        const chargeIds = selectedItemsToAdd
            .filter((k) => k.startsWith("charge_"))
            .map((k) => parseInt(k.replace("charge_", "")));
        const transferIds = selectedItemsToAdd
            .filter((k) => k.startsWith("expense_"))
            .map((k) => parseInt(k.replace("expense_", "")));

        try {
            setSaving(true);
            await axios.post(`/orders/invoices/${invoice.id}/add_items/`, {
                charge_ids: chargeIds,
                transfer_ids: transferIds,
            });
            toast.success("Items agregados correctamente");
            setShowAddItems(false);
            setSelectedItemsToAdd([]);
            if (onUpdate) onUpdate();
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al agregar items"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleStartEdit = (item, type) => {
        setEditingItem({ ...item, type });
        if (type === "charge") {
            setEditForm({
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount: item.discount,
                applies_iva: item.applies_iva,
            });
        } else {
            setEditForm({
                amount: item.cost,
                markup_percentage: item.markup_percentage,
                applies_iva: item.applies_iva,
            });
        }
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
        setEditForm({});
    };

    const handleSaveCharge = async () => {
        if (!editingItem) return;

        try {
            setSaving(true);
            await axios.patch(`/orders/invoices/${invoice.id}/edit_charge/`, {
                charge_id: editingItem.id,
                ...editForm,
            });
            toast.success("Cargo actualizado correctamente");
            handleCancelEdit();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error updating charge:", error);
            toast.error(
                error.response?.data?.error || "Error al actualizar cargo"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleSaveExpense = async () => {
        if (!editingItem) return;

        try {
            setSaving(true);
            await axios.patch(`/orders/invoices/${invoice.id}/edit_expense/`, {
                transfer_id: editingItem.id,
                customer_markup_percentage: parseFloat(
                    editForm.markup_percentage || 0
                ),
                customer_applies_iva: editForm.applies_iva,
            });
            toast.success("Gasto actualizado correctamente");
            handleCancelEdit();
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error updating expense:", error);
            toast.error(
                error.response?.data?.error || "Error al actualizar gasto"
            );
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveItem = async (itemId, itemType) => {
        try {
            setSaving(true);
            const response = await axios.post(
                `/orders/invoices/${invoice.id}/remove_item/`,
                {
                    item_type: itemType === "charge" ? "charge" : "expense",
                    item_id: itemId,
                }
            );

            // Si la factura fue eliminada porque quedó vacía
            if (response.data.invoice_deleted) {
                toast.success(
                    "Pre-factura eliminada porque no tenía más items"
                );
                // Llamar callback de eliminación para cerrar modal y refrescar lista
                if (onDeleted) onDeleted();
            } else {
                toast.success("Item removido de la factura");
                if (onUpdate) onUpdate();
            }
        } catch (error) {
            console.error("Error removing item:", error);
            toast.error(error.response?.data?.error || "Error al remover item");
        } finally {
            setSaving(false);
            setConfirmRemove(null);
        }
    };

    const handleMarkAsDTE = () => {
        setShowDtePrompt(true);
    };

    const confirmMarkAsDTE = async (dteNumber) => {
        try {
            setSaving(true);
            await axios.post(`/orders/invoices/${invoice.id}/mark_as_dte/`, {
                dte_number: dteNumber,
            });
            toast.success("Factura marcada como DTE emitido");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error marking as DTE:", error);
            toast.error(
                error.response?.data?.error || "Error al marcar como DTE"
            );
        } finally {
            setSaving(false);
            setShowDtePrompt(false);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await axios.get(
                `/orders/invoices/${invoice.id}/edit_history/`
            );
            setHistory(response.data);
            setShowHistory(true);
        } catch {
            toast.error("Error al cargar historial");
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleDeletePayment = async (paymentId) => {
        try {
            setSaving(true);
            await axios.delete(`/orders/invoice-payments/${paymentId}/`);
            toast.success("Pago eliminado correctamente");
            if (onUpdate) onUpdate();
        } catch {
            // El interceptor de axios ya muestra el toast de error
        } finally {
            setSaving(false);
            setConfirmDeletePayment(null);
        }
    };

    if (!invoice) return null;

    // Common input styles for editing rows
    const editInputClass =
        "h-9 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-right flex items-center justify-center";

    return (
        <div className={`space-y-4 ${className}`}>
            <PromptDialog
                open={showDtePrompt}
                onClose={() => setShowDtePrompt(false)}
                onConfirm={confirmMarkAsDTE}
                title="Marcar como DTE Emitido"
                description="Ingrese el número de DTE o Documento Tributario Electrónico emitido. Una vez marcado, la factura no podrá ser editada."
                label="Número de DTE"
                placeholder="Ej: DTE-12345678"
                confirmText="Confirmar Emisión"
                cancelText="Cancelar"
            />

            {/* Header con estado de editabilidad */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">
                        Items Facturados
                    </h4>
                    {invoice.is_dte_issued ? (
                        <Badge variant="success" className="text-xs">
                            <FileCheck className="h-3 w-3 mr-1" />
                            DTE Emitido{" "}
                            {invoice.dte_number && `(${invoice.dte_number})`}
                        </Badge>
                    ) : (
                        <Badge variant="warning" className="text-xs">
                            Pre-factura (Editable)
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {/* Ver PDF de la factura */}
                    {invoice.pdf_file && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(invoice.pdf_file, "_blank")}
                        >
                            <FileText className="h-4 w-4 mr-1" />
                            Ver PDF
                        </Button>
                    )}
                    {isEditable && !hasNoItems && !showAddItems && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAddItems(true)}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar Items
                        </Button>
                    )}
                    {isEditable && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleMarkAsDTE}
                            disabled={saving}
                        >
                            <FileCheck className="h-4 w-4 mr-1" />
                            Marcar como DTE Emitido
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchHistory}
                        disabled={loadingHistory}
                    >
                        <History className="h-4 w-4 mr-1" />
                        Historial
                    </Button>
                </div>
            </div>

            {/* Panel para agregar items - mostrar si está activo */}
            {showAddItems && (
                <div className="border border-slate-200 bg-slate-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-slate-700 flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Agregar Items a la Factura
                        </h5>
                        <button
                            onClick={() => {
                                setShowAddItems(false);
                                setSelectedItemsToAdd([]);
                            }}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {loadingAvailable ? (
                        <div className="text-center py-4 text-slate-500">
                            Cargando items disponibles...
                        </div>
                    ) : availableItems.length === 0 ? (
                        <div className="text-center py-4 text-slate-500">
                            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-slate-400" />
                            No hay más items disponibles para agregar
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2 max-h-60 overflow-y-auto mb-3">
                                {availableItems.map((item) => {
                                    const key = `${item.type}_${item.id}`;
                                    const isSelected =
                                        selectedItemsToAdd.includes(key);
                                    return (
                                        <label
                                            key={key}
                                            className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "bg-white border-blue-500 ring-1 ring-blue-500"
                                                    : "bg-white border-slate-200 hover:border-slate-300"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() =>
                                                    handleToggleItemToAdd(item)
                                                }
                                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant={
                                                            item.type ===
                                                            "charge"
                                                                ? "default"
                                                                : "secondary"
                                                        }
                                                        className="text-xs"
                                                    >
                                                        {item.type === "charge"
                                                            ? "Servicio"
                                                            : "Gasto"}
                                                    </Badge>
                                                    <span className="font-medium text-slate-900 truncate">
                                                        {item.description}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold text-slate-900">
                                                    {formatCurrency(item.total)}
                                                </div>
                                                {item.iva > 0 && (
                                                    <div className="text-xs text-slate-500">
                                                        IVA:{" "}
                                                        {formatCurrency(
                                                            item.iva
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                <span className="text-sm text-slate-600">
                                    {selectedItemsToAdd.length} item(s)
                                    seleccionado(s)
                                </span>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setShowAddItems(false);
                                            setSelectedItemsToAdd([]);
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleAddSelectedItems}
                                        disabled={
                                            saving ||
                                            selectedItemsToAdd.length === 0
                                        }
                                    >
                                        <Plus className="h-4 w-4 mr-1" />
                                        Agregar Seleccionados
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Servicios */}
            {billedCharges.length > 0 && (
                <div>
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Servicios ({billedCharges.length})
                    </h5>
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                        Servicio
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-16">
                                        Cant.
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-24">
                                        Precio
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-20">
                                        Desc.
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase w-16">
                                        IVA
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-28">
                                        Total
                                    </th>
                                    {isEditable && (
                                        <th className="px-3 py-2 w-20"></th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {billedCharges.map((charge) => (
                                    <tr
                                        key={charge.id}
                                        className="hover:bg-slate-50 group"
                                    >
                                        {editingItem?.id === charge.id &&
                                        editingItem?.type === "charge" ? (
                                            <>
                                                <td className="px-3 py-2 text-left align-middle">
                                                    <div className="font-medium text-slate-800 text-sm">
                                                        {charge.service_name}
                                                    </div>
                                                    {charge.description && (
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {charge.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <div className="flex justify-end">
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            step="1"
                                                            className={`${editInputClass} w-16`}
                                                            value={
                                                                editForm.quantity
                                                            }
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || (/^\d+$/.test(val) && parseInt(val) > 0)) {
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        quantity: val,
                                                                    })
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <div className="flex justify-end">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0.01"
                                                            className={`${editInputClass} w-24`}
                                                            value={
                                                                editForm.unit_price
                                                            }
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === '' || parseFloat(val) >= 0) {
                                                                    setEditForm({
                                                                        ...editForm,
                                                                        unit_price: val,
                                                                    })
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <div className="flex justify-end">
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                className={`${editInputClass} w-20 pr-5`}
                                                                value={
                                                                    editForm.discount
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (
                                                                        val === "" ||
                                                                        (parseFloat(val) >= 0 && parseFloat(val) <= 100)
                                                                    ) {
                                                                        setEditForm({
                                                                            ...editForm,
                                                                            discount: val,
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                            <span className="absolute right-1.5 top-2.5 text-[10px] text-slate-400">%</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            editForm.applies_iva
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                applies_iva:
                                                                    e.target
                                                                        .checked,
                                                            })
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mx-auto"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-400 align-middle text-sm tabular-nums">
                                                    —
                                                </td>
                                                <td className="px-3 py-2 align-middle">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={
                                                                handleSaveCharge
                                                            }
                                                            disabled={saving}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                            title="Guardar"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={
                                                                handleCancelEdit
                                                            }
                                                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2 text-left align-middle">
                                                    <div className="font-medium text-slate-900 text-sm">
                                                        {charge.service_name}
                                                    </div>
                                                    {charge.description && (
                                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                                            {charge.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-slate-700 align-middle text-sm">
                                                    {charge.quantity}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-slate-700 align-middle text-sm">
                                                    {formatCurrency(
                                                        charge.unit_price
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-slate-500 align-middle text-sm">
                                                    {charge.discount > 0 ? `${charge.discount}%` : "-"}
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    {charge.applies_iva ? (
                                                        <span className="text-emerald-600 font-bold text-xs">
                                                            ✓
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900 align-middle text-sm">
                                                    {formatCurrency(
                                                        charge.total
                                                    )}
                                                </td>
                                                {isEditable && (
                                                    <td className="px-3 py-2 align-middle">
                                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                                            <button
                                                                onClick={() =>
                                                                    handleStartEdit(
                                                                        charge,
                                                                        "charge"
                                                                    )
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmRemove(
                                                                        {
                                                                            id: charge.id,
                                                                            type: "charge",
                                                                            description:
                                                                                charge.service_name,
                                                                        }
                                                                    )
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Quitar de factura"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Gastos */}
            {billedExpenses.length > 0 && (
                <div>
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                        Gastos ({billedExpenses.length})
                    </h5>
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                        Descripción
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-32">
                                        Costo
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-28">
                                        Margen
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase w-12">
                                        IVA
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-32">
                                        Total
                                    </th>
                                    {isEditable && (
                                        <th className="px-3 py-2 w-20"></th>
                                    )}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {billedExpenses.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="hover:bg-slate-50 group"
                                    >
                                        {editingItem?.id === expense.id &&
                                        editingItem?.type === "expense" ? (
                                            <>
                                                <td className="px-3 py-2 text-left align-middle">
                                                    <div className="font-medium text-slate-800 text-sm">
                                                        {expense.description}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {expense.provider_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <div className="flex justify-end">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className={`${editInputClass} w-32 bg-slate-50 opacity-70 cursor-not-allowed`}
                                                            value={editForm.amount}
                                                            readOnly
                                                            disabled
                                                        />
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 align-middle text-right">
                                                    <div className="flex justify-end">
                                                        <div className="relative">
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                step="0.01"
                                                                className={`${editInputClass} w-28 pr-6`}
                                                                value={
                                                                    editForm.markup_percentage
                                                                }
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    if (val === '' || parseFloat(val) >= 0) {
                                                                        setEditForm({
                                                                            ...editForm,
                                                                            markup_percentage: val,
                                                                        });
                                                                    }
                                                                }}
                                                            />
                                                            <span className="absolute right-2 top-2.5 text-xs text-slate-400">
                                                                %
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            editForm.applies_iva
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                applies_iva:
                                                                    e.target
                                                                        .checked,
                                                            })
                                                        }
                                                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 mx-auto"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-400 align-middle text-sm tabular-nums">
                                                    —
                                                </td>
                                                <td className="px-3 py-2 align-middle">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            onClick={
                                                                handleSaveExpense
                                                            }
                                                            disabled={saving}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                                                            title="Guardar"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={
                                                                handleCancelEdit
                                                            }
                                                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded transition-colors"
                                                            title="Cancelar"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2 text-left align-middle">
                                                    <div className="font-medium text-slate-900 text-sm">
                                                        {expense.description}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 mt-0.5">
                                                        {expense.provider_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-slate-700 align-middle text-sm">
                                                    {formatCurrency(
                                                        expense.cost
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums text-slate-700 align-middle text-sm">
                                                    {expense.markup_percentage}%
                                                </td>
                                                <td className="px-3 py-2 text-center align-middle">
                                                    {expense.applies_iva ? (
                                                        <span className="text-emerald-600 font-bold text-xs">
                                                            ✓
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300 text-xs">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900 align-middle text-sm">
                                                    {formatCurrency(
                                                        expense.total
                                                    )}
                                                </td>
                                                {isEditable && (
                                                    <td className="px-3 py-2 align-middle">
                                                        <div className="flex items-center justify-end gap-1 transition-opacity">
                                                            <button
                                                                onClick={() =>
                                                                    handleStartEdit(
                                                                        expense,
                                                                        "expense"
                                                                    )
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setConfirmRemove(
                                                                        {
                                                                            id: expense.id,
                                                                            type: "expense",
                                                                            description:
                                                                                expense.description,
                                                                        }
                                                                    )
                                                                }
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                title="Quitar de factura"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagos Recibidos */}
            {invoice.payments && invoice.payments.length > 0 && (
                <div>
                    <h5 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Banknote className="h-3.5 w-3.5" />
                        Pagos Recibidos ({invoice.payments.length})
                    </h5>
                    <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50/80">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                        Fecha
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                        Método
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                        Banco
                                    </th>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">
                                        Referencia
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 uppercase w-28">
                                        Monto
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 uppercase w-24">
                                        Comprobante
                                    </th>
                                    <th className="px-3 py-2 w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {invoice.payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-slate-50 group">
                                        <td className="px-3 py-2 text-slate-700 text-sm">
                                            {formatDateSafe(payment.payment_date)}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 text-sm capitalize">
                                            {payment.payment_method === 'transferencia' ? 'Transferencia' :
                                             payment.payment_method === 'efectivo' ? 'Efectivo' :
                                             payment.payment_method === 'cheque' ? 'Cheque' :
                                             payment.payment_method === 'deposito' ? 'Depósito' :
                                             payment.payment_method === 'tarjeta' ? 'Tarjeta' :
                                             payment.payment_method || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-slate-700 text-sm">
                                            {payment.bank_name || "—"}
                                        </td>
                                        <td className="px-3 py-2 text-slate-600 text-sm font-mono">
                                            {payment.reference_number || "—"}
                                            {payment.notes && (
                                                <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                                                    {payment.notes}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-right font-semibold tabular-nums text-emerald-600 text-sm">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {payment.receipt_file ? (
                                                <button
                                                    onClick={() => window.open(payment.receipt_file, "_blank")}
                                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                                                    title="Ver comprobante"
                                                >
                                                    <FileText className="h-3.5 w-3.5" />
                                                    <ExternalLink className="h-3 w-3" />
                                                </button>
                                            ) : (
                                                <span className="text-slate-300 text-xs">—</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button
                                                onClick={() => setConfirmDeletePayment({ id: payment.id, amount: payment.amount })}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                title="Eliminar pago"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* No items - Show add button */}
            {hasNoItems && !showAddItems && (
                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Package className="h-10 w-10 mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-600 mb-1">
                        No hay items facturados
                    </p>
                    <p className="text-sm text-slate-400 mb-4">
                        Esta factura no tiene servicios ni gastos vinculados
                    </p>
                    {isEditable && (
                        <Button
                            size="sm"
                            onClick={() => setShowAddItems(true)}
                            className="bg-slate-800 hover:bg-slate-900 text-white"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar Items de la OS
                        </Button>
                    )}
                </div>
            )}

            {/* History Modal */}
            <Modal
                isOpen={showHistory}
                onClose={() => setShowHistory(false)}
                title="Historial de Cambios"
                size="lg"
            >
                <div className="p-1">
                    {history.length === 0 ? (
                        <p className="text-center text-slate-500 py-8">
                            No hay cambios registrados
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {history.map((h) => (
                                <div
                                    key={h.id}
                                    className="relative pl-4 border-l-2 border-slate-200 pb-1"
                                >
                                    <div className="absolute -left-[5px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-slate-500">
                                            {new Date(
                                                h.created_at
                                            ).toLocaleString()}
                                        </span>
                                        <Badge
                                            variant="outline"
                                            className="text-[10px] px-1.5 py-0"
                                        >
                                            {h.user}
                                        </Badge>
                                    </div>
                                    <p className="text-sm text-slate-700 font-medium">
                                        {h.edit_type_display}
                                    </p>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                        {h.description}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <ModalFooter>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(false)}
                    >
                        Cerrar
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Confirm Remove Item Dialog */}
            <ConfirmDialog
                open={!!confirmRemove}
                onClose={() => setConfirmRemove(null)}
                onConfirm={() =>
                    handleRemoveItem(confirmRemove?.id, confirmRemove?.type)
                }
                title="¿Quitar item de la factura?"
                description={
                    billedCharges.length + billedExpenses.length === 1
                        ? `Al quitar "${confirmRemove?.description}" la pre-factura quedará vacía y será eliminada automáticamente. El item volverá a estar disponible para facturar.`
                        : `El item "${confirmRemove?.description}" será removido de la factura y volverá a estar disponible para facturar.`
                }
                confirmText={
                    billedCharges.length + billedExpenses.length === 1
                        ? "Quitar y Eliminar Factura"
                        : "Quitar Item"
                }
                cancelText="Cancelar"
                variant="warning"
            />

            {/* Confirm Delete Payment Dialog */}
            <ConfirmDialog
                open={!!confirmDeletePayment}
                onClose={() => setConfirmDeletePayment(null)}
                onConfirm={() => handleDeletePayment(confirmDeletePayment?.id)}
                title="¿Eliminar pago?"
                description={`Se eliminará el pago de ${formatCurrency(confirmDeletePayment?.amount || 0)}. El saldo de la factura será recalculado automáticamente.`}
                confirmText="Eliminar Pago"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default InvoiceItemsEditor;