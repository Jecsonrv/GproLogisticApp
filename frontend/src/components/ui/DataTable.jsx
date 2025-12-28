import React, { useState, useMemo } from "react";
import {
    ChevronUpIcon,
    ChevronDownIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { usePersistentPageSize, PAGE_SIZE_OPTIONS } from "../../hooks/usePersistentPageSize";

/**
 * DataTable - Tabla Corporativa Enterprise con Responsive Design
 * Estilo: Denso, sobrio, optimizado para todos los dispositivos
 * Referencia: SAP Fiori Table, Stripe Dashboard
 *
 * Features:
 * - Vista de tabla en desktop (lg+)
 * - Vista de tarjetas en móvil/tablet (<lg)
 * - Búsqueda responsive
 * - Paginación adaptativa
 * - Indicador de scroll horizontal
 */
const DataTable = ({
    data = [],
    columns = [],
    searchable = true,
    searchPlaceholder = "Buscar...",
    onRowClick,
    loading = false,
    emptyMessage = "No hay datos disponibles",
    pageSize: initialPageSize = 10,
    showPagination = true,
    compact = false,
    stickyHeader = true,
    showPageSizeSelector = true,
    // Nuevas props para responsive
    mobileColumns = [], // Columnas prioritarias para mostrar en móvil
    cardTitle, // Accessor para el título de la tarjeta móvil
    cardSubtitle, // Accessor para el subtítulo de la tarjeta móvil
}) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortColumn, setSortColumn] = useState(null);
    const [sortDirection, setSortDirection] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = usePersistentPageSize(initialPageSize);

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

    const handlePageSizeChange = (newPageSize) => {
        setPageSize(newPageSize);
        setCurrentPage(1);
    };

    // Loading state con skeleton corporativo responsive
    if (loading) {
        return (
            <div className="w-full">
                {/* Desktop skeleton */}
                <div className="hidden lg:block bg-white border border-slate-200 rounded-md overflow-hidden">
                    <div className="animate-pulse">
                        <div className="h-10 bg-slate-50 border-b border-slate-200" />
                        {[...Array(5)].map((_, i) => (
                            <div
                                key={i}
                                className="h-12 border-b border-slate-100 flex items-center px-4 gap-4"
                            >
                                <div className="h-3 bg-slate-200 rounded w-24" />
                                <div className="h-3 bg-slate-200 rounded w-32" />
                                <div className="h-3 bg-slate-200 rounded w-20" />
                                <div className="h-3 bg-slate-200 rounded flex-1" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Mobile skeleton */}
                <div className="lg:hidden space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-lg p-4 animate-pulse">
                            <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                            <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                            <div className="h-3 bg-slate-200 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Padding dinámico según modo
    const cellPadding = compact ? "px-3 py-2" : "px-3 py-3";
    const headerPadding = compact ? "px-3 py-2" : "px-3 py-2.5";

    // Determinar columnas para móvil (las primeras 3 o las especificadas)
    const visibleMobileColumns = mobileColumns.length > 0
        ? columns.filter(col => mobileColumns.includes(col.accessor))
        : columns.slice(0, 3);

    // Obtener título y subtítulo para tarjetas
    const getTitleColumn = () => cardTitle || columns[0]?.accessor;
    const getSubtitleColumn = () => cardSubtitle || columns[1]?.accessor;

    // Renderizar valor de celda
    const renderCellValue = (row, column, rowIndex) => {
        if (column.cell) return column.cell(row, rowIndex);
        if (column.render) return column.render(row, rowIndex);
        return row[column.accessor];
    };

    return (
        <div className="w-full">
            {/* Búsqueda - Estilo corporativo responsive */}
            {searchable && (
                <div className="mb-3">
                    <div className="relative w-full sm:max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full pl-9 pr-3 py-2.5 sm:py-2 text-sm border border-slate-300 rounded-md sm:rounded-sm bg-white placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors duration-150"
                        />
                    </div>
                </div>
            )}

            {/* Vista Desktop: Tabla tradicional */}
            <div className="hidden lg:block">
                <div className="relative overflow-x-auto bg-white border border-slate-200 rounded-md shadow-sm">
                    {/* Indicador de scroll horizontal */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 opacity-0 transition-opacity" />

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
                                        className="px-4 py-12 text-center text-slate-500 text-sm"
                                    >
                                        <div className="flex flex-col items-center gap-2">
                                            <svg
                                                className="w-10 h-10 text-slate-300"
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
                                                } ${column.className || ""}`}
                                            >
                                                {renderCellValue(row, column, rowIndex)}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vista Móvil/Tablet: Tarjetas */}
            <div className="lg:hidden">
                {paginatedData.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
                        <svg
                            className="w-12 h-12 text-slate-300 mx-auto mb-3"
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
                        <p className="text-slate-500 text-sm">{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {paginatedData.map((row, rowIndex) => (
                            <div
                                key={row.id || rowIndex}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm ${
                                    onRowClick ? "cursor-pointer active:bg-slate-50" : ""
                                } transition-colors`}
                            >
                                {/* Título principal de la tarjeta */}
                                {columns[0] && (
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 text-base truncate">
                                                {renderCellValue(row, columns[0], rowIndex)}
                                            </div>
                                            {columns[1] && (
                                                <div className="text-sm text-slate-500 mt-0.5 truncate">
                                                    {renderCellValue(row, columns[1], rowIndex)}
                                                </div>
                                            )}
                                        </div>
                                        {/* Estado o badge si existe */}
                                        {columns.find(c => c.accessor === 'status' || c.header?.toLowerCase().includes('estado')) && (
                                            <div className="flex-shrink-0">
                                                {renderCellValue(row, columns.find(c => c.accessor === 'status' || c.header?.toLowerCase().includes('estado')), rowIndex)}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Grid de campos adicionales */}
                                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                    {columns.slice(2).filter(col =>
                                        col.accessor !== 'status' &&
                                        !col.header?.toLowerCase().includes('estado') &&
                                        !col.header?.toLowerCase().includes('acciones')
                                    ).slice(0, 4).map((column) => (
                                        <div key={column.accessor || column.header}>
                                            <span className="text-xs text-slate-400 uppercase tracking-wide block mb-0.5">
                                                {column.header}
                                            </span>
                                            <span className="text-slate-700 font-medium">
                                                {renderCellValue(row, column, rowIndex)}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                {/* Acciones (si existen) */}
                                {columns.find(c => c.header?.toLowerCase().includes('acciones') || c.accessor === 'actions') && (
                                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                                        {renderCellValue(row, columns.find(c => c.header?.toLowerCase().includes('acciones') || c.accessor === 'actions'), rowIndex)}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Paginación - Estilo corporativo responsive */}
            {showPagination && sortedData.length > 0 && (
                <div className="mt-4 px-1">
                    {/* Layout móvil: stack vertical */}
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Info de resultados */}
                        <div className="flex flex-col xs:flex-row xs:items-center gap-2 xs:gap-4">
                            <div className="text-xs sm:text-sm text-slate-500">
                                <span className="hidden xs:inline">Mostrando </span>
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

                            {/* Selector de items por página */}
                            {showPageSizeSelector && (
                                <div className="flex items-center gap-2">
                                    <label htmlFor="pageSize" className="text-xs text-slate-500 hidden sm:inline">
                                        Ver:
                                    </label>
                                    <select
                                        id="pageSize"
                                        value={pageSize}
                                        onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                                        className="text-xs sm:text-sm border border-slate-300 rounded-md bg-white px-2 py-1.5 text-slate-700 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors duration-150"
                                    >
                                        {PAGE_SIZE_OPTIONS.map((size) => (
                                            <option key={size} value={size}>
                                                {size}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-xs text-slate-500 hidden md:inline">por página</span>
                                </div>
                            )}
                        </div>

                        {/* Controles de paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center xs:justify-end gap-1">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage === 1}
                                    className="p-2 sm:p-1.5 border border-slate-300 rounded-md text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150"
                                    aria-label="Página anterior"
                                >
                                    <ChevronLeftIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                                </button>

                                {/* Números de página - adaptativo */}
                                <div className="flex items-center gap-1">
                                    {[...Array(totalPages)].map((_, i) => {
                                        const page = i + 1;
                                        // En móvil, mostrar menos páginas
                                        const showInMobile = page === 1 || page === totalPages || page === currentPage;
                                        const showInDesktop = page === 1 || page === totalPages ||
                                            (page >= currentPage - 1 && page <= currentPage + 1);

                                        if (showInMobile || showInDesktop) {
                                            return (
                                                <button
                                                    key={page}
                                                    onClick={() => handlePageChange(page)}
                                                    className={`min-w-[36px] sm:min-w-[28px] h-9 sm:h-7 px-2 text-sm sm:text-xs font-medium rounded-md border transition-colors duration-150 ${
                                                        currentPage === page
                                                            ? "bg-slate-900 text-white border-slate-900"
                                                            : "border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400"
                                                    } ${!showInMobile && showInDesktop ? 'hidden sm:flex items-center justify-center' : ''}`}
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
                                                    className="px-1 text-slate-400 text-xs hidden sm:inline"
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
                                    className="p-2 sm:p-1.5 border border-slate-300 rounded-md text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150"
                                    aria-label="Página siguiente"
                                >
                                    <ChevronRightIcon className="h-5 w-5 sm:h-4 sm:w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataTable;
