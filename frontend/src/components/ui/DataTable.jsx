import React, { useState, useMemo } from "react";
import {
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";

/**
 * DataTable - Tabla Corporativa Enterprise
 * Estilo: Denso, sobrio, optimizado para 1366x768
 * Referencia: SAP Fiori Table, Stripe Dashboard
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
    compact = false, // Modo compacto para pantallas pequeñas
    stickyHeader = true, // Header fijo para scroll
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
                return (
                    value !== null &&
                    value !== undefined &&
                    String(value)
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                );
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

    // Loading state con skeleton corporativo
    if (loading) {
        return (
            <div className="w-full">
                <div className="bg-white border border-slate-200 rounded-sm overflow-hidden">
                    <div className="animate-pulse">
                        <div className="h-10 bg-slate-50 border-b border-slate-200" />
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="h-12 border-b border-slate-100 flex items-center px-3 gap-4"
                            >
                                <div className="h-3 bg-slate-200 rounded w-24" />
                                <div className="h-3 bg-slate-200 rounded w-32" />
                                <div className="h-3 bg-slate-200 rounded w-20" />
                                <div className="h-3 bg-slate-200 rounded flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // Padding dinámico según modo
    const cellPadding = compact ? "px-3 py-2" : "px-3 py-3";
    const headerPadding = compact ? "px-3 py-2" : "px-3 py-2.5";

    return (
        <div className="w-full">
            {/* Búsqueda - Estilo corporativo */}
            {searchable && (
                <div className="mb-3">
                    <div className="relative max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-sm bg-white placeholder:text-slate-400 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors duration-150"
                        />
                    </div>
                </div>
            )}

            {/* Tabla - Container responsivo */}
            <div className="relative overflow-x-auto bg-white border border-slate-200 rounded-sm">
                <table className="w-full text-sm">
                    {/* Header */}
                    <thead
                        className={`bg-slate-50 border-b border-slate-200 ${
                            stickyHeader ? "sticky top-0 z-10" : ""
                        }`}
                    >
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.accessor || column.header}
                                    onClick={() =>
                                        column.sortable !== false &&
                                        column.accessor &&
                                        handleSort(column.accessor)
                                    }
                                    className={`${headerPadding} text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap ${
                                        column.sortable !== false &&
                                        column.accessor
                                            ? "cursor-pointer hover:bg-slate-100 select-none transition-colors duration-75"
                                            : ""
                                    } ${column.width ? column.width : ""} ${
                                        column.minWidth
                                            ? `min-w-[${column.minWidth}]`
                                            : "min-w-[80px]"
                                    } ${column.headerClassName || ""}`}
                                    style={
                                        column.minWidth
                                            ? { minWidth: column.minWidth }
                                            : {}
                                    }
                                >
                                    <div
                                        className={`flex items-center gap-1 w-full ${
                                            column.headerClassName?.includes(
                                                "text-right"
                                            )
                                                ? "justify-end"
                                                : ""
                                        } ${
                                            column.headerClassName?.includes(
                                                "text-center"
                                            )
                                                ? "justify-center"
                                                : ""
                                        }`}
                                    >
                                        <span className="truncate">
                                            {column.header}
                                        </span>
                                        {column.sortable !== false &&
                                            column.accessor &&
                                            sortColumn === column.accessor && (
                                                <span className="text-slate-700 flex-shrink-0">
                                                    {sortDirection === "asc" ? (
                                                        <ChevronUpIcon className="h-3 w-3" />
                                                    ) : (
                                                        <ChevronDownIcon className="h-3 w-3" />
                                                    )}
                                                </span>
                                            )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    {/* Body */}
                    <tbody className="divide-y divide-slate-100">
                        {paginatedData.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-3 py-12 text-center text-slate-500 text-sm"
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <svg
                                            className="w-8 h-8 text-slate-300"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                            />
                                        </svg>
                                        <span>{emptyMessage}</span>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIndex) => (
                                <tr
                                    key={row.id || rowIndex}
                                    onClick={() =>
                                        onRowClick && onRowClick(row)
                                    }
                                    className={`${
                                        onRowClick ? "cursor-pointer" : ""
                                    } hover:bg-slate-50/70 transition-colors duration-75`}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={
                                                column.accessor || column.header
                                            }
                                            className={`${cellPadding} text-slate-700 ${
                                                column.wrap
                                                    ? ""
                                                    : "whitespace-nowrap"
                                            }`}
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

            {/* Paginación - Estilo corporativo compacto */}
            {showPagination && totalPages > 1 && (
                <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    {/* Info de resultados */}
                    <div className="text-xs text-slate-500">
                        Mostrando{" "}
                        <span className="font-medium text-slate-700">
                            {(currentPage - 1) * pageSize + 1}
                        </span>
                        {" - "}
                        <span className="font-medium text-slate-700">
                            {Math.min(
                                currentPage * pageSize,
                                sortedData.length
                            )}
                        </span>
                        {" de "}
                        <span className="font-medium text-slate-700">
                            {sortedData.length}
                        </span>
                    </div>

                    {/* Controles de paginación */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1.5 border border-slate-300 rounded-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150"
                            aria-label="Página anterior"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>

                        {/* Números de página - compactos */}
                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (
                                    page === 1 ||
                                    page === totalPages ||
                                    (page >= currentPage - 1 &&
                                        page <= currentPage + 1)
                                ) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={() =>
                                                handlePageChange(page)
                                            }
                                            className={`min-w-[28px] h-7 px-2 text-xs font-medium rounded-sm border transition-colors duration-150 ${
                                                currentPage === page
                                                    ? "bg-slate-900 text-white border-slate-900"
                                                    : "border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
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
                                        <span
                                            key={page}
                                            className="px-1 text-slate-400 text-xs"
                                        >
                                            ⋯
                                        </span>
                                    );
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="p-1.5 border border-slate-300 rounded-sm text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150"
                            aria-label="Página siguiente"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
