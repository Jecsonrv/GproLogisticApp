import React from "react";

function TableList({ data, columns, title, onRowClick, actions }) {
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-secondary-200">
                <svg
                    className="mx-auto h-12 w-12 text-secondary-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-secondary-900">
                    No hay datos
                </h3>
                <p className="mt-1 text-sm text-secondary-500">
                    No se encontraron registros para {title.toLowerCase()}.
                </p>
            </div>
        );
    }

    return (
        <div className="w-full bg-white shadow-sm rounded-lg overflow-hidden border border-secondary-200">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary-200">
                    <thead className="bg-secondary-50">
                        <tr>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    scope="col"
                                    className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider"
                                >
                                    {col.label}
                                </th>
                            ))}
                            {actions && (
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-secondary-200">
                        {data.map((row, rowIndex) => (
                            <tr
                                key={row.id || rowIndex}
                                className={`hover:bg-secondary-50 transition-colors duration-150 ${
                                    onRowClick ? "cursor-pointer" : ""
                                }`}
                                onClick={() => onRowClick && onRowClick(row)}
                            >
                                {columns.map((col) => (
                                    <td
                                        key={`${row.id || rowIndex}-${col.key}`}
                                        className="px-6 py-2 whitespace-nowrap text-sm text-secondary-900"
                                    >
                                        {col.render
                                            ? col.render(row[col.key], row)
                                            : row[col.key]}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {actions(row)}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {/* Pagination placeholder - can be expanded later */}
            <div className="bg-white px-4 py-3 border-t border-secondary-200 sm:px-6">
                <div className="flex items-center justify-between">
                    <div className="text-sm text-secondary-700">
                        Mostrando{" "}
                        <span className="font-medium">{data.length}</span>{" "}
                        resultados
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TableList;
