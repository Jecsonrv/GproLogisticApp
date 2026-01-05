import React, { useState, useEffect, useMemo } from "react";
import {
    Receipt,
    FileText,
    Calendar,
    DollarSign,
    AlertTriangle,
    CheckCircle,
    Hash,
    MessageSquare,
    Upload,
    FileMinus,
    Clock,
} from "lucide-react";
import {
    Button,
    Input,
    Label,
    Badge,
    Modal,
    ModalFooter,
    FileUpload,
    SelectERP,
} from "./ui";
import api from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, getTodayDate, cn } from "../lib/utils";

// Opciones de motivo predefinidas para NC
const REASON_OPTIONS = [
    { id: "Devolución de Servicios", name: "Devolución de Servicios" },
    { id: "Descuento Comercial", name: "Descuento Comercial" },
    { id: "Error en Precio/Facturación", name: "Error en Precio/Facturación" },
    { id: "Bonificación", name: "Bonificación" },
    { id: "Ajuste de Saldo", name: "Ajuste de Saldo" },
    { id: "Anulación Parcial", name: "Anulación Parcial" },
    { id: "Otro", name: "Otro (especificar)" },
];

/**
 * CreditNoteModal - Modal profesional para gestión de Notas de Crédito
 *
 * @param {boolean} isOpen - Controla visibilidad del modal
 * @param {function} onClose - Callback al cerrar
 * @param {object} invoice - Factura seleccionada (requerido)
 * @param {function} onSuccess - Callback al crear/editar exitosamente
 * @param {object} editingCreditNote - NC a editar (null para crear nueva)
 */
