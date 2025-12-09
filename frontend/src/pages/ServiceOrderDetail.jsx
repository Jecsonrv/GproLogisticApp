import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    Button,
    Badge,
    DataTable,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    Select,
    Skeleton,
    EmptyState,
} from "../components/ui";
import {
    ArrowLeft,
    FileText,
    DollarSign,
    ArrowRightLeft,
    Receipt,
    BarChart3,
    Plus,
    Trash2,
    Edit,
} from "lucide-react";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { useServiceOrder } from "../hooks/useServiceOrders";

function ServiceOrderDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { data: order, isLoading } = useServiceOrder(id);

    const [charges, setCharges] = useState([]);
    const [transfers, setTransfers] = useState([]);
    const [invoice, setInvoice] = useState(null);
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);

    const [isAddChargeModalOpen, setIsAddChargeModalOpen] = useState(false);
    const [isAddTransferModalOpen, setIsAddTransferModalOpen] = useState(false);

    const [chargeFormData, setChargeFormData] = useState({
        service: "",
        quantity: 1,
        unit_price: "",
    });

    const [transferFormData, setTransferFormData] = useState({
        transfer_type: "terceros",
        provider: "",
        amount: "",
        notes: "",
    });

    useEffect(() => {
        if (id) {
            fetchOrderDetails();
            fetchCatalogs();
        }
    }, [id]);

    const fetchOrderDetails = async () => {
        try {
            const [chargesRes, transfersRes, invoiceRes] = await Promise.all([
                axios.get(`/api/orders/order-charges/?service_order=${id}`),
                axios.get(`/api/transfers/?service_order=${id}`),
                axios.get(`/api/invoices/?service_order=${id}`),
            ]);
            setCharges(chargesRes.data);
            setTransfers(transfersRes.data);
            setInvoice(invoiceRes.data[0] || null);
        } catch (error) {
            console.error("Error fetching order details:", error);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [servicesRes, providersRes] = await Promise.all([
                axios.get("/api/catalogs/services/"),
                axios.get("/api/catalogs/providers/"),
            ]);
            setServices(servicesRes.data);
            setProviders(providersRes.data);
        } catch (error) {
            toast.error("Error al cargar catálogos");
        }
    };

    const handleAddCharge = useCallback(
        async (e) => {
            e.preventDefault();
            try {
                await axios.post("/api/orders/order-charges/", {
                    ...chargeFormData,
                    service_order: id,
                });
                toast.success("Cobro agregado exitosamente");
                setIsAddChargeModalOpen(false);
                setChargeFormData({ service: "", quantity: 1, unit_price: "" });
                fetchOrderDetails();
            } catch (error) {
                toast.error("Error al agregar cobro");
            }
        },
        [id, chargeFormData, fetchOrderDetails]
    );

    const handleDeleteCharge = useCallback(
        async (chargeId) => {
            if (!window.confirm("¿Eliminar este cobro?")) return;

            try {
                await axios.delete(`/api/orders/order-charges/${chargeId}/`);
                toast.success("Cobro eliminado");
                fetchOrderDetails();
            } catch (error) {
                toast.error("Error al eliminar cobro");
            }
        },
        [fetchOrderDetails]
    );

    const handleAddTransfer = useCallback(
        async (e) => {
            e.preventDefault();
            try {
                await axios.post("/api/transfers/", {
                    ...transferFormData,
                    service_order: id,
                });
                toast.success("Transferencia agregada");
                setIsAddTransferModalOpen(false);
                setTransferFormData({
                    transfer_type: "terceros",
                    provider: "",
                    amount: "",
                    notes: "",
                });
                fetchOrderDetails();
            } catch (error) {
                toast.error("Error al agregar transferencia");
            }
        },
        [id, transferFormData, fetchOrderDetails]
    );

    // Cálculos optimizados con useMemo (solo se recalculan cuando cambian las dependencias)
    const totals = useMemo(
        () => ({
            charges: charges.reduce(
                (sum, c) => sum + parseFloat(c.total || 0),
                0
            ),
            transfers: transfers.reduce(
                (sum, t) => sum + parseFloat(t.amount || 0),
                0
            ),
            invoiced: invoice ? parseFloat(invoice.total_amount || 0) : 0,
        }),
        [charges, transfers, invoice]
    );

    const chargesColumns = [
        {
            key: "service",
            label: "Servicio",
            render: (row) => row.service?.name || "N/A",
        },
        { key: "quantity", label: "Cantidad" },
        {
            key: "unit_price",
            label: "Precio Unit.",
            render: (row) => `$${parseFloat(row.unit_price).toFixed(2)}`,
        },
        {
            key: "subtotal",
            label: "Subtotal",
            render: (row) => `$${parseFloat(row.subtotal).toFixed(2)}`,
        },
        {
            key: "iva_amount",
            label: "IVA",
            render: (row) => `$${parseFloat(row.iva_amount).toFixed(2)}`,
        },
        {
            key: "total",
            label: "Total",
            render: (row) => (
                <span className="font-semibold">
                    ${parseFloat(row.total).toFixed(2)}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Acciones",
            render: (row) => (
                <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteCharge(row.id)}
                >
                    <Trash2 className="h-3 w-3" />
                </Button>
            ),
        },
    ];

    const transfersColumns = [
        {
            key: "transfer_type",
            label: "Tipo",
            render: (row) => (
                <Badge
                    variant={
                        row.transfer_type === "terceros" ? "warning" : "default"
                    }
                >
                    {row.transfer_type}
                </Badge>
            ),
        },
        {
            key: "provider",
            label: "Proveedor",
            render: (row) => row.provider?.name || "-",
        },
        {
            key: "amount",
            label: "Monto",
            render: (row) => `$${parseFloat(row.amount).toFixed(2)}`,
        },
        {
            key: "status",
            label: "Estado",
            render: (row) => (
                <Badge
                    variant={row.status === "pagada" ? "success" : "warning"}
                >
                    {row.status}
                </Badge>
            ),
        },
        { key: "notes", label: "Notas" },
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-96" />
                <Skeleton className="h-64 w-full" />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex items-center justify-center h-96">
                <EmptyState
                    icon={FileText}
                    title="Orden no encontrada"
                    description="No se pudo cargar la información de la orden de servicio"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/service-orders")}
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">
                        OS #{order.os_number}
                    </h1>
                    <p className="text-sm text-gray-500">
                        Cliente: {order.client?.name} | Estado:{" "}
                        <Badge>{order.status}</Badge>
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="general">
                <TabsList>
                    <TabsTrigger value="general">
                        <FileText className="h-4 w-4 mr-2" />
                        Info General
                    </TabsTrigger>
                    <TabsTrigger value="charges">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Cobros ({charges.length})
                    </TabsTrigger>
                    <TabsTrigger value="transfers">
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Transferencias ({transfers.length})
                    </TabsTrigger>
                    <TabsTrigger value="invoice">
                        <Receipt className="h-4 w-4 mr-2" />
                        Facturación
                    </TabsTrigger>
                    <TabsTrigger value="comparative">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Comparativa
                    </TabsTrigger>
                </TabsList>

                {/* Tab 1: Info General */}
                <TabsContent value="general">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Información del Cliente</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-gray-500">
                                        Cliente
                                    </Label>
                                    <p className="font-medium">
                                        {order.client?.name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">NIT</Label>
                                    <p className="font-medium">
                                        {order.client?.nit}
                                    </p>
                                </div>
                                {order.sub_client && (
                                    <div>
                                        <Label className="text-gray-500">
                                            Subcliente
                                        </Label>
                                        <p className="font-medium">
                                            {order.sub_client.name}
                                        </p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Detalles de la Orden</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-gray-500">
                                        Tipo de Embarque
                                    </Label>
                                    <p className="font-medium">
                                        {order.shipment_type?.name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">
                                        Proveedor
                                    </Label>
                                    <p className="font-medium">
                                        {order.provider?.name}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">
                                        Aforador
                                    </Label>
                                    <p className="font-medium">
                                        {order.customs_agent?.name}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Referencias</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-gray-500">
                                        Orden de Compra (PO)
                                    </Label>
                                    <p className="font-medium">
                                        {order.purchase_order || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">
                                        BL/Referencia
                                    </Label>
                                    <p className="font-medium">
                                        {order.bl_reference || "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">
                                        DUCA
                                    </Label>
                                    <p className="font-medium">
                                        {order.duca || "N/A"}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Fechas</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div>
                                    <Label className="text-gray-500">ETA</Label>
                                    <p className="font-medium">
                                        {order.eta
                                            ? new Date(
                                                  order.eta
                                              ).toLocaleDateString("es-SV")
                                            : "N/A"}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">
                                        Fecha de Creación
                                    </Label>
                                    <p className="font-medium">
                                        {new Date(
                                            order.created_at
                                        ).toLocaleDateString("es-SV")}
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-gray-500">
                                        Estado
                                    </Label>
                                    <Badge
                                        variant={
                                            order.status === "abierta"
                                                ? "warning"
                                                : "default"
                                        }
                                    >
                                        {order.status}
                                    </Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Tab 2: Cobros */}
                <TabsContent value="charges">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Cálculo de Cobros</CardTitle>
                            <Button
                                onClick={() => setIsAddChargeModalOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Cobro
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {charges.length > 0 ? (
                                <>
                                    <DataTable
                                        columns={chargesColumns}
                                        data={charges}
                                    />
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total Cobros:</span>
                                            <span className="text-green-600">
                                                ${totals.charges.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <EmptyState
                                    icon={DollarSign}
                                    title="Sin cobros registrados"
                                    description="Agrega cobros para esta orden de servicio"
                                    action={
                                        <Button
                                            onClick={() =>
                                                setIsAddChargeModalOpen(true)
                                            }
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Agregar Cobro
                                        </Button>
                                    }
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Transferencias */}
                <TabsContent value="transfers">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Gastos a Terceros</CardTitle>
                            <Button
                                onClick={() => setIsAddTransferModalOpen(true)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Gasto
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {transfers.length > 0 ? (
                                <>
                                    <DataTable
                                        columns={transfersColumns}
                                        data={transfers}
                                    />
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <div className="flex justify-between text-lg font-bold">
                                            <span>Total Gastos:</span>
                                            <span className="text-orange-600">
                                                ${totals.transfers.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <EmptyState
                                    icon={ArrowRightLeft}
                                    title="Sin transferencias registradas"
                                    description="Agrega gastos a terceros para esta orden"
                                    action={
                                        <Button
                                            onClick={() =>
                                                setIsAddTransferModalOpen(true)
                                            }
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Agregar Gasto
                                        </Button>
                                    }
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 4: Facturación */}
                <TabsContent value="invoice">
                    <Card>
                        <CardHeader>
                            <CardTitle>Información de Facturación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {invoice ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-gray-500">
                                                Número de Factura
                                            </Label>
                                            <p className="font-medium text-lg">
                                                {invoice.invoice_number}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-gray-500">
                                                Estado
                                            </Label>
                                            <Badge
                                                variant={
                                                    invoice.status === "paid"
                                                        ? "success"
                                                        : "warning"
                                                }
                                            >
                                                {invoice.status}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Label className="text-gray-500">
                                                Total
                                            </Label>
                                            <p className="font-medium text-lg">
                                                $
                                                {parseFloat(
                                                    invoice.total_amount
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-gray-500">
                                                Saldo Pendiente
                                            </Label>
                                            <p className="font-medium text-lg text-red-600">
                                                $
                                                {parseFloat(
                                                    invoice.balance
                                                ).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <EmptyState
                                    icon={Receipt}
                                    title="Sin factura generada"
                                    description="Esta orden aún no tiene una factura asociada"
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 5: Comparativa */}
                <TabsContent value="comparative">
                    <Card>
                        <CardHeader>
                            <CardTitle>Análisis Comparativo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {/* Resumen Visual */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                        <p className="text-sm text-green-600 font-medium">
                                            Cobros Calculados
                                        </p>
                                        <p className="text-2xl font-bold text-green-700">
                                            ${totals.charges.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                                        <p className="text-sm text-orange-600 font-medium">
                                            Gastos a Terceros
                                        </p>
                                        <p className="text-2xl font-bold text-orange-700">
                                            ${totals.transfers.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <p className="text-sm text-blue-600 font-medium">
                                            Facturado
                                        </p>
                                        <p className="text-2xl font-bold text-blue-700">
                                            ${totals.invoiced.toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                {/* Margen */}
                                <div className="p-6 bg-gray-50 rounded-lg">
                                    <h3 className="text-lg font-semibold mb-4">
                                        Análisis de Rentabilidad
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Ingresos (Cobros):
                                            </span>
                                            <span className="font-semibold">
                                                ${totals.charges.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">
                                                Gastos (Terceros):
                                            </span>
                                            <span className="font-semibold text-red-600">
                                                -${totals.transfers.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="border-t pt-3 flex justify-between">
                                            <span className="text-gray-900 font-bold">
                                                Margen Bruto:
                                            </span>
                                            <span
                                                className={`font-bold text-lg ${
                                                    totals.charges -
                                                        totals.transfers >=
                                                    0
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                }`}
                                            >
                                                $
                                                {(
                                                    totals.charges -
                                                    totals.transfers
                                                ).toFixed(2)}
                                            </span>
                                        </div>
                                        {totals.charges > 0 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Margen %:
                                                </span>
                                                <span className="font-semibold">
                                                    {(
                                                        ((totals.charges -
                                                            totals.transfers) /
                                                            totals.charges) *
                                                        100
                                                    ).toFixed(1)}
                                                    %
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Diferencia Cobros vs Facturado */}
                                {invoice && (
                                    <div className="p-6 bg-blue-50 rounded-lg">
                                        <h3 className="text-lg font-semibold mb-4">
                                            Cobros vs Facturado
                                        </h3>
                                        <div className="space-y-3">
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Total Cobros:
                                                </span>
                                                <span className="font-semibold">
                                                    ${totals.charges.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Total Facturado:
                                                </span>
                                                <span className="font-semibold">
                                                    $
                                                    {totals.invoiced.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="border-t pt-3 flex justify-between">
                                                <span className="text-gray-900 font-bold">
                                                    Diferencia:
                                                </span>
                                                <span
                                                    className={`font-bold ${
                                                        Math.abs(
                                                            totals.charges -
                                                                totals.invoiced
                                                        ) < 0.01
                                                            ? "text-green-600"
                                                            : "text-yellow-600"
                                                    }`}
                                                >
                                                    $
                                                    {Math.abs(
                                                        totals.charges -
                                                            totals.invoiced
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal Agregar Cobro */}
            <Dialog
                open={isAddChargeModalOpen}
                onOpenChange={setIsAddChargeModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Cobro</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddCharge} className="space-y-4">
                        <div>
                            <Label>Servicio *</Label>
                            <Select
                                value={chargeFormData.service}
                                onChange={(e) => {
                                    const service = services.find(
                                        (s) => s.id === parseInt(e.target.value)
                                    );
                                    setChargeFormData({
                                        ...chargeFormData,
                                        service: e.target.value,
                                        unit_price:
                                            service?.default_price || "",
                                    });
                                }}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {services.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name} - $
                                        {parseFloat(s.default_price).toFixed(2)}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Cantidad *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={chargeFormData.quantity}
                                    onChange={(e) =>
                                        setChargeFormData({
                                            ...chargeFormData,
                                            quantity: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label>Precio Unitario *</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={chargeFormData.unit_price}
                                    onChange={(e) =>
                                        setChargeFormData({
                                            ...chargeFormData,
                                            unit_price: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddChargeModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">Agregar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Agregar Transferencia */}
            <Dialog
                open={isAddTransferModalOpen}
                onOpenChange={setIsAddTransferModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Agregar Gasto</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddTransfer} className="space-y-4">
                        <div>
                            <Label>Tipo *</Label>
                            <Select
                                value={transferFormData.transfer_type}
                                onChange={(e) =>
                                    setTransferFormData({
                                        ...transferFormData,
                                        transfer_type: e.target.value,
                                    })
                                }
                                required
                            >
                                <option value="terceros">Terceros</option>
                                <option value="propios">Propios</option>
                                <option value="admin">Administrativos</option>
                            </Select>
                        </div>
                        {transferFormData.transfer_type === "terceros" && (
                            <div>
                                <Label>Proveedor *</Label>
                                <Select
                                    value={transferFormData.provider}
                                    onChange={(e) =>
                                        setTransferFormData({
                                            ...transferFormData,
                                            provider: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        )}
                        <div>
                            <Label>Monto *</Label>
                            <Input
                                type="number"
                                step="0.01"
                                value={transferFormData.amount}
                                onChange={(e) =>
                                    setTransferFormData({
                                        ...transferFormData,
                                        amount: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div>
                            <Label>Notas</Label>
                            <textarea
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                rows={3}
                                value={transferFormData.notes}
                                onChange={(e) =>
                                    setTransferFormData({
                                        ...transferFormData,
                                        notes: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAddTransferModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">Agregar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ServiceOrderDetail;
