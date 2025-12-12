import React, { useState, useMemo } from "react";
import {
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

/**
 * DataTable - Tabla profesional con búsqueda, ordenamiento, paginación y filtros
 */
const DataTable = ({
    data = [],
    columns = [],
    searchable = true,
    searchPlaceholder = "Buscar...",
    onRowClick,
    loading = false,
    emptyMessage = "No hay datos disponibles",
    pageSize = 10,
    showPagination = true,
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);

    // Filtrar datos por búsqueda
    const filteredData = useMemo(() => {
        if (!searchTerm) return data;

        return data.filter((row) =>
            columns.some((column) => {
                const value = column.accessor ? row[column.accessor] : "";
                return String(value)
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase());
            })
        );
    }, [data, searchTerm, columns]);

    // Ordenar datos
    const sortedData = useMemo(() => {
        if (!sortColumn) return filteredData;

        return [...filteredData].sort((a, b) => {
            const aValue = a[sortColumn];
            const bValue = b[sortColumn];

            if (aValue === bValue) return 0;
            if (aValue === null || aValue === undefined) return 1;
            if (bValue === null || bValue === undefined) return -1;

            const comparison = aValue > bValue ? 1 : -1;
            return sortDirection === "asc" ? comparison : -comparison;
        });
    }, [filteredData, sortColumn, sortDirection]);

    // Paginar datos
    const paginatedData = useMemo(() => {
        if (!showPagination) return sortedData;

        const startIndex = (currentPage - 1) * pageSize;
        return sortedData.slice(startIndex, startIndex + pageSize);
    }, [sortedData, currentPage, pageSize, showPagination]);

    const totalPages = Math.ceil(sortedData.length / pageSize);

    const handleSort = (columnAccessor) => {
        if (sortColumn === columnAccessor) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortColumn(columnAccessor);
            setSortDirection("asc");
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Búsqueda */}
            {searchable && (
                <div className="mb-4">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>
                </div>
            )}

            {/* Tabla */}
            <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
                <table className="min-w-full">
                    <thead className="bg-white border-b border-gray-200">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.accessor || column.header}
                                    onClick={() =>
                                        column.sortable !== false &&
                                        column.accessor &&
                                        handleSort(column.accessor)
                                    }
                                    className={`px-5 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                                        column.sortable !== false &&
                                        column.accessor
                                            ? "cursor-pointer hover:bg-gray-50 transition-colors"
                                            : ""
                                    }`}
                                >
                                    <div className="flex items-center space-x-1.5">
                                        <span>{column.header}</span>
                                        {column.sortable !== false &&
                                            column.accessor &&
                                            sortColumn === column.accessor && (
                                                <span className="text-gray-700">
                                                    {sortDirection === "asc" ? (
                                                        <ChevronUpIcon className="h-3.5 w-3.5" />
                                                    ) : (
                                                        <ChevronDownIcon className="h-3.5 w-3.5" />
                                                    )}
                                                </span>
                                            )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-5 py-16 text-center text-gray-500 text-sm"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <tr
                                    key={rowIndex}
                                    onClick={() =>
                                        onRowClick && onRowClick(row)
                                    }
                                    className={`${
                                        onRowClick
                                            ? "cursor-pointer hover:bg-gray-50"
                                            : ""
                                    } transition-colors`}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={
                                                column.accessor || column.header
                                            }
                                            className="px-5 py-5 whitespace-nowrap text-sm text-gray-900"
                                        >
                                            {column.cell
                                                ? column.cell(row, rowIndex)
                                                : column.render
                                                ? column.render(row, rowIndex)
                                                : row[column.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Paginación */}
            {showPagination && totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                        Mostrando{" "}
                        <span className="font-medium">
                            {(currentPage - 1) * pageSize + 1}
                        </span>{" "}
                        a{" "}
                        <span className="font-medium">
                            {Math.min(
                                currentPage * pageSize,
                                sortedData.length
                            )}
                        </span>{" "}
                        de{" "}
                        <span className="font-medium">{sortedData.length}</span>{" "}
                        resultados
                    </div>
                    <div className="flex space-x-2">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Anterior
                        </button>
                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            // Mostrar solo páginas cercanas a la actual
                            if (
                                page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 &&
                                    page <= currentPage + 1)
                            ) {
                                return (
                                    <button
                                        key={page}
                                        onClick={() => handlePageChange(page)}
                                        className={`px-3 py-1 border rounded-md ${
                                            currentPage === page
                                                ? "bg-primary-600 text-white border-primary-600"
                                                : "border-gray-300 hover:bg-gray-50"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            } else if (
                                page === currentPage - 2 ||
                                page === currentPage + 2
                            ) {
                                return (
                                    <span key={page} className="px-2">
                                        ...
                                    </span>
                                );
                            }
                            return null;
                        })}
                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
