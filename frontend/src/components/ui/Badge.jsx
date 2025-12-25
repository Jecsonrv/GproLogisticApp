import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

/**
 * Badge Component - Design System Corporativo GPRO
 * Variantes semánticas para estados y categorías
 */
const badgeVariants = cva(
    "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium transition-colors",
    {
        variants: {
            variant: {
                // Default - Neutro
                default: "border-slate-200 bg-slate-100 text-slate-700",
                // Primary - Acción principal
                primary: "border-slate-300 bg-slate-100 text-slate-800",
                // Secondary - Información secundaria
                secondary: "border-slate-200 bg-slate-50 text-slate-600",
                // Success - Estados positivos (pagado, activo, completado)
                success: "border-success-200 bg-success-50 text-success-700",
                // Warning - Alertas y precauciones (pendiente, por vencer)
                warning: "border-warning-200 bg-warning-50 text-warning-700",
                // Danger - Errores y estados críticos (vencido, cancelado)
                danger: "border-danger-200 bg-danger-50 text-danger-700",
                // Info - Información y estados neutrales
                info: "border-info-200 bg-info-50 text-info-700",
                // Outline - Sin fondo
                outline: "border-slate-300 bg-transparent text-slate-700",
                // Purple - Estados especiales
                purple: "border-purple-200 bg-purple-50 text-purple-700",
            },
            size: {
                sm: "text-2xs px-1.5 py-0.5",
                default: "text-xs px-2 py-0.5",
                lg: "text-sm px-2.5 py-1",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

function Badge({ className, variant, size, children, ...props }) {
    return (
        <span
            className={cn(badgeVariants({ variant, size }), className)}
            {...props}
        >
            {children}
        </span>
    );
}

/**
 * StatusBadge - Badge preconfigurado para estados comunes
 */
const statusConfigs = {
    // Estados de orden de servicio
    abierta: { variant: "info", label: "En Proceso" },
    cerrada: { variant: "success", label: "Cerrada" },
    cancelada: { variant: "default", label: "Cancelada" },

    // Estados de pago/factura
    pendiente: { variant: "warning", label: "Pendiente" },
    pagado: { variant: "success", label: "Pagado" },
    pagada: { variant: "success", label: "Pagada" },
    vencido: { variant: "danger", label: "Vencido" },
    vencida: { variant: "danger", label: "Vencida" },
    parcial: { variant: "info", label: "Parcial" },

    // Estados generales
    activo: { variant: "success", label: "Activo" },
    active: { variant: "success", label: "Activo" },
    inactivo: { variant: "default", label: "Inactivo" },
    inactive: { variant: "default", label: "Inactivo" },

    // Estados de transferencia
    provisionada: { variant: "warning", label: "Provisionada" },
    procesada: { variant: "success", label: "Procesada" },

    // Tipos de transferencia
    terceros: { variant: "warning", label: "Terceros" },
    propios: { variant: "info", label: "Propios" },
    admin: { variant: "default", label: "Admin" },
};

function StatusBadge({ status, className, ...props }) {
    const config = statusConfigs[status?.toLowerCase()] || {
        variant: "default",
        label: status || "—",
    };

    return (
        <Badge variant={config.variant} className={className} {...props}>
            {config.label}
        </Badge>
    );
}

export { Badge, StatusBadge, badgeVariants };
