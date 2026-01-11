import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Calculator,
    Save,
    RotateCcw,
    FileCheck,
    AlertCircle,
    Lock,
    Info,
} from "lucide-react";
import { Button, Card, CardContent, ConfirmDialog, Input, Badge } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";

/**
 * ExpenseCalculatorTab - Calculadora de Gastos Reembolsables para Facturación
 *
 * Cumplimiento fiscal El Salvador:
 * - GRAVADO: IVA 13%
 * - EXENTO: Sin IVA
 * - NO_SUJETO: Sin IVA (exportaciones)
 *
 * RESTRICCIONES:
 * - El Monto Base (costo) NO es editable (viene del pago a proveedor)
 * - Solo se permite editar: Margen de Utilidad y Tipo de IVA
 */
const ExpenseCalculatorTab = ({
    orderId,
    orderStatus,
    clientType,
    onUpdate,
}) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expenseAdjustments, setExpenseAdjustments] = useState({});
    const [confirmReset, setConfirmReset] = useState(false);

    const IVA_RATE = 0.13;

    // Tipos de IVA según normativa salvadoreña
    const IVA_TYPES = [
        { value: "gravado", label: "Gravado (13%)", rate: 0.13 },
        { value: "exento", label: "Exento", rate: 0 },
        { value: "no_sujeto", label: "No Sujeto", rate: 0 },
    ];

    // Calcular valores derivados con soporte para tipos de IVA
    const calculateValues = (expense, adjustment) => {
        const cost = parseFloat(expense.amount);
        const markupPercent = parseFloat(adjustment?.markup_percentage || 0);
        const ivaType = adjustment?.iva_type || "no_sujeto";

        // Precio Base (Venta sin IVA)
        const basePrice = cost * (1 + markupPercent / 100);

        // IVA según tipo fiscal
        const ivaRate = ivaType === "gravado" ? IVA_RATE : 0;
        const ivaAmount = basePrice * ivaRate;

        // Total
        const total = basePrice + ivaAmount;

        // Ganancia
        const profit = basePrice - cost;

        return { cost, basePrice, ivaAmount, total, profit, ivaType };
    };

    // Extract fetchData outside useEffect for reusability
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/transfers/transfers/?service_order=${orderId}`
            );
            const data = Array.isArray(response.data) ? response.data : [];

            const billableExpenses = data.filter(
                (exp) =>
                    exp.transfer_type === "cargos" ||
                    exp.transfer_type === "costos" ||
                    exp.transfer_type === "terceros"
            );

            setExpenses(billableExpenses);

            // Inicializar ajustes con valores guardados
            const initialAdjustments = {};
            billableExpenses.forEach((exp) => {
                let ivaType = exp.customer_iva_type;
                if (!ivaType) {
                    if (clientType === "internacional") {
                        ivaType = "no_sujeto";
                    } else if (exp.customer_applies_iva) {
                        ivaType = "gravado";
                    } else {
                        ivaType = "no_sujeto";
                    }
                }

                const markup = parseFloat(exp.customer_markup_percentage || 0);
                const cost = parseFloat(exp.amount || 0);
                const price = cost * (1 + markup / 100);

                initialAdjustments[exp.id] = {
                    // Asegurar conversión a número
                    markup_percentage: markup,
                    iva_type: ivaType,
                    amount_locked: exp.amount_locked || false,
                    is_billed: !!exp.invoice_id,
                    price: price.toFixed(2), // Initialize with formatted price
                };
            });
            setExpenseAdjustments(initialAdjustments);
        } catch (error) {
            console.error("Error loading expenses:", error);
            toast.error("Error al cargar los gastos");
        } finally {
            setLoading(false);
        }
    }, [orderId, clientType]);

    useEffect(() => {
        if (orderId) {
            fetchData();
        }
    }, [orderId, fetchData]);

    const summary = useMemo(() => {
        let totalCost = 0;
        let totalBase = 0; // Precio venta sin IVA
        let totalIVA = 0;
        let totalTotal = 0; // Precio venta con IVA
        let totalProfit = 0;

        expenses.forEach((expense) => {
            const adj = expenseAdjustments[expense.id];
            const vals = calculateValues(expense, adj);

            totalCost += vals.cost;
            totalBase += vals.basePrice;
            totalIVA += vals.ivaAmount;
            totalTotal += vals.total;
            totalProfit += vals.profit;
        });

        return { totalCost, totalBase, totalIVA, totalTotal, totalProfit };
    }, [expenses, expenseAdjustments]);

    const updateAdjustment = (expenseId, field, value) => {
        setExpenseAdjustments((prev) => {
            const currentAdjustment = prev[expenseId] || {};
            const expense = expenses.find(e => e.id === expenseId);
            const cost = parseFloat(expense?.amount || 0);

            let newAdjustment = { ...currentAdjustment };

            if (field === "price") {
                newAdjustment.price = value; // Keep raw string
                const numPrice = parseFloat(value);
                if (!isNaN(numPrice) && cost > 0) {
                    const rawMarkup = ((numPrice / cost) - 1) * 100;
                    newAdjustment.markup_percentage = parseFloat(rawMarkup.toFixed(4));
                } else if (!isNaN(numPrice) && cost === 0) {
                     newAdjustment.markup_percentage = 0; 
                }
            } else if (field === "markup_percentage") {
                const numValue = parseFloat(value);
                newAdjustment.markup_percentage = isNaN(numValue) ? 0 : Math.max(0, numValue);
                // Update price derived from markup
                const newPrice = cost * (1 + newAdjustment.markup_percentage / 100);
                newAdjustment.price = newPrice.toFixed(2);
            } else {
                newAdjustment[field] = value;
            }

            return {
                ...prev,
                [expenseId]: newAdjustment,
            };
        });
    };

    const handleReset = () => {
        const resetAdjustments = {};
        expenses.forEach((exp) => {
            const isBilled = !!exp.invoice_id;
            // Solo resetear gastos NO facturados, mantener los facturados intactos
            if (isBilled) {
                // Mantener valores originales para gastos ya facturados
                resetAdjustments[exp.id] = {
                    markup_percentage: parseFloat(
                        exp.customer_markup_percentage || 0
                    ),
                    iva_type:
                        exp.customer_iva_type ||
                        (exp.customer_applies_iva ? "gravado" : "no_sujeto"),
                    amount_locked: exp.amount_locked || false,
                    is_billed: true,
                };
            } else {
                // Resetear solo los no facturados
                resetAdjustments[exp.id] = {
                    markup_percentage: 0,
                    iva_type:
                        clientType === "internacional"
                            ? "no_sujeto"
                            : "no_sujeto",
                    amount_locked: exp.amount_locked || false,
                    is_billed: false,
                };
            }
        });
        setExpenseAdjustments(resetAdjustments);
        setConfirmReset(false);
        toast.success("Ajustes restablecidos para gastos no facturados");
    };

    const handleSaveAsCharges = async () => {
        try {
            setSaving(true);

            // Filtrar y mapear con validación explícita
            const configs = expenses
                .filter((expense) => !expenseAdjustments[expense.id]?.is_billed)
                .map((expense) => {
                    const adj = expenseAdjustments[expense.id] || {};

                    // Conversión explícita y validación
                    const markupValue = parseFloat(adj.markup_percentage);
                    const markupPercentage = isNaN(markupValue)
                        ? 0
                        : Math.max(0, markupValue);

                    return {
                        expense_id: expense.id,
                        markup_percentage: markupPercentage,
                        iva_type: adj.iva_type || "no_sujeto",
                        applies_iva: adj.iva_type === "gravado",
                    };
                });

            if (configs.length === 0) {
                toast.info("No hay gastos para actualizar");
                return;
            }

            const response = await axios.post(
                `/orders/service-orders/${orderId}/update_expense_configurations/`,
                { configs }
            );

            const { updated_count, synced_invoices } = response.data;
            let message = `✓ ${updated_count} gasto${
                updated_count !== 1 ? "s" : ""
            } actualizado${updated_count !== 1 ? "s" : ""}`;
            if (synced_invoices > 0) {
                message += ` | ${synced_invoices} factura${
                    synced_invoices !== 1 ? "s" : ""
                } sincronizada${synced_invoices !== 1 ? "s" : ""}`;
            }
            toast.success(message);

            // CRÍTICO: Recargar datos después de guardar
            await fetchData();

            if (onUpdate) onUpdate();
        } catch (error) {
            console.error("Error saving configs:", error);
            const errorMsg =
                error.response?.data?.error ||
                "Error al guardar la configuración";
            toast.error(errorMsg);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (expenses.length === 0) {
        return null;
    }

    // La orden es editable si NO está cerrada
    const isEditable = orderStatus !== "cerrada";

    // Verificar si hay gastos no facturados (para mostrar/ocultar botón restablecer)
    const hasUnbilledExpenses = expenses.some((exp) => !exp.invoice_id);

    return (
        <Card>
            <CardContent className="pt-6">
                {/* Header Simplificado */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <Calculator className="h-5 w-5 text-slate-500" />
                            Calculadora de Gastos
                        </h3>
                    </div>

                    {isEditable && (
                        <div className="flex items-center gap-2">
                            {hasUnbilledExpenses && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setConfirmReset(true)}
                                >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Restablecer
                                </Button>
                            )}
                            <Button
                                size="sm"
                                onClick={handleSaveAsCharges}
                                disabled={saving}
                            >
                                <Save className="h-4 w-4 mr-1" />
                                Guardar
                            </Button>
                        </div>
                    )}
                </div>

                {/* Nota informativa sobre restricciones */}
                <div className="mb-4 p-3 border border-dashed border-slate-300 rounded-md bg-slate-50/50">
                    <div className="flex items-start gap-3">
                        <div className="p-1 bg-white border border-slate-200 rounded-full shadow-sm mt-0.5">
                            <Lock className="h-3 w-3 text-slate-500" />
                        </div>
                        <div className="text-sm text-slate-600">
                            <span className="font-semibold text-slate-800 uppercase tracking-wide text-xs block mb-0.5">
                                Restricciones de Edición
                            </span>
                            El costo base es inmutable (proviene de cuentas por
                            pagar). Solo se permite modificar el margen de
                            utilidad y la configuración fiscal.
                        </div>
                    </div>
                </div>

                {/* Tabla con Tipos de IVA - Estilo ERP */}
                <div className="border border-slate-200 rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Gasto
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                        Costo Base
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                                        Margen %
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                        Precio Venta
                                    </th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-32">
                                        Tipo IVA
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                        IVA
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                        Total
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                        Ganancia
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-slate-100">
                                {expenses.map((expense) => {
                                    const adjustment =
                                        expenseAdjustments[expense.id] || {};
                                    const {
                                        cost,
                                        basePrice,
                                        ivaAmount,
                                        total,
                                        profit,
                                    } = calculateValues(expense, adjustment);
                                    const isBilled =
                                        expense.is_billed ||
                                        !!expense.invoice_id;
                                    const isAmountLocked =
                                        expense.amount_locked ||
                                        expense.paid_amount > 0;
                                    const canEdit = isEditable && !isBilled;

                                    return (
                                        <tr
                                            key={expense.id}
                                            className={`transition-colors ${
                                                isBilled
                                                    ? "bg-slate-100 opacity-60"
                                                    : "hover:bg-slate-50/70"
                                            }`}
                                        >
                                            {/* Gasto */}
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className={`font-medium ${
                                                            isBilled
                                                                ? "text-slate-500"
                                                                : "text-slate-900"
                                                        }`}
                                                    >
                                                        {expense.description}
                                                    </div>
                                                    {isBilled && (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-600 border-slate-300"
                                                        >
                                                            <FileCheck className="h-3 w-3 mr-0.5" />
                                                            {expense.invoice_number_client ||
                                                                "Facturado"}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="text-xs text-slate-500 mt-0.5">
                                                    {expense.provider_name ||
                                                        expense.beneficiary_name ||
                                                        "Proveedor desconocido"}
                                                </div>
                                            </td>

                                            {/* Costo Base (No editable) */}
                                            <td
                                                className={`px-3 py-2.5 text-right tabular-nums ${
                                                    isBilled
                                                        ? "text-slate-500"
                                                        : "text-slate-700"
                                                }`}
                                            >
                                                <div className="flex items-center justify-end gap-1">
                                                    {isAmountLocked && (
                                                        <Lock
                                                            className="h-3 w-3 text-slate-400"
                                                            title="Monto bloqueado"
                                                        />
                                                    )}
                                                    {formatCurrency(cost)}
                                                </div>
                                            </td>

                                            {/* Margen % (Calculado - Solo Lectura) */}
                                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-600 font-medium">
                                                {parseFloat(adjustment.markup_percentage || 0).toFixed(2)}%
                                            </td>

                                            {/* Precio Venta Base (Editable) */}
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end relative">
                                                    <span className="absolute left-2 text-slate-400 text-xs">$</span>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        value={adjustment.price}
                                                        onChange={(e) => {
                                                            updateAdjustment(
                                                                expense.id,
                                                                "price",
                                                                e.target.value
                                                            );
                                                        }}
                                                        disabled={!canEdit}
                                                        className={`h-8 w-28 text-right pl-4 pr-2 py-1 font-bold ${
                                                            isBilled ? "text-slate-500 bg-slate-100" : "text-emerald-700 bg-white"
                                                        }`}
                                                    />
                                                </div>
                                            </td>

                                            {/* Selector Tipo IVA */}
                                            <td className="px-3 py-2.5 text-center">
                                                <select
                                                    value={
                                                        adjustment.iva_type ||
                                                        "no_sujeto"
                                                    }
                                                    onChange={(e) =>
                                                        updateAdjustment(
                                                            expense.id,
                                                            "iva_type",
                                                            e.target.value
                                                        )
                                                    }
                                                    disabled={!canEdit}
                                                    className="h-8 w-full text-xs border border-slate-300 rounded px-1 py-1 bg-white disabled:bg-slate-100 disabled:cursor-not-allowed"
                                                >
                                                    {IVA_TYPES.map((type) => (
                                                        <option
                                                            key={type.value}
                                                            value={type.value}
                                                        >
                                                            {type.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>

                                            {/* Monto IVA */}
                                            <td
                                                className={`px-3 py-2.5 text-right tabular-nums ${
                                                    isBilled
                                                        ? "text-slate-500"
                                                        : "text-slate-700"
                                                }`}
                                            >
                                                {ivaAmount > 0
                                                    ? formatCurrency(ivaAmount)
                                                    : "-"}
                                            </td>

                                            {/* Total */}
                                            <td
                                                className={`px-3 py-2.5 text-right font-bold tabular-nums ${
                                                    isBilled
                                                        ? "text-slate-500"
                                                        : "text-slate-900"
                                                }`}
                                            >
                                                {formatCurrency(total)}
                                            </td>

                                            {/* Ganancia */}
                                            <td
                                                className={`px-3 py-2.5 text-right text-xs font-medium tabular-nums ${
                                                    isBilled
                                                        ? "text-slate-400"
                                                        : "text-slate-600"
                                                }`}
                                            >
                                                {profit > 0
                                                    ? formatCurrency(profit)
                                                    : "-"}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                <tr>
                                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700">
                                        TOTALES:
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-700 tabular-nums">
                                        {formatCurrency(summary.totalCost)}
                                    </td>
                                    <td></td>
                                    <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                                        {formatCurrency(summary.totalBase)}
                                    </td>
                                    <td></td>
                                    <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-700 tabular-nums">
                                        {summary.totalIVA > 0
                                            ? formatCurrency(summary.totalIVA)
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-base font-bold text-slate-900 tabular-nums">
                                        {formatCurrency(summary.totalTotal)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-sm font-medium text-slate-600 tabular-nums">
                                        {formatCurrency(summary.totalProfit)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <ConfirmDialog
                    open={confirmReset}
                    onClose={() => setConfirmReset(false)}
                    onConfirm={handleReset}
                    title="¿Restablecer configuración?"
                    description="Los márgenes de gastos NO facturados volverán a 0%. Los gastos ya facturados no serán afectados."
                    confirmText="Restablecer"
                    cancelText="Cancelar"
                    variant="warning"
                />
            </CardContent>
        </Card>
    );
};

export default ExpenseCalculatorTab;
