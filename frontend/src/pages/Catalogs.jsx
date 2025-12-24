import React, { useState, useEffect } from "react";
import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
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
    Skeleton,
    ConfirmDialog,
    SelectERP,
} from "../components/ui";
import {
    Plus,
    Building2,
    Users,
    Landmark,
    Ship,
    UserCircle,
    Search,
    Tags,
} from "lucide-react";
import axios from "../lib/axios";
import toast from "react-hot-toast";

function Catalogs() {
    // Estado del tab activo
    const [activeTab, setActiveTab] = useState("providerCategories");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentCatalog, setCurrentCatalog] = useState("providerCategories");
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        catalog: null,
        id: null,
    });

    // Estados para cada catálogo
    const [providers, setProviders] = useState([]);
    const [providerCategories, setProviderCategories] = useState([]);
    const [banks, setBanks] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [subClients, setSubClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchAllCatalogs();
    }, []);

    // Reset search when tab changes
    useEffect(() => {
        setSearchTerm("");
    }, [activeTab]);

    const fetchAllCatalogs = async () => {
        setLoading(true);
        try {
            const [provCat, prov, bnk, ship, sub] = await Promise.all([
                axios.get("/catalogs/provider-categories/"),
                axios.get("/catalogs/providers/"),
                axios.get("/catalogs/banks/"),
                axios.get("/catalogs/shipment-types/"),
                axios.get("/catalogs/sub-clients/"),
            ]);
            setProviderCategories(provCat.data);
            setProviders(prov.data);
            setBanks(bnk.data);
            setShipmentTypes(ship.data);
            setSubClients(sub.data);
        } catch {
            toast.error("Error al cargar catálogos");
        } finally {
            setLoading(false);
        }
    };

    const openModal = (catalog, item = null) => {
        setCurrentCatalog(catalog);
        setEditingItem(item);

        // Inicializar form según catálogo
        const initialData = item || getInitialFormData(catalog);
        setFormData(initialData);
        setIsModalOpen(true);
    };

    const getInitialFormData = (catalog) => {
        const defaults = {
            providerCategories: {
                name: "",
                description: "",
                is_active: true,
            },
            providers: {
                name: "",
                category: null,
                nit: "",
                phone: "",
                email: "",
                address: "",
                is_active: true,
            },
            banks: {
                name: "",
                contact_phone: "",
                is_active: true,
            },
            shipmentTypes: {
                name: "",
                code: "",
                description: "",
                is_active: true,
            },
            subClients: { name: "", is_active: true },
        };
        return defaults[catalog] || {};
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const endpoints = {
                providerCategories: "/catalogs/provider-categories/",
                providers: "/catalogs/providers/",
                banks: "/catalogs/banks/",
                shipmentTypes: "/catalogs/shipment-types/",
                subClients: "/catalogs/sub-clients/",
            };

            const endpoint = endpoints[currentCatalog];

            if (editingItem) {
                await axios.patch(`${endpoint}${editingItem.id}/`, formData);
                toast.success("Actualizado exitosamente");
            } else {
                await axios.post(endpoint, formData);
                toast.success("Creado exitosamente");
            }

            setIsModalOpen(false);
            await fetchAllCatalogs();
        } catch (error) {
            // Extraer mensaje de error más descriptivo
            let errorMessage = "Error al guardar";

            if (error.response?.data) {
                const data = error.response.data;

                // Errores de validación de Django
                if (data.name && Array.isArray(data.name)) {
                    errorMessage = `Nombre: ${data.name.join(", ")}`;
                } else if (data.nit && Array.isArray(data.nit)) {
                    errorMessage = `NIT: ${data.nit.join(", ")}`;
                } else if (data.email && Array.isArray(data.email)) {
                    errorMessage = `Email: ${data.email.join(", ")}`;
                } else if (typeof data === "string") {
                    errorMessage = data;
                } else if (data.detail) {
                    errorMessage = data.detail;
                } else if (data.message) {
                    errorMessage = data.message;
                } else if (data.non_field_errors) {
                    errorMessage = data.non_field_errors.join(", ");
                } else {
                    // Intentar obtener el primer error
                    const firstError = Object.values(data)[0];
                    if (Array.isArray(firstError)) {
                        errorMessage = firstError.join(", ");
                    } else if (typeof firstError === "string") {
                        errorMessage = firstError;
                    }
                }
            }

            toast.error(errorMessage, { duration: 4000 });
        }
    };

    const handleDelete = (catalog, id) => {
        setConfirmDialog({ open: true, catalog, id });
    };

    const confirmDelete = async () => {
        const { catalog, id } = confirmDialog;

        try {
            const endpoints = {
                providerCategories: "/catalogs/provider-categories/",
                providers: "/catalogs/providers/",
                banks: "/catalogs/banks/",
                shipmentTypes: "/catalogs/shipment-types/",
                subClients: "/catalogs/sub-clients/",
            };

            await axios.delete(`${endpoints[catalog]}${id}/`);
            toast.success("Eliminado exitosamente");
            fetchAllCatalogs();
        } catch {
            toast.error("Error al eliminar");
        }
    };

    // Columnas para cada catálogo
    const getColumns = (catalog) => {
        const actionsColumn = {
            accessor: "actions",
            header: "Acciones",
            cell: (row) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            openModal(catalog, row);
                        }}
                    >
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(catalog, row.id);
                        }}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        };

        const specific = {
            providerCategories: [
                { accessor: "name", header: "Nombre" },
                { accessor: "description", header: "Descripción" },
                {
                    accessor: "is_active",
                    header: "Estado",
                    cell: (row) => (
                        <Badge variant={row.is_active ? "success" : "default"}>
                            {row.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    ),
                },
                actionsColumn,
            ],
            providers: [
                { accessor: "name", header: "Nombre" },
                {
                    accessor: "category_name",
                    header: "Categoría",
                    cell: (row) => (
                        <span className="text-sm text-slate-600">
                            {row.category_name || "—"}
                        </span>
                    ),
                },
                { accessor: "nit", header: "NIT" },
                { accessor: "phone", header: "Teléfono" },
                {
                    accessor: "is_active",
                    header: "Estado",
                    cell: (row) => (
                        <Badge variant={row.is_active ? "success" : "default"}>
                            {row.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    ),
                },
                actionsColumn,
            ],
            banks: [
                { accessor: "name", header: "Nombre" },
                { accessor: "contact_phone", header: "Teléfono" },
                {
                    accessor: "is_active",
                    header: "Estado",
                    cell: (row) => (
                        <Badge variant={row.is_active ? "success" : "default"}>
                            {row.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    ),
                },
                actionsColumn,
            ],
            shipmentTypes: [
                { accessor: "name", header: "Nombre" },
                { accessor: "code", header: "Código" },
                { accessor: "description", header: "Descripción" },
                {
                    accessor: "is_active",
                    header: "Estado",
                    cell: (row) => (
                        <Badge variant={row.is_active ? "success" : "default"}>
                            {row.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    ),
                },
                actionsColumn,
            ],
            subClients: [
                { accessor: "name", header: "Nombre" },
                {
                    accessor: "is_active",
                    header: "Estado",
                    cell: (row) => (
                        <Badge variant={row.is_active ? "success" : "default"}>
                            {row.is_active ? "Activo" : "Inactivo"}
                        </Badge>
                    ),
                },
                actionsColumn,
            ],
        };

        return specific[catalog] || [];
    };

    const getData = (catalog) => {
        const data = {
            providerCategories,
            providers,
            banks,
            shipmentTypes,
            subClients,
        };
        return data[catalog] || [];
    };

    const getFilteredData = (catalog) => {
        const data = getData(catalog);
        if (!searchTerm) return data;

        const lowerTerm = searchTerm.toLowerCase();
        return data.filter((item) => {
            return Object.values(item).some((val) =>
                String(val).toLowerCase().includes(lowerTerm)
            );
        });
    };

    const renderForm = () => {
        return (
            <div className="grid grid-cols-12 gap-4">
                {(() => {
                    switch (currentCatalog) {
                        case "providerCategories":
                            return (
                                <>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Nombre *</Label>
                                        <Input
                                            value={formData.name || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    name: e.target.value,
                                                })
                                            }
                                            required
                                            placeholder="Ej: Naviera, Agencia de Carga"
                                        />
                                    </div>
                                    <div className="col-span-12">
                                        <Label>Descripción</Label>
                                        <textarea
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            rows={3}
                                            value={formData.description || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    description: e.target.value,
                                                })
                                            }
                                            placeholder="Descripción de la categoría de proveedor"
                                        />
                                    </div>
                                </>
                            );

                        case "providers":
                            return (
                                <>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Nombre *</Label>
                                        <Input
                                            value={formData.name || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    name: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Categoría</Label>
                                        <SelectERP
                                            value={formData.category}
                                            onChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    category: value,
                                                })
                                            }
                                            options={providerCategories}
                                            getOptionLabel={(opt) => opt.name}
                                            getOptionValue={(opt) => opt.id}
                                            placeholder="Seleccionar categoría..."
                                            clearable
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <Label>NIT</Label>
                                        <Input
                                            value={formData.nit || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    nit: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <Label>Teléfono</Label>
                                        <Input
                                            value={formData.phone || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    phone: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-4">
                                        <Label>Email</Label>
                                        <Input
                                            type="email"
                                            value={formData.email || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    email: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12">
                                        <Label>Dirección</Label>
                                        <textarea
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            rows={2}
                                            value={formData.address || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    address: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            );

                        case "banks":
                            return (
                                <>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Nombre del Banco *</Label>
                                        <Input
                                            value={formData.name || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    name: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Teléfono</Label>
                                        <Input
                                            value={formData.contact_phone || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    contact_phone: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            );

                        case "shipmentTypes":
                            return (
                                <>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Nombre *</Label>
                                        <Input
                                            value={formData.name || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    name: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="col-span-12 md:col-span-6">
                                        <Label>Código</Label>
                                        <Input
                                            value={formData.code || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    code: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div className="col-span-12">
                                        <Label>Descripción</Label>
                                        <textarea
                                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            rows={2}
                                            value={formData.description || ""}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    description: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                </>
                            );

                        case "subClients":
                            return (
                                <div className="col-span-12">
                                    <Label>Nombre *</Label>
                                    <Input
                                        value={formData.name || ""}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                name: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                            );

                        default:
                            return null;
                    }
                })()}
            </div>
        );
    };

    const getModalTitle = () => {
        const titles = {
            providerCategories: "Categoría de Proveedor",
            providers: "Proveedor",
            banks: "Banco",
            shipmentTypes: "Tipo de Embarque",
            subClients: "Subcliente",
        };
        return `${editingItem ? "Editar" : "Nuevo"} ${
            titles[currentCatalog] || ""
        }`;
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">
                    Catálogos Generales
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                    Gestiona proveedores, aforadores, bancos y más
                </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start overflow-x-auto">
                    <TabsTrigger value="providerCategories">
                        <Tags className="h-4 w-4 mr-2" />
                        Categorías de Proveedores
                    </TabsTrigger>
                    <TabsTrigger value="providers">
                        <Building2 className="h-4 w-4 mr-2" />
                        Proveedores
                    </TabsTrigger>
                    <TabsTrigger value="banks">
                        <Landmark className="h-4 w-4 mr-2" />
                        Bancos
                    </TabsTrigger>
                    <TabsTrigger value="shipmentTypes">
                        <Ship className="h-4 w-4 mr-2" />
                        Tipos de Embarque
                    </TabsTrigger>
                    <TabsTrigger value="subClients">
                        <UserCircle className="h-4 w-4 mr-2" />
                        Subclientes
                    </TabsTrigger>
                </TabsList>

                {/* Categorías de Proveedores */}
                <TabsContent value="providerCategories" key="providerCategories">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Categorías de Proveedores</CardTitle>
                                <Button onClick={() => openModal("providerCategories")}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nueva Categoría
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar categorías..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("providerCategories")}
                                data={getFilteredData("providerCategories")}
                                searchable={false}
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Proveedores */}
                <TabsContent value="providers" key="providers">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Proveedores</CardTitle>
                                <Button onClick={() => openModal("providers")}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo Proveedor
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar proveedores..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("providers")}
                                data={getFilteredData("providers")}
                                searchable={false}
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bancos */}
                <TabsContent value="banks" key="banks">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Bancos</CardTitle>
                                <Button onClick={() => openModal("banks")}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo Banco
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar bancos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("banks")}
                                data={getFilteredData("banks")}
                                searchable={false}
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tipos de Embarque */}
                <TabsContent value="shipmentTypes" key="shipmentTypes">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Tipos de Embarque</CardTitle>
                                <Button onClick={() => openModal("shipmentTypes")}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo Tipo
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar tipos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("shipmentTypes")}
                                data={getFilteredData("shipmentTypes")}
                                searchable={false}
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Subclientes */}
                <TabsContent value="subClients" key="subClients">
                    <Card>
                        <CardHeader className="flex flex-col gap-4 pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle>Subclientes</CardTitle>
                                <Button onClick={() => openModal("subClients")}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Nuevo Subcliente
                                </Button>
                            </div>
                            <div className="relative flex-1 max-w-lg">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar subclientes..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("subClientes")}
                                data={getFilteredData("subClients")}
                                searchable={false}
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal Universal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold text-gray-900">
                            {getModalTitle()}
                        </DialogTitle>
                        <p className="text-sm text-gray-500 mt-1">
                            {editingItem ? "Modifica" : "Completa"} los datos
                            requeridos
                        </p>
                    </DialogHeader>

                    <form onSubmit={handleSubmit}>
                        <div className="space-y-6 py-4">
                            {/* Campos del formulario */}
                            <div className="space-y-4">{renderForm()}</div>

                            {/* Separador */}
                            <div className="border-t border-gray-200 pt-4">
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
                                            El registro estará disponible para
                                            su uso
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer con botones */}
                        <DialogFooter className="bg-gray-50 -mx-6 -mb-6 px-6 py-4 rounded-b-lg">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                                className="min-w-[100px]"
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" className="min-w-[100px]">
                                {editingItem ? "Actualizar" : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() =>
                    setConfirmDialog({ open: false, catalog: null, id: null })
                }
                onConfirm={confirmDelete}
                title="¿Eliminar este registro?"
                description="Esta acción no se puede deshacer. El registro será eliminado permanentemente."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
}

export default Catalogs;
