import React, { useState, useEffect } from "react";
import {
    PlusIcon,
    BanknotesIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import {
    DataTable,
    Modal,
    Button,
    Card,
    Input,
    Select,
    Badge,
    EmptyState,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Invoicing - Módulo de Cuentas por Cobrar (CXC)
 */
const Invoicing = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        total_invoiced: "0",
        total_pending: "0",
        total_collected: "0",
        total_overdue: "0",
        pending_count: 0,
        paid_count: 0,
    });

    // Modals
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Payment form
    const [paymentForm, setPaymentForm] = useState({
        amount: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "transferencia",
        reference: "",
        notes: "",
    });

    // Generate invoice
    const [generateForm, setGenerateForm] = useState({
        client: "",
        invoice_date: new Date().toISOString().split("T")[0],
        due_date: "",
        ccf: "",
        selectedOrders: [],
    });

    const [clients, setClients] = useState([]);
    const [availableOrders, setAvailableOrders] = useState([]);

    useEffect(() => {
        fetchInvoices();
        fetchSummary();
        fetchClients();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/orders/invoices/");
            setInvoices(response.data);
        } catch (error) {
            toast.error("Error al cargar facturas");
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await axios.get("/orders/invoices/summary/");
            setSummary(response.data);
        } catch (error) {
            console.error("Error loading summary");
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get("/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Error loading clients");
        }
    };

    const fetchAvailableOrders = async (clientId) => {
        try {
            const response = await axios.get("/orders/service-orders/", {
                params: {
                    client: clientId,
                    status: "cerrada",
                    facturado: false,
                },
            });
            setAvailableOrders(response.data);
        } catch (error) {
            toast.error("Error al cargar órdenes disponibles");
        }
    };

    const handleOpenPaymentModal = (invoice) => {
        setSelectedInvoice(invoice);
        setPaymentForm({
            amount: invoice.balance,
            payment_date: new Date().toISOString().split("T")[0],
            payment_method: "transferencia",
            reference: "",
            notes: "",
        });
        setIsPaymentModalOpen(true);
    };

    const handleAddPayment = async () => {
        if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
            toast.error("Ingrese un monto válido");
            return;
        }

        try {
            await axios.post(
                `/orders/invoices/${selectedInvoice.id}/add_payment/`,
                paymentForm
            );
            toast.success("Pago registrado exitosamente");
            fetchInvoices();
            fetchSummary();
            setIsPaymentModalOpen(false);
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al registrar pago"
            );
        }
    };

    const handleGenerateInvoice = async () => {
        if (!generateForm.client || generateForm.selectedOrders.length === 0) {
            toast.error("Seleccione cliente y al menos una orden");
            return;
        }

        try {
            const response = await axios.post(
                "/orders/invoices/generate_from_orders/",
                {
                    client: generateForm.client,
                    order_ids: generateForm.selectedOrders,
                    invoice_date: generateForm.invoice_date,
                    due_date: generateForm.due_date,
                    ccf: generateForm.ccf,
                }
            );

            toast.success(
                `Factura ${response.data.invoice_number} generada exitosamente`
            );
            fetchInvoices();
            fetchSummary();
            setIsGenerateModalOpen(false);
            setGenerateForm({
                client: "",
                invoice_date: new Date().toISOString().split("T")[0],
                due_date: "",
                ccf: "",
                selectedOrders: [],
            });
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al generar factura"
            );
        }
    };

    const getStatusBadgeVariant = (invoice) => {
        if (invoice.status === "pagada") return "success";
        if (invoice.days_overdue > 0) return "danger";
        if (invoice.status === "cancelada") return "default";
        return "warning";
    };

    const columns = [
        {
            header: "Factura #",
            accessor: "invoice_number",
            render: (row) => (
                <span className="font-mono font-semibold text-primary-600">
                    {row.invoice_number}
                </span>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            render: (row) => (
                <div>
                    <div className="font-medium text-gray-900">
                        {row.client_name}
                    </div>
                    {row.ccf && (
                        <div className="text-xs text-gray-500">
                            CCF: {row.ccf}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Fecha",
            accessor: "invoice_date",
            render: (row) => (
                <div>
                    <div className="text-sm text-gray-900">
                        {new Date(row.invoice_date).toLocaleDateString("es-SV")}
                    </div>
                    {row.due_date && (
                        <div className="text-xs text-gray-500">
                            Vence:{" "}
                            {new Date(row.due_date).toLocaleDateString("es-SV")}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Total",
            accessor: "total_amount",
            render: (row) => (
                <div className="font-semibold text-gray-900">
                    ${parseFloat(row.total_amount).toFixed(2)}
                </div>
            ),
        },
        {
            header: "Pagado",
            accessor: "paid_amount",
            render: (row) => (
                <div className="text-sm text-green-600">
                    ${parseFloat(row.paid_amount || 0).toFixed(2)}
                </div>
            ),
        },
        {
            header: "Saldo",
            accessor: "balance",
            render: (row) => (
                <div
                    className={`font-bold ${
                        parseFloat(row.balance) > 0
                            ? "text-red-600"
                            : "text-green-600"
                    }`}
                >
                    ${parseFloat(row.balance).toFixed(2)}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            sortable: false,
            render: (row) => (
                <div className="space-y-1">
                    <Badge variant={getStatusBadgeVariant(row)}>
                        {row.status_display}
                    </Badge>
                    {row.days_overdue > 0 && (
                        <div className="text-xs text-red-600 font-medium">
                            {row.days_overdue} días vencida
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Acciones",
            sortable: false,
            render: (row) => (
                <div className="flex space-x-2">
                    {parseFloat(row.balance) > 0 &&
                        row.status !== "cancelada" && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenPaymentModal(row);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="Registrar Pago"
                            >
                                <BanknotesIcon className="h-5 w-5" />
                            </button>
                        )}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(row);
                            setIsDetailModalOpen(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="Ver Detalle"
                    >
                        <DocumentTextIcon className="h-5 w-5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Registro de Facturación
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Control de facturas y pagos
                    </p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setIsGenerateModalOpen(true)}
                    icon={<PlusIcon className="h-5 w-5" />}
                >
                    Registrar Factura
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                            <DocumentTextIcon className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 font-medium">
                                Total Facturado
                            </div>
                            <div className="text-2xl font-bold text-gray-900 mt-1">
                                ${parseFloat(summary.total_invoiced).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 bg-red-100 rounded-lg p-3">
                            <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 font-medium">
                                Saldo Pendiente
                            </div>
                            <div className="text-2xl font-bold text-red-600 mt-1">
                                ${parseFloat(summary.total_pending).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {summary.pending_count} facturas
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                            <CheckCircleIcon className="h-6 w-6 text-green-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 font-medium">
                                Total Cobrado
                            </div>
                            <div className="text-2xl font-bold text-green-600 mt-1">
                                $
                                {parseFloat(summary.total_collected).toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                                {summary.paid_count} pagadas
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
                    <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
                            <ClockIcon className="h-6 w-6 text-orange-600" />
                        </div>
                        <div>
                            <div className="text-sm text-gray-600 font-medium">
                                Vencidas
                            </div>
                            <div className="text-2xl font-bold text-orange-600 mt-1">
                                ${parseFloat(summary.total_overdue).toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100">
                <DataTable
                    data={invoices}
                    columns={columns}
                    loading={loading}
                    searchPlaceholder="Buscar facturas..."
                    emptyMessage="No hay facturas registradas"
                />
            </div>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Registrar Pago"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setIsPaymentModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleAddPayment}>
                            Registrar Pago
                        </Button>
                    </>
                }
            >
                {selectedInvoice && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                    Factura:
                                </span>
                                <span className="font-mono font-semibold">
                                    {selectedInvoice.invoice_number}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                    Cliente:
                                </span>
                                <span className="font-medium">
                                    {selectedInvoice.client_name}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                    Total:
                                </span>
                                <span className="font-semibold">
                                    $
                                    {parseFloat(
                                        selectedInvoice.total_amount
                                    ).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">
                                    Saldo Actual:
                                </span>
                                <span className="text-xl font-bold text-red-600">
                                    $
                                    {parseFloat(
                                        selectedInvoice.balance
                                    ).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Monto del Pago"
                                type="number"
                                step="0.01"
                                value={paymentForm.amount}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        amount: e.target.value,
                                    })
                                }
                                required
                            />
                            <Input
                                label="Fecha de Pago"
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_date: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Método de Pago"
                                value={paymentForm.payment_method}
                                onChange={(value) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        payment_method: value,
                                    })
                                }
                                options={[
                                    { id: "efectivo", name: "Efectivo" },
                                    {
                                        id: "transferencia",
                                        name: "Transferencia Bancaria",
                                    },
                                    { id: "cheque", name: "Cheque" },
                                    { id: "deposito", name: "Depósito" },
                                ]}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                required
                            />
                            <Input
                                label="Referencia/No. Comprobante"
                                value={paymentForm.reference}
                                onChange={(e) =>
                                    setPaymentForm({
                                        ...paymentForm,
                                        reference: e.target.value,
                                    })
                                }
                                placeholder="Ej: TRF-12345"
                            />
                        </div>

                        <Input
                            label="Notas"
                            value={paymentForm.notes}
                            onChange={(e) =>
                                setPaymentForm({
                                    ...paymentForm,
                                    notes: e.target.value,
                                })
                            }
                            placeholder="Notas adicionales..."
                        />

                        {paymentForm.amount && (
                            <div className="bg-green-50 p-4 rounded-lg">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">
                                        Saldo Actual:
                                    </span>
                                    <span className="font-medium">
                                        $
                                        {parseFloat(
                                            selectedInvoice.balance
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">
                                        Monto del Pago:
                                    </span>
                                    <span className="font-medium text-green-600">
                                        -$
                                        {parseFloat(
                                            paymentForm.amount || 0
                                        ).toFixed(2)}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-green-200">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-gray-900">
                                            Nuevo Saldo:
                                        </span>
                                        <span className="text-xl font-bold text-green-600">
                                            $
                                            {(
                                                parseFloat(
                                                    selectedInvoice.balance
                                                ) -
                                                parseFloat(
                                                    paymentForm.amount || 0
                                                )
                                            ).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </Modal>

            {/* Generate Invoice Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                title="Generar Factura desde Órdenes"
                size="2xl"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => setIsGenerateModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleGenerateInvoice}
                        >
                            Generar Factura
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <Select
                        label="Cliente"
                        value={generateForm.client}
                        onChange={(value) => {
                            setGenerateForm({
                                ...generateForm,
                                client: value,
                                selectedOrders: [],
                            });
                            fetchAvailableOrders(value);
                        }}
                        options={clients}
                        getOptionLabel={(opt) => opt.name}
                        getOptionValue={(opt) => opt.id}
                        searchable
                        required
                    />

                    {availableOrders.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Órdenes de Servicio a Facturar
                            </label>
                            <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                                {availableOrders.map((order) => (
                                    <label
                                        key={order.id}
                                        className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={generateForm.selectedOrders.includes(
                                                order.id
                                            )}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setGenerateForm({
                                                        ...generateForm,
                                                        selectedOrders: [
                                                            ...generateForm.selectedOrders,
                                                            order.id,
                                                        ],
                                                    });
                                                } else {
                                                    setGenerateForm({
                                                        ...generateForm,
                                                        selectedOrders:
                                                            generateForm.selectedOrders.filter(
                                                                (id) =>
                                                                    id !==
                                                                    order.id
                                                            ),
                                                    });
                                                }
                                            }}
                                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <div className="ml-3 flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-mono font-medium text-gray-900">
                                                        {order.order_number}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        DUCA: {order.duca}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-gray-900">
                                                        $
                                                        {parseFloat(
                                                            order.total_amount ||
                                                                0
                                                        ).toFixed(2)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-2 text-sm text-gray-500">
                                {generateForm.selectedOrders.length} orden(es)
                                seleccionada(s)
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Fecha de Factura"
                            type="date"
                            value={generateForm.invoice_date}
                            onChange={(e) =>
                                setGenerateForm({
                                    ...generateForm,
                                    invoice_date: e.target.value,
                                })
                            }
                            required
                        />
                        <Input
                            label="Fecha de Vencimiento"
                            type="date"
                            value={generateForm.due_date}
                            onChange={(e) =>
                                setGenerateForm({
                                    ...generateForm,
                                    due_date: e.target.value,
                                })
                            }
                        />
                    </div>

                    <Input
                        label="CCF (Comprobante de Crédito Fiscal)"
                        value={generateForm.ccf}
                        onChange={(e) =>
                            setGenerateForm({
                                ...generateForm,
                                ccf: e.target.value,
                            })
                        }
                        placeholder="Ej: 001-001-0000001"
                    />

                    {generateForm.selectedOrders.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="text-sm text-blue-600 font-medium mb-2">
                                Total de la Factura:
                            </div>
                            <div className="text-3xl font-bold text-blue-900">
                                $
                                {availableOrders
                                    .filter((o) =>
                                        generateForm.selectedOrders.includes(
                                            o.id
                                        )
                                    )
                                    .reduce(
                                        (sum, o) =>
                                            sum +
                                            parseFloat(o.total_amount || 0),
                                        0
                                    )
                                    .toFixed(2)}
                            </div>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Detalle de Factura: ${selectedInvoice?.invoice_number}`}
                size="2xl"
            >
                {selectedInvoice && (
                    <div className="space-y-6">
                        {/* Invoice Header */}
                        <div className="grid grid-cols-2 gap-6 p-6 bg-gray-50 rounded-lg">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Cliente
                                </p>
                                <p className="text-lg font-semibold text-gray-900">
                                    {selectedInvoice.client_name}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Estado
                                </p>
                                <Badge
                                    variant={getStatusBadgeVariant(
                                        selectedInvoice
                                    )}
                                >
                                    {selectedInvoice.status_display}
                                </Badge>
                                {selectedInvoice.days_overdue > 0 && (
                                    <p className="text-xs text-red-600 font-medium mt-1">
                                        Vencida hace{" "}
                                        {selectedInvoice.days_overdue} días
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Fecha de Factura
                                </p>
                                <p className="font-medium text-gray-900">
                                    {new Date(
                                        selectedInvoice.invoice_date
                                    ).toLocaleDateString("es-SV")}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Fecha de Vencimiento
                                </p>
                                <p className="font-medium text-gray-900">
                                    {selectedInvoice.due_date
                                        ? new Date(
                                              selectedInvoice.due_date
                                          ).toLocaleDateString("es-SV")
                                        : "Sin vencimiento"}
                                </p>
                            </div>
                            {selectedInvoice.ccf && (
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-600 mb-1">
                                        CCF
                                    </p>
                                    <p className="font-mono font-medium text-gray-900">
                                        {selectedInvoice.ccf}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-sm text-blue-600 mb-1">
                                    Total Facturado
                                </p>
                                <p className="text-2xl font-bold text-blue-900">
                                    $
                                    {parseFloat(
                                        selectedInvoice.total_amount
                                    ).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-sm text-green-600 mb-1">
                                    Total Pagado
                                </p>
                                <p className="text-2xl font-bold text-green-900">
                                    $
                                    {parseFloat(
                                        selectedInvoice.paid_amount || 0
                                    ).toFixed(2)}
                                </p>
                            </div>
                            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-sm text-red-600 mb-1">
                                    Saldo Pendiente
                                </p>
                                <p className="text-2xl font-bold text-red-900">
                                    $
                                    {parseFloat(
                                        selectedInvoice.balance
                                    ).toFixed(2)}
                                </p>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <BanknotesIcon className="h-5 w-5 text-primary-600" />
                                Historial de Pagos
                            </h3>
                            {selectedInvoice.payments &&
                            selectedInvoice.payments.length > 0 ? (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Método
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Referencia
                                                </th>
                                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Notas
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {selectedInvoice.payments.map(
                                                (payment, idx) => (
                                                    <tr
                                                        key={idx}
                                                        className="hover:bg-gray-50"
                                                    >
                                                        <td className="px-4 py-3 text-sm text-gray-900">
                                                            {new Date(
                                                                payment.payment_date
                                                            ).toLocaleDateString(
                                                                "es-SV"
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                                            $
                                                            {parseFloat(
                                                                payment.amount
                                                            ).toFixed(2)}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">
                                                            {
                                                                payment.payment_method
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                                            {payment.reference ||
                                                                "-"}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-600">
                                                            {payment.notes ||
                                                                "-"}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                                    <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                    <p className="text-gray-600">
                                        No hay pagos registrados
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Service Orders */}
                        {selectedInvoice.service_orders &&
                            selectedInvoice.service_orders.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                        <DocumentTextIcon className="h-5 w-5 text-primary-600" />
                                        Órdenes de Servicio Incluidas
                                    </h3>
                                    <div className="space-y-2">
                                        {selectedInvoice.service_orders.map(
                                            (order) => (
                                                <div
                                                    key={order.id}
                                                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200"
                                                >
                                                    <div>
                                                        <p className="font-mono font-semibold text-gray-900">
                                                            {order.order_number}
                                                        </p>
                                                        {order.duca && (
                                                            <p className="text-xs text-gray-500">
                                                                DUCA:{" "}
                                                                {order.duca}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <p className="font-semibold text-gray-900">
                                                        $
                                                        {parseFloat(
                                                            order.total_amount ||
                                                                0
                                                        ).toFixed(2)}
                                                    </p>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Invoicing;
