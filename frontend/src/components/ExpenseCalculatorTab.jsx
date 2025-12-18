import React, { useState, useEffect, useMemo } from "react";
import {
    Calculator,
    Save,
    RotateCcw,
    FileCheck,
    AlertCircle,
} from "lucide-react";
import { Button, Card, CardContent, ConfirmDialog, Input, Badge } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";

/**
 * ExpenseCalculatorTab - Calculadora de Gastos para Facturación (Diseño ERP Simplificado)
 */
const ExpenseCalculatorTab = ({ orderId, orderStatus, onUpdate }) => {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [expenseAdjustments, setExpenseAdjustments] = useState({});
    const [confirmReset, setConfirmReset] = useState(false);

    const IVA_RATE = 0.13;

    // Calcular valores derivados
    const calculateValues = (expense, adjustment) => {
        const cost = parseFloat(expense.amount);
        const markupPercent = parseFloat(adjustment?.markup_percentage || 0);
        const appliesIva = !!adjustment?.applies_iva;

        // Precio Base (Venta sin IVA)
        // Si hay margen, se aplica sobre el costo: Costo * (1 + %)
        const basePrice = cost * (1 + markupPercent / 100);

        // IVA
        const ivaAmount = appliesIva ? basePrice * IVA_RATE : 0;

        // Total
        const total = basePrice + ivaAmount;

        // Ganancia
        const profit = basePrice - cost;

        return { cost, basePrice, ivaAmount, total, profit };
    };

    useEffect(() => {
        const fetchData = async () => {
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

                // Inicializar ajustes con valores guardados en el transfer o por defecto
                const initialAdjustments = {};
                billableExpenses.forEach((exp) => {
                    initialAdjustments[exp.id] = {
                        markup_percentage: parseFloat(
                            exp.customer_markup_percentage || 0
                        ),
                        applies_iva: exp.customer_applies_iva || false,
                    };
                });
                setExpenseAdjustments(initialAdjustments);
            } catch (error) {
                console.error("Error loading expenses:", error);
                toast.error("Error al cargar los gastos");
            } finally {
                setLoading(false);
            }
        };

        if (orderId) {
            fetchData();
        }
    }, [orderId]);

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
        setExpenseAdjustments((prev) => ({
            ...prev,
            [expenseId]: {
                ...prev[expenseId],
                [field]: value,
            },
        }));
    };

    const handleReset = () => {
        const resetAdjustments = {};
        expenses.forEach((exp) => {
            resetAdjustments[exp.id] = {
                markup_percentage: 0,
                applies_iva: false,
            };
        });
        setExpenseAdjustments(resetAdjustments);
        setConfirmReset(false);
        toast.success("Ajustes restablecidos (No guardado)");
    };

    const handleSaveAsCharges = async () => {
        try {
            setSaving(true);
            const configs = expenses.map((expense) => {
                const adj = expenseAdjustments[expense.id];
                return {
                    expense_id: expense.id,
                    markup_percentage: adj?.markup_percentage || 0,
                    applies_iva: adj?.applies_iva || false,
                };
            });

            await axios.post(
                `/orders/service-orders/${orderId}/update_expense_configurations/`,
                {
                    configs: configs,
                }
            );

            toast.success("Configuración de gastos guardada correctamente");

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

    const isEditable = orderStatus === "abierta";

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
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setConfirmReset(true)}
                            >
                                <RotateCcw className="h-4 w-4 mr-1" />
                                Restablecer
                            </Button>
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

                {/* Tabla Simplificada - Estilo ERP */}
                <div className="border border-slate-200 rounded-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                        Gasto
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                        Costo
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                        Margen %
                                    </th>
                                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                        Precio Base
                                    </th>
                                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
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
                                        expense.is_billed || expense.invoice_id;

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
                                                        "Proveedor desconocido"}
                                                </div>
                                            </td>

                                            {/* Costo */}
                                            <td
                                                className={`px-3 py-2.5 text-right tabular-nums ${
                                                    isBilled
                                                        ? "text-slate-500"
                                                        : "text-slate-700"
                                                }`}
                                            >
                                                {formatCurrency(cost)}
                                            </td>

                                            {/* Margen % Input */}
                                            <td className="px-3 py-2.5 text-right">
                                                <div className="flex items-center justify-end">
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        className="h-8 w-16 text-right px-1 py-1"
                                                        value={
                                                            adjustment.markup_percentage ||
                                                            ""
                                                        }
                                                        onChange={(e) =>
                                                            updateAdjustment(
                                                                expense.id,
                                                                "markup_percentage",
                                                                e.target.value
                                                            )
                                                        }
                                                        disabled={
                                                            !isEditable ||
                                                            isBilled
                                                        }
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </td>

                                            {/* Precio Venta Base */}
                                            <td
                                                className={`px-3 py-2.5 text-right font-medium tabular-nums ${
                                                    isBilled
                                                        ? "text-slate-500"
                                                        : "text-slate-900"
                                                }`}
                                            >
                                                {formatCurrency(basePrice)}
                                            </td>

                                            {/* Checkbox IVA */}
                                            <td className="px-3 py-2.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        !!adjustment.applies_iva
                                                    }
                                                    onChange={(e) =>
                                                        updateAdjustment(
                                                            expense.id,
                                                            "applies_iva",
                                                            e.target.checked
                                                        )
                                                    }
                                                    disabled={
                                                        !isEditable || isBilled
                                                    }
                                                    className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                                                />
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
                                                        : "text-emerald-600"
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
                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                <tr>
                                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700">
                                        TOTALES:
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">
                                        {formatCurrency(summary.totalCost)}
                                    </td>
                                    <td colSpan={1}></td>
                                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-900 tabular-nums">
                                        {formatCurrency(summary.totalBase)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-xs font-bold text-slate-700 tabular-nums">
                                        {summary.totalIVA > 0
                                            ? formatCurrency(summary.totalIVA)
                                            : "-"}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-sm font-bold text-blue-700 tabular-nums">
                                        {formatCurrency(summary.totalTotal)}
                                    </td>
                                    <td className="px-3 py-2.5 text-right text-xs font-bold text-emerald-600 tabular-nums">
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
                    description="Todos los márgenes volverán a 0%."
                    confirmText="Restablecer"
                    cancelText="Cancelar"
                    variant="warning"
                />
            </CardContent>
        </Card>
    );
};

export default ExpenseCalculatorTab;
