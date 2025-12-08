import React, { Fragment, useState } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { CheckIcon, ChevronUpDownIcon } from "@heroicons/react/24/outline";

/**
 * Select - Selector profesional con búsqueda
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <Listbox value={value} onChange={onChange} disabled={disabled}>
                <div className="relative">
                    <Listbox.Button
                        className={`
            relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left
            border ${error ? "border-red-300" : "border-gray-300"}
            transition-all duration-200
            hover:border-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:hover:border-gray-300
          `}
                    >
                        <span className="block truncate">
                            {selectedOption
                                ? getOptionLabel(selectedOption)
                                : placeholder}
                        </span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" />
                        </span>
                    </Listbox.Button>
                    <Transition
                        as={Fragment}
                        leave="transition ease-in duration-100"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                            {searchable && (
                                <div className="px-2 py-2 sticky top-0 bg-white border-b">
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 border border-gray-300 rounded-md transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:border-gray-400"
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
                                <div className="px-3 py-2 text-gray-500 text-sm">
                                    No se encontraron opciones
                                </div>
                            ) : (
                                filteredOptions.map((option, index) => (
                                    <Listbox.Option
                                        key={index}
                                        className={({ active }) =>
                                            `relative cursor-pointer select-none py-2 pl-10 pr-4 transition-colors duration-150 ${
                                                active
                                                    ? "bg-blue-50 text-blue-900"
                                                    : "text-gray-900"
                                            }`
                                        }
                                        value={getOptionValue(option)}
                                    >
                                        {({ selected }) => (
                                            <>
                                                <span
                                                    className={`block truncate ${
                                                        selected
                                                            ? "font-medium"
                                                            : "font-normal"
                                                    }`}
                                                >
                                                    {getOptionLabel(option)}
                                                </span>
                                                {selected && (
                                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                                        <CheckIcon className="h-5 w-5" />
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
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export default Select;
