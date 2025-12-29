import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Plus,
    DollarSign,
    Tag,
    FileText,
    Search,
    ArrowLeft,
    Building2,
    RefreshCw,
    CheckCircle2,
    Percent,
    Settings2,
    Info,
    Edit2,
    Trash2,
    Download,
    Filter,
    XCircle,
    Clock,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Button,
    Modal,
    ModalFooter,
    Input,
    Label,
    Badge,
    ConfirmDialog,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    SelectERP,
    Skeleton,
    SkeletonTable,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";

// ============================================
// KPI CARD - CORPORATE STYLE (Optimizado Mobile First)
// ============================================
const KPICard = ({ label, value, icon: Icon }) => {
    return (
        <div className="bg-white rounded-lg sm:rounded-xl border border-slate-200 p-3 sm:p-4 lg:p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
                <p
                    className="text-[10px] sm:text-xs lg:text-sm font-medium text-slate-500 mb-0.5 sm:mb-1 truncate"
                    title={label}
                >
                    {label}
                </p>
                <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 tabular-nums tracking-tight truncate">
                    {value}
                </p>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-slate-50 rounded-lg sm:rounded-xl border border-slate-100 flex-shrink-0">
                {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-slate-400" />}
            </div>
        </div>
    );
};

/**
 * Página de Gestión de Servicios y Tarifario
 */
const Services = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Obtener parámetros de la URL
    const tabParam = searchParams.get("tab") || "general";
    const clientParam = searchParams.get("client");

    const [activeTab, setActiveTab] = useState(tabParam);

    // Estados para Servicios Generales
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
    });
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        default_price: "",
        applies_iva: true,
        is_active: true,
    });

    // Estados para Precios Personalizados
    const [customPrices, setCustomPrices] = useState([]);
    const [loadingCustom, setLoadingCustom] = useState(true);
    const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
    const [editingCustomPrice, setEditingCustomPrice] = useState(null);
    const [confirmCustomDialog, setConfirmCustomDialog] = useState({
        open: false,
        id: null,
    });
    const [clients, setClients] = useState([]);
    const [activeServices, setActiveServices] = useState([]);
    const [customFormData, setCustomFormData] = useState({
        client: "",
        service: "",
        custom_price: "",
        iva_type: "", // Vacío significa usar el del servicio
        is_active: true,
        notes: "",
        effective_date: new Date().toLocaleDateString("en-CA"),
    });

    const [searchTerm, setSearchTerm] = useState("");

    // Sincronizar tab activo con URL
    useEffect(() => {
        if (tabParam !== activeTab) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    const handleTabChange = (value) => {
        setActiveTab(value);
        // Mantener el cliente si existe al cambiar de pestaña, o limpiar si se desea
        const newParams = new URLSearchParams(searchParams);
        newParams.set("tab", value);
        setSearchParams(newParams);
    };

    useEffect(() => {
        fetchServices();
        fetchClients();
        fetchActiveServices();
    }, []);

    useEffect(() => {
        if (activeTab === "custom") {
            fetchCustomPrices();
        }
        setSearchTerm("");
    }, [activeTab]);

    // Cliente seleccionado (si viene por URL)
    const selectedClientData = useMemo(() => {
        if (!clientParam || clients.length === 0) return null;
        return clients.find((c) => c.id === parseInt(clientParam));
    }, [clientParam, clients]);

    // Filtered Data
    const filteredServices = useMemo(() => {
        if (!searchTerm) return services;
        const lowerTerm = searchTerm.toLowerCase();
        return services.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(lowerTerm)
            )
        );
    }, [services, searchTerm]);

    const filteredCustomPrices = useMemo(() => {
        let data = customPrices;

        // Primero filtrar por cliente si hay parámetro
        if (clientParam) {
            data = data.filter((cp) => cp.client === parseInt(clientParam));
        }

        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(lowerTerm)
            )
        );
    }, [customPrices, searchTerm, clientParam]);

    // Funciones para Servicios Generales
    const fetchServices = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/catalogs/services/");
            setServices(response.data);
        } catch (error) {
            toast.error("No se pudieron cargar los servicios.");
        } finally {
            setLoading(false);
        }
    };

    // Funciones para Precios Personalizados
    const fetchCustomPrices = async () => {
        try {
            setLoadingCustom(true);
            const response = await axios.get(
                "/catalogs/client-service-prices/"
            );
            setCustomPrices(response.data);
        } catch (error) {
            toast.error("No se pudieron cargar las tarifas personalizadas.");
        } finally {
            setLoadingCustom(false);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get("/clients/active/");
            setClients(response.data);
        } catch {
            // Silencioso
        }
    };

    const fetchActiveServices = async () => {
        try {
            const response = await axios.get("/catalogs/services/activos/");
            setActiveServices(response.data);
        } catch {
            // Silencioso
        }
    };

    const handleOpenModal = (service = null) => {
        if (service) {
            setEditingService(service);
            setFormData(service);
        } else {
            setEditingService(null);
            setFormData({
                name: "",
                description: "",
                default_price: "",
                applies_iva: true,
                is_active: true,
            });
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingService(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingService) {
                await axios.put(
                    `/catalogs/services/${editingService.id}/`,
                    formData
                );
                toast.success("El servicio ha sido actualizado correctamente.");
            } else {
                await axios.post("/catalogs/services/", formData);
                toast.success("El servicio ha sido creado correctamente.");
            }
            fetchServices();
            handleCloseModal();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "No se pudo guardar el servicio."
            );
        }
    };

    const handleDelete = (id) => {
        setConfirmDialog({ open: true, id });
    };

    const confirmDelete = async () => {
        const { id } = confirmDialog;
        try {
            await axios.delete(`/catalogs/services/${id}/`);
            toast.success("El servicio ha sido eliminado correctamente.");
            fetchServices();
        } catch (error) {
            toast.error("No se pudo eliminar el servicio.");
        }
    };

    // Funciones para Precios Personalizados
    const handleOpenCustomModal = (customPrice = null) => {
        if (customPrice) {
            setEditingCustomPrice(customPrice);
            setCustomFormData({
                client: customPrice.client,
                service: customPrice.service,
                custom_price: customPrice.custom_price,
                iva_type: customPrice.iva_type || "",
                is_active: customPrice.is_active,
                notes: customPrice.notes || "",
                effective_date:
                    customPrice.effective_date ||
                    new Date().toLocaleDateString("en-CA"),
            });
        } else {
            setEditingCustomPrice(null);
            setCustomFormData({
                client: clientParam || "", // Pre-seleccionar si hay parámetro
                service: "",
                custom_price: "",
                iva_type: "",
                is_active: true,
                notes: "",
                effective_date: new Date().toLocaleDateString("en-CA"),
            });
        }
        setIsCustomModalOpen(true);
    };

    const handleCloseCustomModal = () => {
        setIsCustomModalOpen(false);
        setEditingCustomPrice(null);
    };

    const handleCustomSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingCustomPrice) {
                await axios.put(
                    `/catalogs/client-service-prices/${editingCustomPrice.id}/`,
                    customFormData
                );
                toast.success("La tarifa personalizada ha sido actualizada correctamente.");
            } else {
                await axios.post(
                    "/catalogs/client-service-prices/",
                    customFormData
                );
                toast.success("La tarifa personalizada ha sido creada correctamente.");
            }
            fetchCustomPrices();
            handleCloseCustomModal();
        } catch (error) {
            toast.error("No se pudo guardar la tarifa personalizada.");
        }
    };

    const handleDeleteCustom = (id) => {
        setConfirmCustomDialog({ open: true, id });
    };

    const confirmDeleteCustom = async () => {
        const { id } = confirmCustomDialog;
        try {
            await axios.delete(`/catalogs/client-service-prices/${id}/`);
            toast.success("La tarifa personalizada ha sido eliminada correctamente.");
            fetchCustomPrices();
        } catch (error) {
            toast.error("No se pudo eliminar la tarifa personalizada.");
        }
    };

    const clearClientFilter = () => {
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("client");
        setSearchParams(newParams);
    };

    // Columnas para Precios Personalizados
    const customPriceColumns = [
        {
            header: "Cliente",
            accessor: "client_name",
            sortable: false,
            cell: (row) => (
                <div className="font-medium text-slate-900">
                    {row.client_name}
                </div>
            ),
        },
        {
            header: "Servicio",
            accessor: "service_name",
            sortable: false,
            cell: (row) => (
                <div className="text-slate-600">{row.service_name}</div>
            ),
        },
        {
            header: "Precio Personalizado",
            accessor: "custom_price",
            className: "text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col items-center">
                    <div className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.custom_price)}
                    </div>
                    {row.price_with_iva && (
                        <div className="text-[10px] text-slate-500">
                            Con IVA: {formatCurrency(row.price_with_iva)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Vigencia",
            accessor: "effective_date",
            sortable: false,
            cell: (row) => (
                <div className="text-slate-600 tabular-nums text-sm">
                    {row.effective_date
                        ? new Date(
                              row.effective_date + "T00:00:00"
                          ).toLocaleDateString("es-SV")
                        : "-"}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "is_active",
            sortable: false,
            cell: (row) => (
                <Badge variant={row.is_active ? "success" : "default"}>
                    {row.is_active ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[100px] text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div
                    className="grid grid-cols-2 gap-1 w-full max-w-[80px] mx-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-center">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCustomModal(row);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex justify-center">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCustom(row.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ),
        },
    ];

    // Columnas para Servicios Generales
    const columns = [
        {
            header: "Nombre del Servicio",
            accessor: "name",
            sortable: false,
            cell: (row) => (
                <div className="py-1">
                    <div className="font-medium text-slate-900">{row.name}</div>
                    {row.description && (
                        <div className="text-sm text-slate-500 truncate max-w-md">
                            {row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Precio Base",
            accessor: "default_price",
            className: "text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div className="flex flex-col items-center">
                    <div className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.default_price)}
                    </div>
                    {row.applies_iva && (
                        <div className="text-[10px] text-slate-500">
                            Con IVA:{" "}
                            {formatCurrency(
                                parseFloat(row.default_price) * 1.13
                            )}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "IVA",
            accessor: "applies_iva",
            sortable: false,
            cell: (row) => (
                <Badge variant={row.applies_iva ? "success" : "default"}>
                    {row.applies_iva ? "Sí" : "No"}
                </Badge>
            ),
        },
        {
            header: "Estado",
            accessor: "is_active",
            sortable: false,
            cell: (row) => (
                <Badge variant={row.is_active ? "success" : "default"}>
                    {row.is_active ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[100px] text-center",
            headerClassName: "text-center",
            sortable: false,
            cell: (row) => (
                <div
                    className="grid grid-cols-2 gap-1 w-full max-w-[80px] mx-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-center">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenModal(row);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex justify-center">
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500 mt-1 sm:mt-2">
            {/* Bloque Superior: KPIs Responsive */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
                <KPICard
                    label="Total Servicios"
                    value={services.length}
                    icon={Tag}
                />
                <KPICard
                    label="Servicios Activos"
                    value={services.filter((s) => s.is_active).length}
                    icon={CheckCircle2}
                />
                <KPICard
                    label="Tarifas Especiales"
                    value={customPrices.length}
                    icon={DollarSign}
                />
                <KPICard
                    label={
                        selectedClientData
                            ? `Cliente: ${selectedClientData.name.substring(
                                  0,
                                  20
                              )}${
                                  selectedClientData.name.length > 20
                                      ? "..."
                                      : ""
                              }`
                            : "Todos los Clientes"
                    }
                    value={
                        selectedClientData
                            ? customPrices.filter(
                                  (cp) => cp.client === selectedClientData.id
                              ).length
                            : customPrices.length
                    }
                    icon={Building2}
                />
            </div>

            {/* Bloque Operativo: Tabs & Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Barra de Herramientas Unificada */}
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50/30">
                    {/* Izquierda: Tabs y Buscador */}
                    <div className="flex items-center gap-4 flex-1 w-full">
                        {clientParam && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate("/clients")}
                                className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900 hover:bg-slate-100"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}

                        <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                            <button
                                onClick={() => handleTabChange("general")}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                    activeTab === "general"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                Catálogo General
                            </button>
                            <button
                                onClick={() => handleTabChange("custom")}
                                className={cn(
                                    "px-4 py-2 text-sm font-medium rounded-md transition-all",
                                    activeTab === "custom"
                                        ? "bg-white text-slate-900 shadow-sm"
                                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                )}
                            >
                                Precios por Cliente
                            </button>
                        </div>

                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar en el catálogo..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-8 sm:pl-9 pr-3 sm:pr-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                            />
                        </div>

                        {clientParam && activeTab === "custom" && (
                            <Badge
                                variant="info"
                                className="gap-2 rounded border-blue-200"
                            >
                                Filtro: {selectedClientData?.name}
                                <button
                                    onClick={clearClientFilter}
                                    className="hover:text-blue-800"
                                >
                                    <XCircle className="w-3 h-3" />
                                </button>
                            </Badge>
                        )}
                    </div>

                    {/* Derecha: Contador y Botones */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        <div className="text-sm text-slate-500 hidden md:block">
                            <span className="font-semibold text-slate-900">
                                {activeTab === "general"
                                    ? filteredServices.length
                                    : filteredCustomPrices.length}
                            </span>{" "}
                            registros
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden lg:block" />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                activeTab === "general"
                                    ? fetchServices()
                                    : fetchCustomPrices()
                            }
                            disabled={loading || loadingCustom}
                            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm h-9 px-3 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <RefreshCw
                                className={cn(
                                    "w-3.5 h-3.5 mr-2",
                                    (loading || loadingCustom) && "animate-spin"
                                )}
                            />
                            Actualizar
                        </Button>
                        <Button
                            size="sm"
                            onClick={() =>
                                activeTab === "general"
                                    ? handleOpenModal()
                                    : handleOpenCustomModal()
                            }
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            {activeTab === "general"
                                ? "Nuevo Servicio"
                                : "Nueva Tarifa"}
                        </Button>
                    </div>
                </div>

                {/* Contenido de la Tabla */}
                {activeTab === "general" ? (
                    <DataTable
                        data={filteredServices}
                        columns={columns}
                        loading={loading}
                        searchable={false}
                        emptyMessage="No hay servicios registrados"
                    />
                ) : (
                    <DataTable
                        data={filteredCustomPrices}
                        columns={customPriceColumns}
                        loading={loadingCustom}
                        searchable={false}
                        emptyMessage="No hay precios personalizados registrados"
                    />
                )}
            </div>

            {/* Modal Crear/Editar Servicio */}
            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title={editingService ? "Editar Servicio" : "Nuevo Servicio"}
                size="xl"
            >
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Detalles del Servicio
                        </h4>
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-8">
                                <Label className="mb-1.5 block">
                                    Nombre del Servicio *
                                </Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            name: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: Asesoría Técnica Aduanal"
                                    required
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Label className="mb-1.5 block">
                                    Precio Base ($) *
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                        $
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.default_price}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                default_price: e.target.value,
                                            })
                                        }
                                        className="pl-7 font-mono font-semibold text-slate-900"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="col-span-12">
                                <Label className="mb-1.5 block">
                                    Descripción (Opcional)
                                </Label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            description: e.target.value,
                                        })
                                    }
                                    rows={2}
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none transition-all focus:border-slate-300 focus:ring-2 focus:ring-slate-100 min-h-[60px] placeholder:text-slate-400"
                                    placeholder="Breve descripción del servicio..."
                                />
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="applies_iva"
                                        checked={formData.applies_iva}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                applies_iva: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label
                                        htmlFor="applies_iva"
                                        className="font-medium text-slate-700 cursor-pointer text-sm"
                                    >
                                        Aplicar IVA 13%
                                    </Label>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                is_active: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <Label
                                        htmlFor="is_active"
                                        className="font-medium text-slate-700 cursor-pointer text-sm"
                                    >
                                        Servicio Activo
                                    </Label>
                                </div>
                            </div>

                            {/* Resumen de Costo */}
                            <div className="col-span-12 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                                    Simulación de Precio
                                </h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Precio Neto:</span>
                                        <span className="font-mono">
                                            {formatCurrency(
                                                formData.default_price || 0
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>IVA (13%):</span>
                                        <span className="font-mono">
                                            {formData.applies_iva
                                                ? formatCurrency(
                                                      parseFloat(
                                                          formData.default_price ||
                                                              0
                                                      ) * 0.13
                                                  )
                                                : "$0.00"}
                                        </span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-slate-200 flex justify-between items-center">
                                        <span className="text-sm font-bold text-slate-700">
                                            Precio Final:
                                        </span>
                                        <span className="text-lg font-bold text-slate-900 tabular-nums tracking-tight">
                                            {formatCurrency(
                                                formData.applies_iva
                                                    ? parseFloat(
                                                          formData.default_price ||
                                                              0
                                                      ) * 1.13
                                                    : parseFloat(
                                                          formData.default_price ||
                                                              0
                                                      )
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCloseModal}
                            className="text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px]"
                        >
                            Guardar Servicio
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            {/* Modal Precios Personalizados */}
            <Modal
                isOpen={isCustomModalOpen}
                onClose={handleCloseCustomModal}
                title={
                    editingCustomPrice
                        ? "Editar Tarifa Especial"
                        : "Nueva Tarifa Especial"
                }
                size="xl"
            >
                <form onSubmit={handleCustomSubmit} className="space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
                            Configuración de Tarifa
                        </h4>
                        <div className="grid grid-cols-12 gap-5">
                            <div className="col-span-12 md:col-span-6">
                                <Label className="mb-1.5 block">Cliente</Label>
                                <SelectERP
                                    value={customFormData.client}
                                    onChange={(value) =>
                                        setCustomFormData({
                                            ...customFormData,
                                            client: value,
                                        })
                                    }
                                    options={clients}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    required
                                    disabled={
                                        !!editingCustomPrice || !!clientParam
                                    }
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Label className="mb-1.5 block">
                                    Servicio Base
                                </Label>
                                <SelectERP
                                    value={customFormData.service}
                                    onChange={(value) =>
                                        setCustomFormData({
                                            ...customFormData,
                                            service: value,
                                        })
                                    }
                                    options={activeServices}
                                    getOptionLabel={(opt) =>
                                        `${opt.name} (${formatCurrency(
                                            opt.default_price
                                        )})`
                                    }
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    required
                                    disabled={!!editingCustomPrice}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Label className="mb-1.5 block">
                                    Precio Especial *
                                </Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">
                                        $
                                    </span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={customFormData.custom_price}
                                        onChange={(e) =>
                                            setCustomFormData({
                                                ...customFormData,
                                                custom_price: e.target.value,
                                            })
                                        }
                                        className="pl-7 font-mono font-bold text-slate-900"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Label className="mb-1.5 block">
                                    Vigencia Desde
                                </Label>
                                <Input
                                    type="date"
                                    value={customFormData.effective_date}
                                    onChange={(e) =>
                                        setCustomFormData({
                                            ...customFormData,
                                            effective_date: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="col-span-12">
                                <Label className="mb-1.5 block">
                                    Tratamiento Fiscal (Opcional)
                                </Label>
                                <SelectERP
                                    options={[
                                        {
                                            id: "",
                                            name: "Usar configuración del servicio",
                                        },
                                        {
                                            id: "gravado",
                                            name: "Gravado (13% IVA)",
                                        },
                                        { id: "no_sujeto", name: "No Sujeto" },
                                    ]}
                                    value={customFormData.iva_type}
                                    onChange={(value) =>
                                        setCustomFormData({
                                            ...customFormData,
                                            iva_type: value,
                                        })
                                    }
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                />
                            </div>
                            <div className="col-span-12">
                                <Label className="mb-1.5 block">
                                    Notas Internas
                                </Label>
                                <Input
                                    value={customFormData.notes}
                                    onChange={(e) =>
                                        setCustomFormData({
                                            ...customFormData,
                                            notes: e.target.value,
                                        })
                                    }
                                    placeholder="Observaciones adicionales..."
                                />
                            </div>
                        </div>
                    </div>

                    <ModalFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleCloseCustomModal}
                            className="text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all active:scale-95 min-w-[140px]"
                        >
                            Guardar Tarifa
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, id: null })}
                onConfirm={confirmDelete}
                title="Eliminar Servicio"
                description="¿Estás seguro? Esta acción no se puede deshacer."
                variant="danger"
            />

            <ConfirmDialog
                open={confirmCustomDialog.open}
                onClose={() =>
                    setConfirmCustomDialog({ open: false, id: null })
                }
                onConfirm={confirmDeleteCustom}
                title="Eliminar Tarifa Especial"
                description="¿Estás seguro? Se volverá a aplicar el precio base para este cliente."
                variant="danger"
            />
        </div>
    );
};

export default Services;
