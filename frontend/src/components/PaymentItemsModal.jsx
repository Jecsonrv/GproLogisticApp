/**
 * Modal de Pago por Items
 *
 * Permite registrar pagos con desglose detallado por cada item de la factura
 * (servicios y gastos). Soporta:
 * - Pagos parciales por item específico
 * - Botón de "Pago Completo" que llena todos los montos pendientes
 * - Validación de que la suma de asignaciones coincida con el monto total
 */

import { useState, useEffect, useCallback } from "react";
import Modal, { ModalFooter } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import SelectERP from "./ui/SelectERP";
import { FileUpload } from "./ui/FileUpload";
import { Badge } from "./ui/Badge";
import {
    CheckCircle2,
    DollarSign,
    Package,
    Truck,
    AlertCircle,
    Receipt,
    FileText,
} from "lucide-react";
import axios from "../lib/axios";
import { toast } from "react-hot-toast";

const formatCurrency = (value) => {
    const num = parseFloat(value) || 0;
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(num);
};

const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
};

export function PaymentItemsModal({
    isOpen,
    onClose,
    invoice,
    banks = [],
    onPaymentSuccess,
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentItems, setPaymentItems] = useState([]);
    const [itemAllocations, setItemAllocations] = useState({});

    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: getTodayDate(),
        payment_method: "transferencia",
        bank: "",
        reference: "",
        notes: "",
        receipt_file: null,
    });

    // Cargar items de la factura cuando se abre el modal
    const fetchPaymentItems = useCallback(async () => {
        if (!invoice?.id) return;

        setIsLoading(true);
        try {
            const response = await axios.get(
                `/orders/invoices/${invoice.id}/payment_items/`
            );
            setPaymentItems(response.data.items || []);

            // Inicializar allocations vacías
            const initialAllocations = {};
            (response.data.items || []).forEach((item) => {
                initialAllocations[item.id] = "";
            });
            setItemAllocations(initialAllocations);
        } catch (error) {
            console.error("Error loading payment items:", error);
            toast.error("Error al cargar los items de la factura");
        } finally {
            setIsLoading(false);
        }
    }, [invoice?.id]);

    useEffect(() => {
        if (isOpen && invoice?.id) {
            fetchPaymentItems();
            // Reset form
            setPaymentForm({
                amount: "",
                payment_date: getTodayDate(),
                payment_method: "transferencia",
                bank: "",
                reference: "",
                notes: "",
                receipt_file: null,
            });
        }
    }, [isOpen, invoice?.id, fetchPaymentItems]);

    // Calcular suma de asignaciones
    const totalAllocated = Object.values(itemAllocations).reduce((sum, val) => {
        const num = parseFloat(val) || 0;
        return sum + num;
    }, 0);

    // Calcular total pendiente de items
    const totalPending = paymentItems.reduce((sum, item) => {
        return sum + parseFloat(item.pending || 0);
    }, 0);

    // Actualizar monto total cuando cambian las asignaciones
    useEffect(() => {
        if (totalAllocated > 0) {
            setPaymentForm((prev) => ({
                ...prev,
                amount: totalAllocated.toFixed(2),
            }));
        }
    }, [totalAllocated]);

    // Llenar todos los items con su monto pendiente
    const handleFillAll = () => {
        const newAllocations = {};
        paymentItems.forEach((item) => {
            const pending = parseFloat(item.pending) || 0;
            if (pending > 0) {
                newAllocations[item.id] = pending.toFixed(2);
            } else {
                newAllocations[item.id] = "";
            }
        });
        setItemAllocations(newAllocations);
    };

    // Limpiar todas las asignaciones
    const handleClearAll = () => {
        const newAllocations = {};
        paymentItems.forEach((item) => {
            newAllocations[item.id] = "";
        });
        setItemAllocations(newAllocations);
        setPaymentForm((prev) => ({ ...prev, amount: "" }));
    };

    // Actualizar asignación de un item
    const handleAllocationChange = (itemId, value) => {
        // Permitir el input vacío o valores mientras se escribe
        if (value === "" || value === ".") {
            setItemAllocations((prev) => ({
                ...prev,
                [itemId]: value,
            }));
            return;
        }

        const item = paymentItems.find((i) => i.id === itemId);
        const maxValue = parseFloat(item?.pending || 0);
        const numValue = parseFloat(value);

        // Validar solo si es un número válido
        if (!isNaN(numValue)) {
            // No permitir valores negativos ni mayores al pendiente
            if (numValue < 0) return;
            if (numValue > maxValue) {
                toast.error(
                    `El monto no puede exceder ${formatCurrency(maxValue)}`
                );
                return;
            }

            setItemAllocations((prev) => ({
                ...prev,
                [itemId]: value,
            }));
        }
    };

    // Enviar pago
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error("Ingrese un monto válido");
            return;
        }

        // Validar que se haya subido el comprobante
        if (!paymentForm.receipt_file) {
            toast.error("Debe subir el comprobante de pago");
            return;
        }

        // Validar que haya al menos una asignación si hay items
        const hasAllocations = Object.values(itemAllocations).some(
            (val) => parseFloat(val) > 0
        );

        if (paymentItems.length > 0 && !hasAllocations) {
            toast.error("Asigne el pago a al menos un item");
            return;
        }

        // Validar que la suma coincida con el monto total
        const paymentAmount = parseFloat(paymentForm.amount);
        if (Math.abs(totalAllocated - paymentAmount) > 0.01) {
            toast.error(
                `La suma de asignaciones ($${totalAllocated.toFixed(
                    2
                )}) no coincide con el monto del pago ($${paymentAmount.toFixed(
                    2
                )})`
            );
            return;
        }

        setIsSubmitting(true);
        try {
            // Construir array de asignaciones
            const allocationsArray = [];
            Object.entries(itemAllocations).forEach(([itemId, amount]) => {
                const numAmount = parseFloat(amount);
                if (numAmount > 0) {
                    const item = paymentItems.find((i) => i.id === itemId);
                    if (item) {
                        allocationsArray.push({
                            item_type: item.item_type,
                            item_id: item.item_id,
                            amount: numAmount,
                        });
                    }
                }
            });

            const formData = new FormData();
            formData.append("amount", paymentForm.amount);
            formData.append("payment_date", paymentForm.payment_date);
            formData.append("payment_method", paymentForm.payment_method);

            if (paymentForm.bank) {
                formData.append("bank", paymentForm.bank);
            }
            if (paymentForm.reference) {
                formData.append("reference", paymentForm.reference);
            }
            if (paymentForm.notes) {
                formData.append("notes", paymentForm.notes);
            }
            if (paymentForm.receipt_file) {
                formData.append("receipt_file", paymentForm.receipt_file);
            }

            // Agregar asignaciones como JSON
            if (allocationsArray.length > 0) {
                formData.append(
                    "item_allocations",
                    JSON.stringify(allocationsArray)
                );
            }

            await axios.post(
                `/orders/invoices/${invoice.id}/add_payment/`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            toast.success("Pago registrado exitosamente");
            onPaymentSuccess?.();
            onClose();
        } catch (error) {
            const errorMsg =
                error.response?.data?.error || "Error al registrar el pago";
            toast.error(errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!invoice) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Pago por Items"
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header con info de la factura */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded border border-slate-200 bg-white flex items-center justify-center">
                                <Receipt className="w-5 h-5 text-slate-600" />
                            </div>
                            <div>
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Factura
                                </p>
                                <p className="text-base font-semibold font-mono text-slate-900">
                                    {invoice.invoice_number}
                                </p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right">
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Saldo Pendiente
                            </p>
                            <p className="text-2xl font-bold tabular-nums text-slate-900">
                                {formatCurrency(invoice.balance)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Items de la factura */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            Asignar Pago por Item
                        </h4>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleClearAll}
                                className="text-xs"
                            >
                                Limpiar
                            </Button>
                            <Button
                                type="button"
                                variant="default"
                                size="sm"
                                onClick={handleFillAll}
                                className="text-xs"
                            >
                                Pago Completo
                            </Button>
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-8 text-slate-500">
                            Cargando items...
                        </div>
                    ) : paymentItems.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg">
                            <Package className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <p>No hay items en esta factura</p>
                        </div>
                    ) : (
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            {/* Header de la tabla */}
                            <div className="bg-slate-50 px-4 py-2.5 grid grid-cols-12 gap-2 text-xs font-medium text-slate-600 uppercase tracking-wide border-b border-slate-200">
                                <div className="col-span-1"></div>
                                <div className="col-span-4">Item</div>
                                <div className="col-span-2 text-right">
                                    Total
                                </div>
                                <div className="col-span-2 text-right">
                                    Pagado
                                </div>
                                <div className="col-span-3 text-right">
                                    Asignar
                                </div>
                            </div>

                            {/* Lista de items */}
                            <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                                {paymentItems.map((item) => {
                                    const pending =
                                        parseFloat(item.pending) || 0;
                                    const isPaid = pending <= 0;
                                    const allocation =
                                        itemAllocations[item.id] || "";
                                    const allocationNum =
                                        parseFloat(allocation) || 0;

                                    return (
                                        <div
                                            key={item.id}
                                            className={`px-4 py-3 grid grid-cols-12 gap-2 items-center ${
                                                isPaid
                                                    ? "bg-emerald-50/50"
                                                    : "hover:bg-slate-50"
                                            } transition-colors`}
                                        >
                                            {/* Icono tipo */}
                                            <div className="col-span-1">
                                                {item.item_type ===
                                                "service" ? (
                                                    <div className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center">
                                                        <Package className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 rounded border border-slate-200 bg-white flex items-center justify-center">
                                                        <Truck className="w-4 h-4 text-slate-600" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Nombre y descripción */}
                                            <div className="col-span-4">
                                                <p className="text-sm font-medium text-slate-700 truncate">
                                                    {item.name}
                                                </p>
                                                <p className="text-xs text-slate-500 truncate">
                                                    {item.description}
                                                </p>
                                                <Badge
                                                    variant="outline"
                                                    size="sm"
                                                    className="mt-1"
                                                >
                                                    {item.item_type ===
                                                    "service"
                                                        ? "Servicio"
                                                        : "Gasto"}
                                                </Badge>
                                            </div>

                                            {/* Total */}
                                            <div className="col-span-2 text-right">
                                                <p className="text-sm font-semibold text-slate-700 tabular-nums">
                                                    {formatCurrency(item.total)}
                                                </p>
                                            </div>

                                            {/* Pagado */}
                                            <div className="col-span-2 text-right">
                                                <p className="text-sm text-slate-500 tabular-nums">
                                                    {formatCurrency(item.paid)}
                                                </p>
                                            </div>

                                            {/* Input asignación */}
                                            <div className="col-span-3">
                                                {isPaid ? (
                                                    <div className="flex items-center justify-end gap-1.5 text-slate-600">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-xs font-medium">
                                                            Pagado
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="relative">
                                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                                                            $
                                                        </span>
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            max={pending}
                                                            value={allocation}
                                                            onChange={(e) =>
                                                                handleAllocationChange(
                                                                    item.id,
                                                                    e.target
                                                                        .value
                                                                )
                                                            }
                                                            className={`pl-5 text-right text-sm h-9 font-mono ${
                                                                allocationNum >
                                                                0
                                                                    ? "border-slate-400 bg-slate-50"
                                                                    : ""
                                                            }`}
                                                            placeholder={`Max: ${pending.toFixed(
                                                                2
                                                            )}`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer con totales */}
                            <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 grid grid-cols-12 gap-2 items-center">
                                <div className="col-span-7">
                                    <p className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                                        Total Asignado
                                    </p>
                                </div>
                                <div className="col-span-5 text-right">
                                    <p className="text-xl font-bold tabular-nums text-slate-900">
                                        {formatCurrency(totalAllocated)}
                                    </p>
                                    {totalAllocated > 0 &&
                                        totalAllocated < totalPending && (
                                            <p className="text-xs text-slate-500">
                                                Pendiente:{" "}
                                                {formatCurrency(
                                                    totalPending -
                                                        totalAllocated
                                                )}
                                            </p>
                                        )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Detalle del pago */}
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-slate-500" />
                        Detalle del Pago
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Monto total */}
                        <div>
                            <Label className="mb-1.5 block text-sm">
                                Monto Total del Pago *
                            </Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    max={invoice.balance}
                                    value={paymentForm.amount}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            amount: e.target.value,
                                        })
                                    }
                                    className="pl-9 font-mono font-semibold text-lg"
                                    readOnly
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                                Calculado automáticamente de las asignaciones
                            </p>
                        </div>

                        {/* Fecha */}
                        <div>
                            <Label className="mb-1.5 block text-sm">
                                Fecha de Pago *
                            </Label>
                            <Input
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_date: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        {/* Método de pago */}
                        <div>
                            <Label className="mb-1.5 block text-sm">
                                Método de Pago *
                            </Label>
                            <SelectERP
                                value={paymentForm.payment_method}
                                onChange={(val) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_method: val,
                                    })
                                }
                                options={[
                                    {
                                        id: "transferencia",
                                        name: "Transferencia Bancaria",
                                    },
                                    { id: "efectivo", name: "Efectivo" },
                                    { id: "cheque", name: "Cheque" },
                                    {
                                        id: "tarjeta",
                                        name: "Tarjeta de Crédito/Débito",
                                    },
                                    {
                                        id: "deposito",
                                        name: "Depósito Bancario",
                                    },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                required
                            />
                        </div>

                        {/* Referencia */}
                        <div>
                            <Label className="mb-1.5 block text-sm">
                                Referencia / No. Documento
                            </Label>
                            <Input
                                value={paymentForm.reference}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        reference: e.target.value,
                                    })
                                }
                                placeholder="Ej: TRANS-12345"
                                className="font-mono"
                            />
                        </div>

                        {/* Banco (si aplica) */}
                        {["transferencia", "cheque", "deposito"].includes(
                            paymentForm.payment_method
                        ) && (
                            <div>
                                <Label className="mb-1.5 block text-sm">
                                    Banco{" "}
                                    {["transferencia", "cheque"].includes(
                                        paymentForm.payment_method
                                    )
                                        ? "*"
                                        : ""}
                                </Label>
                                <SelectERP
                                    value={paymentForm.bank}
                                    onChange={(val) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            bank: val || "",
                                        })
                                    }
                                    options={banks}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    required={[
                                        "transferencia",
                                        "cheque",
                                    ].includes(paymentForm.payment_method)}
                                    clearable
                                />
                            </div>
                        )}

                        {/* Notas */}
                        <div className="sm:col-span-2">
                            <Label className="mb-1.5 block text-sm">
                                Notas Adicionales
                            </Label>
                            <Input
                                value={paymentForm.notes}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        notes: e.target.value,
                                    })
                                }
                                placeholder="Observaciones adicionales..."
                            />
                        </div>

                        {/* Comprobante */}
                        <div className="sm:col-span-2">
                            <Label className="mb-1.5 block text-sm">
                                Comprobante de Pago *
                            </Label>
                            <FileUpload
                                accept=".pdf,.jpg,.jpeg,.png"
                                onFileChange={(file) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        receipt_file: file,
                                    })
                                }
                                helperText="Sube el soporte del pago (PDF, JPG, PNG) - Obligatorio"
                            />
                        </div>
                    </div>
                </div>

                {/* Preview del impacto */}
                {totalAllocated > 0 && (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                {parseFloat(invoice.balance) - totalAllocated <=
                                0.01 ? (
                                    <>
                                        <CheckCircle2 className="w-5 h-5 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-700">
                                            La factura será marcada como pagada
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <AlertCircle className="w-5 h-5 text-slate-600" />
                                        <span className="text-sm font-medium text-slate-700">
                                            Pago parcial - Quedará saldo
                                            pendiente
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-500">
                                    Nuevo Saldo
                                </p>
                                <p className="text-lg font-bold text-slate-900 tabular-nums">
                                    {formatCurrency(
                                        Math.max(
                                            0,
                                            parseFloat(invoice.balance) -
                                                totalAllocated
                                        )
                                    )}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <ModalFooter>
                    <Button type="button" variant="outline" onClick={onClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        variant="default"
                        disabled={isSubmitting || totalAllocated <= 0}
                        className="min-w-[160px]"
                    >
                        {isSubmitting ? "Procesando..." : "Confirmar Pago"}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

export default PaymentItemsModal;
