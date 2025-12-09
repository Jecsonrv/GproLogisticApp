import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
 * Formatea un número como moneda USD
 * @param {number} value - El valor a formatear
 * @param {object} options - Opciones de formateo
 * @returns {string} - Valor formateado
 */
export function formatCurrency(value, options = {}) {
  const {
    locale = 'en-US',
    currency = 'USD',
    minimumFractionDigits = 2,
    maximumFractionDigits = 2
  } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value || 0);
}

/**
 * Formatea una fecha en formato salvadoreño
 * @param {string|Date} date - La fecha a formatear
 * @param {object} options - Opciones de formateo
 * @returns {string} - Fecha formateada
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';

  const {
    locale = 'es-SV',
    format = 'short' // 'short', 'medium', 'long'
  } = options;

  const formats = {
    short: { day: '2-digit', month: 'short' },
    medium: { day: '2-digit', month: 'short', year: 'numeric' },
    long: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' },
  };

  return new Date(date).toLocaleDateString(locale, formats[format] || formats.short);
}

/**
 * Formatea una fecha relativa (hace X días, etc.)
 * @param {string|Date} date - La fecha
 * @returns {string} - Texto relativo
 */
export function formatRelativeDate(date) {
  if (!date) return 'N/A';

  const now = new Date();
  const target = new Date(date);
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Mañana';
  if (diffDays === -1) return 'Ayer';
  if (diffDays > 0 && diffDays <= 7) return `En ${diffDays} días`;
  if (diffDays < 0 && diffDays >= -7) return `Hace ${Math.abs(diffDays)} días`;

  return formatDate(date, { format: 'medium' });
}

/**
 * Trunca texto con ellipsis
 * @param {string} text - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string}
 */
export function truncate(text, maxLength = 50) {
  if (!text || text.length <= maxLength) return text || '';
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
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Obtiene las iniciales de un nombre
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
