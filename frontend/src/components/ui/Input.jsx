import * as React from "react"
import { cn } from "../../lib/utils"

/**
 * Input Component - Design System Corporativo GPRO
 * Estilos consistentes con el resto del sistema
 */
const Input = React.forwardRef(({
  className,
  type,
  error,
  label,
  ...props
}, ref) => {
  if (label) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <input
          type={type}
          className={cn(
            // Base styles
            "flex h-9 w-full rounded-sm border bg-white px-3 py-2 text-sm transition-colors duration-150",
            // Placeholder
            "placeholder:text-slate-400",
            // Focus state
            "focus:outline-none focus:ring-1",
            // File input
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700",
            // Disabled
            "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
            // Default border and focus
            error
              ? "border-danger-300 focus:border-danger-500 focus:ring-danger-500"
              : "border-slate-300 focus:border-brand-500 focus:ring-brand-500",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <input
      type={type}
      className={cn(
        // Base styles
        "flex h-9 w-full rounded-sm border bg-white px-3 py-2 text-sm transition-colors duration-150",
        // Placeholder
        "placeholder:text-slate-400",
        // Focus state
        "focus:outline-none focus:ring-1",
        // File input
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700",
        // Disabled
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        // Default border and focus
        error
          ? "border-danger-300 focus:border-danger-500 focus:ring-danger-500"
          : "border-slate-300 focus:border-brand-500 focus:ring-brand-500",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

/**
 * Textarea Component - Design System Corporativo GPRO
 */
const Textarea = React.forwardRef(({
  className,
  error,
  ...props
}, ref) => {
  return (
    <textarea
      className={cn(
        // Base styles
        "flex min-h-[80px] w-full rounded-sm border bg-white px-3 py-2 text-sm transition-colors duration-150 resize-none",
        // Placeholder
        "placeholder:text-slate-400",
        // Focus state
        "focus:outline-none focus:ring-1",
        // Disabled
        "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
        // Default border and focus
        error
          ? "border-danger-300 focus:border-danger-500 focus:ring-danger-500"
          : "border-slate-300 focus:border-brand-500 focus:ring-brand-500",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

/**
 * FormField Component - Wrapper con label y error
 */
const FormField = React.forwardRef(({
  className,
  label,
  required,
  error,
  helperText,
  children,
  ...props
}, ref) => {
  return (
    <div className={cn("space-y-1.5", className)} ref={ref} {...props}>
      {label && (
        <label className={cn(
          "block text-xs font-medium text-slate-700",
          required && "after:content-['_*'] after:text-danger-500"
        )}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-danger-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-xs text-slate-500">{helperText}</p>
      )}
    </div>
  )
})
FormField.displayName = "FormField"

export { Input, Textarea, FormField }
