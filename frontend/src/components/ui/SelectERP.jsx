import React, { Fragment, useState, useRef, useEffect } from "react";
import { Listbox, Transition } from "@headlessui/react";
import {
    CheckIcon,
    ChevronUpDownIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";

/**
 * SelectERP - Selector profesional estilo ERP
 * Diseño limpio, moderno y elegante inspirado en sistemas empresariales
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
            button: "py-1.5 pl-3 pr-9 text-xs",
            icon: "h-4 w-4",
            option: "py-1.5 pl-9 pr-3 text-xs",
            checkIcon: "h-3.5 w-3.5",
        },
        md: {
            button: "py-2 pl-3.5 pr-10 text-sm h-9",
            icon: "h-5 w-5",
            option: "py-2 pl-10 pr-4 text-sm",
            checkIcon: "h-4 w-4",
        },
        lg: {
            button: "py-3 pl-4 pr-11 text-base",
            icon: "h-5 w-5",
            option: "py-3 pl-11 pr-4 text-base",
            checkIcon: "h-5 w-5",
        },
    };

    const currentSize = sizeClasses[size];

    return (
        <div className="w-full">
            {/* Label */}
            {label && (
                <label className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                    {label}
                    {required && <span className="text-red-500">*</span>}
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
                                            ? "border-red-400"
                                            : "border-gray-300"
                                    }
                                    rounded-sm
                                    ${currentSize.button}
                                    transition-all duration-200 ease-in-out
                                    hover:border-gray-400 hover:shadow-sm
                                    focus:outline-none focus:border-blue-400 focus:shadow-sm
                                    ${
                                        disabled
                                            ? "bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200"
                                            : "text-gray-900"
                                    }
                                    ${open ? "border-blue-400 shadow-sm" : ""}
                                    ${error && open ? "border-red-400" : ""}
                                `}
                            >
                                {/* Texto seleccionado o placeholder */}
                                <span
                                    className={`block truncate ${
                                        !selectedOption && "text-gray-400"
                                    }`}
                                >
                                    {selectedOption
                                        ? getOptionLabel(selectedOption)
                                        : placeholder}
                                </span>

                                {/* Iconos de la derecha */}
                                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1">
                                    {/* Botón de limpiar (si está habilitado y hay valor) */}
                                    {clearable &&
                                        value !== null &&
                                        value !== undefined &&
                                        value !== "" &&
                                        !disabled && (
                                            <button
                                                type="button"
                                                onClick={handleClear}
                                                className="pointer-events-auto rounded p-0.5 hover:bg-gray-100 transition-colors"
                                            >
                                                <XMarkIcon
                                                    className={`${currentSize.icon} text-gray-400 hover:text-gray-600`}
                                                />
                                            </button>
                                        )}
                                    {/* Icono chevron */}
                                    <ChevronUpDownIcon
                                        className={`${
                                            currentSize.icon
                                        } text-gray-400 transition-transform duration-200 ${
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
                                <Listbox.Options className="absolute z-50 mt-1.5 w-full overflow-hidden rounded-sm bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                    {/* Barra de búsqueda */}
                                    {searchable && (
                                        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 p-2.5">
                                            <div className="relative">
                                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                <input
                                                    ref={searchInputRef}
                                                    type="text"
                                                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-sm transition-all duration-200 focus:bg-white focus:outline-none focus:border-blue-400"
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
                                                <p className="text-sm text-gray-500">
                                                    No se encontraron resultados
                                                </p>
                                                {searchTerm && (
                                                    <p className="text-xs text-gray-400 mt-1">
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
                                                            } transition-colors duration-150 ${
                                                                active
                                                                    ? "bg-blue-50 text-blue-900"
                                                                    : "text-gray-900"
                                                            }`
                                                        }
                                                        value={getOptionValue(
                                                            option
                                                        )}
                                                    >
                                                        {({
                                                            selected,
                                                            active,
                                                        }) => (
                                                            <>
                                                                {/* Icono de check */}
                                                                {selected && (
                                                                    <span
                                                                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                                                            active
                                                                                ? "text-blue-600"
                                                                                : "text-blue-500"
                                                                        }`}
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
                                                                            ? "font-semibold"
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
                    className={`mt-1.5 text-xs ${
                        error ? "text-red-600" : "text-gray-500"
                    }`}
                >
                    {error || helperText}
                </p>
            )}
        </div>
    );
};

export default SelectERP;
