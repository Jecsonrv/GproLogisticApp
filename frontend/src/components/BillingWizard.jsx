import React, { useState, useEffect, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    Button,
    Input,
    Label,
    Spinner,
    SelectERP,
    Badge,
} from "./ui";
import { formatCurrency, getTodayDate, cn } from "../lib/utils";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import {
    Check,
    AlertCircle,
    Calendar,
    CreditCard,
    Info,
    FileText,
    Building2,
    TrendingUp,
    Package,
    Receipt,
} from "lucide-react";

/**
 * Calcula la fecha de vencimiento basándose en días de crédito
 */
const calculateDueDate = (issueDate, creditDays, paymentCondition) => {
    if (!issueDate) return "";

    const issue = new Date(issueDate + "T00:00:00");

    // Si es contado, la fecha de vencimiento es la misma de emisión
    if (paymentCondition === "contado" || !creditDays || creditDays <= 0) {
        return issueDate;
    }

    // Para crédito, sumar los días
    issue.setDate(issue.getDate() + creditDays);
    return issue.toISOString().split("T")[0];
};

/**
 * BillingWizard - Asistente para generar facturas parciales o totales
 * Permite seleccionar qué cargos incluir en la factura.
 */
const BillingWizard = ({ isOpen, onClose, serviceOrder, onInvoiceCreated }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [charges, setCharges] = useState([]);
    const [selectedChargeIds, setSelectedChargeIds] = useState([]);

    // Form data for invoice
    const [formData, setFormData] = useState({
        invoice_number: "",
        invoice_type: "DTE",
        issue_date: getTodayDate(),
        due_date: "",
        payment_condition: "contado",
        notes: "",
    });

    // Obtener días de crédito del cliente
    const clientCreditDays = serviceOrder?.client_credit_days || 0;
    const clientPaymentCondition =
        serviceOrder?.client_payment_condition || "contado";

    // Reset state when opening
    useEffect(() => {
        if (isOpen && serviceOrder) {
            setStep(1);
            const today = getTodayDate();
            const paymentCond =
                serviceOrder.client_payment_condition || "contado";
            const creditDays = serviceOrder.client_credit_days || 0;

            // Determinar tipo de factura por defecto
            // Si es internacional -> FEX, si no -> DTE (CCF/Factura)
            const defaultInvoiceType =
                serviceOrder.client_type === "internacional" ? "FEX" : "DTE";

            setFormData({
                invoice_number: "",
                invoice_type: defaultInvoiceType,
                issue_date: today,
                due_date: calculateDueDate(today, creditDays, paymentCond),
                payment_condition: paymentCond,
                notes: "",
            });
            fetchCharges();
        }
        // fetchCharges intentionally omitted to avoid reloading when other deps change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, serviceOrder]);

    // Recalcular fecha de vencimiento cuando cambia la condición de pago o fecha de emisión
    useEffect(() => {
        if (formData.issue_date) {
            const newDueDate = calculateDueDate(
                formData.issue_date,
                formData.payment_condition === "credito" ? clientCreditDays : 0,
                formData.payment_condition
            );
            setFormData((prev) => ({ ...prev, due_date: newDueDate }));
        }
    }, [formData.issue_date, formData.payment_condition, clientCreditDays]);

    const fetchCharges = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/orders/service-orders/${serviceOrder.id}/billable_items/`
            );
            // El endpoint devuelve {items: [], summary: {}}
            const items = response.data.items || [];
            setCharges(items);
            // Select all by default
            setSelectedChargeIds(items.map((c) => c.id));
        } catch (error) {
            console.error("Error fetching charges:", error);
            toast.error(
                "No se pudieron cargar los cargos pendientes. Intente recargar."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleChargeToggle = (chargeId) => {
        setSelectedChargeIds((prev) => {
            if (prev.includes(chargeId)) {
                return prev.filter((id) => id !== chargeId);
            } else {
                return [...prev, chargeId];
            }
        });
    };

    const selectedTotals = useMemo(() => {
        let subtotalServicios = 0;
        let subtotalTerceros = 0;
        let baseGravadaServicios = 0; // Solo servicios con iva_type === 'gravado'
        let iva = 0;
        let total = 0;

        // NUEVO: Cálculos de rentabilidad
        let costoDirectoTotal = 0;
        let gananciaBruta = 0;
        let serviciosPropios = [];
        let serviciosTercerizados = [];
        let reembolsos = [];

        // Validar que charges sea un array
        if (Array.isArray(charges)) {
            charges.forEach((charge) => {
                if (selectedChargeIds.includes(charge.id)) {
                    const amount = parseFloat(charge.amount);
                    let ivaAmount = parseFloat(charge.iva);

                    // Si es Factura de Exportación (FEX) o Internacional (INTL), el IVA es 0
                    const isExport =
                        formData.invoice_type === "FEX" ||
                        formData.invoice_type === "INTL";
                    if (isExport) {
                        ivaAmount = 0;
                    }

                    // Separar servicios de gastos de terceros
                    if (charge.type === "service") {
                        subtotalServicios += amount;
                        // Acumular base gravada solo si el servicio es gravado
                        if (charge.iva_type === "gravado") {
                            baseGravadaServicios += amount;
                        }

                        // NUEVO: Calcular rentabilidad por servicio
                        const costAmount = parseFloat(charge.cost_amount || 0);
                        const profit = amount - costAmount;

                        if (charge.is_third_party_service) {
                            costoDirectoTotal += costAmount;
                            serviciosTercerizados.push({
                                ...charge,
                                cost: costAmount,
                                sale: amount,
                                profit: profit,
                                margin:
                                    costAmount > 0
                                        ? (profit / costAmount) * 100
                                        : 100,
                            });
                        } else {
                            serviciosPropios.push({
                                ...charge,
                                cost: 0,
                                sale: amount,
                                profit: amount,
                                margin: 100,
                            });
                        }
                        gananciaBruta += profit;
                    } else if (charge.type === "expense") {
                        subtotalTerceros += amount;
                        // Reembolsos no tienen ganancia
                        reembolsos.push({
                            ...charge,
                            cost: amount,
                            sale: amount,
                            profit: 0,
                            margin: 0,
                        });
                    }

                    iva += ivaAmount;

                    // Recalcular total de línea considerando el IVA ajustado
                    total += amount + ivaAmount;
                }
            });
        }

        const subtotal = subtotalServicios + subtotalTerceros;

        // Calcular retención del 1% para Gran Contribuyente
        const RETENCION_THRESHOLD = 100.0;
        const RETENCION_RATE = 0.01;

        const isGranContribuyente =
            serviceOrder?.client_is_gran_contribuyente || false;
        const isDTE = formData.invoice_type === "DTE";

        let retencion = 0;
        if (
            isGranContribuyente &&
            isDTE &&
            baseGravadaServicios > RETENCION_THRESHOLD
        ) {
            retencion = baseGravadaServicios * RETENCION_RATE;
        }

        const totalAPagar = total - retencion;

        // NUEVO: Calcular margen de rentabilidad total
        const margenRentabilidad =
            subtotalServicios > 0
                ? (gananciaBruta / subtotalServicios) * 100
                : 0;

        return {
            subtotalServicios,
            subtotalTerceros,
            baseGravadaServicios,
            subtotal,
            iva,
            retencion,
            total,
            totalAPagar,
            // NUEVO: Datos de rentabilidad
            costoDirectoTotal,
            gananciaBruta,
            margenRentabilidad,
            serviciosPropios,
            serviciosTercerizados,
            reembolsos,
        };
    }, [
        charges,
        selectedChargeIds,
        serviceOrder?.client_is_gran_contribuyente,
        formData.invoice_type,
    ]);

    const handleCreateInvoice = async () => {
        if (selectedChargeIds.length === 0) {
            toast.error(
                "Debe seleccionar al menos un cargo para generar la factura."
            );
            return;
        }

        try {
            setLoading(true);

            // Separate items by type
            const selectedItems = charges.filter((c) =>
                selectedChargeIds.includes(c.id)
            );
            const chargeIds = selectedItems
                .filter((c) => c.type === "service")
                .map((c) => c.original_id);
            const expenseIds = selectedItems
                .filter((c) => c.type === "expense")
                .map((c) => c.original_id);

            // Redondear total a 2 decimales
            const totalAmount = Math.round(selectedTotals.total * 100) / 100;

            const payload = {
                service_order: serviceOrder.id,
                charge_ids: chargeIds,
                transfer_ids: expenseIds,
                total_amount: totalAmount,
                invoice_number: formData.invoice_number || "",
                invoice_type: formData.invoice_type || "DTE",
                issue_date: formData.issue_date,
                due_date: formData.due_date,
                payment_condition: formData.payment_condition,
                notes: formData.notes || "",
            };

            await axios.post("/orders/invoices/", payload);
            toast.success("La factura ha sido generada exitosamente.");
            if (onInvoiceCreated) onInvoiceCreated();
            onClose();
        } catch (error) {
            console.error("Error creating invoice:", error);
            // Mostrar errores de validación de forma clara
            if (error.response?.data) {
                const errors = error.response.data;
                if (typeof errors === "object") {
                    const errorMessages = Object.entries(errors)
                        .map(([field, msgs]) => {
                            const fieldName =
                                {
                                    due_date: "Fecha de vencimiento",
                                    issue_date: "Fecha de emisión",
                                    total_amount: "Monto total",
                                    payment_condition: "Condición de pago",
                                }[field] || field;
                            return `${fieldName}: ${
                                Array.isArray(msgs) ? msgs.join(", ") : msgs
                            }`;
                        })
                        .join("\n");
                    toast.error(
                        errorMessages || "No se pudo generar la factura."
                    );
                } else {
                    toast.error(
                        errors.error ||
                            errors.detail ||
                            "No se pudo generar la factura. Verifique los datos."
                    );
                }
            } else {
                toast.error(
                    "No se pudo generar la factura. Intente nuevamente."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>
                        Generar Factura - {serviceOrder?.order_number}
                    </DialogTitle>
                    <DialogDescription>
                        Seleccione los cargos a incluir y complete los datos
                        fiscales.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 px-1">
                    {/* Step 1: Select Charges */}
                    {step === 1 && (
                        <div className="space-y-4">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <Spinner size="lg" />
                                </div>
                            ) : charges.length === 0 ? (
                                <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-slate-400" />
                                    <p>
                                        No hay cargos pendientes de facturar
                                        para esta orden.
                                    </p>
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-md overflow-hidden bg-white mb-4 shadow-sm">
                                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                                            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                                                <tr>
                                                    <th className="px-4 py-2.5 w-10 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={
                                                                selectedChargeIds.length ===
                                                                    charges.length &&
                                                                charges.length >
                                                                    0
                                                            }
                                                            onChange={(e) => {
                                                                if (
                                                                    e.target
                                                                        .checked
                                                                ) {
                                                                    setSelectedChargeIds(
                                                                        charges.map(
                                                                            (
                                                                                c
                                                                            ) =>
                                                                                c.id
                                                                        )
                                                                    );
                                                                } else {
                                                                    setSelectedChargeIds(
                                                                        []
                                                                    );
                                                                }
                                                            }}
                                                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        />
                                                    </th>
                                                    <th className="px-4 py-2.5 text-left font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                                                        Servicio / Descripción
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-28">
                                                        Monto
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                                                        IVA
                                                    </th>
                                                    <th className="px-4 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-32">
                                                        Total
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {charges.map((charge) => {
                                                    // Ajuste visual dinámico según tipo de factura
                                                    // Si es FEX/INTL, mostrar IVA como 0 aunque el cargo tenga IVA
                                                    const isExport =
                                                        formData.invoice_type ===
                                                            "FEX" ||
                                                        formData.invoice_type ===
                                                            "INTL";
                                                    const displayIva = isExport
                                                        ? 0
                                                        : parseFloat(
                                                              charge.iva
                                                          );
                                                    const displayTotal =
                                                        parseFloat(
                                                            charge.amount
                                                        ) + displayIva;

                                                    return (
                                                        <tr
                                                            key={charge.id}
                                                            className={cn(
                                                                "transition-colors cursor-pointer group",
                                                                selectedChargeIds.includes(
                                                                    charge.id
                                                                )
                                                                    ? "bg-blue-50/40"
                                                                    : "hover:bg-slate-50"
                                                            )}
                                                            onClick={() =>
                                                                handleChargeToggle(
                                                                    charge.id
                                                                )
                                                            }
                                                        >
                                                            <td className="px-4 py-2.5 text-center">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={selectedChargeIds.includes(
                                                                        charge.id
                                                                    )}
                                                                    onChange={(
                                                                        e
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        handleChargeToggle(
                                                                            charge.id
                                                                        );
                                                                    }}
                                                                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="flex items-center gap-2">
                                                                    <Badge
                                                                        variant={
                                                                            charge.type ===
                                                                            "service"
                                                                                ? charge.is_third_party_service
                                                                                    ? "secondary" // Tercerizado
                                                                                    : "default" // Propio
                                                                                : "outline" // Gasto -> Cargo a Cliente
                                                                        }
                                                                        className={`text-[10px] px-1.5 py-0 uppercase ${
                                                                            charge.type ===
                                                                            "expense"
                                                                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                                : ""
                                                                        }`}
                                                                    >
                                                                        {charge.type ===
                                                                        "service"
                                                                            ? charge.is_third_party_service
                                                                                ? "Servicio Tercerizado"
                                                                                : "Servicio Propio"
                                                                            : "Cargo a Cliente"}
                                                                    </Badge>
                                                                    <span className="font-medium text-slate-700">
                                                                        {
                                                                            charge.description
                                                                        }
                                                                    </span>
                                                                </div>
                                                                {charge.notes && (
                                                                    <div className="text-[11px] text-slate-500 mt-0.5 ml-14 truncate max-w-md">
                                                                        {
                                                                            charge.notes
                                                                        }
                                                                    </div>
                                                                )}
                                                                {/* Info de costo/margen para servicios tercerizados */}
                                                                {charge.type ===
                                                                    "service" &&
                                                                    charge.is_third_party_service &&
                                                                    charge.cost_amount >
                                                                        0 && (
                                                                        <div className="text-[11px] text-slate-500 mt-0.5 ml-14">
                                                                            Costo:{" "}
                                                                            {formatCurrency(
                                                                                charge.cost_amount
                                                                            )}{" "}
                                                                            |
                                                                            Margen:{" "}
                                                                            {charge.margin_percentage.toFixed(
                                                                                2
                                                                            )}
                                                                            %
                                                                        </div>
                                                                    )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">
                                                                {formatCurrency(
                                                                    charge.amount
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right tabular-nums text-slate-500">
                                                                {formatCurrency(
                                                                    displayIva
                                                                )}
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900">
                                                                {formatCurrency(
                                                                    displayTotal
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                            <tfoot className="bg-slate-50 border-t border-slate-200">
                                                <tr>
                                                    <td
                                                        colSpan={2}
                                                        className="px-4 py-3 text-right font-semibold text-slate-700 text-sm"
                                                    >
                                                        Total Seleccionado:
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-600 tabular-nums text-sm">
                                                        {formatCurrency(
                                                            selectedTotals.subtotal
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium text-slate-600 tabular-nums text-sm">
                                                        {formatCurrency(
                                                            selectedTotals.iva
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-black text-slate-900 tabular-nums text-lg">
                                                        {formatCurrency(
                                                            selectedTotals.total
                                                        )}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Invoice Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            {/* Desglose Fiscal Completo */}
                            <div className="bg-slate-50 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                                        Resumen de Facturación
                                    </h3>
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        {selectedChargeIds.length}{" "}
                                        {selectedChargeIds.length === 1
                                            ? "item"
                                            : "items"}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {/* Subtotales detallados */}
                                    {selectedTotals.subtotalServicios > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">
                                                Servicios
                                            </span>
                                            <span className="text-slate-700 tabular-nums">
                                                {formatCurrency(
                                                    selectedTotals.subtotalServicios
                                                )}
                                            </span>
                                        </div>
                                    )}
                                    {selectedTotals.subtotalTerceros > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">
                                                Gastos Reembolsables
                                            </span>
                                            <span className="text-slate-700 tabular-nums">
                                                {formatCurrency(
                                                    selectedTotals.subtotalTerceros
                                                )}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm pt-1">
                                        <span className="text-slate-600 font-medium">
                                            Subtotal
                                        </span>
                                        <span className="text-slate-800 tabular-nums font-medium">
                                            {formatCurrency(
                                                selectedTotals.subtotal
                                            )}
                                        </span>
                                    </div>

                                    {/* IVA */}
                                    <div className="flex justify-between text-sm">
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-slate-500">
                                                IVA 13%
                                            </span>
                                            {(formData.invoice_type === "FEX" ||
                                                formData.invoice_type ===
                                                    "INTL") && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-[9px] px-1 h-4 bg-emerald-50 text-emerald-700 border-emerald-200"
                                                >
                                                    EXENTO (EXPORTACIÓN)
                                                </Badge>
                                            )}
                                        </div>
                                        <span
                                            className={`tabular-nums ${
                                                selectedTotals.iva === 0
                                                    ? "text-slate-400"
                                                    : "text-slate-700"
                                            }`}
                                        >
                                            {formatCurrency(selectedTotals.iva)}
                                        </span>
                                    </div>

                                    {/* Retención si aplica */}
                                    {selectedTotals.retencion > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">
                                                Retención 1%
                                            </span>
                                            <span className="text-slate-600 tabular-nums">
                                                −{" "}
                                                {formatCurrency(
                                                    selectedTotals.retencion
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Total Final */}
                                <div className="mt-4 pt-3 border-t border-slate-200">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                            {selectedTotals.retencion > 0
                                                ? "Total a Cobrar"
                                                : "Total Factura"}
                                        </span>
                                        <span className="text-xl font-bold text-slate-900 tabular-nums">
                                            {formatCurrency(
                                                selectedTotals.retencion > 0
                                                    ? selectedTotals.totalAPagar
                                                    : selectedTotals.total
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tabla Detallada de Análisis de Items */}
                            {selectedChargeIds.length > 0 && (
                                <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg p-5 border border-slate-200">
                                    <div className="flex items-center gap-2 mb-4">
                                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                                        <h3 className="text-sm font-semibold text-slate-700">
                                            Análisis por Items
                                        </h3>
                                    </div>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                                            <thead className="bg-slate-50">
                                                <tr>
                                                    <th className="px-3 py-2.5 text-left font-bold text-slate-600 uppercase text-[10px] tracking-wider">
                                                        Servicio
                                                    </th>
                                                    <th className="px-3 py-2.5 text-center font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                                                        Tipo
                                                    </th>
                                                    <th className="px-3 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                                                        Cant.
                                                    </th>
                                                    <th className="px-3 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-28">
                                                        Costo
                                                    </th>
                                                    <th className="px-3 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-28">
                                                        Precio
                                                    </th>
                                                    <th className="px-3 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-28">
                                                        Ganancia
                                                    </th>
                                                    <th className="px-3 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-20">
                                                        Margen
                                                    </th>
                                                    <th className="px-3 py-2.5 text-center font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                                                        Tipo IVA
                                                    </th>
                                                    <th className="px-3 py-2.5 text-right font-bold text-slate-600 uppercase text-[10px] tracking-wider w-24">
                                                        IVA
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-slate-100">
                                                {charges
                                                    .filter((charge) =>
                                                        selectedChargeIds.includes(
                                                            charge.id
                                                        )
                                                    )
                                                    .map((charge) => {
                                                        const hasCost =
                                                            charge.cost_amount >
                                                            0;

                                                        return (
                                                            <tr
                                                                key={charge.id}
                                                                className="hover:bg-slate-50"
                                                            >
                                                                <td className="px-3 py-2 text-slate-700">
                                                                    {charge.service_name ||
                                                                        charge.description}
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    {charge.type ===
                                                                    "expense" ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] px-1.5 py-0.5 font-medium bg-orange-50 text-orange-700 border-orange-200"
                                                                        >
                                                                            Cargo
                                                                            a
                                                                            Cliente
                                                                        </Badge>
                                                                    ) : charge.is_third_party_service ? (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] px-1.5 py-0.5 font-medium bg-slate-100 text-slate-600 border-slate-300"
                                                                        >
                                                                            Servicio
                                                                            Tercerizado
                                                                        </Badge>
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className="text-[10px] px-1.5 py-0.5 font-medium bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                        >
                                                                            Servicio
                                                                            Propio
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-600 tabular-nums">
                                                                    {charge.quantity ||
                                                                        1}
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums">
                                                                    {hasCost ? (
                                                                        <span className="text-slate-700">
                                                                            {formatCurrency(
                                                                                charge.cost_amount
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right text-slate-700 tabular-nums font-medium">
                                                                    {formatCurrency(
                                                                        charge.amount
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums">
                                                                    {hasCost ? (
                                                                        <span
                                                                            className={`font-medium ${
                                                                                charge.profit >=
                                                                                0
                                                                                    ? "text-emerald-700"
                                                                                    : "text-red-700"
                                                                            }`}
                                                                        >
                                                                            {formatCurrency(
                                                                                charge.profit
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums">
                                                                    {hasCost ? (
                                                                        <span
                                                                            className={`text-[11px] ${
                                                                                charge.margin_percentage >=
                                                                                0
                                                                                    ? "text-slate-600"
                                                                                    : "text-red-700"
                                                                            }`}
                                                                        >
                                                                            {charge.margin_percentage.toFixed(
                                                                                1
                                                                            )}
                                                                            %
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300 text-[11px]">
                                                                            N/A
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <Badge
                                                                        variant="outline"
                                                                        className={`text-[10px] px-1.5 py-0.5 font-medium ${
                                                                            charge.iva_type ===
                                                                            "gravado"
                                                                                ? "bg-slate-100 text-slate-700 border-slate-300"
                                                                                : "bg-slate-50 text-slate-600 border-slate-200"
                                                                        }`}
                                                                    >
                                                                        {charge.iva_type ===
                                                                        "gravado"
                                                                            ? "Gravado 13%"
                                                                            : charge.iva_type ===
                                                                              "exento"
                                                                            ? "Exento"
                                                                            : "No Sujeto"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                                                                    {charge.iva_amount >
                                                                    0 ? (
                                                                        formatCurrency(
                                                                            charge.iva_amount
                                                                        )
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                            </tbody>
                                            <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-3 py-3 text-right font-semibold text-slate-700 text-sm"
                                                    >
                                                        Subtotal (sin IVA):
                                                    </td>
                                                    <td
                                                        colSpan={2}
                                                        className="px-3 py-3 text-right font-semibold text-slate-800 tabular-nums text-sm"
                                                    >
                                                        {formatCurrency(
                                                            selectedTotals.subtotal
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td
                                                        colSpan={7}
                                                        className="px-3 py-2 text-right font-medium text-slate-700 text-sm"
                                                    >
                                                        IVA (13%):
                                                    </td>
                                                    <td
                                                        colSpan={2}
                                                        className="px-3 py-2 text-right font-medium text-slate-700 tabular-nums text-sm"
                                                    >
                                                        {formatCurrency(
                                                            selectedTotals.iva
                                                        )}
                                                    </td>
                                                </tr>
                                                <tr className="border-t border-slate-300">
                                                    <td
                                                        colSpan={7}
                                                        className="px-3 py-3 text-right font-bold text-slate-800 text-sm uppercase tracking-wide"
                                                    >
                                                        Total a Pagar:
                                                    </td>
                                                    <td
                                                        colSpan={2}
                                                        className="px-3 py-3 text-right font-bold text-slate-900 tabular-nums text-base"
                                                    >
                                                        {formatCurrency(
                                                            selectedTotals.total
                                                        )}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 flex items-center gap-1.5">
                                        <Info className="w-3.5 h-3.5" />
                                        Esta información es solo para uso
                                        interno y no se incluye en la factura.
                                    </div>
                                </div>
                            )}

                            {/* Información del Cliente */}
                            {(clientPaymentCondition ||
                                clientCreditDays > 0) && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-300 rounded">
                                    <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">
                                            {serviceOrder?.client_name ||
                                                "Cliente"}
                                            :
                                        </span>{" "}
                                        {clientPaymentCondition ===
                                        "contado" ? (
                                            "Pago al contado"
                                        ) : (
                                            <>
                                                {clientCreditDays} dias de
                                                credito
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <Label className="mb-1.5 block">
                                        Tipo de Factura
                                    </Label>
                                    <SelectERP
                                        options={[
                                            {
                                                id: "DTE",
                                                name: "DTE (Documento Tributario Electrónico)",
                                            },
                                            {
                                                id: "FEX",
                                                name: "FEX (Factura de Exportación)",
                                            },
                                            {
                                                id: "INTL",
                                                name: "Factura Internacional",
                                            },
                                        ]}
                                        value={formData.invoice_type}
                                        onChange={(val) =>
                                            setFormData({
                                                ...formData,
                                                invoice_type: val,
                                            })
                                        }
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                    {formData.invoice_type === "DTE" &&
                                        serviceOrder?.client_is_gran_contribuyente &&
                                        selectedTotals.retencion > 0 && (
                                            <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                                <AlertCircle className="w-3 h-3" />
                                                Se aplicará retención del 1%
                                            </p>
                                        )}
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">
                                        No. DTE / Factura (Opcional)
                                    </Label>
                                    <Input
                                        value={formData.invoice_number}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                invoice_number: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: DTE-12345678"
                                        className="font-mono"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Dejar vacío para generar{" "}
                                        <strong>
                                            PRE-00XXX-{new Date().getFullYear()}
                                        </strong>
                                    </p>
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">
                                        Condición de Pago
                                    </Label>
                                    <SelectERP
                                        options={[
                                            { id: "contado", name: "Contado" },
                                            { id: "credito", name: "Crédito" },
                                        ]}
                                        value={formData.payment_condition}
                                        onChange={(val) =>
                                            setFormData({
                                                ...formData,
                                                payment_condition: val,
                                            })
                                        }
                                        getOptionLabel={(opt) => opt.name}
                                        getOptionValue={(opt) => opt.id}
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">
                                        Fecha de Emisión
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.issue_date}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                issue_date: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block">
                                        Fecha de Vencimiento
                                        {formData.payment_condition ===
                                            "credito" &&
                                            clientCreditDays > 0 && (
                                                <span className="text-xs font-normal text-slate-400 ml-1">
                                                    (+{clientCreditDays} días)
                                                </span>
                                            )}
                                    </Label>
                                    <Input
                                        type="date"
                                        value={formData.due_date}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                due_date: e.target.value,
                                            })
                                        }
                                    />
                                    {formData.payment_condition ===
                                        "contado" && (
                                        <p className="text-xs text-slate-500 mt-1">
                                            Vence el mismo día de emisión
                                        </p>
                                    )}
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="mb-1.5 block">
                                        Notas / Observaciones
                                    </Label>
                                    <Input
                                        value={formData.notes}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                notes: e.target.value,
                                            })
                                        }
                                        placeholder="Opcional: notas adicionales para la factura"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="border-t border-slate-100 pt-4 mt-4">
                    {step === 1 ? (
                        <>
                            <Button variant="outline" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={selectedChargeIds.length === 0}
                            >
                                Siguiente
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button variant="ghost" onClick={() => setStep(1)}>
                                Atrás
                            </Button>
                            <Button
                                onClick={handleCreateInvoice}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Spinner className="mr-2" />
                                ) : (
                                    <Check className="mr-2 h-4 w-4" />
                                )}
                                Generar Factura
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BillingWizard;
