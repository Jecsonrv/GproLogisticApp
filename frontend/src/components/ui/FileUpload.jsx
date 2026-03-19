import React, { useRef, useState, useEffect } from "react";
import { Upload, File as FileIcon, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "./Button";

/**
 * Validates a file against a given accept string (comma-separated MIME types or extensions).
 * Returns true if the file is acceptable.
 */
function isFileTypeAccepted(file, accept) {
    if (!accept || accept === "*/*" || accept === "*") return true;
    const acceptedTypes = accept
        .split(",")
        .map((t) => t.trim().toLowerCase());
    const fileName = file.name.toLowerCase();
    const fileMime = file.type.toLowerCase();

    return acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
            // Extension match (e.g. ".pdf")
            return fileName.endsWith(type);
        }
        if (type.endsWith("/*")) {
            // MIME wildcard match (e.g. "image/*")
            const mimeGroup = type.slice(0, -2);
            return fileMime.startsWith(mimeGroup);
        }
        // Exact MIME type match
        return fileMime === type;
    });
}

/**
 * Formats an accept string into a user-readable label.
 * E.g. ".pdf,.jpg,.png" → "PDF, JPG, PNG"
 */
function formatAcceptLabel(accept) {
    if (!accept || accept === "*/*" || accept === "*") return "cualquier tipo";
    return accept
        .split(",")
        .map((t) => {
            const type = t.trim();
            if (type.startsWith(".")) return type.slice(1).toUpperCase();
            if (type === "image/*") return "imágenes";
            if (type === "application/pdf") return "PDF";
            return type;
        })
        .join(", ");
}

export function FileUpload({
    onFileChange,
    onChange, // Support both onChange and onFileChange
    accept = "*/*",
    maxSize = 5 * 1024 * 1024, // 5MB default
    multiple = false,
    disabled = false,
    className,
    label = "Adjuntar archivo",
    helperText,
    value, // Support controlled value
}) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [error, setError] = useState("");
    const inputRef = useRef(null);

    // Handle controlled value changes (for reset)
    useEffect(() => {
        if (value === null || value === undefined) {
            setSelectedFiles([]);
            // Reset the native input so the same file can be re-selected
            if (inputRef.current) {
                inputRef.current.value = "";
            }
        } else if (value instanceof File) {
            setSelectedFiles([value]);
        } else if (Array.isArray(value)) {
            setSelectedFiles(value);
        }
    }, [value]);

    // Use either onChange or onFileChange (onChange takes priority)
    const fileChangeCallback = onChange || onFileChange;

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files || []);
        setError("");

        if (files.length === 0) return;

        // Validate file type
        const invalidTypeFiles = files.filter(
            (file) => !isFileTypeAccepted(file, accept)
        );
        if (invalidTypeFiles.length > 0) {
            setError(
                `Tipo de archivo no permitido. Formatos aceptados: ${formatAcceptLabel(accept)}`
            );
            // Reset input so the same (invalid) file can be retried after correction
            if (inputRef.current) {
                inputRef.current.value = "";
            }
            return;
        }

        // Validate file size
        const oversizedFiles = files.filter((file) => file.size > maxSize);
        if (oversizedFiles.length > 0) {
            setError(
                `Archivo(s) demasiado grande(s). Máximo ${formatFileSize(
                    maxSize
                )}`
            );
            // Reset input so the same file can be re-selected after user reduces size
            if (inputRef.current) {
                inputRef.current.value = "";
            }
            return;
        }

        setSelectedFiles(files);
        if (fileChangeCallback) {
            fileChangeCallback(multiple ? files : files[0]);
        }
    };

    const handleRemoveFile = (index) => {
        const newFiles = selectedFiles.filter((_, i) => i !== index);
        setSelectedFiles(newFiles);
        // Reset the native input value so the same file can be re-selected
        if (inputRef.current) {
            inputRef.current.value = "";
        }
        if (fileChangeCallback) {
            fileChangeCallback(multiple ? newFiles : null);
        }
    };

    const handleClick = () => {
        inputRef.current?.click();
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return (
            Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
        );
    };

    return (
        <div className={cn("w-full", className)}>
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleFileChange}
                disabled={disabled}
                className="hidden"
            />

            {/* Upload Button */}
            <Button
                type="button"
                variant="outline"
                onClick={handleClick}
                disabled={disabled}
                className="w-full"
            >
                <Upload className="h-4 w-4 mr-2" />
                {label}
            </Button>

            {/* Helper Text */}
            {helperText && (
                <p className="mt-1 text-xs text-slate-500">{helperText}</p>
            )}

            {/* Error Message */}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

            {/* Selected Files */}
            {selectedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                    {selectedFiles.map((file, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2"
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <FileIcon className="h-4 w-4 text-slate-400 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-slate-700 truncate">
                                        {file.name}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {formatFileSize(file.size)}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="ml-2 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
