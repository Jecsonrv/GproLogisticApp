import React, { useState, useEffect } from "react";
import {
    Plus,
    FileText,
    Eye,
    X,
    Check,
    Search,
    Truck,
    Download,
} from "lucide-react";
import {
    DataTable,
    Modal,
    Button,
    Card,
    Input,
    Select,
    Badge,
    CardHeader,
    CardTitle,
    CardContent,
    Label,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import ServiceOrderDetail from "../components/ServiceOrderDetail";

const ServiceOrders = () => {
    const [orders, setOrders] = useState([]);
    const [clients, setClients] = useState([]);
    const [customsAgents, setCustomsAgents] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const [formData, setFormData] = useState({
        client: "",
        sub_client: null,
        shipment_type: "",
        provider: "",
        customs_agent: "",
        purchase_order: "",
        bl_reference: "",
        eta: "",
        duca: "",
    });

    useEffect(() => {
        fetchOrders();
        fetchCatalogs();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/orders/service-orders/");
            setOrders(response.data);
        } catch (error) {
            // toast.error('Error al cargar órdenes'); // Silent fail or use mock
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCatalogs = async () => {
        try {
            const [clientsRes, agentsRes, typesRes, providersRes] =
                await Promise.all([
                    axios.get("/clients/"),
                    axios.get("/catalogs/customs-agents/"),
                    axios.get("/catalogs/shipment-types/"),
                    axios.get("/catalogs/providers/"),
                ]);
            setClients(clientsRes.data);
            setCustomsAgents(agentsRes.data);
            setShipmentTypes(typesRes.data);
            setProviders(providersRes.data);
        } catch (error) {
            console.error("Catalogs load failed", error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        try {
            await axios.post("/orders/service-orders/", formData);
            toast.success("Orden de Servicio creada exitosamente");
            fetchOrders();
            setIsCreateModalOpen(false);
            resetForm();
        } catch (error) {
            const errorMsg =
                error.response?.data?.duca?.[0] ||
                error.response?.data?.message ||
                "Error al crear orden";
            toast.error(errorMsg);
        }
    };

    const resetForm = () => {
        setFormData({
            client: "",
            sub_client: null,
            shipment_type: "",
            provider: "",
            customs_agent: "",
            purchase_order: "",
            bl_reference: "",
            eta: "",
            duca: "",
        });
    };

    const handleViewDetail = (order) => {
        setSelectedOrder(order);
        setIsDetailModalOpen(true);
    };

    const handleCloseOrder = async (orderId) => {
        if (!confirm("¿Está seguro de cerrar esta Orden de Servicio?")) return;

        try {
            await axios.patch(`/orders/service-orders/${orderId}/`, {
                status: "cerrada",
            });
            toast.success("Orden cerrada exitosamente");
            fetchOrders();
        } catch (error) {
            toast.error("Error al cerrar orden");
        }
    };

    const handleExportExcel = async () => {
        if (orders.length === 0) {
            toast.error("No hay órdenes para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get(
                "/orders/service-orders/export_excel/",
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().split("T")[0];
            link.setAttribute("download", `ordenes_servicio_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Archivo exportado exitosamente");
        } catch (error) {
            const message =
                error.response?.data?.error || "Error al exportar archivo";
            toast.error(message);
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };



    const columns = [
        {
            header: "OS #",
            accessor: "order_number",
            render: (row) => (
                <div className="font-mono font-bold text-primary-700">
                    {row.order_number}
                </div>
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
                    {row.customs_agent_name && (
                        <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Truck className="h-3 w-3" />
                            {row.customs_agent_name}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Referencias",
            accessor: "duca",
            render: (row) => (
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded w-fit text-gray-700">
                        DUCA: {row.duca}
                    </span>
                    {row.bl_reference && (
                        <span className="text-xs text-gray-500">
                            BL: {row.bl_reference}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "ETA",
            accessor: "eta",
            render: (row) => (
                <span className="text-sm font-medium text-gray-600">
                    {new Date(row.eta).toLocaleDateString("es-SV")}
                </span>
            ),
        },
        {
            header: "Totales",
            sortable: false,
            render: (row) => (
                <div className="text-sm">
                    <div className="text-gray-900 font-bold">
                        ${row.total_amount?.toFixed(2) || "0.00"}
                    </div>
                    <div className="flex gap-2 text-xs text-gray-400">
                        <span>S: ${row.total_services?.toFixed(2) || "0"}</span>
                        <span>
                            T: ${row.total_third_party?.toFixed(2) || "0"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            sortable: false,
            render: (row) => (
                <div className="flex flex-col gap-1 items-start">
                    <Badge
                        variant={
                            row.status === "abierta"
                                ? "default"
                                : row.status === "cerrada"
                                ? "secondary"
                                : "warning"
                        }
                    >
                        {row.status === "abierta"
                            ? "Abierta"
                            : row.status === "cerrada"
                            ? "Cerrada"
                            : row.status}
                    </Badge>
                    {row.facturado && (
                        <Badge
                            variant="outline"
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                        >
                            Facturado
                        </Badge>
                    )}
                </div>
            ),
        },
        {
            header: "Acciones",
            sortable: false,
            render: (row) => (
                <div className="flex items-center space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(row);
                        }}
                        title="Ver Detalle"
                    >
                        <Eye className="h-4 w-4 text-gray-500" />
                    </Button>
                    {row.status === "abierta" && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseOrder(row.id);
                            }}
                            title="Cerrar OS"
                        >
                            <Check className="h-4 w-4 text-green-600" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">
                        Órdenes de Servicio
                    </h1>
                    <p className="text-sm text-gray-500">
                        Gestión centralizada de embarques y tramitaciones.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExporting || orders.length === 0}
                    >
                        <Download className="mr-2 h-4 w-4" />
                        {isExporting ? "Exportando..." : "Exportar Excel"}
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Nueva Orden
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    <DataTable
                        data={orders}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Buscar por OS, Cliente o Referencia..."
                        onRowClick={handleViewDetail}
                    />
                </CardContent>
            </Card>

            {/* Modal Crear OS */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title="Nueva Orden de Servicio"
                size="2xl"
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => setIsCreateModalOpen(false)}
                        >
                            Cancelar
                        </Button>
                        <Button onClick={handleCreate}>Crear Orden</Button>
                    </>
                }
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Cliente"
                                value={formData.client}
                                onChange={(value) =>
                                    setFormData({ ...formData, client: value })
                                }
                                options={clients}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                                required
                            />
                        </div>
                        <div>
                            <Select
                                label="Aforador"
                                value={formData.customs_agent}
                                onChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        customs_agent: value,
                                    })
                                }
                                options={customsAgents}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Tipo de Embarque"
                                value={formData.shipment_type}
                                onChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        shipment_type: value,
                                    })
                                }
                                options={shipmentTypes}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                required
                            />
                        </div>
                        <div>
                            <Select
                                label="Proveedor"
                                value={formData.provider}
                                onChange={(value) =>
                                    setFormData({
                                        ...formData,
                                        provider: value,
                                    })
                                }
                                options={providers}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">DUCA</Label>
                            <Input
                                value={formData.duca}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        duca: e.target.value,
                                    })
                                }
                                placeholder="4-12345"
                                required
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block">
                                BL / Referencia
                            </Label>
                            <Input
                                value={formData.bl_reference}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        bl_reference: e.target.value,
                                    })
                                }
                                placeholder="BL-123456"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="mb-2 block">
                                ETA (Fecha Estimada)
                            </Label>
                            <Input
                                type="date"
                                value={formData.eta}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        eta: e.target.value,
                                    })
                                }
                                required
                            />
                        </div>
                        <div>
                            <Label className="mb-2 block">
                                PO (Purchase Order)
                            </Label>
                            <Input
                                value={formData.purchase_order}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        purchase_order: e.target.value,
                                    })
                                }
                                placeholder="PO-123456"
                            />
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Modal Detalle OS */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={`Detalle OS: ${selectedOrder?.order_number}`}
                size="4xl"
            >
                {selectedOrder && (
                    <ServiceOrderDetail
                        orderId={selectedOrder.id}
                        onUpdate={() => {
                            fetchOrders();
                            setIsDetailModalOpen(false);
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};

export default ServiceOrders;
