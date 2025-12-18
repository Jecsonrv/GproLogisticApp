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
} from "lucide-react";
import { Button, Input, Badge } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";

/**
 * InvoiceItemsEditor - Permite editar las líneas de una pre-factura
 * Solo funciona si la factura NO tiene DTE emitido
 */
const InvoiceItemsEditor = ({ invoice, onUpdate, className = "" }) => {
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
                description: item.description || "",
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
                amount: parseFloat(editForm.amount),
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
        if (
            !window.confirm(
                "¿Está seguro de quitar este item de la factura? Volverá a estar disponible para facturar."
            )
        ) {
            return;
        }

        try {
            setSaving(true);
            await axios.post(`/orders/invoices/${invoice.id}/remove_item/`, {
                item_type: itemType === "charge" ? "charge" : "expense",
                item_id: itemId,
            });
            toast.success("Item removido de la factura");
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error removing item:", error);
            toast.error(error.response?.data?.error || "Error al remover item");
        } finally {
            setSaving(false);
        }
    };

    const handleMarkAsDTE = async () => {
        const dteNumber = window.prompt(
            "Ingrese el número de DTE emitido (opcional):",
            ""
        );
        if (dteNumber === null) return; // Cancelled

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

    if (!invoice) return null;

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Header con estado de editabilidad */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-700">
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
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchHistory}
                        disabled={loadingHistory}
                    >
                        <History className="h-4 w-4 mr-1" />
                        Historial
                    </Button>
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
                </div>
            </div>

            {/* Panel para agregar items - mostrar si está activo */}
            {showAddItems && (
                <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4">
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
                                            className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                                                isSelected
                                                    ? "bg-blue-100 border-blue-300"
                                                    : "bg-white border-slate-200 hover:bg-slate-50"
                                            }`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() =>
                                                    handleToggleItemToAdd(item)
                                                }
                                                className="h-4 w-4 rounded border-slate-300"
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
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Servicios ({billedCharges.length})
                    </h5>
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                                        Servicio
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-16">
                                        Cant.
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-24">
                                        Precio
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-20">
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
                                        className="hover:bg-slate-50/50"
                                    >
                                        {editingItem?.id === charge.id &&
                                        editingItem?.type === "charge" ? (
                                            <>
                                                <td className="px-3 py-2">
                                                    <span className="font-medium">
                                                        {charge.service_name}
                                                    </span>
                                                    <Input
                                                        className="mt-1 h-7 text-xs"
                                                        value={
                                                            editForm.description
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                description:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="Descripción"
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        className="h-7 w-14 text-xs text-right"
                                                        value={
                                                            editForm.quantity
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                quantity:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-7 w-20 text-xs text-right"
                                                        value={
                                                            editForm.unit_price
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                unit_price:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-500">
                                                    -
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={
                                                                handleSaveCharge
                                                            }
                                                            disabled={saving}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={
                                                                handleCancelEdit
                                                            }
                                                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-900">
                                                        {charge.service_name}
                                                    </div>
                                                    {charge.description && (
                                                        <div className="text-xs text-slate-500">
                                                            {charge.description}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {charge.quantity}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {formatCurrency(
                                                        charge.unit_price
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium tabular-nums">
                                                    {formatCurrency(
                                                        charge.total
                                                    )}
                                                </td>
                                                {isEditable && (
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() =>
                                                                    handleStartEdit(
                                                                        charge,
                                                                        "charge"
                                                                    )
                                                                }
                                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveItem(
                                                                        charge.id,
                                                                        "charge"
                                                                    )
                                                                }
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Gastos ({billedExpenses.length})
                    </h5>
                    <div className="border border-slate-200 rounded-md overflow-hidden">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">
                                        Descripción
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-20">
                                        Costo
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-16">
                                        Margen
                                    </th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-slate-600 w-12">
                                        IVA
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-slate-600 w-20">
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
                                        className="hover:bg-slate-50/50"
                                    >
                                        {editingItem?.id === expense.id &&
                                        editingItem?.type === "expense" ? (
                                            <>
                                                <td className="px-3 py-2">
                                                    <span className="font-medium">
                                                        {expense.description}
                                                    </span>
                                                    <div className="text-xs text-slate-500">
                                                        {expense.provider_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        className="h-7 w-20 text-xs text-right"
                                                        value={editForm.amount}
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                amount: e.target
                                                                    .value,
                                                            })
                                                        }
                                                    />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Input
                                                        type="number"
                                                        className="h-7 w-14 text-xs text-right"
                                                        value={
                                                            editForm.markup_percentage
                                                        }
                                                        onChange={(e) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                markup_percentage:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        placeholder="%"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-center">
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
                                                        className="h-4 w-4"
                                                    />
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-500">
                                                    -
                                                </td>
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={
                                                                handleSaveExpense
                                                            }
                                                            disabled={saving}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                        >
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={
                                                                handleCancelEdit
                                                            }
                                                            className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-900">
                                                        {expense.description}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        {expense.provider_name}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {formatCurrency(
                                                        expense.cost
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right tabular-nums">
                                                    {expense.markup_percentage}%
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {expense.applies_iva ? (
                                                        <span className="text-green-600">
                                                            ✓
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-300">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right font-medium tabular-nums">
                                                    {formatCurrency(
                                                        expense.total
                                                    )}
                                                </td>
                                                {isEditable && (
                                                    <td className="px-3 py-2">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() =>
                                                                    handleStartEdit(
                                                                        expense,
                                                                        "expense"
                                                                    )
                                                                }
                                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                                title="Editar"
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    handleRemoveItem(
                                                                        expense.id,
                                                                        "expense"
                                                                    )
                                                                }
                                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
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

            {/* No items - Show add button */}
            {hasNoItems && !showAddItems && (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
                    <Package className="h-10 w-10 mx-auto mb-3 text-slate-400" />
                    <p className="font-medium text-slate-600 mb-1">
                        No hay items facturados
                    </p>
                    <p className="text-sm text-slate-500 mb-4">
                        Esta factura no tiene servicios ni gastos vinculados
                    </p>
                    {isEditable && (
                        <Button
                            size="sm"
                            onClick={() => setShowAddItems(true)}
                            className="bg-brand-600 hover:bg-brand-700"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Agregar Items de la OS
                        </Button>
                    )}
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowHistory(false)}
                >
                    <div
                        className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">
                                Historial de Cambios
                            </h3>
                            <button
                                onClick={() => setShowHistory(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto">
                            {history.length === 0 ? (
                                <p className="text-center text-slate-500 py-4">
                                    No hay cambios registrados
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((h) => (
                                        <div
                                            key={h.id}
                                            className="p-3 bg-slate-50 rounded-lg text-sm"
                                        >
                                            <div className="flex items-center justify-between mb-1">
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    {h.edit_type_display}
                                                </Badge>
                                                <span className="text-xs text-slate-500">
                                                    {new Date(
                                                        h.created_at
                                                    ).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-slate-700">
                                                {h.description}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                Por: {h.user}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceItemsEditor;
