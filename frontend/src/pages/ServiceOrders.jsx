import React, { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Eye,
    Check,
    Search,
    Truck,
    Download,
    Filter,
    SlidersHorizontal,
    Calendar,
    Clock,
    DollarSign,
    Briefcase,
    MoreHorizontal,
} from "lucide-react";
import {
    DataTable,
    Modal,
    Button,
    Card,
    Input,
    Select,
    Badge,
    CardContent,
    Label,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import ServiceOrderDetail from "../components/ServiceOrderDetail";

const ServiceOrders = () => {
    const [orders, setOrders] = useState([]);
    // Catálogos
    const [clients, setClients] = useState([]);
    const [customsAgents, setCustomsAgents] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [providers, setProviders] = useState([]);

    // Estados de interfaz
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
            console.error(error);
            toast.error("Error al sincronizar órdenes");
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
            console.error("Error cargando catálogos", error);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await axios.post("/orders/service-orders/", formData);
            toast.success("Orden de Servicio creada");
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
        if (!confirm("¿Confirmar cierre operativo de esta orden?")) return;

        try {
            await axios.patch(`/orders/service-orders/${orderId}/`, {
                status: "cerrada",
            });
            toast.success("Orden cerrada correctamente");
            fetchOrders();
        } catch (error) {
            toast.error("Error al actualizar estado");
        }
    };

    const handleExportExcel = async () => {
        if (orders.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get(
                "/orders/service-orders/export_excel/",
                { responseType: "blob" }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().split("T")[0];
            link.setAttribute("download", `GPRO_Ordenes_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Exportación completada");
        } catch (error) {
            toast.error("Error al generar el archivo Excel");
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    // --- KPIs Calculation ---
    const kpis = useMemo(() => {
        const active = orders.filter((o) => o.status === "abierta").length;
        const totalAmount = orders.reduce(
            (acc, curr) => acc + (parseFloat(curr.total_amount) || 0),
            0
        );
        // Simulación de "próximos a vencer" basado en una lógica simple (si existiera fecha de cierre)
        const pending = orders.length - active;
        return { active, totalAmount, pending };
    }, [orders]);

    // --- Professional CRM-Style Columns ---
    const columns = [
        {
            header: "OS",
            accessor: "order_number",
            render: (row) => (
                <div className="flex flex-col gap-1 py-1">
                    <span className="font-mono text-sm font-semibold text-slate-900">
                        {row.order_number}
                    </span>
                    {row.created_at && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            {new Date(row.created_at).toLocaleDateString(
                                "es-SV",
                                {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                }
                            )}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Cliente",
            accessor: "client_name",
            render: (row) => (
                <div className="py-1">
                    <div className="font-medium text-slate-900 text-sm mb-1">
                        {row.client_name}
                    </div>
                    <div className="flex items-center gap-2">
                        {row.customs_agent_name && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                                <Truck className="h-3 w-3 text-slate-400" />
                                <span
                                    className="truncate max-w-[100px]"
                                    title={row.customs_agent_name}
                                >
                                    {row.customs_agent_name}
                                </span>
                            </span>
                        )}
                        {row.shipment_type_name && (
                            <span className="text-[11px] text-slate-500">
                                {row.shipment_type_name}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "Referencia",
            accessor: "duca",
            render: (row) => (
                <div className="space-y-1.5 py-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider min-w-[35px]">
                            DUCA
                        </span>
                        <span className="text-xs text-slate-900 font-mono select-all bg-slate-50 px-1.5 py-0.5 rounded">
                            {row.duca}
                        </span>
                    </div>
                    {row.bl_reference && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider min-w-[35px]">
                                BL
                            </span>
                            <span className="text-xs text-slate-700 font-mono select-all">
                                {row.bl_reference}
                            </span>
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "ETA",
            accessor: "eta",
            render: (row) => (
                <div className="flex flex-col gap-0.5 py-1">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-sm text-slate-900 font-medium tabular-nums">
                            {new Date(row.eta).toLocaleDateString("es-SV", {
                                day: "2-digit",
                                month: "short",
                            })}
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500 ml-5 uppercase tracking-wide">
                        Estimado
                    </span>
                </div>
            ),
        },
        {
            header: "Monto",
            sortable: false,
            render: (row) => (
                <div className="text-right py-1">
                    <div className="text-base font-semibold text-slate-900 tabular-nums mb-0.5">
                        $
                        {row.total_amount?.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                        }) || "0.00"}
                    </div>
                    <div className="flex items-center justify-end gap-2 text-[10px] text-slate-500">
                        <span
                            className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium"
                            title="Servicios"
                        >
                            S $
                            {row.total_services?.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                            }) || "0"}
                        </span>
                        <span
                            className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded font-medium"
                            title="Terceros"
                        >
                            T $
                            {row.total_third_party?.toLocaleString("en-US", {
                                maximumFractionDigits: 0,
                            }) || "0"}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "status",
            render: (row) => {
                const styles = {
                    abierta: "bg-blue-50 text-blue-700 border-blue-200",
                    cerrada:
                        "bg-emerald-50 text-emerald-700 border-emerald-200",
                    cancelada: "bg-slate-50 text-slate-600 border-slate-200",
                };
                const currentStyle = styles[row.status] || styles.cancelada;

                return (
                    <div className="flex flex-col items-start gap-1.5 py-1">
                        <span
                            className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-semibold border ${currentStyle}`}
                        >
                            {row.status === "abierta"
                                ? "En Proceso"
                                : row.status === "cerrada"
                                ? "Cerrada"
                                : "Cancelada"}
                        </span>
                        {row.facturado && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold px-2 py-0.5 bg-emerald-50 rounded-md border border-emerald-200">
                                <Check className="h-3 w-3" /> Facturado
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Acciones",
            sortable: false,
            render: (row) => (
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewDetail(row);
                        }}
                        title="Ver Detalles"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    {row.status === "abierta" && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCloseOrder(row.id);
                            }}
                            title="Cerrar Orden"
                        >
                            <Check className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 p-6">
            {/* Clean Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">
                        OTs
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={isExporting || orders.length === 0}
                        className="text-sm"
                    >
                        <Download
                            className={`mr-2 h-4 w-4 ${
                                isExporting ? "animate-bounce" : ""
                            }`}
                        />
                        Exportar
                    </Button>
                    <Button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-sm"
                    >
                        <Plus className="mr-2 h-4 w-4" /> Nueva Orden
                    </Button>
                </div>
            </div>
            {/* KPI Cards - Clean Design */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Total OT's
                                </p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {orders.length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    En el sistema
                                </p>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg">
                                <Briefcase className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Facturadas
                                </p>
                                <p className="text-3xl font-bold text-green-600">
                                    {orders.filter((o) => o.facturado).length}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Con F. facturación
                                </p>
                            </div>
                            <div className="p-3 bg-green-50 rounded-lg">
                                <Check className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Cerradas
                                </p>
                                <p className="text-3xl font-bold text-gray-900">
                                    {
                                        orders.filter(
                                            (o) => o.status === "cerrada"
                                        ).length
                                    }
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Estado cerrado
                                </p>
                            </div>
                            <div className="p-3 bg-gray-100 rounded-lg">
                                <Clock className="h-6 w-6 text-gray-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">
                                    Pendientes
                                </p>
                                <p className="text-3xl font-bold text-yellow-600">
                                    {kpis.active}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    Pendientes de cierre
                                </p>
                            </div>
                            <div className="p-3 bg-yellow-50 rounded-lg">
                                <Clock className="h-6 w-6 text-yellow-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Action Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[300px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar OT, MBL, contenedor..."
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filtros
                    </Button>
                    <Button variant="outline" size="sm">
                        <SlidersHorizontal className="mr-2 h-4 w-4" />
                        Búsqueda Masiva
                    </Button>
                    <Button variant="outline" size="sm">
                        Importar
                    </Button>
                    <Button variant="outline" size="sm">
                        Provisión
                    </Button>
                </div>
            </div>

            {/* Main Table */}
            <Card className="bg-white border border-gray-200 shadow-sm">
                <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-base font-semibold text-gray-900">
                        Órdenes de Trabajo
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        Mostrando 20 de {orders.length} OT's
                    </p>
                </div>
                <CardContent className="p-0">
                    <DataTable
                        data={orders}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder=""
                        onRowClick={handleViewDetail}
                    />
                </CardContent>
            </Card>

            {/* Professional Modal - Create OS */}
            <Modal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Plus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Nueva Orden de Servicio
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Complete la información operativa
                            </p>
                        </div>
                    </div>
                }
                size="2xl"
                footer={
                    <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
                        <Button
                            variant="outline"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="border-slate-300 text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleCreate}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Crear Orden
                        </Button>
                    </div>
                }
            >
                <form onSubmit={handleCreate} className="space-y-6 p-6">
                    <div className="grid grid-cols-2 gap-5">
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

                    <div className="grid grid-cols-2 gap-5">
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
                                label="Proveedor Logístico"
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

                    <div className="p-5 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-1 w-1 rounded-full bg-slate-400"></div>
                            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                                Referencias Operativas
                            </h4>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="mb-1.5 block text-slate-700 font-medium text-xs">
                                    DUCA <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={formData.duca}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            duca: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: 4-12345"
                                    required
                                    className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-slate-700 font-medium text-xs">
                                    BL / Guía
                                </Label>
                                <Input
                                    value={formData.bl_reference}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            bl_reference: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: BL-123456"
                                    className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-slate-700 font-medium text-xs">
                                    Fecha ETA{" "}
                                    <span className="text-red-500">*</span>
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
                                    className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <Label className="mb-1.5 block text-slate-700 font-medium text-xs">
                                    Orden de Compra (PO)
                                </Label>
                                <Input
                                    value={formData.purchase_order}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            purchase_order: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: PO-998877"
                                    className="bg-white border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>
                </form>
            </Modal>

            {/* Professional Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title={
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <Eye className="h-5 w-5 text-slate-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">
                                Detalle de Orden
                            </h3>
                            {selectedOrder && (
                                <p className="text-xs text-slate-500 font-mono mt-0.5">
                                    {selectedOrder.order_number} •{" "}
                                    {selectedOrder.client_name}
                                </p>
                            )}
                        </div>
                    </div>
                }
                size="4xl"
            >
                {selectedOrder && (
                    <ServiceOrderDetail
                        orderId={selectedOrder.id}
                        onUpdate={() => {
                            fetchOrders();
                        }}
                    />
                )}
            </Modal>
        </div>
    );
};

export default ServiceOrders;
