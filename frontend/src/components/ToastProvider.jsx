import { Toaster } from "react-hot-toast";

const ToastProvider = () => {
    return (
        <Toaster
            position="top-right"
            toastOptions={{
                // Default options
                duration: 4000,
                style: {
                    background: "#fff",
                    color: "#363636",
                    boxShadow:
                        "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                    borderRadius: "0.75rem",
                    padding: "16px",
                    maxWidth: "500px",
                },
                // Success
                success: {
                    duration: 3000,
                    iconTheme: {
                        primary: "#10b981",
                        secondary: "#fff",
                    },
                    style: {
                        border: "1px solid #10b981",
                    },
                },
                // Error
                error: {
                    duration: 5000,
                    iconTheme: {
                        primary: "#ef4444",
                        secondary: "#fff",
                    },
                    style: {
                        border: "1px solid #ef4444",
                    },
                },
                // Loading
                loading: {
                    iconTheme: {
                        primary: "#3b82f6",
                        secondary: "#fff",
                    },
                },
            }}
        />
    );
};

export default ToastProvider;
