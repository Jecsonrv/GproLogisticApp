import React from "react";
import { AlertTriangle, X, Info, AlertCircle } from "lucide-react";
import { Button } from "./Button";

/**
 * ConfirmDialog - Diálogo de confirmación profesional estilo ERP
 * @param {boolean} open - Si el diálogo está abierto
 * @param {function} onClose - Función para cerrar el diálogo
 * @param {function} onConfirm - Función a ejecutar al confirmar
 * @param {string} title - Título del diálogo
 * @param {string} description - Descripción/mensaje del diálogo
 * @param {string} confirmText - Texto del botón de confirmar (default: "Confirmar")
 * @param {string} cancelText - Texto del botón de cancelar (default: "Cancelar")
 * @param {string} variant - Variante del botón ('danger' | 'warning' | 'primary' | 'info')
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

    // Configuración de variantes con iconos y colores profesionales
    const variantConfig = {
        danger: {
            icon: AlertTriangle,
            iconBg: "bg-red-50",
            iconColor: "text-red-600",
            buttonBg: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
            borderColor: "border-red-100",
        },
        warning: {
            icon: AlertCircle,
            iconBg: "bg-amber-50",
            iconColor: "text-amber-600",
            buttonBg: "bg-amber-600 hover:bg-amber-700 focus:ring-amber-500",
            borderColor: "border-amber-100",
        },
        primary: {
            icon: Info,
            iconBg: "bg-blue-50",
            iconColor: "text-blue-600",
            buttonBg: "bg-blue-600 hover:bg-blue-700 focus:ring-blue-500",
            borderColor: "border-blue-100",
        },
        info: {
            icon: Info,
            iconBg: "bg-sky-50",
            iconColor: "text-sky-600",
            buttonBg: "bg-sky-600 hover:bg-sky-700 focus:ring-sky-500",
            borderColor: "border-sky-100",
        },
    };

    const config = variantConfig[variant] || variantConfig.danger;
    const IconComponent = config.icon;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 transition-opacity duration-200"
            onClick={onClose}
            style={{ margin: 0 }}
        >
            {/* Dialog Container - Responsive */}
            <div
                className="relative w-full max-w-md transform transition-all duration-200 ease-out"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`bg-white rounded-lg sm:rounded-xl shadow-2xl border ${config.borderColor}`}
                >
                    {/* Header con diseño profesional - Mobile Optimized */}
                    <div className="relative px-4 sm:px-6 pt-4 sm:pt-6 pb-4 sm:pb-5">
                        {/* Botón cerrar - Más discreto */}
                        <button
                            onClick={onClose}
                            className="absolute right-3 sm:right-4 top-3 sm:top-4 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-all duration-200"
                            aria-label="Cerrar"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        {/* Icono y contenido - Responsive */}
                        <div className="flex items-start gap-3 sm:gap-4 pr-8 sm:pr-8">
                            {/* Icono con diseño moderno */}
                            <div
                                className={`flex-shrink-0 ${config.iconBg} rounded-lg p-2.5 sm:p-3 shadow-sm`}
                            >
                                <IconComponent
                                    className={`h-5 w-5 sm:h-6 sm:w-6 ${config.iconColor}`}
                                    strokeWidth={2}
                                />
                            </div>

                            {/* Contenido */}
                            <div className="flex-1 pt-0.5 min-w-0">
                                <h3 className="text-base sm:text-lg font-semibold text-slate-900 leading-tight sm:leading-6">
                                    {title}
                                </h3>
                                <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                                    {description}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer con botones mejorados - Mobile First */}
                    <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 bg-slate-50/50 border-t border-slate-100">
                        <button
                            onClick={onClose}
                            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all duration-200"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`w-full sm:w-auto px-4 py-2 sm:py-2.5 text-sm font-medium text-white rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ${config.buttonBg}`}
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
