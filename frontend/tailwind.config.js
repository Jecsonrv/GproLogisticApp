/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    // Breakpoints optimizados para ERP responsive
    screens: {
      'xs': '375px',    // iPhone SE y móviles pequeños
      'sm': '640px',    // Móviles grandes / tablets pequeñas
      'md': '768px',    // Tablets (iPad mini)
      'lg': '1024px',   // Tablets grandes / laptops pequeñas
      'xl': '1280px',   // Laptops / desktops
      '2xl': '1536px',  // Desktops grandes
      '3xl': '1920px',  // Monitores ultrawide
    },
    extend: {
      // ============================================
      // DESIGN SYSTEM - GPRO LOGISTIC ERP/CRM
      // Estilo: Corporativo, Sobrio, Denso en información
      // Referencia: Salesforce Lightning, SAP Fiori
      // ============================================

      colors: {
        // BRAND - Azul corporativo principal
        brand: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#b8d4ff',
          300: '#7ab3ff',
          400: '#3a8fff',
          500: '#0066ff',  // Primary action
          600: '#0052cc',  // Primary hover
          700: '#003d99',  // Dark variant
          800: '#002966',  // Darker variant
          900: '#001433',  // Darkest
          950: '#000a1a',
        },

        // NEUTRAL - Grises para UI corporativa
        slate: {
          25: '#fcfcfd',   // Background más claro
          50: '#f8fafc',
          75: '#f4f6f8',   // Background secundario
          100: '#f1f5f9',  // Background principal
          150: '#e8edf2',  // Borders sutiles
          200: '#e2e8f0',  // Borders
          300: '#cbd5e1',  // Borders más visibles
          400: '#94a3b8',  // Placeholder text
          500: '#64748b',  // Secondary text
          600: '#475569',  // Body text
          700: '#334155',  // Headers
          800: '#1e293b',  // Primary text
          900: '#0f172a',  // Títulos principales
          950: '#020617',  // Negro casi puro
        },

        // SUCCESS - Verde para estados positivos
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',  // Base
          600: '#16a34a',  // Hover
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },

        // WARNING - Amarillo/Ámbar para alertas
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',  // Base
          600: '#d97706',  // Hover
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },

        // DANGER - Rojo para errores y acciones destructivas
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',  // Base
          600: '#dc2626',  // Hover
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },

        // INFO - Azul claro para información
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',  // Base
          600: '#2563eb',  // Hover
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },

        // PURPLE - Para estados especiales
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        },

        // Alias para compatibilidad
        primary: {
          50: '#f0f6ff',
          100: '#e0edff',
          200: '#b8d4ff',
          300: '#7ab3ff',
          400: '#3a8fff',
          500: '#0066ff',
          600: '#0052cc',
          700: '#003d99',
          800: '#002966',
          900: '#001433',
          950: '#000a1a',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        }
      },

      // TIPOGRAFÍA
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Consolas', 'monospace'],
      },

      fontSize: {
        // Sistema tipográfico corporativo
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px
        'xs': ['0.6875rem', { lineHeight: '1rem' }],      // 11px - Para etiquetas pequeñas
        'sm': ['0.75rem', { lineHeight: '1.125rem' }],    // 12px - Texto secundario
        'base': ['0.8125rem', { lineHeight: '1.25rem' }], // 13px - Texto principal (denso)
        'md': ['0.875rem', { lineHeight: '1.375rem' }],   // 14px - Alternativo
        'lg': ['1rem', { lineHeight: '1.5rem' }],         // 16px - Subtítulos
        'xl': ['1.125rem', { lineHeight: '1.75rem' }],    // 18px - Títulos de sección
        '2xl': ['1.25rem', { lineHeight: '1.875rem' }],   // 20px - Títulos de página
        '3xl': ['1.5rem', { lineHeight: '2rem' }],        // 24px - Headers grandes
        '4xl': ['1.875rem', { lineHeight: '2.25rem' }],   // 30px
        '5xl': ['2.25rem', { lineHeight: '2.5rem' }],     // 36px
      },

      // ESPACIADO
      spacing: {
        '0.5': '0.125rem',  // 2px
        '1': '0.25rem',     // 4px
        '1.5': '0.375rem',  // 6px
        '2': '0.5rem',      // 8px
        '2.5': '0.625rem',  // 10px
        '3': '0.75rem',     // 12px
        '3.5': '0.875rem',  // 14px
        '4': '1rem',        // 16px
        '5': '1.25rem',     // 20px
        '6': '1.5rem',      // 24px
        '7': '1.75rem',     // 28px
        '8': '2rem',        // 32px
        '9': '2.25rem',     // 36px
        '10': '2.5rem',     // 40px
        '11': '2.75rem',    // 44px
        '12': '3rem',       // 48px
        '14': '3.5rem',     // 56px
        '16': '4rem',       // 64px
        '18': '4.5rem',     // 72px
        '20': '5rem',       // 80px
      },

      // BORDER RADIUS
      borderRadius: {
        'none': '0',
        'sm': '0.25rem',    // 4px - Botones y inputs
        'DEFAULT': '0.375rem', // 6px - Cards
        'md': '0.5rem',     // 8px - Modals
        'lg': '0.75rem',    // 12px - Cards grandes
        'xl': '1rem',       // 16px
        '2xl': '1.5rem',    // 24px
        'full': '9999px',   // Círculos
      },

      // SOMBRAS - Sutiles y profesionales
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.03)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.03)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px -1px rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.03)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.03)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.03)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.1)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.03)',
        // Sombras para elevación de elementos
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px 0 rgb(0 0 0 / 0.02)',
        'card-hover': '0 4px 12px 0 rgb(0 0 0 / 0.06), 0 2px 4px 0 rgb(0 0 0 / 0.03)',
        'dropdown': '0 4px 16px 0 rgb(0 0 0 / 0.08), 0 2px 4px 0 rgb(0 0 0 / 0.04)',
        'modal': '0 20px 40px 0 rgb(0 0 0 / 0.12), 0 8px 16px 0 rgb(0 0 0 / 0.06)',
        // Focus rings
        'focus-brand': '0 0 0 3px rgba(0, 102, 255, 0.15)',
        'focus-danger': '0 0 0 3px rgba(239, 68, 68, 0.15)',
        'focus-success': '0 0 0 3px rgba(34, 197, 94, 0.15)',
      },

      // ANIMACIONES
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'fade-out': 'fadeOut 0.2s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'slide-down': 'slideDown 0.2s ease-out',
        'scale-in': 'scaleIn 0.15s ease-out',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },

      // TRANSICIONES
      transitionDuration: {
        '75': '75ms',
        '100': '100ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
      },

      transitionTimingFunction: {
        'ease-out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
      },

      // ANCHO MÁXIMO PARA CONTENEDORES
      maxWidth: {
        '8xl': '88rem',    // 1408px
        '9xl': '96rem',    // 1536px
        'screen-3xl': '1920px',
      },

      // Z-INDEX
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'modal-backdrop': '400',
        'modal': '500',
        'popover': '600',
        'tooltip': '700',
        'toast': '800',
      },
    },
  },
  plugins: [],
}
