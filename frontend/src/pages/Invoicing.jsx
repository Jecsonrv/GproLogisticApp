import React, { useState, useEffect } from "react";
import {
    Plus,
    Banknote,
    FileText,
    AlertTriangle,
    CheckCircle,
    Clock,
    Eye,
    Search,
    Filter,
    Download,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    StatCard,
} from "../components/ui/Card";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import Modal, { ModalFooter } from "../components/ui/Modal";
import Select from "../components/ui/Select";
import DataTable from "../components/ui/DataTable";
import EmptyState from "../components/ui/EmptyState";
import api from "../lib/axios";
import { cn, formatCurrency, formatDate } from "../lib/utils";
import toast from "react-hot-toast";

/**
 * Invoicing - Módulo de Facturación y CXC
 * Design System Corporativo GPRO
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

    // Generate invoice form
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
            const response = await api.get("/orders/invoices/");
            setInvoices(response.data);
        } catch (error) {
            toast.error("Error al cargar facturas");
        } finally {
            setLoading(false);
        }
    };

    const fetchSummary = async () => {
        try {
            const response = await api.get("/orders/invoices/summary/");
            setSummary(response.data);
        } catch (error) {
            console.error("Error loading summary");
        }
    };

    const fetchClients = async () => {
        try {
            const response = await api.get("/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Error loading clients");
        }
    };

    const fetchAvailableOrders = async (clientId) => {
        try {
            const response = await api.get("/orders/service-orders/", {
                params: { client: clientId, status: "cerrada", facturado: false },
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
            await api.post(`/orders/invoices/${selectedInvoice.id}/add_payment/`, paymentForm);
            toast.success("Pago registrado exitosamente");
            fetchInvoices();
            fetchSummary();
            setIsPaymentModalOpen(false);
        } catch (error) {
            toast.error(error.response?.data?.error || "Error al registrar pago");
        }
    };

    const handleGenerateInvoice = async () => {
        if (!generateForm.client || generateForm.selectedOrders.length === 0) {
            toast.error("Seleccione cliente y al menos una orden");
            return;
        }

        try {
            const response = await api.post("/orders/invoices/generate_from_orders/", {
                client: generateForm.client,
                order_ids: generateForm.selectedOrders,
                invoice_date: generateForm.invoice_date,
                due_date: generateForm.due_date,
                ccf: generateForm.ccf,
            });

            toast.success(`Factura ${response.data.invoice_number} generada exitosamente`);
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
            toast.error(error.response?.data?.error || "Error al generar factura");
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
                <span className="font-mono font-medium text-brand-600">
                    {row.invoice_number}
                </span>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            render: (row) => (
                <div>
                    <div className="font-medium text-slate-900 text-sm">{row.client_name}</div>
                    {row.ccf && <div className="text-xs text-slate-500">CCF: {row.ccf}</div>}
                </div>
            ),
        },
        {
            header: "Fecha",
            accessor: "invoice_date",
            render: (row) => (
                <div>
                    <div className="text-sm text-slate-900">
                        {new Date(row.invoice_date).toLocaleDateString("es-SV")}
                    </div>
                    {row.due_date && (
                        <div className="text-xs text-slate-500">
                            Vence: {new Date(row.due_date).toLocaleDateString("es-SV")}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Total",
            accessor: "total_amount",
            render: (row) => (
                <div className="font-semibold text-slate-900 tabular-nums">
                    {formatCurrency(row.total_amount)}
                </div>
            ),
        },
        {
            header: "Pagado",
            accessor: "paid_amount",
            render: (row) => (
                <div className="text-sm text-success-600 tabular-nums">
                    {formatCurrency(row.paid_amount || 0)}
                </div>
            ),
        },
        {
            header: "Saldo",
            accessor: "balance",
            render: (row) => (
                <div
                    className={cn(
                        "font-bold tabular-nums",
                        parseFloat(row.balance) > 0 ? "text-danger-600" : "text-success-600"
                    )}
                >
                    {formatCurrency(row.balance)}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            sortable: false,
            render: (row) => (
                <div className="space-y-1">
                    <Badge variant={getStatusBadgeVariant(row)}>{row.status_display}</Badge>
                    {row.days_overdue > 0 && (
                        <div className="text-xs text-danger-600 font-medium">
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
                <div className="flex items-center gap-1">
                    {parseFloat(row.balance) > 0 && row.status !== "cancelada" && (
                        <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenPaymentModal(row);
                            }}
                            title="Registrar Pago"
                            className="text-success-600 hover:text-success-700 hover:bg-success-50"
                        >
                            <Banknote className="h-4 w-4" />
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedInvoice(row);
                            setIsDetailModalOpen(true);
                        }}
                        title="Ver Detalle"
                        className="text-brand-600 hover:text-brand-700 hover:bg-brand-50"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-xl font-semibold text-slate-900">Facturación y CXC</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Control de facturas y cuentas por cobrar
                    </p>
                </div>
                <Button onClick={() => setIsGenerateModalOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Registrar Factura
                </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Facturado"
                    value={formatCurrency(summary.total_invoiced)}
                    icon={FileText}
                />
                <StatCard
                    title="Saldo Pendiente"
                    value={formatCurrency(summary.total_pending)}
                    description={`${summary.pending_count} facturas`}
                    icon={AlertTriangle}
                />
                <StatCard
                    title="Total Cobrado"
                    value={formatCurrency(summary.total_collected)}
                    description={`${summary.paid_count} pagadas`}
                    icon={CheckCircle}
                />
                <StatCard
                    title="Vencidas"
                    value={formatCurrency(summary.total_overdue)}
                    icon={Clock}
                />
            </div>

            {/* Invoices Table */}
            <Card>
                <CardContent className="p-0">
                    <DataTable
                        data={invoices}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Buscar facturas..."
                        emptyMessage="No hay facturas registradas"
                    />
                </CardContent>
            </Card>

            {/* Payment Modal */}
            <Modal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                title="Registrar Pago"
                size="lg"
            >
                {selectedInvoice && (
                    <div className="space-y-4">
                        {/* Invoice Summary */}
                        <div className="bg-slate-50 p-4 rounded-md space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Factura:</span>
                                <span className="font-mono font-semibold">{selectedInvoice.invoice_number}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Cliente:</span>
                                <span className="font-medium">{selectedInvoice.client_name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Total:</span>
                                <span className="font-semibold">{formatCurrency(selectedInvoice.total_amount)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Saldo Actual:</span>
                                <span className="text-lg font-bold text-danger-600">
                                    {formatCurrency(selectedInvoice.balance)}
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Monto del Pago"
                                type="number"
                                step="0.01"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                                required
                            />
                            <Input
                                label="Fecha de Pago"
                                type="date"
                                value={paymentForm.payment_date}
                                onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <Select
                                label="Método de Pago"
                                value={paymentForm.payment_method}
                                onChange={(value) => setPaymentForm({ ...paymentForm, payment_method: value })}
                                options={[
                                    { id: "efectivo", name: "Efectivo" },
                                    { id: "transferencia", name: "Transferencia Bancaria" },
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
                                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                                placeholder="Ej: TRF-12345"
                            />
                        </div>

                        <Input
                            label="Notas"
                            value={paymentForm.notes}
                            onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                            placeholder="Notas adicionales..."
                        />

                        {/* Payment Preview */}
                        {paymentForm.amount && (
                            <div className="bg-success-50 border border-success-200 p-4 rounded-md">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600">Saldo Actual:</span>
                                    <span className="font-medium">{formatCurrency(selectedInvoice.balance)}</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600">Monto del Pago:</span>
                                    <span className="font-medium text-success-600">
                                        -{formatCurrency(paymentForm.amount || 0)}
                                    </span>
                                </div>
                                <div className="pt-2 border-t border-success-200">
                                    <div className="flex justify-between">
                                        <span className="font-semibold text-slate-900">Nuevo Saldo:</span>
                                        <span className="text-xl font-bold text-success-600">
                                            {formatCurrency(
                                                parseFloat(selectedInvoice.balance) - parseFloat(paymentForm.amount || 0)
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsPaymentModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button variant="success" onClick={handleAddPayment}>
                        Registrar Pago
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Generate Invoice Modal */}
            <Modal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                title="Generar Factura desde Órdenes"
                size="2xl"
            >
                <div className="space-y-4">
                    <Select
                        label="Cliente"
                        value={generateForm.client}
                        onChange={(value) => {
                            setGenerateForm({ ...generateForm, client: value, selectedOrders: [] });
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Órdenes de Servicio a Facturar
                            </label>
                            <div className="border border-slate-200 rounded-md max-h-64 overflow-y-auto">
                                {availableOrders.map((order) => (
                                    <label
                                        key={order.id}
                                        className="flex items-center p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 cursor-pointer"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={generateForm.selectedOrders.includes(order.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setGenerateForm({
                                                        ...generateForm,
                                                        selectedOrders: [...generateForm.selectedOrders, order.id],
                                                    });
                                                } else {
                                                    setGenerateForm({
                                                        ...generateForm,
                                                        selectedOrders: generateForm.selectedOrders.filter(
                                                            (id) => id !== order.id
                                                        ),
                                                    });
                                                }
                                            }}
                                            className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                        />
                                        <div className="ml-3 flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-mono font-medium text-slate-900 text-sm">
                                                        {order.order_number}
                                                    </div>
                                                    <div className="text-xs text-slate-500">DUCA: {order.duca}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-slate-900">
                                                        {formatCurrency(order.total_amount || 0)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                            <div className="mt-2 text-sm text-slate-500">
                                {generateForm.selectedOrders.length} orden(es) seleccionada(s)
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Fecha de Factura"
                            type="date"
                            value={generateForm.invoice_date}
                            onChange={(e) => setGenerateForm({ ...generateForm, invoice_date: e.target.value })}
                            required
                        />
                        <Input
                            label="Fecha de Vencimiento"
                            type="date"
                            value={generateForm.due_date}
                            onChange={(e) => setGenerateForm({ ...generateForm, due_date: e.target.value })}
                        />
                    </div>

                    <Input
                        label="CCF (Comprobante de Crédito Fiscal)"
                        value={generateForm.ccf}
                        onChange={(e) => setGenerateForm({ ...generateForm, ccf: e.target.value })}
                        placeholder="Ej: 001-001-0000001"
                    />

                    {/* Invoice Total Preview */}
                    {generateForm.selectedOrders.length > 0 && (
                        <div className="bg-brand-50 border border-brand-200 p-4 rounded-md">
                            <div className="text-sm text-brand-600 font-medium mb-2">Total de la Factura:</div>
                            <div className="text-3xl font-bold text-brand-900 tabular-nums">
                                {formatCurrency(
                                    availableOrders
                                        .filter((o) => generateForm.selectedOrders.includes(o.id))
                                        .reduce((sum, o) => sum + parseFloat(o.total_amount || 0), 0)
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <ModalFooter>
                    <Button variant="ghost" onClick={() => setIsGenerateModalOpen(false)}>
                        Cancelar
                    </Button>
                    <Button onClick={handleGenerateInvoice}>Generar Factura</Button>
                </ModalFooter>
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
                        <div className="grid grid-cols-2 gap-6 p-4 bg-slate-50 rounded-md">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Cliente</p>
                                <p className="text-base font-semibold text-slate-900">{selectedInvoice.client_name}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Estado</p>
                                <Badge variant={getStatusBadgeVariant(selectedInvoice)}>
                                    {selectedInvoice.status_display}
                                </Badge>
                                {selectedInvoice.days_overdue > 0 && (
                                    <p className="text-xs text-danger-600 font-medium mt-1">
                                        Vencida hace {selectedInvoice.days_overdue} días
                                    </p>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fecha de Factura</p>
                                <p className="text-sm font-medium text-slate-900">
                                    {new Date(selectedInvoice.invoice_date).toLocaleDateString("es-SV")}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Fecha de Vencimiento</p>
                                <p className="text-sm font-medium text-slate-900">
                                    {selectedInvoice.due_date
                                        ? new Date(selectedInvoice.due_date).toLocaleDateString("es-SV")
                                        : "Sin vencimiento"}
                                </p>
                            </div>
                            {selectedInvoice.ccf && (
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">CCF</p>
                                    <p className="font-mono font-medium text-slate-900">{selectedInvoice.ccf}</p>
                                </div>
                            )}
                        </div>

                        {/* Financial Summary */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 bg-brand-50 border border-brand-200 rounded-md">
                                <p className="text-xs text-brand-600 mb-1">Total Facturado</p>
                                <p className="text-xl font-bold text-brand-900 tabular-nums">
                                    {formatCurrency(selectedInvoice.total_amount)}
                                </p>
                            </div>
                            <div className="p-4 bg-success-50 border border-success-200 rounded-md">
                                <p className="text-xs text-success-600 mb-1">Total Pagado</p>
                                <p className="text-xl font-bold text-success-900 tabular-nums">
                                    {formatCurrency(selectedInvoice.paid_amount || 0)}
                                </p>
                            </div>
                            <div className="p-4 bg-danger-50 border border-danger-200 rounded-md">
                                <p className="text-xs text-danger-600 mb-1">Saldo Pendiente</p>
                                <p className="text-xl font-bold text-danger-900 tabular-nums">
                                    {formatCurrency(selectedInvoice.balance)}
                                </p>
                            </div>
                        </div>

                        {/* Payment History */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                <Banknote className="h-4 w-4 text-brand-600" />
                                Historial de Pagos
                            </h3>
                            {selectedInvoice.payments && selectedInvoice.payments.length > 0 ? (
                                <div className="border border-slate-200 rounded-md overflow-hidden">
                                    <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Monto
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Método
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Referencia
                                                </th>
                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                                                    Notas
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-100">
                                            {selectedInvoice.payments.map((payment, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-4 py-2.5 text-sm text-slate-900">
                                                        {new Date(payment.payment_date).toLocaleDateString("es-SV")}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm font-semibold text-success-600 tabular-nums">
                                                        {formatCurrency(payment.amount)}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-slate-600 capitalize">
                                                        {payment.payment_method}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-slate-600 font-mono">
                                                        {payment.reference || "-"}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-sm text-slate-600">
                                                        {payment.notes || "-"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 bg-slate-50 rounded-md border border-slate-200">
                                    <Clock className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                                    <p className="text-sm text-slate-600">No hay pagos registrados</p>
                                </div>
                            )}
                        </div>

                        {/* Service Orders */}
                        {selectedInvoice.service_orders && selectedInvoice.service_orders.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-brand-600" />
                                    Órdenes de Servicio Incluidas
                                </h3>
                                <div className="space-y-2">
                                    {selectedInvoice.service_orders.map((order) => (
                                        <div
                                            key={order.id}
                                            className="flex justify-between items-center p-3 bg-slate-50 rounded border border-slate-200"
                                        >
                                            <div>
                                                <p className="font-mono font-semibold text-slate-900 text-sm">
                                                    {order.order_number}
                                                </p>
                                                {order.duca && (
                                                    <p className="text-xs text-slate-500">DUCA: {order.duca}</p>
                                                )}
                                            </div>
                                            <p className="font-semibold text-slate-900 tabular-nums">
                                                {formatCurrency(order.total_amount || 0)}
                                            </p>
                                        </div>
                                    ))}
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
