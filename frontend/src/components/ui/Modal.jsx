import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";

/**
 * Modal - Modal reutilizable y profesional con tamaños mejorados
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
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel
                                className={`w-full ${sizeClasses[size]} transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all border border-gray-100`}
                            >
                                {/* Header */}
                                {(title || showCloseButton) && (
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/50">
                                        {title && (
                                            <Dialog.Title
                                                as="h3"
                                                className="text-lg font-semibold leading-6 text-gray-900"
                                            >
                                                {title}
                                            </Dialog.Title>
                                        )}
                                        {showCloseButton && (
                                            <button
                                                type="button"
                                                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                onClick={onClose}
                                            >
                                                <XMarkIcon className="h-5 w-5" />
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Body */}
                                <div className="px-6 py-5 max-h-[calc(90vh-200px)] overflow-y-auto">
                                    {children}
                                </div>

                                {/* Footer */}
                                {footer && (
                                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3 rounded-b-2xl">
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
        className={`flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 -mx-6 -mb-5 mt-6 rounded-b-2xl ${className}`}
    >
        {children}
    </div>
);

export default Modal;
