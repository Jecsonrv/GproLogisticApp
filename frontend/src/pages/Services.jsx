import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, DollarSign, Tag, FileText, Search, ArrowLeft, Building2, RefreshCw, CheckCircle2, Percent, Settings2, Info } from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Button,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    Badge,
    ConfirmDialog,
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
    SelectERP,
    StatCard,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, cn } from "../lib/utils";

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
        return clients.find(c => c.id === parseInt(clientParam));
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
            data = data.filter(cp => cp.client === parseInt(clientParam));
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
            toast.error("Error al cargar servicios");
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
            toast.error("Error al cargar precios personalizados");
        } finally {
            setLoadingCustom(false);
        }
    };

    const fetchClients = async () => {
        try {
            const response = await axios.get("/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Error al cargar clientes:", error);
        }
    };

    const fetchActiveServices = async () => {
        try {
            const response = await axios.get("/catalogs/services/activos/");
            setActiveServices(response.data);
        } catch (error) {
            console.error("Error al cargar servicios activos:", error);
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
                toast.success("Servicio actualizado exitosamente");
            } else {
                await axios.post("/catalogs/services/", formData);
                toast.success("Servicio creado exitosamente");
            }
            fetchServices();
            handleCloseModal();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Error al guardar servicio"
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
            toast.success("Servicio eliminado exitosamente");
            fetchServices();
        } catch (error) {
            toast.error("Error al eliminar servicio");
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
                toast.success("Precio personalizado actualizado exitosamente");
            } else {
                await axios.post(
                    "/catalogs/client-service-prices/",
                    customFormData
                );
                toast.success("Precio personalizado creado exitosamente");
            }
            fetchCustomPrices();
            handleCloseCustomModal();
        } catch (error) {
            toast.error("Error al guardar precio personalizado");
        }
    };

    const handleDeleteCustom = (id) => {
        setConfirmCustomDialog({ open: true, id });
    };

    const confirmDeleteCustom = async () => {
        const { id } = confirmCustomDialog;
        try {
            await axios.delete(`/catalogs/client-service-prices/${id}/`);
            toast.success("Precio personalizado eliminado exitosamente");
            fetchCustomPrices();
        } catch (error) {
            toast.error("Error al eliminar precio personalizado");
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
            cell: (row) => (
                <div className="font-medium text-slate-900">
                    {row.client_name}
                </div>
            ),
        },
        {
            header: "Servicio",
            accessor: "service_name",
            cell: (row) => (
                <div className="text-slate-600">
                    {row.service_name}
                </div>
            ),
        },
        {
            header: "Precio Personalizado",
            accessor: "custom_price",
            cell: (row) => (
                <div>
                    <div className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.custom_price)}
                    </div>
                    {row.price_with_iva && (
                        <div className="text-xs text-slate-500">
                            Con IVA: {formatCurrency(row.price_with_iva)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Vigencia",
            accessor: "effective_date",
            cell: (row) => (
                <div className="text-slate-600 tabular-nums">
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
            cell: (row) => (
                <Badge variant={row.is_active ? "success" : "default"}>
                    {row.is_active ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            cell: (row) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCustomModal(row);
                        }}
                        className="text-slate-500 hover:text-amber-600"
                    >
                        <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustom(row.id);
                        }}
                        className="text-slate-500 hover:text-red-600"
                    >
                        <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                </div>
            ),
        },
    ];

    // Columnas para Servicios Generales
    const columns = [
        {
            header: "Nombre del Servicio",
            accessor: "name",
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
            cell: (row) => (
                <div>
                    <div className="font-semibold text-slate-900 tabular-nums">
                        {formatCurrency(row.default_price)}
                    </div>
                    {row.applies_iva && (
                        <div className="text-xs text-slate-500">
                            Con IVA: {formatCurrency(parseFloat(row.default_price) * 1.13)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "IVA",
            accessor: "applies_iva",
            cell: (row) => (
                <Badge variant={row.applies_iva ? "success" : "default"}>
                    {row.applies_iva ? "Sí" : "No"}
                </Badge>
            ),
        },
        {
            header: "Estado",
            accessor: "is_active",
            cell: (row) => (
                <Badge variant={row.is_active ? "success" : "default"}>
                    {row.is_active ? "Activo" : "Inactivo"}
                </Badge>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            cell: (row) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(row);
                        }}
                        className="text-slate-500 hover:text-amber-600"
                    >
                        <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(row.id);
                        }}
                        className="text-slate-500 hover:text-red-600"
                    >
                        <Plus className="w-4 h-4 rotate-45" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header Estándar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        {clientParam && (
                            <Button 
                                variant="ghost" 
                                size="icon-xs" 
                                onClick={() => navigate("/clients")}
                                className="h-6 w-6 text-slate-400 hover:text-slate-900"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        )}
                        <h1 className="text-2xl font-bold text-slate-900">
                            Servicios y Tarifario
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                        {selectedClientData 
                            ? `Gestionando precios personalizados para: ${selectedClientData.name}`
                            : "Gestión de servicios generales y precios personalizados por cliente"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => activeTab === 'general' ? fetchServices() : fetchCustomPrices()}
                        disabled={loading || loadingCustom}
                        size="sm"
                    >
                        <RefreshCw className={cn("w-4 h-4 mr-1.5", (loading || loadingCustom) && "animate-spin")} />
                        Actualizar
                    </Button>
                    <Button 
                        onClick={() => activeTab === 'general' ? handleOpenModal() : handleOpenCustomModal()}
                        size="sm"
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        {activeTab === 'general' ? 'Nuevo Servicio' : 'Nueva Tarifa'}
                    </Button>
                </div>
            </div>

            {/* KPI Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Servicios"
                    value={services.length}
                    icon={Tag}
                />
                <StatCard
                    title="Servicios Activos"
                    value={services.filter(s => s.is_active).length}
                    icon={CheckCircle2}
                />
                <StatCard
                    title="Tarifas Especiales"
                    value={customPrices.length}
                    description="Personalizados"
                    icon={DollarSign}
                />
                {selectedClientData && (
                    <StatCard
                        title="Cliente Actual"
                        value={selectedClientData.name}
                        description={`${customPrices.filter(cp => cp.client === selectedClientData.id).length} tarifas`}
                        icon={Building2}
                    />
                )}
            </div>

            {/* Tabs & Table Card */}
            <div className="space-y-4">
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg w-fit">
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

                <Card>
                    <CardHeader className="pb-4">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1 max-w-2xl">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        placeholder="Buscar en el catálogo..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>
                                {clientParam && activeTab === 'custom' && (
                                    <Badge variant="info" className="gap-2 rounded border-blue-200">
                                        Filtro: {selectedClientData?.name}
                                        <button onClick={clearClientFilter} className="hover:text-blue-800">
                                            <ArrowLeft className="w-3 h-3 rotate-45" />
                                        </button>
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="px-5 pb-5 pt-0">
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
                    </CardContent>
                </Card>
            </div>

            {/* Modal Crear/Editar Servicio */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent size="xl">
                    <DialogHeader className="border-b border-slate-100 pb-4">
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            {editingService ? "Editar Servicio" : "Nuevo Servicio"}
                        </DialogTitle>
                        <p className="text-sm text-slate-500">
                            Configuración del catálogo general de servicios
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-8">
                                <Label>Nombre del Servicio *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Ej: Asesoría Técnica Aduanal"
                                    required
                                />
                            </div>
                            <div className="col-span-12 md:col-span-4">
                                <Label>Precio Base ($) *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={formData.default_price}
                                        onChange={(e) => setFormData({ ...formData, default_price: e.target.value })}
                                        className="pl-7"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>
                            
                            <div className="col-span-12">
                                <Label>Descripción (Opcional)</Label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none mt-1 min-h-[60px]"
                                    placeholder="Breve descripción del servicio..."
                                />
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="applies_iva"
                                        checked={formData.applies_iva}
                                        onChange={(e) => setFormData({ ...formData, applies_iva: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="applies_iva" className="font-medium text-slate-700 cursor-pointer">Aplicar IVA 13%</Label>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-6">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <Label htmlFor="is_active" className="font-medium text-slate-700 cursor-pointer">Estado Activo</Label>
                                </div>
                            </div>
                            
                            {/* Resumen de Costo */}
                            <div className="col-span-12 bg-slate-50 p-4 rounded-md border border-slate-200 mt-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-3">Resumen de Costo</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>Precio Neto:</span>
                                        <span>{formatCurrency(formData.default_price || 0)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm text-slate-600">
                                        <span>IVA (13%):</span>
                                        <span>
                                            {formData.applies_iva ? formatCurrency(parseFloat(formData.default_price || 0) * 0.13) : "$0.00"}
                                        </span>
                                    </div>
                                    <div className="pt-2 mt-2 border-t border-slate-300 flex justify-between items-center font-bold text-slate-900">
                                        <span>Precio Final:</span>
                                        <span className="text-lg text-blue-700 tabular-nums">
                                            {formatCurrency(
                                                formData.applies_iva 
                                                ? parseFloat(formData.default_price || 0) * 1.13 
                                                : parseFloat(formData.default_price || 0)
                                            )}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 border-t border-slate-200 mt-4">
                            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancelar</Button>
                            <Button type="submit">Guardar Servicio</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Precios Personalizados */}
            <Dialog open={isCustomModalOpen} onOpenChange={setIsCustomModalOpen}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            {editingCustomPrice ? "Editar Tarifa Especial" : "Nueva Tarifa Especial"}
                        </DialogTitle>
                        <p className="text-sm text-slate-500">
                            Configura un precio específico para un cliente
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleCustomSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-12 gap-4">
                            <div className="col-span-12 md:col-span-6">
                                <SelectERP
                                    label="Cliente"
                                    value={customFormData.client}
                                    onChange={(value) => setCustomFormData({ ...customFormData, client: value })}
                                    options={clients}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    required
                                    disabled={!!editingCustomPrice || !!clientParam}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <SelectERP
                                    label="Servicio"
                                    value={customFormData.service}
                                    onChange={(value) => setCustomFormData({ ...customFormData, service: value })}
                                    options={activeServices}
                                    getOptionLabel={(opt) => `${opt.name} (${formatCurrency(opt.default_price)})`}
                                    getOptionValue={(opt) => opt.id}
                                    searchable
                                    required
                                    disabled={!!editingCustomPrice}
                                />
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Label>Precio Especial *</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={customFormData.custom_price}
                                        onChange={(e) => setCustomFormData({ ...customFormData, custom_price: e.target.value })}
                                        className="pl-7"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="col-span-12 md:col-span-6">
                                <Label>Vigencia Desde</Label>
                                <Input
                                    type="date"
                                    value={customFormData.effective_date}
                                    onChange={(e) => setCustomFormData({ ...customFormData, effective_date: e.target.value })}
                                />
                            </div>
                            <div className="col-span-12">
                                <Label>Tratamiento Fiscal Especial (Opcional)</Label>
                                <SelectERP
                                    options={[
                                        { id: "", name: "Usar configuración del servicio" },
                                        { id: "gravado", name: "Gravado (13% IVA)" },
                                        { id: "no_sujeto", name: "No Sujeto" },
                                    ]}
                                    value={customFormData.iva_type}
                                    onChange={(value) => setCustomFormData({ ...customFormData, iva_type: value })}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                />
                            </div>
                            <div className="col-span-12">
                                <Label>Notas</Label>
                                <Input
                                    value={customFormData.notes}
                                    onChange={(e) => setCustomFormData({ ...customFormData, notes: e.target.value })}
                                    placeholder="Observaciones adicionales..."
                                />
                            </div>
                        </div>

                        <DialogFooter className="bg-slate-50 -mx-6 -mb-6 px-6 py-4 border-t border-slate-200">
                            <Button type="button" variant="outline" onClick={handleCloseCustomModal}>Cancelar</Button>
                            <Button type="submit">Guardar Tarifa</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

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
                onClose={() => setConfirmCustomDialog({ open: false, id: null })}
                onConfirm={confirmDeleteCustom}
                title="Eliminar Tarifa Especial"
                description="¿Estás seguro? Se volverá a aplicar el precio base para este cliente."
                variant="danger"
            />
        </div>
    );
};

export default Services;
