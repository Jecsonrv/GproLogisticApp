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
    RefreshCw,
    FolderArchive,
    CheckSquare,
    Square,
    Loader2,
} from "lucide-react";
import { Button, EmptyState, ConfirmDialog, Label, Input, Badge } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatDate, formatCurrency, cn } from "../lib/utils";
import JSZip from "jszip";

/**
 * DocumentsTabUnified - Centro de Documentos de OS
 * Diseño ERP corporativo con exportación masiva ZIP
 * Refactorizado para UX/UI limpia y sobria
 */
const DocumentsTabUnified = ({ orderId, orderNumber, onUpdate }) => {
    const [allDocuments, setAllDocuments] = useState([]);
    const [categoriesSummary, setCategoriesSummary] = useState({});
    const [totalDocuments, setTotalDocuments] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [selectedDocs, setSelectedDocs] = useState(new Set());
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
        sourceModel: null,
    });
    const [uploadForm, setUploadForm] = useState({
        document_type: "tramite",
        description: "",
        file: null,
    });
    const [dragOver, setDragOver] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState({});
    const [activeFilter, setActiveFilter] = useState("all");
    const [showUploadForm, setShowUploadForm] = useState(false);
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

            const categories = Object.keys(
                response.data.categories_summary || {}
            );
            const expanded = {};
            categories.forEach((cat) => {
                expanded[cat] = true;
            });
            setExpandedCategories(expanded);
        } catch {
            toast.error("Error al cargar documentos");
        } finally {
            setLoading(false);
        }
    };

    // Configuración de categorías - Estilo corporativo SOBRIO
    // Se eliminan los fondos de color (bg-*-50) para evitar saturación visual.
    // Se usan colores semánticos solo en iconos y acentos sutiles.
    const CATEGORY_CONFIG = {
        tramite: {
            label: "Trámite",
            fullLabel: "Documentos del Trámite",
            icon: FileText,
            color: "text-slate-600",
            hoverColor: "hover:text-slate-800",
            prefix: "TRAMITE",
        },
        factura_venta: {
            label: "Facturación",
            fullLabel: "Facturas de Venta",
            icon: Receipt,
            color: "text-slate-600",
            prefix: "FACTURA",
        },
        pago_cliente: {
            label: "Cobros",
            fullLabel: "Pagos de Clientes",
            icon: Banknote,
            color: "text-slate-600",
            hoverColor: "hover:text-green-700",
            prefix: "PAGO CLIENTE",
        },
        nota_credito: {
            label: "Notas Crédito",
            fullLabel: "Notas de Crédito",
            icon: CreditCard,
            color: "text-slate-600",
            hoverColor: "hover:text-purple-700",
            prefix: "NC",
        },
        factura_costo: {
            label: "Costos",
            fullLabel: "Facturas de Proveedores",
            icon: Building2,
            color: "text-slate-600",
            hoverColor: "hover:text-orange-700",
            prefix: "FACT PROVEEDOR",
        },
        pago_proveedor: {
            label: "Pagos Prov.",
            fullLabel: "Pagos a Proveedores",
            icon: DollarSign,
            color: "text-slate-600",
            hoverColor: "hover:text-red-700",
            prefix: "PAGO PROVEEDOR",
        },
        nc_proveedor: {
            label: "NC Prov.",
            fullLabel: "NC de Proveedores",
            icon: CreditCard,
            color: "text-slate-600",
            hoverColor: "hover:text-slate-800",
            prefix: "NC PROVEEDOR",
        },
        otros: {
            label: "Otros",
            fullLabel: "Otros Documentos",
            icon: File,
            color: "text-slate-600",
            hoverColor: "hover:text-slate-800",
            prefix: "DOC",
        },
    };

    const filteredDocuments = useMemo(() => {
        if (activeFilter === "all") return allDocuments;
        return allDocuments.filter((doc) => doc.category === activeFilter);
    }, [allDocuments, activeFilter]);

    const groupedDocuments = useMemo(() => {
        return filteredDocuments.reduce((acc, doc) => {
            const cat = doc.category || "otros";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(doc);
            return acc;
        }, {});
    }, [filteredDocuments]);

    // Selección de documentos
    const toggleDocSelection = (docId) => {
        const newSelected = new Set(selectedDocs);
        if (newSelected.has(docId)) {
            newSelected.delete(docId);
        } else {
            newSelected.add(docId);
        }
        setSelectedDocs(newSelected);
    };

    const selectAllInCategory = (category) => {
        const docs = groupedDocuments[category] || [];
        const newSelected = new Set(selectedDocs);
        const allSelected = docs.every((doc) => newSelected.has(doc.id));

        if (allSelected) {
            docs.forEach((doc) => newSelected.delete(doc.id));
        } else {
            docs.forEach((doc) => newSelected.add(doc.id));
        }
        setSelectedDocs(newSelected);
    };

    const selectAll = () => {
        if (selectedDocs.size === filteredDocuments.length) {
            setSelectedDocs(new Set());
        } else {
            setSelectedDocs(new Set(filteredDocuments.map((doc) => doc.id)));
        }
    };

    // Función para generar nombre de archivo ordenado
    const generateFileName = (doc, index, categoryPrefix) => {
        const osNumber = orderNumber || `OS${orderId}`;
        const cleanDescription = (doc.description || "documento")
            .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s\-]/g, "") // Limpiar caracteres especiales
            .trim()
            .substring(0, 50);

        const extension = doc.file_name?.split(".").pop() || "pdf";
        const paddedIndex = String(index + 1).padStart(2, "0");

        // Mantener nombre original del archivo, solo agregar prefijo de OS si no lo tiene
        return `${osNumber}-${categoryPrefix}-${paddedIndex}-${cleanDescription}.${extension}`;
    };

    // Exportación masiva en ZIP
    const handleExportZip = async () => {
        const docsToExport =
            selectedDocs.size > 0
                ? filteredDocuments.filter((doc) => selectedDocs.has(doc.id))
                : filteredDocuments;

        if (docsToExport.length === 0) {
            toast.error("No hay documentos para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const zip = new JSZip();
            const osNumber = orderNumber || `OS${orderId}`;

            // Agrupar por categoría para renombrado ordenado
            const groupedForExport = {};
            docsToExport.forEach((doc) => {
                const cat = doc.category || "otros";
                if (!groupedForExport[cat]) groupedForExport[cat] = [];
                groupedForExport[cat].push(doc);
            });

            // Crear carpetas por categoría
            for (const [category, docs] of Object.entries(groupedForExport)) {
                const config =
                    CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otros;
                const folderName = `${config.prefix}`;
                const folder = zip.folder(folderName);

                for (let i = 0; i < docs.length; i++) {
                    const doc = docs[i];
                    try {
                        const response = await fetch(doc.file_url);
                        if (!response.ok) continue;

                        const blob = await response.blob();
                        const fileName = generateFileName(
                            doc,
                            i,
                            config.prefix
                        );
                        folder.file(fileName, blob);
                    } catch {
                        // Continuar con el siguiente documento si falla
                    }
                }
            }

            // Generar y descargar el ZIP
            const content = await zip.generateAsync({ type: "blob" });
            const timestamp = new Date().toISOString().split("T")[0];
            const zipFileName = `${osNumber}_DOCUMENTOS_${timestamp}.zip`;

            const downloadUrl = window.URL.createObjectURL(content);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = zipFileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);

            toast.success(
                `${docsToExport.length} documentos exportados exitosamente`
            );
            setSelectedDocs(new Set());
        } catch {
            toast.error("Error al generar el archivo ZIP");
        } finally {
            setIsExporting(false);
        }
    };

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
            setShowUploadForm(false);
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
            if (sourceModel === "OrderDocument") {
                await axios.delete(`/orders/documents/${id}/`);
                toast.success("Documento eliminado exitosamente");
                fetchAllDocuments();
                if (onUpdate) onUpdate();
            }
        } catch {
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
            const config =
                CATEGORY_CONFIG[doc.category] || CATEGORY_CONFIG.otros;
            const fileName = generateFileName(doc, 0, config.prefix);

            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
        } catch {
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
        if (!bytes || bytes === 0) return "—";
        const k = 1024;
        const sizes = ["B", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
                    <p className="text-sm text-slate-500 font-medium">
                        Cargando documentos...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header: Título y Acciones principales */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        Centro de Documentos
                        <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {totalDocuments} archivos
                        </span>
                    </h3>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Gestión centralizada de archivos y comprobantes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {filteredDocuments.length > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportZip}
                            disabled={isExporting}
                            className="text-slate-600 border-slate-300 hover:bg-slate-50"
                        >
                            {isExporting ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <FolderArchive className="w-4 h-4 mr-2" />
                            )}
                            {selectedDocs.size > 0
                                ? `Exportar (${selectedDocs.size})`
                                : "Descargar Todo ZIP"}
                        </Button>
                    )}
                    <Button
                        size="sm"
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className={
                            showUploadForm
                                ? "bg-slate-700 text-white"
                                : "bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                        }
                    >
                        {showUploadForm ? (
                            <>
                                <X className="w-4 h-4 mr-2" />
                                Cancelar Subida
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4 mr-2" />
                                Subir Documento
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Formulario de Upload colapsable - Diseño limpio */}
            {showUploadForm && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 animate-in fade-in slide-in-from-top-2 duration-200">
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
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
                                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-slate-500 focus:border-slate-500 transition-shadow"
                                >
                                    <option value="tramite">
                                        Trámite (DUCA, BL, Levante)
                                    </option>
                                    <option value="factura_venta">
                                        Facturas de Venta
                                    </option>
                                    <option value="factura_costo">
                                        Facturas de Costo
                                    </option>
                                    <option value="otros">Otros</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 block">
                                    Descripción del archivo
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
                                    placeholder="Ej: DUCA 4-2558, BL Original Escaneado..."
                                    className="text-sm bg-white border-slate-300"
                                />
                            </div>
                        </div>

                        {/* Drop Zone Refinada */}
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            className={cn(
                                "relative border-2 border-dashed rounded-lg p-6 text-center transition-all bg-white",
                                dragOver
                                    ? "border-slate-500 bg-slate-50"
                                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50/50"
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
                                <div className="flex flex-col items-center justify-center gap-2">
                                    <div className="p-3 bg-slate-100 rounded-full mb-2">
                                        <Upload className="w-6 h-6 text-slate-500" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-700">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                fileInputRef.current?.click()
                                            }
                                            className="text-slate-900 hover:text-slate-700 hover:underline font-semibold"
                                        >
                                            Haz clic para seleccionar
                                        </button>{" "}
                                        o arrastra y suelta aquí
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        Soporta PDF, JPG, PNG (Max 5MB)
                                    </p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md p-3 max-w-lg mx-auto">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="p-2 bg-white rounded shadow-sm">
                                            <FileText className="w-5 h-5 text-slate-700" />
                                        </div>
                                        <div className="text-left overflow-hidden">
                                            <p className="text-sm font-medium text-slate-900 truncate w-full">
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

                        <div className="flex justify-end pt-2">
                            <Button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white min-w-[120px]"
                                disabled={!uploadForm.file || isUploading}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Subiendo...
                                    </>
                                ) : (
                                    "Confirmar Subida"
                                )}
                            </Button>
                        </div>
                    </form>
                </div>
            )}

            {/* Navegación y Filtros de Categoría */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide border-b border-slate-100">
                <button
                    onClick={() => setActiveFilter("all")}
                    className={cn(
                        "px-4 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap border",
                        activeFilter === "all"
                            ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                            : "bg-white text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900"
                    )}
                >
                    Todos
                    <span
                        className={cn(
                            "ml-2 px-1.5 py-0.5 text-[10px] rounded-full",
                            activeFilter === "all"
                                ? "bg-slate-600 text-slate-100"
                                : "bg-slate-100 text-slate-600"
                        )}
                    >
                        {totalDocuments}
                    </span>
                </button>
                <div className="h-6 w-px bg-slate-200 mx-2" />
                {Object.entries(categoriesSummary).map(([cat, data]) => {
                    const config =
                        CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.otros;
                    const Icon = config.icon;
                    const isActive = activeFilter === cat;
                    return (
                        <button
                            key={cat}
                            onClick={() =>
                                setActiveFilter(isActive ? "all" : cat)
                            }
                            className={cn(
                                "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-all whitespace-nowrap border",
                                isActive
                                    ? "bg-white border-slate-300 text-slate-900 shadow-sm ring-1 ring-slate-200"
                                    : "bg-white border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                            )}
                        >
                            <Icon
                                className={cn(
                                    "w-4 h-4",
                                    isActive
                                        ? "text-slate-900"
                                        : "text-slate-400"
                                )}
                            />
                            {config.label}
                            <span
                                className={cn(
                                    "px-1.5 py-0.5 text-[10px] rounded-full font-bold",
                                    isActive
                                        ? "bg-slate-100 text-slate-900"
                                        : "bg-slate-50 text-slate-400"
                                )}
                            >
                                {data.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Barra de selección y herramientas */}
            {filteredDocuments.length > 0 && (
                <div className="flex items-center justify-between bg-slate-50 px-4 py-2 rounded-md border border-slate-100">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={selectAll}
                            className="flex items-center gap-2 text-xs font-medium text-slate-600 hover:text-slate-900"
                        >
                            {selectedDocs.size === filteredDocuments.length ? (
                                <CheckSquare className="w-4 h-4 text-slate-800" />
                            ) : (
                                <Square className="w-4 h-4 text-slate-400" />
                            )}
                            {selectedDocs.size > 0
                                ? `${selectedDocs.size} seleccionados`
                                : "Seleccionar todo"}
                        </button>
                        {selectedDocs.size > 0 && (
                            <>
                                <div className="h-4 w-px bg-slate-300" />
                                <button
                                    onClick={() => setSelectedDocs(new Set())}
                                    className="text-xs font-medium text-slate-500 hover:text-slate-700"
                                >
                                    Limpiar
                                </button>
                            </>
                        )}
                    </div>
                    <div className="text-xs text-slate-400">
                        {/* Espacio para info adicional si es necesario */}
                    </div>
                </div>
            )}

            {/* Lista de Documentos Agrupados - Tabla Unificada */}
            {Object.keys(groupedDocuments).length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-sm table-fixed min-w-[600px] sm:min-w-0">
                        <colgroup>
                            <col className="w-12" />
                            <col className="w-[40%]" />
                            <col className="w-[20%] hidden sm:table-column" />
                            <col className="w-[20%] hidden md:table-column" />
                            <col className="w-28" />
                        </colgroup>
                        <thead className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            <tr>
                                <th className="px-4 py-3 text-center">
                                    {/* Checkbox column */}
                                </th>
                                <th className="px-4 py-3">Documento</th>
                                <th className="px-4 py-3 hidden sm:table-cell">Referencia</th>
                                <th className="px-4 py-3 hidden md:table-cell">Subido</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {Object.entries(groupedDocuments).map(([category, docs]) => {
                                const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.otros;
                                const isExpanded = expandedCategories[category] !== false;
                                const allSelected = docs.every((doc) => selectedDocs.has(doc.id));

                                return (
                                    <React.Fragment key={category}>
                                        {/* Group Header Row */}
                                        <tr className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                            <td colSpan="5" className="px-4 py-2 border-y border-slate-100">
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => toggleCategory(category)}
                                                        className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-slate-700"
                                                    >
                                                        <span className="p-1 bg-white border border-slate-200 rounded-md text-slate-500">
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-3.5 h-3.5" />
                                                            ) : (
                                                                <ChevronRight className="w-3.5 h-3.5" />
                                                            )}
                                                        </span>
                                                        <span className="flex items-center gap-2">
                                                            {config.fullLabel}
                                                            <span className="text-xs font-normal text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                                                                {docs.length}
                                                            </span>
                                                        </span>
                                                    </button>
                                                    <button
                                                        onClick={() => selectAllInCategory(category)}
                                                        className="text-xs text-slate-400 hover:text-slate-600 font-medium px-2 py-1 hover:bg-white rounded transition-colors"
                                                    >
                                                        {allSelected ? "Deseleccionar grupo" : "Seleccionar grupo"}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Document Rows */}
                                        {isExpanded &&
                                            docs.map((doc) => {
                                                const isSelected = selectedDocs.has(doc.id);
                                                return (
                                                    <tr
                                                        key={doc.id}
                                                        className={cn(
                                                            "group/row transition-colors hover:bg-slate-50",
                                                            isSelected && "bg-blue-50/30 hover:bg-blue-50/50"
                                                        )}
                                                    >
                                                        <td className="px-4 py-3 text-center align-top pt-4">
                                                            <button
                                                                onClick={() => toggleDocSelection(doc.id)}
                                                                className="outline-none focus:ring-2 focus:ring-slate-400 rounded"
                                                            >
                                                                {isSelected ? (
                                                                    <CheckSquare className="w-4 h-4 text-slate-900" />
                                                                ) : (
                                                                    <Square className="w-4 h-4 text-slate-300 group-hover/row:text-slate-400" />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-start gap-3">
                                                                <div
                                                                    className={cn(
                                                                        "mt-0.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-400",
                                                                        config.color
                                                                    )}
                                                                >
                                                                    <config.icon className="w-4 h-4" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p
                                                                        className="font-medium text-slate-900 group-hover/row:text-slate-700 transition-colors cursor-pointer hover:underline truncate"
                                                                        onClick={() => window.open(doc.file_url, "_blank")}
                                                                        title={doc.description}
                                                                    >
                                                                        {doc.description}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                                        <span
                                                                            className="text-xs text-slate-500 truncate max-w-[200px]"
                                                                            title={doc.file_name}
                                                                        >
                                                                            {doc.file_name}
                                                                        </span>
                                                                        {doc.amount && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] py-0 h-4 border-slate-200 text-slate-600 bg-white"
                                                                            >
                                                                                {formatCurrency(doc.amount)}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 hidden sm:table-cell text-sm text-slate-600 align-top pt-4">
                                                            {doc.reference_label ? (
                                                                <span className="text-slate-700 font-mono text-sm">
                                                                    {doc.reference_label}
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300 text-xs">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 hidden md:table-cell align-top pt-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs font-medium text-slate-700">
                                                                    {formatDate(doc.uploaded_at, { format: "short" })}
                                                                </span>
                                                                <span className="text-[10px] text-slate-400">
                                                                    {doc.uploaded_by || "Sistema"}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right align-top pt-3">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <button
                                                                    onClick={() => window.open(doc.file_url, "_blank")}
                                                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                                                    title="Ver documento"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownload(doc)}
                                                                    className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                                                                    title="Descargar"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                                {doc.deletable && (
                                                                    <button
                                                                        onClick={() => handleDelete(doc)}
                                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="py-12 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    <EmptyState
                        icon={FileText}
                        title="Sin documentos"
                        description={
                            activeFilter !== "all"
                                ? "No hay documentos en esta categoría"
                                : "No se han cargado documentos para esta orden"
                        }
                        action={
                            activeFilter === "all" && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setShowUploadForm(true)}
                                    className="mt-4 border-slate-300 text-slate-700 hover:bg-white"
                                >
                                    Subir el primer documento
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
                title="¿Eliminar documento?"
                description="Esta acción eliminará el archivo permanentemente. ¿Estás seguro?"
                confirmText="Sí, eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default DocumentsTabUnified;
