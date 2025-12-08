import React, { useEffect, useState } from "react";
import axios from "../lib/axios";
import { Card, DataTable, Button, Select, Badge } from "../components/ui";

function AccountStatements() {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState("");
    const [statement, setStatement] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await axios.get("/clients/");
            setClients(response.data);
        } catch (err) {
            setError("Error al cargar clientes");
        }
    };

    const fetchStatement = async (clientId) => {
        if (!clientId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get(
                `/clients/${clientId}/account_statement/`
            );
            setStatement(response.data);
        } catch (err) {
            setError(
                err.response?.data?.detail || "Error al cargar estado de cuenta"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleClientChange = (e) => {
        const clientId = e.target.value;
        setSelectedClient(clientId);
        if (clientId) {
            fetchStatement(clientId);
        } else {
            setStatement(null);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedClient) return;

        try {
            const response = await axios.get(
                `/clients/${selectedClient}/export_statement_excel/`,
                { responseType: "blob" }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute(
                "download",
                `estado_cuenta_${selectedClient}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            setError("Error al exportar estado de cuenta");
        }
    };

    const columns = [
        {
            header: "No. Orden",
            accessor: "order_number",
        },
        {
            header: "Fecha",
            accessor: "date",
            render: (value) => new Date(value).toLocaleDateString("es-GT"),
        },
        {
            header: "ETA",
            accessor: "eta",
            render: (value) =>
                value ? new Date(value).toLocaleDateString("es-GT") : "N/A",
        },
        {
            header: "DUCA",
            accessor: "duca",
        },
        {
            header: "PO",
            accessor: "po",
        },
        {
            header: "Monto",
            accessor: "amount",
            render: (value) => `Q ${parseFloat(value).toFixed(2)}`,
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Estados de Cuenta
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                    Consulta el estado de cuenta de tus clientes
                </p>
            </div>

            {/* Selector de Cliente */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <Select
                            label="Seleccionar Cliente"
                            value={selectedClient}
                            onChange={handleClientChange}
                            options={clients.map((client) => ({
                                value: client.id,
                                label: `${client.name} - ${client.nit}`,
                            }))}
                            placeholder="Seleccione un cliente..."
                        />
                    </div>
                    <div className="flex items-end">
                        <Button
                            variant="success"
                            onClick={handleExportExcel}
                            disabled={!selectedClient || !statement}
                            className="w-full"
                        >
                            <svg
                                className="w-5 h-5 mr-2 inline"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                            </svg>
                            Exportar a Excel
                        </Button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {loading && (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">
                        Cargando estado de cuenta...
                    </span>
                </div>
            )}

            {statement && !loading && (
                <>
                    {/* Información del Cliente */}
                    <Card title="Información del Cliente" className="mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-500">Cliente</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {statement.client}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">NIT</p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {statement.nit}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">
                                    Condición de Pago
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {statement.payment_condition}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">
                                    Días de Crédito
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {statement.credit_days} días
                                </p>
                            </div>
                        </div>
                    </Card>

                    {/* Resumen de Crédito */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <Card>
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">
                                    Límite de Crédito
                                </p>
                                <p className="text-3xl font-bold text-blue-600">
                                    Q{" "}
                                    {parseFloat(statement.credit_limit).toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                        </Card>

                        <Card>
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">
                                    Crédito Usado
                                </p>
                                <p className="text-3xl font-bold text-orange-600">
                                    Q{" "}
                                    {parseFloat(statement.credit_used).toFixed(
                                        2
                                    )}
                                </p>
                            </div>
                        </Card>

                        <Card>
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">
                                    Crédito Disponible
                                </p>
                                <p
                                    className={`text-3xl font-bold ${
                                        statement.available_credit > 0
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    Q{" "}
                                    {parseFloat(
                                        statement.available_credit
                                    ).toFixed(2)}
                                </p>
                            </div>
                        </Card>
                    </div>

                    {/* Órdenes Pendientes */}
                    <Card
                        title="Órdenes Pendientes"
                        actions={
                            <Badge variant="primary">
                                {statement.total_pending_orders} orden(es)
                            </Badge>
                        }
                    >
                        {statement.pending_invoices &&
                        statement.pending_invoices.length > 0 ? (
                            <DataTable
                                columns={columns}
                                data={statement.pending_invoices}
                            />
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                No hay órdenes pendientes
                            </div>
                        )}
                    </Card>
                </>
            )}

            {!selectedClient && !loading && (
                <Card>
                    <div className="text-center py-12 text-gray-500">
                        <svg
                            className="mx-auto h-12 w-12 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        <p className="mt-2 text-sm">
                            Seleccione un cliente para ver su estado de cuenta
                        </p>
                    </div>
                </Card>
            )}
        </div>
    );
}

export default AccountStatements;
