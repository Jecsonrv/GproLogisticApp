import React, { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";

/**
 * Select - Selector corporativo con búsqueda
 * Estilo: Sobrio, profesional, consistente con design system
 */
const Select = ({
    value,
    onChange,
    options = [],
    placeholder = "Seleccionar...",
    label,
    error,
    disabled = false,
    searchable = false,
    getOptionLabel = (option) => option.label || option.name || option,
    getOptionValue = (option) => option.value || option.id || option,
}) => {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredOptions = searchable
        ? options.filter((option) =>
              getOptionLabel(option)
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase())
          )
        : options;

    const selectedOption = options.find((opt) => getOptionValue(opt) === value);

    return (
        <div className="w-full">
            {label && (
                <label className="block text-xs font-medium text-slate-700 mb-1">
                    {label}
                </label>
            )}
            <Listbox value={value} onChange={onChange} disabled={disabled}>
                <div className="relative">
                    <Listbox.Button
                        className={`
                            relative w-full cursor-default rounded-sm bg-white py-2 pl-3 pr-10 text-left text-sm
                            border ${
                                error ? "border-danger-300" : "border-slate-300"
                            }
                            transition-colors duration-150
                            hover:border-slate-400
                            focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500
                            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed disabled:hover:border-slate-300
                        `}
                    >
                        <span
                            className={`block truncate ${
                                !selectedOption
                                    ? "text-slate-400"
                                    : "text-slate-900"
                            }`}
                        >
                            {selectedOption
                                ? getOptionLabel(selectedOption)
                                : placeholder}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-4 w-4 text-slate-400" />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute z-dropdown mt-1 max-h-60 w-full overflow-auto rounded-sm bg-white py-1 text-sm shadow-dropdown border border-slate-200 focus:outline-none">
                            {searchable && (
                                <div className="px-2 py-2 sticky top-0 bg-white border-b border-slate-200">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-sm transition-colors duration-150 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 hover:border-slate-400 placeholder:text-slate-400"
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            )}
                            {filteredOptions.length === 0 ? (
                                <div className="px-3 py-2 text-slate-500 text-sm">
                                    No se encontraron opciones
                                </div>
                            ) : (
                                filteredOptions.map((option, index) => (
                                    <Listbox.Option
                                        key={index}
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-2 pl-9 pr-4 transition-colors duration-75 ${
                                                active
                                                    ? "bg-slate-50 text-slate-900"
                                                    : "text-slate-700"
                                            }`
                                        }
                                        value={getOptionValue(option)}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${
                                                        selected
                                                            ? "font-medium text-slate-900"
                                                            : "font-normal"
                                                    }`}
                                                >
                                                    {getOptionLabel(option)}
                                                </span>
                                                {selected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-brand-600">
                                                        <CheckIcon className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </Listbox.Option>
                                ))
                            )}
                        </Listbox.Options>
                    </Transition>
                </div>
            </Listbox>
            {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>
    );
};

export default Select;
