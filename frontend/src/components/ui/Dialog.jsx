import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Dialog({ open, onOpenChange, children }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />

            {/* Content */}
            <div className="relative z-50 max-h-[90vh] overflow-y-auto">
                {children}
            </div>
        </div>
    );
}

export function DialogContent({ children, className, size = "md" }) {
    const sizes = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
        full: "max-w-7xl",
    };

    return (
        <div
            className={cn(
                "w-full rounded-lg bg-white p-6 shadow-xl",
                sizes[size],
                className
            )}
        >
            {children}
        </div>
    );
}

export function DialogHeader({ children, className }) {
    return (
        <div
            className={cn(
                "flex flex-col space-y-1.5 text-center sm:text-left",
                className
            )}
        >
            {children}
        </div>
    );
}

export function DialogTitle({ children, className }) {
    return (
        <h3
            className={cn(
                "text-lg font-semibold leading-none tracking-tight text-gray-900",
                className
            )}
        >
            {children}
        </h3>
    );
}

export function DialogDescription({ children, className }) {
    return <p className={cn("text-sm text-gray-500", className)}>{children}</p>;
}

export function DialogFooter({ children, className }) {
    return (
        <div
            className={cn(
                "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6",
                className
            )}
        >
            {children}
        </div>
    );
}

export function DialogClose({ onClose, className }) {
    return (
        <button
            type="button"
            onClick={onClose}
            className={cn(
                "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
        >
            <X className="h-4 w-4" />
            <span className="sr-only">Cerrar</span>
        </button>
    );
}
