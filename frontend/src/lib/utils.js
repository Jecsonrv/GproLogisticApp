import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind CSS de forma inteligente
 * Usa clsx para manejar condicionales y twMerge para resolver conflictos
 *
 * @example
 * cn('px-4 py-2', 'px-6') // => 'py-2 px-6' (px-6 override px-4)
 * cn('text-red-500', condition && 'text-blue-500')
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

/**
 * Obtiene la fecha de hoy en formato YYYY-MM-DD (ISO)
 * Útil para inputs de tipo date y para el backend
 * @returns {string} - Fecha en formato YYYY-MM-DD
 */
export function getTodayDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/**
 * Formatea un número como moneda USD
 * @param {number} value - El valor a formatear
 * @param {object} options - Opciones de formateo
 * @returns {string} - Valor formateado
 */
export function formatCurrency(value, options = {}) {
    const {
        locale = "en-US",
        currency = "USD",
        minimumFractionDigits = 2,
        maximumFractionDigits = 2,
    } = options;

    // Ensure minimumFractionDigits doesn't exceed maximumFractionDigits
    const minDigits = Math.min(minimumFractionDigits, maximumFractionDigits);

    return new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: minDigits,
        maximumFractionDigits,
    }).format(value || 0);
}

/**
 * Formatea una fecha en formato "13 dic 2025"
 * Maneja correctamente valores nulos, indefinidos y fechas inválidas
 * @param {string|Date} date - La fecha a formatear
 * @param {object} options - Opciones de formateo
 * @returns {string} - Fecha formateada
 */
export function formatDate(date, options = {}) {
    // Validación robusta de entrada
    if (!date || date === "null" || date === "undefined") return "—";

    const {
        locale = "es-SV",
        format = "short", // 'short', 'medium', 'long'
    } = options;

    try {
        const dateObj = new Date(date);

        // Verificar si la fecha es válida
        if (isNaN(dateObj.getTime())) {
            return "—";
        }

        // Nombres cortos de meses en español
        const monthsShort = [
            "ene",
            "feb",
            "mar",
            "abr",
            "may",
            "jun",
            "jul",
            "ago",
            "sep",
            "oct",
            "nov",
            "dic",
        ];

        // Para formato short y medium, usamos "13 dic 2025"
        if (format === "short" || format === "medium") {
            const day = dateObj.getDate();
            const month = monthsShort[dateObj.getMonth()];
            const year = dateObj.getFullYear();
            return `${day} ${month} ${year}`;
        }

        // Para formato long, incluimos hora si está disponible
        if (format === "long") {
            const formatOptions = {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            };
            return dateObj.toLocaleDateString(locale, formatOptions);
        }

        return dateObj.toLocaleDateString(locale);
    } catch {
        return "—";
    }
}

/**
 * Formatea una fecha relativa (hace X días, etc.)
 * @param {string|Date} date - La fecha
 * @returns {string} - Texto relativo
 */
export function formatRelativeDate(date) {
    if (!date || date === "null" || date === "undefined") return "—";

    try {
        const now = new Date();
        const target = new Date(date);

        if (isNaN(target.getTime())) return "—";

        const diffTime = target - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return "Hoy";
        if (diffDays === 1) return "Mañana";
        if (diffDays === -1) return "Ayer";
        if (diffDays > 0 && diffDays <= 7) return `En ${diffDays} días`;
        if (diffDays < 0 && diffDays >= -7)
            return `Hace ${Math.abs(diffDays)} días`;

        return formatDate(date, { format: "medium" });
    } catch {
        return "—";
    }
}

/**
 * Trunca texto con ellipsis
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string}
 */
export function truncate(text, maxLength = 50) {
    if (!text || text.length <= maxLength) return text || "";
    return `${text.slice(0, maxLength)}...`;
}

/**
 * Genera un ID único simple
 * @returns {string}
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Debounce function
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Capitaliza la primera letra
 * @param {string} str
 * @returns {string}
 */
export function capitalize(str) {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Obtiene las iniciales de un nombre
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
    if (!name) return "";
    return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}



/**
 * Formatea una fecha/hora proveniente del backend (ISO UTC)
 * Maneja correctamente la zona horaria local para evitar cambios de día
 * @param {string|Date} dateString - La fecha en formato ISO
 * @param {object} options - Opciones de formateo
 * @returns {string} - Fecha formateada
 */
export function formatDateTime(dateString, options = {}) {
    if (!dateString || dateString === "null" || dateString === "undefined") return "—";

    const { includeTime = false, locale = "es-SV" } = options;

    try {
        const date = new Date(dateString);

        // Verificar si la fecha es válida
        if (isNaN(date.getTime())) {
            return "—";
        }

        const formatOptions = {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        };

        if (includeTime) {
            formatOptions.hour = "2-digit";
            formatOptions.minute = "2-digit";
        }

        return date.toLocaleDateString(locale, formatOptions);
    } catch {
        return "—";
    }
}
