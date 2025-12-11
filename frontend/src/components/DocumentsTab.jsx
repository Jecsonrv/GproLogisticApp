import React, { useState, useEffect, useRef } from "react";
import {
    Upload,
    Trash2,
    Download,
    Eye,
    FileText,
    X,
    File,
    CheckCircle2,
} from "lucide-react";
import { Button, EmptyState, ConfirmDialog, Label, Input } from "./ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatDate, cn } from "../lib/utils";

/**
 * DocumentsTab - Gestión completa de documentos de la OS
 * Incluye categorización, upload, preview, descarga
 */
const DocumentsTab = ({ orderId, onUpdate }) => {
    const [documents, setDocuments] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
    });
    const [uploadForm, setUploadForm] = useState({
        document_type: "tramite",
        description: "",
        file: null,
    });
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        fetchDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const fetchDocuments = async () => {
        try {
            const response = await axios.get(
                `/orders/documents/?order=${orderId}`
            );
            setDocuments(response.data);
        } catch (_error) {
            console.error("Error loading documents");
        }
    };

    const handleFileSelect = (file) => {
        // Validar tamaño (5MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("El archivo no debe superar los 5MB");
            return;
        }
        // Validar tipo
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
            fetchDocuments();
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

    const handleDelete = (docId) => {
        setConfirmDialog({ open: true, id: docId });
    };

    const confirmDelete = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null });

        try {
            await axios.delete(`/orders/documents/${id}/`);
            toast.success("Documento eliminado exitosamente");
            fetchDocuments();
            if (onUpdate) onUpdate();
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
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDownload = async (doc) => {
        try {
            const url = doc.file_url || doc.file;
            const response = await fetch(url);
            const blob = await response.blob();

            // Crear un link temporal para descargar
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = downloadUrl;
            link.download = doc.file_name || doc.description || "documento";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Limpiar el objeto URL
            window.URL.revokeObjectURL(downloadUrl);
        } catch (_error) {
            toast.error("Error al descargar el documento");
        }
    };

    const getDocumentTypeConfig = (type) => {
        const config = {
            tramite: {
                label: "Documentos del Trámite",
                icon: FileText,
                color: "text-blue-600",
                bgColor: "bg-blue-50",
                borderColor: "border-blue-200",
            },
            factura_venta: {
                label: "Facturas de Venta",
                icon: FileText,
                color: "text-green-600",
                bgColor: "bg-green-50",
                borderColor: "border-green-200",
            },
            factura_costo: {
                label: "Facturas de Costo / Comprobantes",
                icon: FileText,
                color: "text-orange-600",
                bgColor: "bg-orange-50",
                borderColor: "border-orange-200",
            },
            otros: {
                label: "Otros Documentos / Evidencias",
                icon: File,
                color: "text-slate-600",
                bgColor: "bg-slate-50",
                borderColor: "border-slate-200",
            },
        };
        return config[type] || config.otros;
    };

    const getFileIcon = (fileName) => {
        if (!fileName) return File;
        const ext = fileName.split(".").pop().toLowerCase();
        if (ext === "pdf") return FileText;
        if (["jpg", "jpeg", "png"].includes(ext)) return Eye;
        return File;
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    // Agrupar documentos por tipo
    const groupedDocuments = documents.reduce((acc, doc) => {
        const type = doc.document_type || "otros";
        if (!acc[type]) acc[type] = [];
        acc[type].push(doc);
        return acc;
    }, {});

    return (
        <div className="space-y-5">
            {/* Formulario de Upload */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Subir Documento
                </h3>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Tipo de Documento */}
                        <div>
                            <Label className="label-corporate label-required">
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
                                className="input-corporate"
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

                        {/* Descripción */}
                        <div>
                            <Label className="label-corporate">
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
                                className="input-corporate"
                                placeholder="Ej: DUCA 4-2558, BL Original, etc."
                            />
                        </div>
                    </div>

                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={cn(
                            "relative border-2 border-dashed rounded-lg p-8 text-center transition-all",
                            dragOver
                                ? "border-brand-500 bg-brand-50"
                                : "border-slate-300 hover:border-brand-400 hover:bg-slate-50"
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
                                <Upload className="w-12 h-12 mx-auto text-slate-400 mb-3" />
                                <p className="text-sm text-slate-600 mb-2">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            fileInputRef.current?.click()
                                        }
                                        className="text-brand-600 hover:text-brand-700 font-medium"
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
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-brand-100 rounded">
                                        <FileText className="w-5 h-5 text-brand-600" />
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
                                    className="p-1.5 text-slate-400 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={resetForm}
                            disabled={isUploading}
                        >
                            Limpiar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-brand-600 hover:bg-brand-700"
                            disabled={!uploadForm.file || isUploading}
                        >
                            {isUploading ? "Subiendo..." : "Subir Documento"}
                        </Button>
                    </div>
                </form>
            </div>

            {/* Lista de Documentos Agrupados */}
            {Object.keys(groupedDocuments).length > 0 ? (
                <div className="space-y-4">
                    {Object.entries(groupedDocuments).map(([type, docs]) => {
                        const typeConfig = getDocumentTypeConfig(type);
                        const Icon = typeConfig.icon;

                        return (
                            <div
                                key={type}
                                className="bg-white border border-slate-200 rounded-lg overflow-hidden"
                            >
                                <div
                                    className={cn(
                                        "px-5 py-3 border-b",
                                        typeConfig.bgColor,
                                        typeConfig.borderColor
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <Icon
                                            className={cn(
                                                "w-5 h-5",
                                                typeConfig.color
                                            )}
                                        />
                                        <h4 className="text-sm font-semibold text-slate-900">
                                            {typeConfig.label}
                                        </h4>
                                        <span className="ml-auto text-xs font-medium text-slate-500">
                                            {docs.length}{" "}
                                            {docs.length === 1
                                                ? "documento"
                                                : "documentos"}
                                        </span>
                                    </div>
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {docs.map((doc) => {
                                        const FileIcon = getFileIcon(
                                            doc.file_name
                                        );

                                        return (
                                            <div
                                                key={doc.id}
                                                className="px-5 py-4 hover:bg-slate-50 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                                        <div className="p-2 bg-slate-100 rounded">
                                                            <FileIcon className="w-5 h-5 text-slate-600" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium text-slate-900 truncate">
                                                                {doc.description ||
                                                                    doc.file_name}
                                                            </p>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                <span className="text-xs text-slate-500">
                                                                    {formatDate(
                                                                        doc.uploaded_at,
                                                                        {
                                                                            format: "medium",
                                                                        }
                                                                    )}
                                                                </span>
                                                                {doc.uploaded_by_username && (
                                                                    <>
                                                                        <span className="text-slate-300">
                                                                            •
                                                                        </span>
                                                                        <span className="text-xs text-slate-500">
                                                                            Por:{" "}
                                                                            {
                                                                                doc.uploaded_by_username
                                                                            }
                                                                        </span>
                                                                    </>
                                                                )}
                                                                <span className="text-slate-300">
                                                                    •
                                                                </span>
                                                                <span className="text-xs text-slate-500">
                                                                    {doc.file_size
                                                                        ? formatFileSize(
                                                                              doc.file_size
                                                                          )
                                                                        : "N/A"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 ml-4">
                                                        <a
                                                            href={
                                                                doc.file_url ||
                                                                doc.file
                                                            }
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded transition-colors"
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
                                                        <button
                                                            onClick={() =>
                                                                handleDelete(
                                                                    doc.id
                                                                )
                                                            }
                                                            className="p-2 text-danger-600 hover:text-danger-700 hover:bg-danger-50 rounded transition-colors"
                                                            title="Eliminar"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg py-12">
                    <EmptyState
                        icon={FileText}
                        title="Sin documentos"
                        description="Sube documentos relacionados con esta orden de servicio"
                        action={
                            <Button
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                className="bg-brand-600 hover:bg-brand-700"
                            >
                                <Upload className="w-4 h-4 mr-1.5" />
                                Subir Primer Documento
                            </Button>
                        }
                    />
                </div>
            )}

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, id: null })}
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

export default DocumentsTab;
