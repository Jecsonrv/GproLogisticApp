import { Toaster } from "react-hot-toast";

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

export default ToastProvider;
