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
    Modal,
    ModalFooter,
    Input,
    Label,
    Badge,
    Skeleton,
    SkeletonTable,
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
    Edit2,
    Trash2,
    RefreshCw,
    XCircle,
} from "lucide-react";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";

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
                                openModal(catalog, row);
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
                                handleDelete(catalog, row.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
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
            <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    Información General
                </h4>
                <div className="grid grid-cols-12 gap-4">
                    {(() => {
                        switch (currentCatalog) {
                            case "providerCategories":
                                return (
                                    <>
                                        <div className="col-span-12">
                                            <Label className="mb-1.5 block">
                                                Nombre *
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Descripción
                                            </Label>
                                            <textarea
                                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none transition-colors"
                                                rows={3}
                                                value={
                                                    formData.description || ""
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description:
                                                            e.target.value,
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
                                            <Label className="mb-1.5 block">
                                                Nombre *
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Categoría
                                            </Label>
                                            <SelectERP
                                                value={formData.category}
                                                onChange={(value) =>
                                                    setFormData({
                                                        ...formData,
                                                        category: value,
                                                    })
                                                }
                                                options={providerCategories}
                                                getOptionLabel={(opt) =>
                                                    opt.name
                                                }
                                                getOptionValue={(opt) => opt.id}
                                                placeholder="Seleccionar categoría..."
                                                clearable
                                            />
                                        </div>
                                        <div className="col-span-12 md:col-span-4">
                                            <Label className="mb-1.5 block">
                                                NIT
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Teléfono
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Email
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Dirección
                                            </Label>
                                            <textarea
                                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none transition-colors"
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
                                            <Label className="mb-1.5 block">
                                                Nombre del Banco *
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Teléfono
                                            </Label>
                                            <Input
                                                value={
                                                    formData.contact_phone || ""
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        contact_phone:
                                                            e.target.value,
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
                                            <Label className="mb-1.5 block">
                                                Nombre *
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Código
                                            </Label>
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
                                            <Label className="mb-1.5 block">
                                                Descripción
                                            </Label>
                                            <textarea
                                                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none transition-colors"
                                                rows={2}
                                                value={
                                                    formData.description || ""
                                                }
                                                onChange={(e) =>
                                                    setFormData({
                                                        ...formData,
                                                        description:
                                                            e.target.value,
                                                    })
                                                }
                                            />
                                        </div>
                                    </>
                                );

                            case "subClients":
                                return (
                                    <div className="col-span-12">
                                        <Label className="mb-1.5 block">
                                            Nombre *
                                        </Label>
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
                {/* Tabs Skeleton */}
                <div className="flex gap-4 mb-6 p-1 bg-slate-100 rounded-lg w-fit">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-9 w-28 rounded-md bg-slate-200" />
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col pb-4">
                    {/* Toolbar Skeleton */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-4">
                        <Skeleton className="h-9 flex-1 max-w-lg rounded-lg" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24 rounded-lg" />
                            <Skeleton className="h-9 w-32 rounded-lg" />
                        </div>
                    </div>

                    {/* Table Skeleton */}
                    <div className="p-4">
                        <SkeletonTable rows={10} columns={4} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-2">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                {/* Tabs Navigation con estilo corporativo */}
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab("providerCategories")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === "providerCategories"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            <Tags className="h-4 w-4" />
                            Categorías
                        </button>
                        <button
                            onClick={() => setActiveTab("providers")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === "providers"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            <Building2 className="h-4 w-4" />
                            Proveedores
                        </button>
                        <button
                            onClick={() => setActiveTab("banks")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === "banks"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            <Landmark className="h-4 w-4" />
                            Bancos
                        </button>
                        <button
                            onClick={() => setActiveTab("shipmentTypes")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === "shipmentTypes"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            <Ship className="h-4 w-4" />
                            Embarques
                        </button>
                        <button
                            onClick={() => setActiveTab("subClients")}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2",
                                activeTab === "subClients"
                                    ? "bg-white text-slate-900 shadow-sm"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                            )}
                        >
                            <UserCircle className="h-4 w-4" />
                            Subclientes
                        </button>
                    </div>
                </div>

                {/* Content for each Tab with Corporate Design */}
                {[
                    "providerCategories",
                    "providers",
                    "banks",
                    "shipmentTypes",
                    "subClients",
                ].map((tab) => (
                    <TabsContent value={tab} key={tab}>
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col pb-4">
                            {/* Barra de Herramientas Unificada */}
                            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50/30">
                                {/* Izquierda: Buscador */}
                                <div className="flex items-center gap-3 flex-1 w-full lg:max-w-lg">
                                    <div className="relative flex-1 group">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder={`Buscar ${
                                                tab === "banks"
                                                    ? "bancos"
                                                    : tab === "providers"
                                                    ? "proveedores"
                                                    : tab ===
                                                      "providerCategories"
                                                    ? "categorías"
                                                    : tab === "shipmentTypes"
                                                    ? "tipos de embarque"
                                                    : "subclientes"
                                            }...`}
                                            value={searchTerm}
                                            onChange={(e) =>
                                                setSearchTerm(e.target.value)
                                            }
                                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                                        />
                                    </div>
                                    {searchTerm && (
                                        <button
                                            onClick={() => setSearchTerm("")}
                                            className="flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Derecha: Contador y Botón */}
                                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                                    <div className="text-sm text-slate-500 hidden md:block">
                                        <span className="font-semibold text-slate-900">
                                            {getFilteredData(tab).length}
                                        </span>{" "}
                                        registros
                                    </div>
                                    <div className="h-6 w-px bg-slate-200 hidden lg:block" />

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fetchAllCatalogs()}
                                        disabled={loading}
                                        className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm h-9 px-3 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        <RefreshCw
                                            className={cn(
                                                "w-3.5 h-3.5 mr-2",
                                                loading && "animate-spin"
                                            )}
                                        />
                                        Actualizar
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => openModal(tab)}
                                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-2" />
                                        {tab === "providerCategories" &&
                                            "Nueva Categoría"}
                                        {tab === "providers" &&
                                            "Nuevo Proveedor"}
                                        {tab === "banks" && "Nuevo Banco"}
                                        {tab === "shipmentTypes" &&
                                            "Nuevo Tipo"}
                                        {tab === "subClients" &&
                                            "Nuevo Subcliente"}
                                    </Button>
                                </div>
                            </div>

                            {/* Tabla */}
                            <DataTable
                                columns={getColumns(tab)}
                                data={getFilteredData(tab)}
                                searchable={false}
                                pagination
                                emptyMessage="No hay registros"
                            />
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* Modal Universal */}
            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={getModalTitle()}
                size="lg"
            >
                <form onSubmit={handleSubmit}>
                    <div className="space-y-6 py-4">
                        {/* Campos del formulario */}
                        <div className="space-y-4">{renderForm()}</div>

                        {/* Separador */}
                        <div className="border-t border-slate-200 pt-4">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
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
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                                />
                                <div className="flex flex-col">
                                    <Label
                                        htmlFor="is_active"
                                        className="font-medium text-slate-900 cursor-pointer"
                                    >
                                        Estado Activo
                                    </Label>
                                    <span className="text-xs text-slate-500">
                                        El registro estará disponible para su
                                        uso en el sistema
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer con botones */}
                    <ModalFooter>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setIsModalOpen(false)}
                            className="text-slate-500 font-semibold hover:text-slate-700 hover:bg-slate-100"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200 min-w-[120px] transition-all active:scale-95"
                        >
                            {editingItem ? "Actualizar" : "Guardar"}
                        </Button>
                    </ModalFooter>
                </form>
            </Modal>

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
