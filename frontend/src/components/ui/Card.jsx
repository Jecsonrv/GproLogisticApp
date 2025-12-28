import * as React from "react";
import { cn } from "../../lib/utils";

/**
 * Card Components - Design System Corporativo GPRO
 * Sistema de tarjetas composables para contenido estructurado
 */

const Card = React.forwardRef(
    ({ className, variant = "default", ...props }, ref) => {
        const variants = {
            default: "bg-white border border-slate-200 shadow-card",
            elevated: "bg-white border border-slate-200 shadow-md",
            flat: "bg-white border border-slate-200",
            ghost: "bg-slate-50 border border-slate-100",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "rounded-md text-slate-900",
                    variants[variant],
                    className
                )}
                {...props}
            />
        );
    }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1 p-5 pb-0", className)}
        {...props}
    />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-base font-semibold leading-tight tracking-tight text-slate-900",
            className
        )}
        {...props}
    />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-slate-500", className)}
        {...props}
    />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-5", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex items-center p-5 pt-0", className)}
        {...props}
    />
));
CardFooter.displayName = "CardFooter";

/**
 * StatCard - Tarjeta de estadística/KPI con soporte responsive
 */
const StatCard = React.forwardRef(
    (
        {
            className,
            title,
            value,
            description,
            icon: Icon,
            trend,
            trendValue,
            variant = "default",
            compact = false, // Modo compacto para móviles
            ...props
        },
        ref
    ) => {
        const trendColors = {
            up: "text-success-600",
            down: "text-danger-600",
            neutral: "text-slate-500",
        };

        const trendIcons = {
            up: "↑",
            down: "↓",
            neutral: "→",
        };

        return (
            <Card ref={ref} className={cn("p-3 sm:p-4", className)} {...props}>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
                            {title}
                        </p>
                        <p className="text-lg sm:text-2xl font-bold text-slate-900 mt-0.5 sm:mt-1 tabular-nums tracking-tight truncate">
                            {value}
                        </p>
                        {(description || trend) && (
                            <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                                {trend && trendValue && (
                                    <span
                                        className={cn(
                                            "text-[10px] sm:text-xs font-medium whitespace-nowrap",
                                            trendColors[trend]
                                        )}
                                    >
                                        {trendIcons[trend]} {trendValue}
                                    </span>
                                )}
                                {description && (
                                    <span className="text-[10px] sm:text-xs text-slate-500 truncate hidden xs:inline">
                                        {description}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {Icon && (
                        <div className="flex-shrink-0 p-1.5 sm:p-2 bg-slate-100 rounded">
                            <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
                        </div>
                    )}
                </div>
            </Card>
        );
    }
);
StatCard.displayName = "StatCard";

/**
 * MetricCard - Tarjeta de métrica con variante de color
 */
const MetricCard = React.forwardRef(
    (
        {
            className,
            title,
            value,
            subtitle,
            icon: Icon,
            variant = "default",
            ...props
        },
        ref
    ) => {
        const variants = {
            default: "bg-slate-50 border-slate-200 text-slate-900",
            primary: "bg-slate-100 border-slate-300 text-slate-800",
            success: "bg-success-50 border-success-200 text-success-700",
            warning: "bg-warning-50 border-warning-200 text-warning-700",
            danger: "bg-danger-50 border-danger-200 text-danger-700",
            info: "bg-info-50 border-info-200 text-info-700",
        };

        return (
            <div
                ref={ref}
                className={cn(
                    "p-4 rounded-md border",
                    variants[variant],
                    className
                )}
                {...props}
            >
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-medium opacity-75 uppercase tracking-wide">
                            {title}
                        </p>
                        <p className="text-xl font-bold mt-1 tabular-nums">
                            {value}
                        </p>
                        {subtitle && (
                            <p className="text-xs opacity-75 mt-0.5">
                                {subtitle}
                            </p>
                        )}
                    </div>
                    {Icon && (
                        <div className="opacity-50">
                            <Icon className="w-6 h-6" />
                        </div>
                    )}
                </div>
            </div>
        );
    }
);
MetricCard.displayName = "MetricCard";

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
    StatCard,
    MetricCard,
};
