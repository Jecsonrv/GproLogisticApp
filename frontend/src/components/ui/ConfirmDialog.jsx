import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./Button";

/**
 * ConfirmDialog - Diálogo de confirmación profesional estilo CRM
 * @param {boolean} open - Si el diálogo está abierto
 * @param {function} onClose - Función para cerrar el diálogo
 * @param {function} onConfirm - Función a ejecutar al confirmar
 * @param {string} title - Título del diálogo
 * @param {string} description - Descripción/mensaje del diálogo
 * @param {string} confirmText - Texto del botón de confirmar (default: "Confirmar")
 * @param {string} cancelText - Texto del botón de cancelar (default: "Cancelar")
 * @param {string} variant - Variante del botón ('danger' | 'warning' | 'primary')
 */
const ConfirmDialog = ({
    open = false,
    onClose,
    onConfirm,
    title = "¿Estás seguro?",
    description = "Esta acción no se puede deshacer.",
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = "danger",
}) => {
    if (!open) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    const variantStyles = {
        danger: "bg-danger-600 hover:bg-danger-700 text-white shadow-sm",
        warning: "bg-warning-600 hover:bg-warning-700 text-white shadow-sm",
        primary: "bg-brand-600 hover:bg-brand-700 text-white shadow-sm",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative z-50 w-full max-w-md">
                <div className="bg-white rounded-lg shadow-xl border border-slate-200">
                    {/* Header */}
                    <div className="flex items-start justify-between p-6 pb-4">
                        <div className="flex items-start gap-4">
                            <div
                                className={`p-3 rounded-full ${
                                    variant === "danger"
                                        ? "bg-danger-50"
                                        : variant === "warning"
                                        ? "bg-warning-50"
                                        : "bg-brand-50"
                                }`}
                            >
                                <AlertTriangle
                                    className={`h-6 w-6 ${
                                        variant === "danger"
                                            ? "text-danger-600"
                                            : variant === "warning"
                                            ? "text-warning-600"
                                            : "text-brand-600"
                                    }`}
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {title}
                                </h3>
                                <p className="mt-2 text-sm text-slate-600">
                                    {description}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Footer con botones */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 rounded-b-lg">
                        <Button variant="outline" onClick={onClose}>
                            {cancelText}
                        </Button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${variantStyles[variant]}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
