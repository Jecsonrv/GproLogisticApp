import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Modal - Estilo Corporativo Enterprise con Responsive Design
 *
 * Features:
 * - Fullscreen en móvil para mejor UX
 * - Tamaños adaptativos según viewport
 * - Safe area padding para notch/home indicator
 * - Scroll interno con header/footer fijos
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
    // Nuevas props para responsive
    mobileFullscreen = true, // En móvil, ocupar pantalla completa
    hideHeaderOnMobile = false, // Ocultar header en móvil
}) => {
    // Tamaños con responsive - en móvil siempre max-w más pequeño o fullscreen
    const sizeClasses = {
        sm: "sm:max-w-md",
        md: "sm:max-w-lg",
        lg: "sm:max-w-2xl",
        xl: "sm:max-w-3xl",
        "2xl": "sm:max-w-4xl",
        "3xl": "sm:max-w-5xl",
        "4xl": "sm:max-w-6xl",
        "5xl": "sm:max-w-7xl",
        full: "sm:max-w-[95vw]",
    };

    // Clases base para móvil
    const mobileClasses = mobileFullscreen
        ? "w-full h-full sm:h-auto sm:w-full sm:max-h-[90vh]"
        : "w-[95vw] max-h-[85vh] sm:w-full sm:max-h-[90vh]";

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
                    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    {/* Container - diferente alineación en móvil vs desktop */}
                    <div className={`flex min-h-full ${
                        mobileFullscreen
                            ? 'items-stretch sm:items-center justify-center sm:p-4'
                            : 'items-center justify-center p-4'
                    }`}>
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                            enterTo="opacity-100 translate-y-0 sm:scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                        >
                            {/* Panel - bordes mínimos estilo enterprise */}
                            <Dialog.Panel
                                className={`${mobileClasses} ${sizeClasses[size]} transform overflow-hidden ${
                                    mobileFullscreen
                                        ? 'rounded-none sm:rounded-lg'
                                        : 'rounded-lg'
                                } bg-white text-left align-middle shadow-modal transition-all border-0 sm:border sm:border-slate-200 flex flex-col`}
                            >
                                {/* Header - estilo corporativo con safe area */}
                                {(title || showCloseButton) && (
                                    <div className={`flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0 ${
                                        mobileFullscreen ? 'pt-[max(0.75rem,env(safe-area-inset-top))]' : ''
                                    } ${hideHeaderOnMobile ? 'hidden sm:flex' : ''}`}>
                                        {title && (
                                            <Dialog.Title
                                                as="h3"
                                                className="text-base sm:text-lg font-semibold leading-6 text-slate-900 truncate pr-2"
                                            >
                                                {title}
                                            </Dialog.Title>
                                        )}
                                        {showCloseButton && (
                                            <button
                                                type="button"
                                                className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg p-2 sm:p-1.5 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 -mr-1"
                                                onClick={onClose}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Botón cerrar flotante en móvil cuando header está oculto */}
                                {hideHeaderOnMobile && showCloseButton && (
                                    <button
                                        type="button"
                                        className="sm:hidden absolute top-3 right-3 z-10 text-slate-400 hover:text-slate-600 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md transition-colors duration-150 focus:outline-none"
                                        onClick={onClose}
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                )}

                                {/* Body - scroll interno con padding responsive */}
                                <div className={`px-4 sm:px-5 py-4 sm:py-5 flex-1 overflow-y-auto ${
                                    mobileFullscreen
                                        ? 'max-h-[calc(100vh-8rem)] sm:max-h-[calc(90vh-180px)]'
                                        : 'max-h-[calc(85vh-180px)]'
                                }`}>
                                    {children}
                                </div>

                                {/* Footer - estilo corporativo con safe area */}
                                {footer && (
                                    <div className={`px-4 sm:px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 flex-shrink-0 ${
                                        mobileFullscreen ? 'pb-[max(0.75rem,env(safe-area-inset-bottom))]' : ''
                                    }`}>
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
        className={`flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 px-4 sm:px-5 py-3 border-t border-slate-200 bg-slate-50 -mx-4 sm:-mx-5 -mb-4 sm:-mb-5 mt-4 sm:mt-5 ${className}`}
    >
        {children}
    </div>
);

export default Modal;
