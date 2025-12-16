import React, { Fragment, useState, useRef, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
import {
    CheckIcon,
    ChevronUpDownIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

/**
 * SelectERP - Selector corporativo estilo ERP
 * Diseño sobrio, profesional, consistente con design system
 * Referencia: SAP Fiori Select, Stripe Dashboard
 */
const SelectERP = ({
    value,
    onChange,
    options = [],
    placeholder = "Seleccionar...",
    label,
    error,
    disabled = false,
    searchable = false,
    clearable = false,
    required = false,
    helperText,
    size = "md", // sm, md, lg
    getOptionLabel = (option) => option.label || option.name || option,
    getOptionValue = (option) => option.value || option.id || option,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const searchInputRef = useRef(null);

    // Filtrar opciones basado en búsqueda
    const filteredOptions = searchable
        ? options.filter((option) =>
              getOptionLabel(option)
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase())
          )
        : options;

    // Obtener opción seleccionada
    const selectedOption = options.find((opt) => getOptionValue(opt) === value);

    // Focus en input de búsqueda cuando se abre el dropdown
    useEffect(() => {
        if (isOpen && searchable && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 10);
        }
    }, [isOpen, searchable]);

    // Limpiar búsqueda al cerrar
    const handleClose = () => {
        setIsOpen(false);
        setSearchTerm("");
    };

    // Manejar limpieza de selección
    const handleClear = (e) => {
        e.stopPropagation();
        onChange(null);
    };

    // Tamaños del componente
    const sizeClasses = {
        sm: {
            button: "py-1.5 pl-3 pr-9 text-xs h-7",
            icon: "h-4 w-4",
            option: "py-1.5 pl-8 pr-3 text-xs",
            checkIcon: "h-3.5 w-3.5",
        },
        md: {
            button: "py-2 pl-3 pr-9 text-sm h-9",
            icon: "h-4 w-4",
            option: "py-2 pl-9 pr-4 text-sm",
            checkIcon: "h-4 w-4",
        },
        lg: {
            button: "py-2.5 pl-3.5 pr-10 text-sm h-10",
            icon: "h-5 w-5",
            option: "py-2.5 pl-10 pr-4 text-sm",
            checkIcon: "h-4 w-4",
        },
    };

    const currentSize = sizeClasses[size];

    return (
        <div className="w-full">
            {/* Label */}
            {label && (
                <label className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 mb-1">
                    {label}
                    {required && <span className="text-danger-500">*</span>}
                </label>
            )}

            <Listbox value={value} onChange={onChange} disabled={disabled}>
                {({ open }) => {
                    // Sincronizar estado local con estado de Listbox
                    if (open !== isOpen) {
                        setIsOpen(open);
                    }
                    if (!open && searchTerm) {
                        setSearchTerm("");
                    }

                    return (
                        <div className="relative">
                            {/* Botón principal */}
                            <Listbox.Button
                                className={`
                                    group
                                    relative w-full cursor-default text-left
                                    bg-white
                                    border ${
                                        error
                                            ? "border-danger-300"
                                            : "border-slate-300"
                                    }
                                    rounded-sm
                                    ${currentSize.button}
                                    transition-colors duration-150
                                    hover:border-slate-400
                                    focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500
                                    ${
                                        disabled
                                            ? "bg-slate-50 text-slate-500 cursor-not-allowed border-slate-200"
                                            : "text-slate-900"
                                    }
                                    ${
                                        open
                                            ? "border-brand-500 ring-1 ring-brand-500"
                                            : ""
                                    }
                                    ${
                                        error && open
                                            ? "border-danger-500 ring-1 ring-danger-500"
                                            : ""
                                    }
                                `}
                            >
                                {/* Texto seleccionado o placeholder */}
                                <span
                                    className={`block truncate ${
                                        !selectedOption && "text-slate-400"
                                    }`}
                                >
                                    {selectedOption
                                        ? getOptionLabel(selectedOption)
                                        : placeholder}
                                </span>

                                {/* Iconos de la derecha */}
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
                                    {/* Botón de limpiar (si está habilitado y hay valor) */}
                                    {clearable &&
                                        value !== null &&
                                        value !== undefined &&
                                        value !== "" &&
                                        !disabled && (
                                            <button
                                                type="button"
                                                onClick={handleClear}
                                                className="pointer-events-auto rounded p-0.5 hover:bg-slate-100 transition-colors"
                                            >
                                                <XMarkIcon
                                                    className={`${currentSize.icon} text-slate-400 hover:text-slate-600`}
                                                />
                                            </button>
                                        )}
                                    {/* Icono chevron */}
                                    <ChevronUpDownIcon
                                        className={`${
                                            currentSize.icon
                                        } text-slate-400 transition-transform duration-150 ${
                                            open ? "rotate-180" : ""
                                        }`}
                                    />
                                </span>
                            </Listbox.Button>

                            {/* Dropdown con opciones */}
                            <Transition
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                                afterLeave={handleClose}
                            >
                                <Listbox.Options className="absolute z-dropdown mt-1 w-full overflow-hidden rounded-sm bg-white shadow-dropdown border border-slate-200 focus:outline-none">
                                    {/* Barra de búsqueda */}
                                    {searchable && (
                                        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 p-2">
                                            <div className="relative">
                                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-300 rounded-sm transition-colors duration-150 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 placeholder:text-slate-400"
                                                    placeholder="Buscar..."
                                                    value={searchTerm}
                                                    onChange={(e) =>
                                                        setSearchTerm(
                                                            e.target.value
                                                        )
                                                    }
                                                    onClick={(e) =>
                                                        e.stopPropagation()
                                                    }
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Lista de opciones */}
                                    <div className="max-h-60 overflow-auto py-1">
                                        {filteredOptions.length === 0 ? (
                                            <div className="px-4 py-6 text-center">
                                                <p className="text-sm text-slate-500">
                                                    No se encontraron resultados
                                                </p>
                                                {searchTerm && (
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Intenta con otro término
                                                        de búsqueda
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            filteredOptions.map(
                                                (option, index) => (
                                                    <Listbox.Option
                                                        key={index}
                                                        className={({
                                                            active,
                                                        }) =>
                                                            `relative cursor-pointer select-none ${
                                                                currentSize.option
                                                            } transition-colors duration-75 ${
                                                                active
                                                                    ? "bg-slate-50 text-slate-900"
                                                                    : "text-slate-700"
                                                            }`
                                                        }
                                                        value={getOptionValue(
                                                            option
                                                        )}
                                                    >
                                                        {({ selected }) => (
                                                            <>
                                                                {/* Icono de check */}
                                                                {selected && (
                                                                    <span
                                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 text-brand-600`}
                                                                    >
                                                                        <CheckIcon
                                                                            className={
                                                                                currentSize.checkIcon
                                                                            }
                                                                        />
                                                                    </span>
                                                                )}

                                                                {/* Texto de la opción */}
                                                                <span
                                                                    className={`block truncate ${
                                                                        selected
                                                                            ? "font-medium text-slate-900"
                                                                            : "font-normal"
                                                                    }`}
                                                                >
                                                                    {getOptionLabel(
                                                                        option
                                                                    )}
                                                                </span>
                                                            </>
                                                        )}
                                                    </Listbox.Option>
                                                )
                                            )
                                        )}
                                    </div>
                                </Listbox.Options>
                            </Transition>
                        </div>
                    );
                }}
            </Listbox>

            {/* Texto de ayuda o error */}
            {(error || helperText) && (
                <p
                    className={`mt-1 text-xs ${
                        error ? "text-danger-600" : "text-slate-500"
                    }`}
                >
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default SelectERP;
