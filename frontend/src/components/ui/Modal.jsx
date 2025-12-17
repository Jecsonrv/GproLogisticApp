import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Modal - Modal reutilizable y profesional con tamaños mejorados
 */
/**
 * Modal - Estilo Corporativo Enterprise
 * Bordes mínimos, sombras sutiles, aspecto profesional
 */
const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = "md", // sm, md, lg, xl, 2xl, 3xl, 4xl, 5xl, full
    showCloseButton = true,
    footer,
    closeOnOverlayClick = true,
}) => {
    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-3xl",
        "2xl": "max-w-4xl",
        "3xl": "max-w-5xl",
        "4xl": "max-w-6xl",
        "5xl": "max-w-7xl",
        full: "max-w-[95vw]",
    };

    return (
        <Transition appear show={isOpen} as={Fragment}>
            <Dialog
                as="div"
                className="relative z-50"
                onClose={closeOnOverlayClick ? onClose : () => {}}
            >
                {/* Overlay - más sutil */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-slate-900/50" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-98"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-98"
                        >
                            {/* Panel - bordes mínimos estilo enterprise */}
                            <Dialog.Panel
                                className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-md bg-white text-left align-middle shadow-modal transition-all border border-slate-200`}
                            >
                                {/* Header - estilo corporativo */}
                                {(title || showCloseButton) && (
                                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
                                        {title && (
                                            <Dialog.Title
                                                as="h3"
                                                className="text-base font-semibold leading-6 text-slate-900"
                                            >
                                                {title}
                                            </Dialog.Title>
                                        )}
                                        {showCloseButton && (
                                            <button
                                                type="button"
                                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded p-1.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1"
                                                onClick={onClose}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Body */}
                                <div className="px-5 py-5 max-h-[calc(90vh-180px)] overflow-y-auto">
                                    {children}
                                </div>

                                {/* Footer - estilo corporativo */}
                                {footer && (
                                    <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                                        {footer}
                                    </div>
                                )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export const ModalFooter = ({ children, className = "" }) => (
    <div
        className={`flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 bg-slate-50 -mx-5 -mb-5 mt-5 ${className}`}
    >
        {children}
    </div>
);

export default Modal;
