import React, { useState, useEffect, useRef, useMemo } from "react";
import {
    Upload,
    Trash2,
    Download,
    Eye,
    FileText,
    X,
    File,
    Receipt,
    CreditCard,
    Banknote,
    Building2,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    DollarSign,
    Filter,
    RefreshCw,
} from "lucide-react";
import { Button, EmptyState, ConfirmDialog, Label, Input, Badge } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatDate, formatCurrency, cn } from "../lib/utils";

/**
 * DocumentsTabUnified - Vista unificada de TODOS los documentos relacionados a una OS
 * Incluye: Documentos directos, facturas, pagos de clientes, notas de crédito,
 * facturas de proveedores y comprobantes de pago a proveedores
 */
const DocumentsTabUnified = ({ orderId, onUpdate }) => {
    const [allDocuments, setAllDocuments] = useState([]);
    const [categoriesSummary, setCategoriesSummary] = useState({});
    const [totalDocuments, setTotalDocuments] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
        sourceModel: null,
        sourceId: null,
    });
    const [uploadForm, setUploadForm] = useState({
        document_type: "tramite",
        description: "",
        file: null,
    });
    const [dragOver, setDragOver] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [activeFilter, setActiveFilter] = useState("all");
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchAllDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const fetchAllDocuments = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/orders/service-orders/${orderId}/all_documents/`
            );
            setAllDocuments(response.data.documents || []);
            setCategoriesSummary(response.data.categories_summary || {});
            setTotalDocuments(response.data.total_documents || 0);

            // Expandir todas las categorías por defecto
            const categories = Object.keys(
                response.data.categories_summary || {}
            );
            const expanded = {};
            categories.forEach((cat) => {
                expanded[cat] = true;
            });
            setExpandedCategories(expanded);
        } catch (error) {
            console.error("Error loading documents:", error);
            toast.error("Error al cargar documentos");
        } finally {
            setLoading(false);
        }
    };

    // Configuración de categorías
    const CATEGORY_CONFIG = {
        tramite: {
            label: "Documentos del Trámite",
            icon: FileText,
            color: "text-blue-600",
            bgColor: "bg-blue-50",
            borderColor: "border-blue-200",
            badgeVariant: "info",
        },
        factura_venta: {
            label: "Facturas de Venta",
            icon: Receipt,
            color: "text-emerald-600",
            bgColor: "bg-emerald-50",
            borderColor: "border-emerald-200",
            badgeVariant: "success",
        },
        pago_cliente: {
            label: "Pagos de Clientes",
            icon: Banknote,
            color: "text-green-600",
            bgColor: "bg-green-50",
            borderColor: "border-green-200",
            badgeVariant: "success",
        },
        nota_credito: {
            label: "Notas de Crédito",
            icon: CreditCard,
            color: "text-purple-600",
            bgColor: "bg-purple-50",
            borderColor: "border-purple-200",
            badgeVariant: "purple",
        },
        factura_costo: {
            label: "Facturas de Proveedores",
            icon: Building2,
            color: "text-orange-600",
            bgColor: "bg-orange-50",
            borderColor: "border-orange-200",
            badgeVariant: "warning",
        },
        pago_proveedor: {
            label: "Pagos a Proveedores",
            icon: DollarSign,
            color: "text-red-600",
            bgColor: "bg-red-50",
            borderColor: "border-red-200",
            badgeVariant: "danger",
        },
        otros: {
            label: "Otros Documentos",
            icon: File,
            color: "text-slate-600",
            bgColor: "bg-slate-50",
            borderColor: "border-slate-200",
            badgeVariant: "default",
        },
    };

    // Filtrar documentos
    const filteredDocuments = useMemo(() => {
        if (activeFilter === "all") return allDocuments;
        return allDocuments.filter((doc) => doc.category === activeFilter);
    }, [allDocuments, activeFilter]);

    // Agrupar documentos por categoría
    const groupedDocuments = useMemo(() => {
        return filteredDocuments.reduce((acc, doc) => {
            const cat = doc.category || "otros";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(doc);
            return acc;
        }, {});
    }, [filteredDocuments]);

    const handleFileSelect = (file) => {
        if (file.size > 5 * 1024 * 1024) {
            toast.error("El archivo no debe superar los 5MB");
            return;
        }
        const validTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
        ];
        if (!validTypes.includes(file.type)) {
            toast.error("Solo se permiten archivos PDF, JPG o PNG");
            return;
        }
        setUploadForm({ ...uploadForm, file });
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragOver(true);
    };
    const handleDragLeave = (e) => {
        e.preventDefault();
        setDragOver(false);
    };
    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileSelect(file);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!uploadForm.file) {
            toast.error("Selecciona un archivo");
            return;
        }

        try {
            setIsUploading(true);
            const formData = new FormData();
            formData.append("order", orderId);
            formData.append("document_type", uploadForm.document_type);
            formData.append("description", uploadForm.description);
            formData.append("file", uploadForm.file);

            await axios.post("/orders/documents/", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Documento subido exitosamente");
            resetForm();
            fetchAllDocuments();
            if (onUpdate) onUpdate();
        } catch (error) {
            const errorMessage =
                error.response?.data?.error ||
                error.response?.data?.detail ||
                "Error al subir documento";
            toast.error(errorMessage);
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = (doc) => {
        if (!doc.deletable) {
            toast.error("Este documento no puede ser eliminado desde aquí");
            return;
        }
        setConfirmDialog({
            open: true,
            id: doc.source_id,
            sourceModel: doc.source_model,
        });
    };

    const confirmDelete = async () => {
        const { id, sourceModel } = confirmDialog;
        setConfirmDialog({ open: false, id: null, sourceModel: null });

        try {
            // Solo se pueden eliminar OrderDocument desde aquí
            if (sourceModel === "OrderDocument") {
                await axios.delete(`/orders/documents/${id}/`);
                toast.success("Documento eliminado exitosamente");
                fetchAllDocuments();
                if (onUpdate) onUpdate();
            }
        } catch (_error) {
            toast.error("Error al eliminar documento");
        }
    };

    const resetForm = () => {
        setUploadForm({
            document_type: "tramite",
            description: "",
            file: null,
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDownload = async (doc) => {
        try {
            const response = await fetch(doc.file_url);
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = doc.file_name || doc.description || "documento";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch (_error) {
            toast.error("Error al descargar el documento");
        }
    };

    const toggleCategory = (category) => {
        setExpandedCategories((prev) => ({
            ...prev,
            [category]: !prev[category],
        }));
    };

    const formatFileSize = (bytes) => {
        if (!bytes || bytes === 0) return "";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Header con resumen */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            Centro de Documentos
                        </h3>
                        <p className="text-sm text-slate-500 mt-0.5">
                            Todos los documentos relacionados a esta orden de
                            servicio
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchAllDocuments}
                            className="text-slate-600"
                        >
                            <RefreshCw className="w-4 h-4 mr-1.5" />
                            Actualizar
                        </Button>
                        <Badge variant="default" className="px-3 py-1">
                            {totalDocuments} documentos
                        </Badge>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
                    {Object.entries(categoriesSummary).map(([cat, data]) => {
                        const config =
                            CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.otros;
                        const Icon = config.icon;
                        return (
                            <button
                                key={cat}
                                onClick={() =>
                                    setActiveFilter(
                                        activeFilter === cat ? "all" : cat
                                    )
                                }
                                className={cn(
                                    "p-3 rounded-lg border transition-all text-left",
                                    activeFilter === cat
                                        ? `${config.bgColor} ${config.borderColor} ring-2 ring-offset-1 ring-blue-500`
                                        : "bg-white border-slate-200 hover:border-slate-300"
                                )}
                            >
                                <Icon
                                    className={cn("w-4 h-4 mb-1", config.color)}
                                />
                                <p className="text-lg font-bold text-slate-900">
                                    {data.count}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {data.label}
                                </p>
                            </button>
                        );
                    })}
                </div>

                {activeFilter !== "all" && (
                    <div className="flex items-center gap-2 text-sm">
                        <Filter className="w-4 h-4 text-blue-600" />
                        <span className="text-slate-600">Filtrando por:</span>
                        <Badge
                            variant={
                                CATEGORY_CONFIG[activeFilter]?.badgeVariant ||
                                "default"
                            }
                        >
                            {CATEGORY_CONFIG[activeFilter]?.label ||
                                activeFilter}
                        </Badge>
                        <button
                            onClick={() => setActiveFilter("all")}
                            className="text-blue-600 hover:text-blue-700 underline ml-2"
                        >
                            Ver todos
                        </button>
                    </div>
                )}
            </div>

            {/* Formulario de Upload */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h4 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Subir Nuevo Documento
                </h4>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                Categoría
                            </Label>
                            <select
                                value={uploadForm.document_type}
                                onChange={(e) =>
                                    setUploadForm({
                                        ...uploadForm,
                                        document_type: e.target.value,
                                    })
                                }
                                required
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="tramite">
                                    Documentos del Trámite (DUCA, BL, Levante)
                                </option>
                                <option value="factura_venta">
                                    Facturas de Venta
                                </option>
                                <option value="factura_costo">
                                    Facturas de Costo / Comprobantes
                                </option>
                                <option value="otros">
                                    Otros Documentos / Evidencias
                                </option>
                            </select>
                        </div>
                        <div>
                            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">
                                Descripción
                            </Label>
                            <Input
                                type="text"
                                value={uploadForm.description}
                                onChange={(e) =>
                                    setUploadForm({
                                        ...uploadForm,
                                        description: e.target.value,
                                    })
                                }
                                placeholder="Ej: DUCA 4-2558, BL Original, etc."
                                className="text-sm"
                            />
                        </div>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "relative border-2 border-dashed rounded-lg p-6 text-center transition-all",
                            dragOver
                                ? "border-blue-500 bg-blue-50"
                                : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                        )}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) =>
                                handleFileSelect(e.target.files[0])
                            }
                            className="hidden"
                        />

                        {!uploadForm.file ? (
                            <div>
                                <Upload className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                                <p className="text-sm text-slate-600 mb-1">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className="text-blue-600 hover:text-blue-700 font-medium"
                                    >
                                        Click para seleccionar
                                    </button>{" "}
                                    o arrastra el archivo aquí
                                </p>
                                <p className="text-xs text-slate-500">
                                    PDF, JPG, PNG - Máximo 5MB
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-100 rounded">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-slate-900">
                                            {uploadForm.file.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {formatFileSize(
                                                uploadForm.file.size
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setUploadForm({
                                            ...uploadForm,
                                            file: null,
                                        });
                                        if (fileInputRef.current)
                                            fileInputRef.current.value = "";
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                            disabled={isUploading}
                            size="sm"
                        >
                            Limpiar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700"
                            disabled={!uploadForm.file || isUploading}
                            size="sm"
                        >
                            {isUploading ? "Subiendo..." : "Subir Documento"}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Lista de Documentos Agrupados */}
            {Object.keys(groupedDocuments).length > 0 ? (
                <div className="space-y-3">
                    {Object.entries(groupedDocuments).map(
                        ([category, docs]) => {
                            const config =
                                CATEGORY_CONFIG[category] ||
                                CATEGORY_CONFIG.otros;
                            const Icon = config.icon;
                            const isExpanded =
                                expandedCategories[category] !== false;

                            return (
                                <div
                                    key={category}
                                    className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                                >
                                    {/* Category Header */}
                                    <button
                                        onClick={() => toggleCategory(category)}
                                        className={cn(
                                            "w-full px-5 py-3 flex items-center justify-between border-b transition-colors",
                                            config.bgColor,
                                            config.borderColor,
                                            "hover:opacity-90"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon
                                                className={cn(
                                                    "w-5 h-5",
                                                    config.color
                                                )}
                                            />
                                            <span className="text-sm font-semibold text-slate-900">
                                                {config.label}
                                            </span>
                                            <Badge
                                                variant={config.badgeVariant}
                                                className="text-xs"
                                            >
                                                {docs.length}
                                            </Badge>
                                        </div>
                                        {isExpanded ? (
                                            <ChevronDown className="w-4 h-4 text-slate-500" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 text-slate-500" />
                                        )}
                                    </button>

                                    {/* Documents List */}
                                    {isExpanded && (
                                        <div className="divide-y divide-slate-100">
                                            {docs.map((doc) => (
                                                <div
                                                    key={doc.id}
                                                    className="px-5 py-4 hover:bg-slate-50 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                                            <div
                                                                className={cn(
                                                                    "p-2 rounded",
                                                                    config.bgColor
                                                                )}
                                                            >
                                                                <FileText
                                                                    className={cn(
                                                                        "w-4 h-4",
                                                                        config.color
                                                                    )}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-900 truncate">
                                                                    {
                                                                        doc.description
                                                                    }
                                                                </p>

                                                                {/* Metadata row */}
                                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                                                                    {doc.reference_label && (
                                                                        <span className="inline-flex items-center gap-1 text-xs text-blue-600 font-medium">
                                                                            <ExternalLink className="w-3 h-3" />
                                                                            {
                                                                                doc.reference_label
                                                                            }
                                                                        </span>
                                                                    )}
                                                                    {doc.amount && (
                                                                        <span className="text-xs font-semibold text-slate-700">
                                                                            {formatCurrency(
                                                                                doc.amount
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {doc.subcategory && (
                                                                        <span className="text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                            {
                                                                                doc.subcategory
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Secondary info */}
                                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                                                                    {doc.uploaded_at && (
                                                                        <span>
                                                                            {formatDate(
                                                                                doc.uploaded_at,
                                                                                {
                                                                                    format: "medium",
                                                                                }
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                    {doc.uploaded_by && (
                                                                        <>
                                                                            <span className="text-slate-300">
                                                                                •
                                                                            </span>
                                                                            <span>
                                                                                Por:{" "}
                                                                                {
                                                                                    doc.uploaded_by
                                                                                }
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                    {doc.file_name && (
                                                                        <>
                                                                            <span className="text-slate-300">
                                                                                •
                                                                            </span>
                                                                            <span
                                                                                className="truncate max-w-[150px]"
                                                                                title={
                                                                                    doc.file_name
                                                                                }
                                                                            >
                                                                                {
                                                                                    doc.file_name
                                                                                }
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                                            <a
                                                                href={
                                                                    doc.file_url
                                                                }
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                                                                title="Ver documento"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </a>
                                                            <button
                                                                onClick={() =>
                                                                    handleDownload(
                                                                        doc
                                                                    )
                                                                }
                                                                className="p-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                                                title="Descargar"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </button>
                                                            {doc.deletable ? (
                                                                <button
                                                                    onClick={() =>
                                                                        handleDelete(
                                                                            doc
                                                                        )
                                                                    }
                                                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                                                                    title="Eliminar"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <span
                                                                    className="p-2 text-slate-300 cursor-not-allowed"
                                                                    title="Este documento no puede eliminarse desde aquí"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }
                    )}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg py-12">
                    <EmptyState
                        icon={FileText}
                        title="Sin documentos"
                        description={
                            activeFilter !== "all"
                                ? "No hay documentos en esta categoría"
                                : "Sube documentos relacionados con esta orden de servicio"
                        }
                        action={
                            activeFilter !== "all" ? (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setActiveFilter("all")}
                                >
                                    Ver todos los documentos
                                </Button>
                            ) : (
                                <Button
                                    size="sm"
                                    onClick={() =>
                                        fileInputRef.current?.click()
                                    }
                                    className="bg-blue-600 hover:bg-blue-700"
                                >
                                    <Upload className="w-4 h-4 mr-1.5" />
                                    Subir Primer Documento
                                </Button>
                            )
                        }
                    />
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() =>
                    setConfirmDialog({
                        open: false,
                        id: null,
                        sourceModel: null,
                    })
                }
                onConfirm={confirmDelete}
                title="¿Eliminar este documento?"
                description="Esta acción no se puede deshacer. El documento será eliminado permanentemente."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default DocumentsTabUnified;
