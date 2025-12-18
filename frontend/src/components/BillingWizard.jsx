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
} from "./ui";
import { formatCurrency, getTodayDate } from "../lib/utils";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { Check, AlertCircle, Calendar, CreditCard, Info } from "lucide-react";

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
            setCharges(response.data);
            // Select all by default
            setSelectedChargeIds(response.data.map((c) => c.id));
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
        let subtotal = 0;
        let iva = 0;
        let total = 0;

        charges.forEach((charge) => {
            if (selectedChargeIds.includes(charge.id)) {
                subtotal += parseFloat(charge.amount);
                iva += parseFloat(charge.iva);
                total += parseFloat(charge.total);
            }
        });

        return { subtotal, iva, total };
    }, [charges, selectedChargeIds]);

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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        Generar Factura - {serviceOrder?.order_number}
                    </DialogTitle>
                    <DialogDescription>
                        Seleccione los cargos a incluir y complete los datos
                        fiscales.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4 px-1">
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
                                <div className="border rounded-md overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 w-10 text-center">
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
                                                        className="rounded border-slate-300"
                                                    />
                                                </th>
                                                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                                                    Servicio / Descripción
                                                </th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                                                    IVA
                                                </th>
                                                <th className="px-4 py-3 text-right font-semibold text-slate-600">
                                                    Total
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {charges.map((charge) => (
                                                <tr
                                                    key={charge.id}
                                                    className={
                                                        selectedChargeIds.includes(
                                                            charge.id
                                                        )
                                                            ? "bg-blue-50/30"
                                                            : ""
                                                    }
                                                >
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedChargeIds.includes(
                                                                charge.id
                                                            )}
                                                            onChange={() =>
                                                                handleChargeToggle(
                                                                    charge.id
                                                                )
                                                            }
                                                            className="rounded border-slate-300"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-900">
                                                        <div className="font-medium">
                                                            {charge.description}
                                                        </div>
                                                        {charge.notes && (
                                                            <div className="text-xs text-slate-500 truncate max-w-md">
                                                                {charge.notes}
                                                            </div>
                                                        )}
                                                        <div className="text-[10px] text-slate-400 uppercase mt-0.5">
                                                            {charge.type ===
                                                            "service"
                                                                ? "Servicio"
                                                                : "Gasto"}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                                        {formatCurrency(
                                                            charge.amount
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                                                        {formatCurrency(
                                                            charge.iva
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-900">
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
                                                    className="px-4 py-3 text-right font-semibold text-slate-700"
                                                >
                                                    Total Seleccionado:
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                    {formatCurrency(
                                                        selectedTotals.subtotal
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                    {formatCurrency(
                                                        selectedTotals.iva
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-blue-700 text-lg">
                                                    {formatCurrency(
                                                        selectedTotals.total
                                                    )}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Step 2: Invoice Details */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-blue-700 font-medium">
                                        Monto a Facturar
                                    </p>
                                    <p className="text-2xl font-bold text-blue-800">
                                        {formatCurrency(selectedTotals.total)}
                                    </p>
                                </div>
                                <div className="text-right text-sm text-blue-600">
                                    {selectedChargeIds.length} cargos
                                    seleccionados
                                </div>
                            </div>

                            {/* Información del Cliente */}
                            {(clientPaymentCondition ||
                                clientCreditDays > 0) && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                                    <Info className="h-4 w-4 text-amber-600 flex-shrink-0" />
                                    <p className="text-sm text-amber-800">
                                        <span className="font-medium">
                                            {serviceOrder?.client_name ||
                                                "Cliente"}
                                            :
                                        </span>{" "}
                                        {clientPaymentCondition ===
                                        "contado" ? (
                                            "Pago al contado"
                                        ) : (
                                            <>
                                                {clientCreditDays} días de
                                                crédito
                                            </>
                                        )}
                                    </p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