const CreditNoteModal = ({
    isOpen,
    onClose,
    invoice,
    onSuccess,
    editingCreditNote = null,
}) => {
    const isEditing = !!editingCreditNote;

    // Form state
    const [form, setForm] = useState({
        note_number: "",
        amount: "",
        issue_date: getTodayDate(),
        reason: "",
        custom_reason: "",
        pdf_file: null,
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState({});

    // Reset form cuando cambia la factura o se abre/cierra
    useEffect(() => {
        if (isOpen) {
            if (editingCreditNote) {
                // Modo edición: cargar datos existentes
                const standardReason = REASON_OPTIONS.find(opt => opt.id === editingCreditNote.reason);
                
                setForm({
                    note_number: editingCreditNote.note_number || "",
                    amount: editingCreditNote.amount || "",
                    issue_date: editingCreditNote.issue_date || getTodayDate(),
                    reason: standardReason ? editingCreditNote.reason : "Otro",
                    custom_reason: standardReason ? "" : editingCreditNote.reason || "",
                    pdf_file: null,
                });
            } else {
                // Modo creación: limpiar formulario
                setForm({
                    note_number: "",
                    amount: "",
                    issue_date: getTodayDate(),
                    reason: "",
                    custom_reason: "",
                    pdf_file: null,
                });
            }
            setErrors({});
        }
    }, [isOpen, editingCreditNote]);

    // Calcular máximo acreditable
    const maxCreditable = useMemo(() => {
        if (!invoice) return 0;

        if (isEditing && editingCreditNote) {
            // En edición, el máximo es el saldo + el monto original de la NC
            return parseFloat(invoice.balance || 0) + parseFloat(editingCreditNote.amount || 0);
        }

        return parseFloat(invoice.balance || 0);
    }, [invoice, isEditing, editingCreditNote]);

    // Validar formulario
    const validateForm = () => {
        const newErrors = {};

        if (!form.note_number.trim()) {
            newErrors.note_number = "El número de NC es requerido";
        }

        if (!form.amount || parseFloat(form.amount) <= 0) {
            newErrors.amount = "El monto debe ser mayor a cero";
        } else if (parseFloat(form.amount) > maxCreditable) {
            newErrors.amount = `El monto no puede exceder ${formatCurrency(maxCreditable)}`;
        }

        if (!form.issue_date) {
            newErrors.issue_date = "La fecha es requerida";
        }

        if (!form.reason) {
            newErrors.reason = "El motivo es requerido";
        } else if (form.reason === "Otro" && !form.custom_reason.trim()) {
            newErrors.custom_reason = "Especifique el motivo";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Manejar envío
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm() || isSubmitting || !invoice) return;

        try {
            setIsSubmitting(true);

            const finalReason = form.reason === "Otro" ? form.custom_reason.trim() : form.reason;

            const formData = new FormData();
            formData.append("amount", form.amount);
            formData.append("note_number", form.note_number.trim());
            formData.append("reason", finalReason);
            formData.append("issue_date", form.issue_date);

            if (form.pdf_file) {
                formData.append("pdf_file", form.pdf_file);
            }

            if (isEditing) {
                // Actualizar NC existente
                await api.patch(
                    `/orders/credit-notes/${editingCreditNote.id}/`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                toast.success("Nota de crédito actualizada correctamente");
            } else {
                // Crear nueva NC
                await api.post(
                    `/orders/invoices/${invoice.id}/add_credit_note/`,
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                toast.success("Nota de crédito registrada correctamente");
            }

            onSuccess?.();
            onClose();
        } catch (error) {
            // El interceptor de axios ya muestra el error
            console.error("Error al procesar NC:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Aplicar monto total (saldo completo)
    const applyFullBalance = () => {
        setForm({ ...form, amount: maxCreditable.toFixed(2) });
    };

    if (!invoice) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEditing ? "Editar Nota de Crédito" : "Registrar Nota de Crédito"}
            size="2xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Header - Información de la Factura */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl p-5 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
                                <Receipt className="w-6 h-6 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                                    Aplicar a Factura
                                </p>
                                <p className="text-lg font-bold text-slate-800 font-mono tracking-tight">
                                    {invoice.invoice_number || "Sin número"}
                                </p>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    {invoice.client_name}
                                </p>
                            </div>
                        </div>
                        <div className="text-left sm:text-right space-y-1">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Total Facturado
                                </p>
                                <p className="text-sm font-semibold text-slate-600 tabular-nums">
                                    {formatCurrency(invoice.total_amount)}
                                </p>
                            </div>
                            <div className="pt-1 border-t border-slate-200">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    Saldo Ajustable
                                </p>
                                <p className="text-2xl font-black text-slate-900 tabular-nums tracking-tight">
                                    {formatCurrency(maxCreditable)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Indicadores de estado */}
                    <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-slate-200">
                        {invoice.credited_amount > 0 && (
                            <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                <FileMinus className="w-3 h-3 mr-1" />
                                NC Previas: {formatCurrency(invoice.credited_amount)}
                            </Badge>
                        )}
                        {invoice.paid_amount > 0 && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Pagado: {formatCurrency(invoice.paid_amount)}
                            </Badge>
                        )}
                        {invoice.retencion > 0 && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                                <DollarSign className="w-3 h-3 mr-1" />
                                Retención: {formatCurrency(invoice.retencion)}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Formulario */}
                <div className="space-y-5">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Datos de la Nota de Crédito
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Número de NC */}
                            <div>
                                <Label className="mb-1.5 block text-slate-700">
                                    <Hash className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                                    Número de NC *
                                </Label>
                                <Input
                                    value={form.note_number}
                                    onChange={(e) =>
                                        setForm({ ...form, note_number: e.target.value })
                                    }
                                    placeholder="Ej: NC-00123"
                                    className={cn(
                                        "font-mono uppercase",
                                        errors.note_number && "border-red-300 focus:border-red-500"
                                    )}
                                />
                                {errors.note_number && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {errors.note_number}
                                    </p>
                                )}
                            </div>

                            {/* Fecha de Emisión */}
                            <div>
                                <Label className="mb-1.5 block text-slate-700">
                                    <Calendar className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                                    Fecha de Emisión *
                                </Label>
                                <Input
                                    type="date"
                                    value={form.issue_date}
                                    onChange={(e) =>
                                        setForm({ ...form, issue_date: e.target.value })
                                    }
                                    className={errors.issue_date && "border-red-300"}
                                />
                                {errors.issue_date && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {errors.issue_date}
                                    </p>
                                )}
                            </div>

                            {/* Monto a Acreditar */}
                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <Label className="text-slate-700">
                                        <DollarSign className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                                        Monto a Acreditar *
                                    </Label>
                                    <button
                                        type="button"
                                        onClick={applyFullBalance}
                                        className="text-xs text-slate-500 hover:text-slate-900 font-medium transition-colors"
                                    >
                                        Aplicar saldo completo
                                    </button>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-lg">
                                        $
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0.01"
                                        max={maxCreditable}
                                        value={form.amount}
                                        onChange={(e) =>
                                            setForm({ ...form, amount: e.target.value })
                                        }
                                        className={cn(
                                            "pl-8 font-mono font-bold text-lg text-slate-900 h-12",
                                            errors.amount && "border-red-300 focus:border-red-500"
                                        )}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="flex items-center justify-between mt-1.5">
                                    {errors.amount ? (
                                        <p className="text-xs text-red-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {errors.amount}
                                        </p>
                                    ) : (
                                        <p className="text-[11px] text-slate-500">
                                            Máximo acreditable: {formatCurrency(maxCreditable)}
                                        </p>
                                    )}
                                    {form.amount && parseFloat(form.amount) > 0 && (
                                        <p className="text-[11px] text-slate-500">
                                            Nuevo saldo: {formatCurrency(maxCreditable - parseFloat(form.amount || 0))}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Motivo / Razón (Select) */}
                            <div className="md:col-span-2">
                                <Label className="mb-1.5 block text-slate-700">
                                    <MessageSquare className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                                    Motivo / Razón *
                                </Label>
                                <SelectERP
                                    value={form.reason}
                                    onChange={(val) => setForm({ ...form, reason: val })}
                                    options={REASON_OPTIONS}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    placeholder="Seleccionar motivo..."
                                    className={errors.reason && "border-red-300"}
                                />
                                {errors.reason && (
                                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" />
                                        {errors.reason}
                                    </p>
                                )}
                            </div>

                            {/* Custom Reason (si se selecciona "Otro") */}
                            {form.reason === "Otro" && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                    <Label className="mb-1.5 block text-slate-700">
                                        Especifique el motivo *
                                    </Label>
                                    <Input
                                        value={form.custom_reason}
                                        onChange={(e) => setForm({ ...form, custom_reason: e.target.value })}
                                        placeholder="Describa el motivo detalladamente..."
                                        className={errors.custom_reason && "border-red-300"}
                                        autoFocus
                                    />
                                    {errors.custom_reason && (
                                        <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            {errors.custom_reason}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Documento PDF */}
                            <div className="md:col-span-2">
                                <Label className="mb-1.5 block text-slate-700">
                                    <Upload className="w-3.5 h-3.5 inline mr-1.5 text-slate-400" />
                                    Documento Digital (PDF)
                                </Label>
                                <FileUpload
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onFileChange={(file) =>
                                        setForm({ ...form, pdf_file: file })
                                    }
                                    helperText="Suba la copia digital de la nota de crédito (PDF, JPG, PNG - máx 5MB)"
                                />
                                {isEditing && editingCreditNote?.pdf_file && !form.pdf_file && (
                                    <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                                        <FileText className="w-3.5 h-3.5" />
                                        Documento existente adjunto. Suba uno nuevo para reemplazarlo.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Resumen de la operación */}
                {form.amount && parseFloat(form.amount) > 0 && (
                    <div className="bg-slate-900 text-white rounded-xl p-4 shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                    <FileMinus className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase tracking-wider">
                                        {isEditing ? "Actualizar Nota de Crédito" : "Nueva Nota de Crédito"}
                                    </p>
                                    <p className="text-sm font-medium">
                                        {form.note_number || "Sin número"}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase tracking-wider">
                                    Monto a Acreditar
                                </p>
                                <p className="text-2xl font-bold tabular-nums">
                                    -{formatCurrency(form.amount)}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <ModalFooter>
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="text-slate-500 font-semibold"
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || !form.amount || parseFloat(form.amount) <= 0}
                        className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[180px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Clock className="w-4 h-4 mr-2 animate-spin" />
                                Procesando...
                            </>
                        ) : isEditing ? (
                            "Actualizar Nota"
                        ) : (
                            "Registrar Nota de Crédito"
                        )}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
};

export default CreditNoteModal;
