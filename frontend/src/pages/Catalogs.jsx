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
} from "../components/ui";
import {
    Plus,
    Building2,
    Users,
    Landmark,
    Ship,
    UserCircle,
} from "lucide-react";
import axios from "../lib/axios";
import toast from "react-hot-toast";

function Catalogs() {
    // Estado del tab activo
    const [activeTab, setActiveTab] = useState("providers");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentCatalog, setCurrentCatalog] = useState("providers");
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        catalog: null,
        id: null,
    });

    // Estados para cada catálogo
    const [providers, setProviders] = useState([]);
    const [customsAgents, setCustomsAgents] = useState([]);
    const [banks, setBanks] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [subClients, setSubClients] = useState([]);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({});

    useEffect(() => {
        fetchAllCatalogs();
    }, []);

    const fetchAllCatalogs = async () => {
        setLoading(true);
        try {
            const [prov, cust, bnk, ship, sub] = await Promise.all([
                axios.get("/catalogs/providers/"),
                axios.get("/catalogs/customs-agents/"),
                axios.get("/catalogs/banks/"),
                axios.get("/catalogs/shipment-types/"),
                axios.get("/catalogs/sub-clients/"),
            ]);
            setProviders(prov.data);
            setCustomsAgents(cust.data);
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
            providers: {
                name: "",
                nit: "",
                phone: "",
                email: "",
                address: "",
                is_active: true,
            },
            customsAgents: {
                name: "",
                phone: "",
                email: "",
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
                providers: "/catalogs/providers/",
                customsAgents: "/catalogs/customs-agents/",
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
                providers: "/catalogs/providers/",
                customsAgents: "/catalogs/customs-agents/",
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
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openModal(catalog, row)}
                    >
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(catalog, row.id)}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        };

        const specific = {
            providers: [
                { accessor: "name", header: "Nombre" },
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
            customsAgents: [
                { accessor: "name", header: "Nombre" },
                { accessor: "phone", header: "Teléfono" },
                { accessor: "email", header: "Email" },
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
            providers,
            customsAgents,
            banks,
            shipmentTypes,
            subClients,
        };
        return data[catalog] || [];
    };

    const renderForm = () => {
        switch (currentCatalog) {
            case "providers":
                return (
                    <>
                        <div>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
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
                            <div>
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
                        </div>
                        <div>
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
                        <div>
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

            case "customsAgents":
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
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
                            <div>
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
                        </div>
                        <div>
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
                    </>
                );

            case "banks":
                return (
                    <>
                        <div>
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
                        <div>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
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
                            <div>
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
                        </div>
                        <div>
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
                    <div>
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
    };

    const getModalTitle = () => {
        const titles = {
            providers: "Proveedor",
            customsAgents: "Aforador",
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
                    <TabsTrigger value="providers">
                        <Building2 className="h-4 w-4 mr-2" />
                        Proveedores
                    </TabsTrigger>
                    <TabsTrigger value="customsAgents">
                        <Users className="h-4 w-4 mr-2" />
                        Aforadores
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

                {/* Proveedores */}
                <TabsContent value="providers" key="providers">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Proveedores</CardTitle>
                            <Button onClick={() => openModal("providers")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Proveedor
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("providers")}
                                data={getData("providers")}
                                searchable
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Aforadores */}
                <TabsContent value="customsAgents" key="customsAgents">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Aforadores</CardTitle>
                            <Button onClick={() => openModal("customsAgents")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Aforador
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("customsAgents")}
                                data={getData("customsAgents")}
                                searchable
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Bancos */}
                <TabsContent value="banks" key="banks">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Bancos</CardTitle>
                            <Button onClick={() => openModal("banks")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Banco
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("banks")}
                                data={getData("banks")}
                                searchable
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tipos de Embarque */}
                <TabsContent value="shipmentTypes" key="shipmentTypes">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Tipos de Embarque</CardTitle>
                            <Button onClick={() => openModal("shipmentTypes")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Tipo
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("shipmentTypes")}
                                data={getData("shipmentTypes")}
                                searchable
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Subclientes */}
                <TabsContent value="subClients" key="subClients">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Subclientes</CardTitle>
                            <Button onClick={() => openModal("subClients")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Subcliente
                            </Button>
                        </CardHeader>
                        <CardContent className="px-5 pb-5 pt-0">
                            <DataTable
                                columns={getColumns("subClientes")}
                                data={getData("subClientes")}
                                searchable
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
