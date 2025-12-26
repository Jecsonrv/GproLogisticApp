import React, { useState } from "react";
import { Download, ChevronDown, FileSpreadsheet, Filter } from "lucide-react";
import { cn } from "../../lib/utils";

/**
 * ExportButton - Componente de exportación profesional con dropdown
 * Diseño uniforme basado en AccountStatements
 *
 * @param {Object} props
 * @param {Function} props.onExportAll - Callback para exportar todos los datos
 * @param {Function} props.onExportFiltered - Callback para exportar datos filtrados
 * @param {number} props.filteredCount - Cantidad de registros filtrados
 * @param {number} props.totalCount - Cantidad total de registros
 * @param {boolean} props.isExporting - Estado de exportación activa
 * @param {boolean} props.disabled - Deshabilitar botón
 * @param {string} props.allLabel - Etiqueta para opción "exportar todo"
 * @param {string} props.allDescription - Descripción para opción "exportar todo"
 * @param {string} props.filteredLabel - Etiqueta para opción "exportar filtrado"
 * @param {string} props.filteredDescription - Descripción para opción "exportar filtrado"
 */
const ExportButton = ({
    onExportAll,
    onExportFiltered,
    filteredCount = 0,
    totalCount = 0,
    isExporting = false,
    disabled = false,
    allLabel = "Exportar Todo",
    allDescription = "Exportar todos los registros",
    filteredLabel = "Registros Filtrados",
    filteredDescription = "Exportar solo los registros visibles",
    className = "",
}) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleExportAll = () => {
        setIsMenuOpen(false);
        onExportAll?.();
    };

    const handleExportFiltered = () => {
        setIsMenuOpen(false);
        onExportFiltered?.();
    };

    const isDisabled = disabled || isExporting || totalCount === 0;

    return (
        <div className={cn("relative", className)}>
            <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                disabled={isDisabled}
                className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium",
                    "bg-white border border-slate-300 rounded-sm text-slate-700",
                    "hover:bg-slate-50 hover:border-slate-400",
                    "shadow-sm transition-all duration-150",
                    "focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-1",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white",
                    isMenuOpen && "bg-slate-50 border-slate-400"
                )}
            >
                <Download
                    className={cn(
                        "w-4 h-4 text-slate-600",
                        isExporting && "animate-bounce"
                    )}
                />
                <span>Exportar</span>
                <ChevronDown
                    className={cn(
                        "w-4 h-4 text-slate-500 transition-transform duration-200",
                        isMenuOpen && "rotate-180"
                    )}
                />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && !isExporting && !isDisabled && (
                <>
                    {/* Overlay para cerrar al hacer click afuera */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsMenuOpen(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 z-20 overflow-hidden">
                        {/* Header */}
                        <div className="px-4 py-2.5 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                            <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                Opciones de Exportación
                            </p>
                        </div>

                        <div className="p-2">
                            {/* Opción 1: Exportar Todo */}
                            <button
                                onClick={handleExportAll}
                                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-blue-50 rounded-lg transition-colors text-left group"
                            >
                                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                    <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {allLabel}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {allDescription}
                                        {totalCount > 0 && (
                                            <span className="font-medium text-slate-700">
                                                {" "}
                                                ({totalCount.toLocaleString()}{" "}
                                                registro{totalCount !== 1 ? "s" : ""})
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </button>

                            {/* Opción 2: Exportar Filtrados */}
                            <button
                                onClick={handleExportFiltered}
                                disabled={filteredCount === 0}
                                className="w-full flex items-start gap-3 px-3 py-3 hover:bg-emerald-50 rounded-lg transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
                            >
                                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors group-disabled:bg-slate-100">
                                    <Filter className="w-4 h-4 text-emerald-600 group-disabled:text-slate-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900">
                                        {filteredLabel}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {filteredDescription}
                                        {filteredCount > 0 ? (
                                            <span className="font-medium text-emerald-700">
                                                {" "}
                                                ({filteredCount.toLocaleString()}{" "}
                                                registro{filteredCount !== 1 ? "s" : ""})
                                            </span>
                                        ) : (
                                            <span className="font-medium text-slate-400">
                                                {" "}
                                                (No hay registros filtrados)
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </button>
                        </div>

                        {/* Footer informativo (opcional) */}
                        <div className="px-4 py-2 bg-slate-50 border-t border-slate-200">
                            <p className="text-xs text-slate-500">
                                Los archivos se descargarán en formato Excel (.xlsx)
                            </p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExportButton;
