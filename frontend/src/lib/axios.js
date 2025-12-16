import axios from "axios";
import toast from "react-hot-toast";

/**
 * API Client - Axios configurado para GPRO Logistic
 * Incluye manejo automático de errores con Toast
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "/api",
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

/**
 * Extraer mensaje de error del backend
 */
const extractErrorMessage = (error) => {
    const data = error.response?.data;

    if (!data) {
        if (error.message === "Network Error") {
            return "Error de conexión. Verifica tu conexión a internet.";
        }
        return error.message || "Ha ocurrido un error inesperado";
    }

    // String directo
    if (typeof data === "string") return data;

    // Formatos comunes de Django REST Framework
    if (data.error) return data.error;
    if (data.detail) return data.detail;
    if (data.message) return data.message;

    // Errores de validación (non_field_errors)
    if (data.non_field_errors) {
        return Array.isArray(data.non_field_errors)
            ? data.non_field_errors.join(". ")
            : data.non_field_errors;
    }

    // Errores de campos específicos
    const fieldErrors = Object.entries(data)
        .filter(([key]) => !["status", "code"].includes(key))
        .map(([key, value]) => {
            const fieldName = key.replace(/_/g, " ");
            const msg = Array.isArray(value) ? value.join(", ") : value;
            return `${fieldName}: ${msg}`;
        });

    if (fieldErrors.length > 0) {
        return fieldErrors.length === 1
            ? fieldErrors[0]
            : fieldErrors.slice(0, 3).join(". ") +
                  (fieldErrors.length > 3 ? "..." : "");
    }

    return "Ha ocurrido un error";
};

/**
 * Mostrar toast de error apropiado según el código HTTP
 */
const showErrorToast = (error) => {
    const status = error.response?.status;
    const message = extractErrorMessage(error);

    // No mostrar toast para errores 401 (se manejan con redirect)
    if (status === 401) return;

    // Configurar duración según severidad
    const duration = status >= 500 ? 8000 : 6000;

    toast.error(message, {
        duration,
        id: `error-${Date.now()}`, // Evitar toasts duplicados
    });
};

// Interceptor para añadir token de autenticación
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("access_token");
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Si el error es 401 y no es un retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem("refresh_token");
                if (refreshToken) {
                    const response = await axios.post(
                        `${
                            import.meta.env.VITE_API_URL || "/api"
                        }/users/token/refresh/`,
                        { refresh: refreshToken }
                    );

                    const { access } = response.data;
                    localStorage.setItem("access_token", access);

                    // Reintentar la petición original con el nuevo token
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Si el refresh falla, limpiar tokens y redirigir a login
                localStorage.removeItem("access_token");
                localStorage.removeItem("refresh_token");
                toast.error(
                    "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
                    {
                        duration: 5000,
                    }
                );
                window.location.href = "/login";
                return Promise.reject(refreshError);
            }
        }

        // Mostrar toast de error automáticamente si no está deshabilitado
        if (!originalRequest._skipErrorToast) {
            showErrorToast(error);
        }

        return Promise.reject(error);
    }
);

/**
 * Helper para hacer peticiones sin mostrar toast de error automático
 * Útil cuando se quiere manejar el error manualmente
 */
export const silentRequest = (config) => {
    return api({ ...config, _skipErrorToast: true });
};

export default api;
