import React, { useEffect, useState } from "react";
import axios from "../lib/axios";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Button,
    Select,
    Badge,
    Label,
    Skeleton,
    EmptyState,
} from "../components/ui";
import {
    FileText,
    Download,
    TrendingUp,
    TrendingDown,
    DollarSign,
    CreditCard,
    AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

function AccountStatements() {
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState("");
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [statement, setStatement] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingClients, setLoadingClients] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchStatement(selectedClient, selectedYear);
        }
    }, [selectedClient, selectedYear]);

    const fetchClients = async () => {
        try {
            setLoadingClients(true);
            const response = await axios.get("/clients/");
            setClients(response.data);
        } catch (err) {
            toast.error("Error al cargar clientes");
        } finally {
            setLoadingClients(false);
        }
    };

    const fetchStatement = async (clientId, year) => {
        if (!clientId) return;

        setLoading(true);

        try {
            const response = await axios.get(
                `/api/clients/${clientId}/account_statement/`,
                { params: { year } }
            );
            setStatement(response.data);
        } catch (err) {
            toast.error(
                err.response?.data?.detail || "Error al cargar estado de cuenta"
            );
            setStatement(null);
        } finally {
            setLoading(false);
        }
    };

    const handleClientChange = (e) => {
        const clientId = e.target.value;
        setSelectedClient(clientId);
        if (!clientId) {
            setStatement(null);
        }
    };

    const handleExportExcel = async () => {
        if (!selectedClient) {
            toast.error("Seleccione un cliente primero");
            return;
        }

        if (
            !statement ||
            !statement.invoices ||
            statement.invoices.length === 0
        ) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get(
                `/clients/${selectedClient}/export_statement_excel/`,
                {
                    responseType: "blob",
                    params: { year: selectedYear },
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const clientName =
                clients.find((c) => c.id === parseInt(selectedClient))?.name ||
                "cliente";
            link.setAttribute(
                "download",
                `estado_cuenta_${clientName}_${selectedYear}.xlsx`
            );
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Estado de cuenta exportado exitosamente");
        } catch (err) {
            const message =
                err.response?.data?.error ||
                "Error al exportar estado de cuenta";
            toast.error(message);
            console.error("Export error:", err);
        } finally {
            setIsExporting(false);
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
                            disabled={
                                isExporting || !selectedClient || !statement
                            }
                            className="w-full"
                        >
                            <Download className="h-5 w-5 mr-2" />
                            {isExporting ? "Exportando..." : "Exportar a Excel"}
                        </Button>
                    </div>
                </div>
            </div>

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
