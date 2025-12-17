import { Toaster, toast } from "react-hot-toast";

/**
 * ToastProvider - Sistema de notificaciones corporativo
 * Estilo: Sobrio, Profesional, Enterprise
 * Referencia: SAP Fiori Message Toast
 */
const ToastProvider = () => {
    return (
        <Toaster
            position="top-right"
            containerStyle={{
                top: 16,
                right: 16,
            }}
            gutter={8}
            toastOptions={{
                // Default options - Estilo corporativo sobrio
                duration: 4000,
                style: {
                    background: "#ffffff",
                    color: "#1e293b",
                    boxShadow:
                        "0 4px 12px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05)",
                    borderRadius: "4px", // Mínimo para look enterprise
                    padding: "12px 16px",
                    maxWidth: "420px",
                    fontSize: "13px",
                    fontWeight: "500",
                    border: "1px solid #e2e8f0",
                    lineHeight: "1.5",
                },
                // Success - Verde corporativo
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: "#16a34a",
                        secondary: "#ffffff",
                    },
                    style: {
                        borderLeft: "4px solid #16a34a",
                        borderColor: "#dcfce7",
                        backgroundColor: "#f0fdf4",
                    },
                },
                // Error - Rojo para errores críticos
                error: {
                    duration: 6000, // Más tiempo para errores
                    iconTheme: {
                        primary: "#dc2626",
                        secondary: "#ffffff",
                    },
                    style: {
                        borderLeft: "4px solid #dc2626",
                        borderColor: "#fecaca",
                        backgroundColor: "#fef2f2",
                    },
                },
                // Loading - Azul neutro
                loading: {
                    iconTheme: {
                        primary: "#0066ff",
                        secondary: "#ffffff",
                    },
                    style: {
                        borderLeft: "4px solid #0066ff",
                        borderColor: "#dbeafe",
                        backgroundColor: "#eff6ff",
                    },
                },
            }}
        />
    );
};

/**
 * Funciones helper para mostrar toasts con mensajes de error del backend
 */
export const showErrorToast = (
    error,
    fallbackMessage = "Ha ocurrido un error"
) => {
    // Extraer mensaje del error del backend
    let message = fallbackMessage;

    if (error?.response?.data) {
        const data = error.response.data;
        // Soportar múltiples formatos de error del backend
        if (typeof data === "string") {
            message = data;
        } else if (data.error) {
            message = data.error;
        } else if (data.detail) {
            message = data.detail;
        } else if (data.message) {
            message = data.message;
        } else if (data.non_field_errors) {
            message = data.non_field_errors.join(", ");
        } else {
            // Si es un objeto con errores de validación
            const errors = Object.entries(data)
                .map(
                    ([key, value]) =>
                        `${key}: ${
                            Array.isArray(value) ? value.join(", ") : value
                        }`
                )
                .join(". ");
            if (errors) message = errors;
        }
    } else if (error?.message) {
        message = error.message;
    }

    toast.error(message, { duration: 6000 });
};

export const showSuccessToast = (message) => {
    toast.success(message, { duration: 3000 });
};

export const showWarningToast = (message) => {
    toast(message, {
        duration: 5000,
        icon: "⚠️",
        style: {
            borderLeft: "4px solid #f59e0b",
            borderColor: "#fef3c7",
            backgroundColor: "#fffbeb",
        },
    });
};

export default ToastProvider;
