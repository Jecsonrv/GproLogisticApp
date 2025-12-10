import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

/**
 * Button Component - Design System Corporativo GPRO
 * Variantes: default, secondary, outline, ghost, destructive, success, link
 * Tamaños: xs, sm, default, lg, icon
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Botón primario - Acción principal
        default:
          "bg-brand-600 text-white shadow-sm hover:bg-brand-700 focus-visible:ring-brand-500",
        // Botón secundario - Acciones alternativas
        secondary:
          "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 focus-visible:ring-slate-500",
        // Botón outline - Acciones terciarias
        outline:
          "border border-slate-300 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-400 focus-visible:ring-brand-500",
        // Botón ghost - Sin fondo visible
        ghost:
          "text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-slate-500",
        // Botón destructivo - Acciones peligrosas
        destructive:
          "bg-danger-600 text-white shadow-sm hover:bg-danger-700 focus-visible:ring-danger-500",
        // Botón success - Acciones positivas
        success:
          "bg-success-600 text-white shadow-sm hover:bg-success-700 focus-visible:ring-success-500",
        // Botón link - Estilo enlace
        link:
          "text-brand-600 underline-offset-4 hover:underline hover:text-brand-700 focus-visible:ring-brand-500",
        // Botón warning - Acciones de precaución
        warning:
          "bg-warning-600 text-white shadow-sm hover:bg-warning-700 focus-visible:ring-warning-500",
      },
      size: {
        xs: "h-7 rounded-sm px-2 text-xs",
        sm: "h-8 rounded-sm px-3 text-sm",
        default: "h-9 rounded-sm px-4 text-sm",
        lg: "h-10 rounded px-5 text-base",
        xl: "h-11 rounded px-6 text-base",
        icon: "h-9 w-9 rounded-sm",
        "icon-sm": "h-8 w-8 rounded-sm",
        "icon-xs": "h-7 w-7 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}, ref) => {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && (
        <svg
          className="h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
