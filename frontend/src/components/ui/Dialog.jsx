import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

export function Dialog({ open, onOpenChange, children }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Overlay */}
            <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={() => onOpenChange(false)}
            />

            {/* Layout container */}
            <div className="flex min-h-full items-center justify-center p-4 text-center">
                {/* Content Wrapper */}
                <div className="relative z-50 w-full flex justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full flex justify-center">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function DialogContent({ children, className, size = "md" }) {
    const sizes = {
        sm: "max-w-md",
        md: "max-w-xl",
        lg: "max-w-3xl",
        xl: "max-w-5xl",
        "2xl": "max-w-6xl",
        "3xl": "max-w-7xl",
        full: "max-w-[95vw]",
    };

    return (
        <div
            className={cn(
                "w-full rounded-xl bg-white p-4 sm:p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto",
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
                "flex flex-col space-y-1.5 text-center sm:text-left mb-4",
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
                "text-xl font-semibold leading-none tracking-tight text-gray-900",
                className
            )}
        >
            {children}
        </h3>
    );
}

export function DialogDescription({ children, className }) {
    return (
        <p className={cn("text-sm text-gray-500 mt-1", className)}>
            {children}
        </p>
    );
}

export function DialogFooter({ children, className }) {
    return (
        <div
            className={cn(
                "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 mt-6 pt-4 border-t border-gray-100",
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
                "absolute right-4 top-4 rounded-lg p-1.5 opacity-70 ring-offset-white transition-all hover:opacity-100 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none",
                className
            )}
        >
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
        </button>
    );
}
