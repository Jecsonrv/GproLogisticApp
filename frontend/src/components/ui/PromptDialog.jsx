import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Input";

/**
 * PromptDialog - Un reemplazo profesional para window.prompt
 * Permite solicitar un valor al usuario mediante un modal.
 */
const PromptDialog = ({
    open,
    onClose,
    onConfirm,
    title,
    description,
    label,
    placeholder = "",
    defaultValue = "",
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    required = false,
    type = "text",
}) => {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (open) {
            setValue(defaultValue);
        }
    }, [open, defaultValue]);

    const handleConfirm = () => {
        if (required && !value.trim()) {
            return;
        }
        onConfirm(value);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>
                
                <div className="py-4">
                    <Input
                        label={label}
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        placeholder={placeholder}
                        type={type}
                        autoFocus
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                handleConfirm();
                            }
                        }}
                    />
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        {cancelText}
                    </Button>
                    <Button onClick={handleConfirm} disabled={required && !value.trim()}>
                        {confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PromptDialog;
