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
    // Estado del tab activo (Tabs component maneja esto internamente)
    const [, setActiveTab] = useState("providers");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [currentCatalog, setCurrentCatalog] = useState("providers");

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
                axios.get("/api/catalogs/providers/"),
                axios.get("/api/catalogs/customs-agents/"),
                axios.get("/api/catalogs/banks/"),
                axios.get("/api/catalogs/shipment-types/"),
                axios.get("/api/catalogs/sub-clients/"),
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
                code: "",
                phone: "",
                email: "",
                is_active: true,
            },
            banks: {
                name: "",
                code: "",
                swift_code: "",
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
                providers: "/api/catalogs/providers/",
                customsAgents: "/api/catalogs/customs-agents/",
                banks: "/api/catalogs/banks/",
                shipmentTypes: "/api/catalogs/shipment-types/",
                subClients: "/api/catalogs/sub-clients/",
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
            fetchAllCatalogs();
        } catch (error) {
            toast.error(error.response?.data?.message || "Error al guardar");
        }
    };

    const handleDelete = async (catalog, id) => {
        if (!window.confirm("¿Eliminar este registro?")) return;

        try {
            const endpoints = {
                providers: "/api/catalogs/providers/",
                customsAgents: "/api/catalogs/customs-agents/",
                banks: "/api/catalogs/banks/",
                shipmentTypes: "/api/catalogs/shipment-types/",
                subClients: "/api/catalogs/sub-clients/",
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
        const common = [
            { key: "name", label: "Nombre" },
            {
                key: "is_active",
                label: "Estado",
                render: (row) => (
                    <Badge variant={row.is_active ? "success" : "default"}>
                        {row.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                ),
            },
            {
                key: "actions",
                label: "Acciones",
                render: (row) => (
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
            },
        ];

        const specific = {
            providers: [
                { key: "nit", label: "NIT" },
                { key: "phone", label: "Teléfono" },
                ...common,
            ],
            customsAgents: [
                { key: "code", label: "Código" },
                { key: "phone", label: "Teléfono" },
                ...common,
            ],
            banks: [
                { key: "code", label: "Código" },
                { key: "swift_code", label: "SWIFT" },
                ...common,
            ],
            shipmentTypes: [
                { key: "code", label: "Código" },
                { key: "description", label: "Descripción" },
                ...common,
            ],
            subClients: common,
        };

        return specific[catalog] || common;
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
                        <div className="grid grid-cols-2 gap-4">
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
                        </div>
                    </>
                );

            case "banks":
                return (
                    <>
                        <div className="grid grid-cols-2 gap-4">
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
                                <Label>Código *</Label>
                                <Input
                                    value={formData.code || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            code: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Código SWIFT</Label>
                                <Input
                                    value={formData.swift_code || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            swift_code: e.target.value,
                                        })
                                    }
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
            <Tabs defaultValue="providers" onValueChange={setActiveTab}>
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
                <TabsContent value="providers">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Proveedores</CardTitle>
                            <Button onClick={() => openModal("providers")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Proveedor
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
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
                <TabsContent value="customsAgents">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Aforadores</CardTitle>
                            <Button onClick={() => openModal("customsAgents")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Aforador
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
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
                <TabsContent value="banks">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Bancos</CardTitle>
                            <Button onClick={() => openModal("banks")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Banco
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
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
                <TabsContent value="shipmentTypes">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Tipos de Embarque</CardTitle>
                            <Button onClick={() => openModal("shipmentTypes")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Tipo
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
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
                <TabsContent value="subClients">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Subclientes</CardTitle>
                            <Button onClick={() => openModal("subClients")}>
                                <Plus className="h-4 w-4 mr-2" />
                                Nuevo Subcliente
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <DataTable
                                columns={getColumns("subClients")}
                                data={getData("subClients")}
                                searchable
                                pagination
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal Universal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>{getModalTitle()}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {renderForm()}

                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={formData.is_active || false}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        is_active: e.target.checked,
                                    })
                                }
                                className="rounded border-gray-300"
                            />
                            <Label htmlFor="is_active">Activo</Label>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">
                                {editingItem ? "Actualizar" : "Guardar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Catalogs;
