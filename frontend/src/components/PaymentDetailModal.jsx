/**
 * Modal de Detalle de Pago
 *
 * Muestra el desglose detallado de un pago registrado:
 * - Items pagados (servicios y gastos)
 * - Montos asignados a cada item
 * - Información del pago (método, fecha, referencia)
 * - Permite subir/actualizar el comprobante de pago
 */

import { useState, useEffect } from "react";
import Modal, { ModalFooter } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { FileUpload } from "./ui/FileUpload";
import {
    Receipt,
    Package,
    Truck,
    FileText,
    DollarSign,
    Calendar,
    CreditCard,
    Building2,
    FileCheck,
    Upload,
    ExternalLink,
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

const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
        const dateOnly = String(dateStr).split("T")[0];
        const parts = dateOnly.split("-");
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            const dateObj = new Date(year, month - 1, day);
            return dateObj.toLocaleDateString("es-SV", {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        }
        return dateStr;
    } catch {
        return dateStr;
    }
};

export function PaymentDetailModal({ isOpen, onClose, payment, onUpdate }) {
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [receiptFile, setReceiptFile] = useState(null);

    // Reset cuando se cierra el modal
    useEffect(() => {
        if (!isOpen) {
            setReceiptFile(null);
        }
    }, [isOpen]);

    const handleUploadReceipt = async () => {
        if (!receiptFile || !payment?.id) return;

        setIsUploadingReceipt(true);
        try {
            const formData = new FormData();
            formData.append("receipt_file", receiptFile);

            await axios.patch(
                `/orders/invoice-payments/${payment.id}/`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            toast.success("Comprobante actualizado exitosamente");
            setReceiptFile(null);
            onUpdate?.();
            onClose();
        } catch (error) {
            console.error("Error uploading receipt:", error);
            toast.error("Error al subir el comprobante");
        } finally {
            setIsUploadingReceipt(false);
        }
    };

    if (!payment) return null;

    // Debug: verificar qué datos llegan
    console.log("PaymentDetailModal - payment:", payment);
    console.log(
        "PaymentDetailModal - item_allocations:",
        payment.item_allocations
    );

    const hasItemAllocations =
        payment.item_allocations && payment.item_allocations.length > 0;

    // Obtener método de pago formateado
    const paymentMethodLabel =
        {
            transferencia: "Transferencia Bancaria",
            efectivo: "Efectivo",
            cheque: "Cheque",
            tarjeta: "Tarjeta de Crédito/Débito",
            deposito: "Depósito Bancario",
        }[payment.payment_method] || payment.payment_method;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Detalle del Gasto"
            size="lg"
        >
            <div className="space-y-5">
                {/* Header con información general */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                Monto Total
                            </div>
                            <div className="text-2xl font-bold text-slate-900 tabular-nums">
                                {formatCurrency(payment.amount)}
                            </div>
                        </div>
                        <div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
                                <Calendar className="w-3.5 h-3.5" />
                                Fecha de Pago
                            </div>
                            <div className="text-base font-semibold text-slate-700">
                                {formatDate(payment.payment_date)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Información del pago */}
                <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-500" />
                        Información del Pago
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="text-slate-500 block mb-1">
                                Método:
                            </span>
                            <span className="font-medium text-slate-700 block">
                                {paymentMethodLabel}
                            </span>
                        </div>
                        {payment.bank_name && (
                            <div>
                                <span className="text-slate-500 flex items-center gap-1 mb-1">
                                    <Building2 className="w-3.5 h-3.5" />
                                    Banco:
                                </span>
                                <span className="font-medium text-slate-700 block">
                                    {payment.bank_name}
                                </span>
                            </div>
                        )}
                        {payment.reference_number && (
                            <div>
                                <span className="text-slate-500 block mb-1">
                                    Referencia:
                                </span>
                                <span className="font-mono text-slate-700 block">
                                    {payment.reference_number}
                                </span>
                            </div>
                        )}
                        {payment.notes && (
                            <div className="sm:col-span-2">
                                <span className="text-slate-500 block mb-1">
                                    Notas:
                                </span>
                                <p className="text-slate-700">
                                    {payment.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Items asignados */}
                {hasItemAllocations ? (
                    <div>
                        <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-500" />
                            Desglose por Item
                        </h5>
                        <div className="border border-slate-200 rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase tracking-wide">
                                            Item
                                        </th>
                                        <th className="px-3 py-2 text-right text-xs font-medium text-slate-600 uppercase tracking-wide">
                                            Monto Pagado
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {payment.item_allocations.map(
                                        (allocation, idx) => (
                                            <tr
                                                key={idx}
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="px-3 py-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-shrink-0">
                                                            {allocation.item_type ===
                                                            "service" ? (
                                                                <div className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center">
                                                                    <Package className="w-3.5 h-3.5 text-slate-600" />
                                                                </div>
                                                            ) : (
                                                                <div className="w-7 h-7 rounded border border-slate-200 bg-white flex items-center justify-center">
                                                                    <Truck className="w-3.5 h-3.5 text-slate-600" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-medium text-slate-700 truncate">
                                                                {allocation.item_name ||
                                                                    "Item"}
                                                            </div>
                                                            <Badge
                                                                variant="outline"
                                                                size="sm"
                                                                className="mt-0.5"
                                                            >
                                                                {allocation.item_type ===
                                                                "service"
                                                                    ? "Servicio"
                                                                    : "Gasto"}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-right font-semibold tabular-nums text-slate-700">
                                                    {formatCurrency(
                                                        allocation.amount
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                        <td className="px-3 py-2 text-sm font-medium text-slate-600">
                                            Total
                                        </td>
                                        <td className="px-3 py-2 text-right text-base font-bold tabular-nums text-slate-900">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center text-sm text-slate-600">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                        <p>Pago general sin desglose por items</p>
                    </div>
                )}

                {/* Comprobante de pago */}
                <div>
                    <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-slate-500" />
                        Comprobante de Pago
                    </h5>

                    {payment.receipt_file ? (
                        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-sm">
                                <FileCheck className="w-5 h-5 text-slate-600" />
                                <span className="text-slate-700 font-medium">
                                    Comprobante disponible
                                </span>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    window.open(payment.receipt_file, "_blank")
                                }
                            >
                                <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                                Ver Documento
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm text-slate-600 text-center">
                                No se ha cargado comprobante para este pago
                            </div>
                            <FileUpload
                                accept=".pdf,.jpg,.jpeg,.png"
                                onFileChange={(file) => setReceiptFile(file)}
                                helperText="Sube el comprobante de pago (PDF, JPG, PNG)"
                            />
                            {receiptFile && (
                                <Button
                                    variant="default"
                                    className="w-full"
                                    onClick={handleUploadReceipt}
                                    disabled={isUploadingReceipt}
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    {isUploadingReceipt
                                        ? "Subiendo..."
                                        : "Subir Comprobante"}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <ModalFooter>
                <Button variant="outline" onClick={onClose}>
                    Cerrar
                </Button>
            </ModalFooter>
        </Modal>
    );
}

export default PaymentDetailModal;
