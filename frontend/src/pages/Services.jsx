import React, { useState, useEffect, useMemo } from "react";
import { Plus, DollarSign, Tag, FileText, Search } from "lucide-react";
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
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Página de Gestión de Servicios
 */
const Services = () => {
    const [activeTab, setActiveTab] = useState("general");

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
        is_active: true,
        notes: "",
        effective_date: new Date().toLocaleDateString("en-CA"),
    });

    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        fetchServices();
        fetchClients();
        fetchActiveServices();
    }, []);

    useEffect(() => {
        if (activeTab === "custom") {
            fetchCustomPrices();
        }
        setSearchTerm(""); // Reset search on tab change
    }, [activeTab]);

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
        if (!searchTerm) return customPrices;
        const lowerTerm = searchTerm.toLowerCase();
        return customPrices.filter((item) =>
            Object.values(item).some((val) =>
                String(val).toLowerCase().includes(lowerTerm)
            )
        );
    }, [customPrices, searchTerm]);

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
                is_active: customPrice.is_active,
                notes: customPrice.notes || "",
                effective_date:
                    customPrice.effective_date ||
                    new Date().toLocaleDateString("en-CA"),
            });
        } else {
            setEditingCustomPrice(null);
            setCustomFormData({
                client: "",
                service: "",
                custom_price: "",
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
            // Extraer mensaje de error descriptivo
            let errorMessage = "Error al guardar precio personalizado";

            if (error.response?.data) {
                const errorData = error.response.data;

                if (typeof errorData === "string") {
                    errorMessage = errorData;
                } else if (errorData.non_field_errors) {
                    errorMessage = Array.isArray(errorData.non_field_errors)
                        ? errorData.non_field_errors[0]
                        : errorData.non_field_errors;
                } else if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else {
                    // Buscar el primer error de campo
                    const firstError = Object.entries(errorData).find(
                        ([key, value]) => value
                    );
                    if (firstError) {
                        const [field, message] = firstError;
                        const fieldNames = {
                            client: "Cliente",
                            service: "Servicio",
                            custom_price: "Precio",
                        };
                        const fieldLabel = fieldNames[field] || field;
                        errorMessage = `${fieldLabel}: ${
                            Array.isArray(message) ? message[0] : message
                        }`;
                    }
                }
            }

            toast.error(errorMessage, { duration: 4000 });
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

    // Obtener el servicio seleccionado para mostrar si aplica IVA
    const selectedService = activeServices.find(
        (s) => s.id === parseInt(customFormData.service)
    );
    const calculatedPriceWithIva =
        selectedService?.applies_iva && customFormData.custom_price
            ? (parseFloat(customFormData.custom_price) * 1.13).toFixed(2)
            : null;

    // Columnas para Precios Personalizados
    const customPriceColumns = [
        {
            header: "Cliente",
            accessor: "client_name",
            cell: (row) => (
                <div className="font-medium text-gray-900">
                    {row.client_name}
                </div>
            ),
        },
        {
            header: "Servicio",
            accessor: "service_name",
            cell: (row) => (
                <div className="font-medium text-gray-900">
                    {row.service_name}
                </div>
            ),
        },
        {
            header: "Precio Personalizado",
            accessor: "custom_price",
            cell: (row) => (
                <div>
                    <div className="font-semibold text-primary-600">
                        ${parseFloat(row.custom_price).toFixed(2)}
                    </div>
                    {row.price_with_iva && (
                        <div className="text-xs text-gray-500">
                            Con IVA: $
                            {parseFloat(row.price_with_iva).toFixed(2)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            header: "Vigencia",
            accessor: "effective_date",
            cell: (row) => (
                <div className="text-sm text-gray-600">
                    {row.effective_date
                        ? new Date(
                              row.effective_date + "T00:00:00"
                          ).toLocaleDateString("es-GT")
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
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenCustomModal(row)}
                    >
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteCustom(row.id)}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        },
    ];

    // Columnas para Servicios Generales
    const columns = [
        {
            header: "#",
            accessor: "sequence",
            cell: (row, index) => (
                <span className="font-mono font-semibold text-gray-600">
                    {index + 1}
                </span>
            ),
        },
        {
            header: "Nombre del Servicio",
            accessor: "name",
            cell: (row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.name}</div>
                    {row.description && (
                        <div className="text-sm text-gray-500 truncate max-w-md">
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
                    <div className="font-semibold text-gray-900">
                        ${parseFloat(row.default_price).toFixed(2)}
                    </div>
                    {row.applies_iva && row.price_with_iva && (
                        <div className="text-xs text-gray-500">
                            Con IVA: $
                            {parseFloat(row.price_with_iva).toFixed(2)}
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
                    {row.applies_iva ? "Sí aplica" : "No aplica"}
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
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenModal(row)}
                    >
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(row.id)}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Servicios y Tarifario
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Gestiona servicios generales y precios personalizados por
                    cliente
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="general">
                        <Tag className="h-4 w-4 mr-2" />
                        Servicios Generales
                    </TabsTrigger>
                    <TabsTrigger value="custom">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Precios por Cliente
                    </TabsTrigger>
                </TabsList>

                {/* Servicios Generales */}
                <TabsContent value="general" key="general">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Catálogo de Servicios</CardTitle>
                                <Button onClick={() => handleOpenModal()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo Servicio
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar servicios..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                data={filteredServices}
                                columns={columns}
                                loading={loading}
                                searchable={false}
                                emptyMessage="No hay servicios registrados"
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Precios Personalizados */}
                <TabsContent value="custom" key="custom">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Tarifas Personalizadas</CardTitle>
                                <Button onClick={() => handleOpenCustomModal()}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo Precio
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar tarifas..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                data={filteredCustomPrices}
                                columns={customPriceColumns}
                                loading={loadingCustom}
                                searchable={false}
                                emptyMessage="No hay precios personalizados registrados"
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal Crear/Editar */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            {editingService
                                ? "Editar Servicio"
                                : "Nuevo Servicio"}
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            {editingService
                                ? "Modifica los datos del servicio"
                                : "Define un nuevo servicio para el catálogo general"}
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6 py-4">
                            {/* Información Básica */}
                            <div className="space-y-4">
                                <div>
                                    <Label>Nombre del Servicio *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: Asesoría y Gestión Aduanal"
                                        required
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                        Nombre descriptivo del servicio
                                    </p>
                                </div>

                                <div>
                                    <Label>Precio Base (Sin IVA) *</Label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                            $
                                        </span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.default_price}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    default_price:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="0.00"
                                            className="pl-7"
                                            required
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        Precio estándar del servicio sin incluir
                                        IVA
                                    </p>
                                </div>

                                <div>
                                    <Label>Descripción</Label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                description: e.target.value,
                                            })
                                        }
                                        rows={3}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Descripción detallada del servicio (opcional)"
                                    />
                                </div>
                            </div>

                            {/* Configuración */}
                            <div className="border-t border-gray-200 pt-4 space-y-3">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="applies_iva"
                                        checked={
                                            formData.applies_iva !== undefined
                                                ? formData.applies_iva
                                                : true
                                        }
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                applies_iva: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="flex flex-col flex-1">
                                        <Label
                                            htmlFor="applies_iva"
                                            className="font-medium text-gray-900 cursor-pointer"
                                        >
                                            Aplicar IVA (13%)
                                        </Label>
                                        <span className="text-xs text-gray-500">
                                            El precio final incluirá el impuesto
                                            al valor agregado
                                        </span>
                                    </div>
                                    <div className="text-right min-w-[120px]">
                                        {formData.applies_iva &&
                                        formData.default_price ? (
                                            <>
                                                <div className="text-xs text-gray-500">
                                                    Precio con IVA
                                                </div>
                                                <div className="text-lg font-bold text-primary-600">
                                                    $
                                                    {(
                                                        parseFloat(
                                                            formData.default_price
                                                        ) * 1.13
                                                    ).toFixed(2)}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="h-[52px]"></div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="is_active"
                                        checked={
                                            formData.is_active !== undefined
                                                ? formData.is_active
                                                : true
                                        }
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                is_active: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="flex flex-col">
                                        <Label
                                            htmlFor="is_active"
                                            className="font-medium text-gray-900 cursor-pointer"
                                        >
                                            Estado Activo
                                        </Label>
                                        <span className="text-xs text-gray-500">
                                            El servicio estará disponible para
                                            usar en órdenes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseModal}
                                className="min-w-[100px]"
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" className="min-w-[100px]">
                                {editingService ? "Actualizar" : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Crear/Editar Precio Personalizado */}
            <Dialog
                open={isCustomModalOpen}
                onOpenChange={setIsCustomModalOpen}
            >
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            {editingCustomPrice
                                ? "Editar Precio Personalizado"
                                : "Nuevo Precio Personalizado"}
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            {editingCustomPrice
                                ? "Modifica el precio personalizado para este cliente"
                                : "Define un precio especial para un cliente específico"}
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleCustomSubmit}>
                        <div className="space-y-6 py-4">
                            {/* Selección Cliente y Servicio */}
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <SelectERP
                                            label="Cliente"
                                            placeholder="Seleccione un cliente"
                                            value={customFormData.client}
                                            onChange={(value) =>
                                                setCustomFormData({
                                                    ...customFormData,
                                                    client: value,
                                                })
                                            }
                                            options={clients}
                                            getOptionLabel={(client) =>
                                                client.name
                                            }
                                            getOptionValue={(client) =>
                                                client.id
                                            }
                                            searchable
                                            clearable
                                            required
                                            disabled={!!editingCustomPrice}
                                            helperText="Cliente al que aplicará el precio especial"
                                        />
                                    </div>

                                    <div>
                                        <SelectERP
                                            label="Servicio"
                                            placeholder="Seleccione un servicio"
                                            value={customFormData.service}
                                            onChange={(value) =>
                                                setCustomFormData({
                                                    ...customFormData,
                                                    service: value,
                                                })
                                            }
                                            options={activeServices}
                                            getOptionLabel={(service) =>
                                                service.name
                                            }
                                            getOptionValue={(service) =>
                                                service.id
                                            }
                                            searchable
                                            clearable
                                            required
                                            disabled={!!editingCustomPrice}
                                            helperText="Servicio con precio personalizado"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>
                                            Precio Personalizado (Sin IVA) *
                                        </Label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                                $
                                            </span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={
                                                    customFormData.custom_price
                                                }
                                                onChange={(e) =>
                                                    setCustomFormData({
                                                        ...customFormData,
                                                        custom_price:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="0.00"
                                                className="pl-7"
                                                required
                                            />
                                        </div>
                                        {selectedService?.applies_iva &&
                                            calculatedPriceWithIva && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Con IVA:{" "}
                                                    <span className="font-semibold">
                                                        $
                                                        {calculatedPriceWithIva}
                                                    </span>
                                                </p>
                                            )}
                                    </div>

                                    <div>
                                        <Label>Fecha de Vigencia</Label>
                                        <Input
                                            type="date"
                                            value={
                                                customFormData.effective_date
                                            }
                                            onChange={(e) =>
                                                setCustomFormData({
                                                    ...customFormData,
                                                    effective_date:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Fecha desde la cual aplica este
                                            precio
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <Label>Notas</Label>
                                    <textarea
                                        value={customFormData.notes}
                                        onChange={(e) =>
                                            setCustomFormData({
                                                ...customFormData,
                                                notes: e.target.value,
                                            })
                                        }
                                        rows={3}
                                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        placeholder="Notas adicionales sobre este precio personalizado (opcional)"
                                    />
                                </div>
                            </div>

                            {/* Estado */}
                            <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <input
                                        type="checkbox"
                                        id="custom_is_active"
                                        checked={customFormData.is_active}
                                        onChange={(e) =>
                                            setCustomFormData({
                                                ...customFormData,
                                                is_active: e.target.checked,
                                            })
                                        }
                                        className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <div className="flex flex-col">
                                        <Label
                                            htmlFor="custom_is_active"
                                            className="font-medium text-gray-900 cursor-pointer"
                                        >
                                            Estado Activo
                                        </Label>
                                        <span className="text-xs text-gray-500">
                                            El precio personalizado estará
                                            disponible para usar en órdenes
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseCustomModal}
                                className="min-w-[100px]"
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" className="min-w-[100px]">
                                {editingCustomPrice ? "Actualizar" : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog - Servicios */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, id: null })}
                onConfirm={confirmDelete}
                title="¿Eliminar este servicio?"
                description="Esta acción no se puede deshacer. El servicio será eliminado permanentemente del catálogo."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />

            {/* Confirm Delete Dialog - Precios Personalizados */}
            <ConfirmDialog
                open={confirmCustomDialog.open}
                onClose={() =>
                    setConfirmCustomDialog({ open: false, id: null })
                }
                onConfirm={confirmDeleteCustom}
                title="¿Eliminar este precio personalizado?"
                description="Esta acción no se puede deshacer. El precio personalizado será eliminado permanentemente."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default Services;
