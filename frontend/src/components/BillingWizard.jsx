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
import { Check, AlertCircle, Calendar, CreditCard, Info, FileText, Building2 } from "lucide-react";

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

            setFormData({
                invoice_number: "",
                invoice_type: "DTE",
                issue_date: today,
                due_date: calculateDueDate(today, creditDays, paymentCond),
                payment_condition: paymentCond,
                notes: "",
            });
            fetchCharges();
        }
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
            toast.error("Error al cargar los cargos disponibles");
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
        let iva = 0;
        let total = 0;

        // Validar que charges sea un array
        if (Array.isArray(charges)) {
            charges.forEach((charge) => {
                if (selectedChargeIds.includes(charge.id)) {
                    const amount = parseFloat(charge.amount);
                    const ivaAmount = parseFloat(charge.iva);

                    // Separar servicios de gastos de terceros
                    if (charge.type === 'service') {
                        subtotalServicios += amount;
                    } else if (charge.type === 'expense') {
                        subtotalTerceros += amount;
                    }

                    iva += ivaAmount;
                    total += parseFloat(charge.total);
                }
            });
        }

        const subtotal = subtotalServicios + subtotalTerceros;

        // Calcular retención del 1% para Gran Contribuyente
        // SOLO sobre servicios (NO sobre gastos de terceros)
        const RETENCION_THRESHOLD = 100.00;
        const RETENCION_RATE = 0.01;

        const isGranContribuyente = serviceOrder?.client_is_gran_contribuyente || false;
        const isDTE = formData.invoice_type === 'DTE';

        let retencion = 0;
        if (isGranContribuyente && isDTE && subtotalServicios > RETENCION_THRESHOLD) {
            retencion = subtotalServicios * RETENCION_RATE;
        }

        const totalAPagar = total - retencion;

        return {
            subtotalServicios,
            subtotalTerceros,
            subtotal,
            iva,
            retencion,
            total,
            totalAPagar
        };
    }, [charges, selectedChargeIds, serviceOrder?.client_is_gran_contribuyente, formData.invoice_type]);

    const handleCreateInvoice = async () => {
        if (selectedChargeIds.length === 0) {
            toast.error("Seleccione al menos un cargo");
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
            toast.success("Factura generada correctamente");
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
                    toast.error(errorMessages || "Error al crear factura");
                } else {
                    toast.error(
                        errors.error ||
                            errors.detail ||
                            "Error al crear factura"
                    );
                }
            } else {
                toast.error("Error al crear factura");
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
                                                                charges.length > 0
                                                            }
                                                            onChange={(e) => {
                                                                if (
                                                                    e.target.checked
                                                                ) {
                                                                    setSelectedChargeIds(
                                                                        charges.map(
                                                                            (c) =>
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
                                                {charges.map((charge) => (
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
                                                        onClick={() => handleChargeToggle(charge.id)}
                                                    >
                                                        <td className="px-4 py-2.5 text-center">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedChargeIds.includes(
                                                                    charge.id
                                                                )}
                                                                onChange={(e) => {
                                                                    e.stopPropagation();
                                                                    handleChargeToggle(charge.id);
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
                                                                            ? "default"
                                                                            : "secondary"
                                                                    }
                                                                    className="text-[10px] px-1.5 py-0 uppercase"
                                                                >
                                                                    {charge.type === "service" ? "Servicio" : "Gasto"}
                                                                </Badge>
                                                                <span className="font-medium text-slate-700">{charge.description}</span>
                                                            </div>
                                                            {charge.notes && (
                                                                <div className="text-[11px] text-slate-500 mt-0.5 ml-14 truncate max-w-md">
                                                                    {charge.notes}
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
                                                                charge.iva
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2.5 text-right tabular-nums font-bold text-slate-900">
                                                            {formatCurrency(
                                                                charge.total
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
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
                            <div className="bg-slate-50 p-5 rounded border border-slate-300">
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-300">
                                    <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                        Desglose Fiscal
                                    </h3>
                                    <span className="text-xs text-slate-500 font-medium">
                                        {selectedChargeIds.length} items
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {/* Subtotales */}
                                    {selectedTotals.subtotalServicios > 0 && (
                                        <div className="flex justify-between text-sm py-1">
                                            <span className="text-slate-600 font-medium">Subtotal Servicios:</span>
                                            <span className="font-medium text-slate-900 tabular-nums">
                                                {formatCurrency(selectedTotals.subtotalServicios)}
                                            </span>
                                        </div>
                                    )}
                                    {selectedTotals.subtotalTerceros > 0 && (
                                        <div className="flex justify-between text-sm py-1">
                                            <span className="text-slate-600 font-medium">Gastos Reembolsables:</span>
                                            <span className="font-medium text-slate-900 tabular-nums">
                                                {formatCurrency(selectedTotals.subtotalTerceros)}
                                            </span>
                                        </div>
                                    )}

                                    <div className="flex justify-between text-sm py-1.5 border-t border-slate-300 mt-2">
                                        <span className="text-slate-700 font-semibold">Subtotal:</span>
                                        <span className="font-semibold text-slate-900 tabular-nums">
                                            {formatCurrency(selectedTotals.subtotal)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm py-1">
                                        <span className="text-slate-600 font-medium">IVA (13%):</span>
                                        <span className="font-medium text-slate-900 tabular-nums">
                                            {formatCurrency(selectedTotals.iva)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-sm py-1.5 border-t border-slate-300 mt-2">
                                        <span className="text-slate-800 font-semibold">Total Bruto:</span>
                                        <span className="text-slate-900 font-semibold tabular-nums">
                                            {formatCurrency(selectedTotals.total)}
                                        </span>
                                    </div>

                                    {/* Retención 1% */}
                                    {selectedTotals.retencion > 0 && (
                                        <>
                                            <div className="flex justify-between text-sm py-1 border-t border-slate-300 mt-2">
                                                <span className="font-medium flex items-center gap-1 text-slate-600">
                                                    <AlertCircle className="w-3 h-3" />
                                                    Retención 1%:
                                                </span>
                                                <span className="font-medium tabular-nums text-slate-700">
                                                    - {formatCurrency(selectedTotals.retencion)}
                                                </span>
                                            </div>

                                            <div className="flex justify-between text-base py-2.5 border-t-2 border-slate-400 mt-3 bg-slate-100 -mx-5 px-5">
                                                <span className="font-bold text-slate-800 uppercase text-sm">Total a Pagar:</span>
                                                <span className="tabular-nums font-bold text-slate-900">
                                                    {formatCurrency(selectedTotals.totalAPagar)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Información del Cliente */}
                            {(clientPaymentCondition ||
                                clientCreditDays > 0) && (
                                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-100 border border-slate-300 rounded">
                                    <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
                                    <p className="text-sm text-slate-700">
                                        <span className="font-semibold">
                                            {serviceOrder?.client_name ||
                                                "Cliente"}:
                                        </span>{" "}
                                        {clientPaymentCondition ===
                                        "contado" ? (
                                            "Pago al contado"
                                        ) : (
                                            <>
                                                {clientCreditDays} días de crédito
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label className="flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-slate-400" />
                                        Tipo de Factura
                                    </Label>
                                    <SelectERP
                                        options={[
                                            { id: "DTE", name: "DTE (Documento Tributario Electrónico)" },
                                            { id: "FEX", name: "FEX (Factura de Exportación)" },
                                            { id: "INTL", name: "Factura Internacional" },
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
                                    {formData.invoice_type === 'DTE' && serviceOrder?.client_is_gran_contribuyente && selectedTotals.retencion > 0 && (
                                        <p className="text-xs text-slate-600 mt-1.5 flex items-center gap-1 bg-slate-100 px-2 py-1 rounded">
                                            <AlertCircle className="w-3 h-3" />
                                            Se aplicará retención del 1%
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>No. DTE / Factura (Opcional)</Label>
                                    <Input
                                        value={formData.invoice_number}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                invoice_number: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: DTE-12345678"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">
                                        Dejar vacío para generar{" "}
                                        <strong>
                                            PRE-00XXX-{new Date().getFullYear()}
                                        </strong>
                                        .
                                    </p>
                                </div>
                                <div>
                                    <Label className="flex items-center gap-2">
                                        <CreditCard className="h-4 w-4 text-slate-400" />
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
                                    <Label className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
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
                                    <Label className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-slate-400" />
                                        Fecha de Vencimiento
                                        {formData.payment_condition ===
                                            "credito" &&
                                            clientCreditDays > 0 && (
                                                <span className="text-xs font-normal text-slate-400">
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
                                <div className="col-span-2">
                                    <Label>Notas / Observaciones</Label>
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
