import React, { useState, useEffect } from "react";
import {
    PlusIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    TagIcon,
    DocumentCheckIcon,
} from "@heroicons/react/24/outline";
import {
    DataTable,
    Modal,
    Button,
    Card,
    SelectERP,
    Input,
    Badge,
    EmptyState,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";

/**
 * ClientPricing - Gestión de Tarifario de Clientes
 * Permite asignar precios personalizados de servicios a cada cliente
 */
const ClientPricing = () => {
    const [clients, setClients] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [clientPrices, setClientPrices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddingPrice, setIsAddingPrice] = useState(false);

    const [priceForm, setPriceForm] = useState({
        service: "",
        custom_price: "",
    });

    useEffect(() => {
        fetchClients();
        fetchServices();
    }, []);

    useEffect(() => {
        if (selectedClient) {
            fetchClientPrices(selectedClient);
        }
    }, [selectedClient]);

    const fetchClients = async () => {
        try {
            const response = await axios.get("/clients/");
            setClients(response.data);
            if (response.data.length > 0 && !selectedClient) {
                setSelectedClient(response.data[0].id);
            }
        } catch (error) {
            toast.error("Error al cargar clientes");
        }
    };

    const fetchServices = async () => {
        try {
            const response = await axios.get("/catalogs/services/activos/");
            setServices(response.data);
        } catch (error) {
            toast.error("Error al cargar servicios");
        }
    };

    const fetchClientPrices = async (clientId) => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/catalogs/client-service-prices/by-client/${clientId}/`
            );
            setClientPrices(response.data);
        } catch (error) {
            toast.error("Error al cargar tarifario del cliente");
            setClientPrices([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPrice = async () => {
        if (!priceForm.service || !priceForm.custom_price) {
            toast.error("Complete todos los campos requeridos");
            return;
        }

        try {
            await axios.post("/catalogs/client-service-prices/", {
                client: selectedClient,
                service: priceForm.service,
                custom_price: priceForm.custom_price,
            });
            toast.success("Precio personalizado agregado");
            fetchClientPrices(selectedClient);
            setIsAddingPrice(false);
            setPriceForm({ service: "", custom_price: "" });
        } catch (error) {
            const errorMsg =
                error.response?.data?.message ||
                error.response?.data?.non_field_errors?.[0] ||
                "Error al agregar precio";
            toast.error(errorMsg);
        }
    };

    const handleDeletePrice = async (priceId) => {
        if (!confirm("¿Eliminar este precio personalizado?")) return;

        try {
            await axios.delete(`/catalogs/client-service-prices/${priceId}/`);
            toast.success("Precio eliminado");
            fetchClientPrices(selectedClient);
        } catch (error) {
            toast.error("Error al eliminar precio");
        }
    };

    const handleBulkAdd = async () => {
        if (!selectedClient) return;

        const servicesToAdd = services
            .filter(
                (service) =>
                    !clientPrices.some((cp) => cp.service === service.id)
            )
            .map((service) => ({
                client: selectedClient,
                service: service.id,
                custom_price: service.default_price,
            }));

        if (servicesToAdd.length === 0) {
            toast.info("Ya existen precios para todos los servicios");
            return;
        }

        if (
            !confirm(
                `¿Agregar ${servicesToAdd.length} servicios con precios por defecto?`
            )
        )
            return;

        try {
            await axios.post("/catalogs/client-service-prices/bulk_create/", {
                prices: servicesToAdd,
            });
            toast.success(
                `${servicesToAdd.length} precios agregados exitosamente`
            );
            fetchClientPrices(selectedClient);
        } catch (error) {
            toast.error("Error al agregar precios en lote");
        }
    };

    const getAvailableServices = () => {
        return services.filter(
            (service) => !clientPrices.some((cp) => cp.service === service.id)
        );
    };

    const columns = [
        {
            header: "Código",
            accessor: "service_code",
            render: (row) => (
                <span className="font-mono font-medium text-gray-900">
                    {row.service_code}
                </span>
            ),
        },
        {
            header: "Servicio",
            accessor: "service_name",
            render: (row) => (
                <div className="font-medium text-gray-900">
                    {row.service_name}
                </div>
            ),
        },
        {
            header: "Precio Base",
            render: (row) => {
                const service = services.find((s) => s.id === row.service);
                return (
                    <div className="text-sm text-gray-500">
                        ${parseFloat(service?.default_price || 0).toFixed(2)}
                    </div>
                );
            },
        },
        {
            header: "Precio Cliente",
            accessor: "custom_price",
            render: (row) => {
                const service = services.find((s) => s.id === row.service);
                const basePrice = parseFloat(service?.default_price || 0);
                const customPrice = parseFloat(row.custom_price);
                const isDifferent = Math.abs(customPrice - basePrice) > 0.01;

                return (
                    <div>
                        <div
                            className={`font-semibold ${
                                isDifferent
                                    ? "text-primary-600"
                                    : "text-gray-900"
                            }`}
                        >
                            ${customPrice.toFixed(2)}
                        </div>
                        {isDifferent && (
                            <div className="text-xs text-gray-500">
                                {customPrice > basePrice ? "+" : ""}
                                {(
                                    ((customPrice - basePrice) / basePrice) *
                                    100
                                ).toFixed(1)}
                                %
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            header: "IVA",
            render: (row) => {
                const service = services.find((s) => s.id === row.service);
                return (
                    <Badge
                        variant={service?.applies_iva ? "success" : "default"}
                    >
                        {service?.applies_iva ? "Sí (13%)" : "No"}
                    </Badge>
                );
            },
        },
        {
            header: "Precio Final",
            render: (row) => {
                const service = services.find((s) => s.id === row.service);
                const customPrice = parseFloat(row.custom_price);
                const finalPrice = service?.applies_iva
                    ? customPrice * 1.13
                    : customPrice;

                return (
                    <div className="font-bold text-gray-900">
                        ${finalPrice.toFixed(2)}
                    </div>
                );
            },
        },
        {
            header: "Acciones",
            sortable: false,
            render: (row) => (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePrice(row.id);
                    }}
                    className="text-red-600 hover:text-red-900"
                    title="Eliminar"
                >
                    <TrashIcon className="h-5 w-5" />
                </button>
            ),
        },
    ];

    const selectedClientData = clients.find((c) => c.id === selectedClient);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Precios por Cliente
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Configura precios personalizados para cada cliente
                    </p>
                </div>
                {selectedClient && (
                    <div className="flex space-x-2">
                        <Button
                            variant="secondary"
                            onClick={handleBulkAdd}
                            icon={<DocumentCheckIcon className="h-5 w-5" />}
                        >
                            Agregar Todos los Servicios
                        </Button>
                        <Button
                            variant="primary"
                            onClick={() => setIsAddingPrice(true)}
                            icon={<PlusIcon className="h-5 w-5" />}
                        >
                            Agregar Precio
                        </Button>
                    </div>
                )}
            </div>

            {/* Client Selector */}
            <Card>
                <div className="flex items-center space-x-4">
                    <div className="flex-1">
                        <SelectERP
                            label="Cliente"
                            value={selectedClient}
                            onChange={(value) => setSelectedClient(value)}
                            options={clients}
                            getOptionLabel={(opt) => opt.name}
                            getOptionValue={(opt) => opt.id}
                            searchable
                            clearable
                        />
                    </div>
                    {selectedClientData && (
                        <div className="flex-shrink-0 pt-6">
                            <div className="text-sm text-gray-500">
                                Precios configurados:
                            </div>
                            <div className="text-2xl font-bold text-primary-600">
                                {clientPrices.length} / {services.length}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Prices Table */}
            {selectedClient ? (
                <Card>
                    <DataTable
                        data={clientPrices}
                        columns={columns}
                        loading={loading}
                        searchPlaceholder="Buscar por código o servicio..."
                        emptyMessage="Este cliente no tiene precios personalizados configurados"
                    />
                </Card>
            ) : (
                <Card>
                    <EmptyState
                        icon={<TagIcon className="h-12 w-12 text-gray-400" />}
                        title="Seleccione un cliente"
                        description="Seleccione un cliente para ver y gestionar su tarifario personalizado"
                    />
                </Card>
            )}

            {/* Add Price Modal */}
            <Modal
                isOpen={isAddingPrice}
                onClose={() => {
                    setIsAddingPrice(false);
                    setPriceForm({ service: "", custom_price: "" });
                }}
                title="Agregar Precio Personalizado"
                size="lg"
                footer={
                    <>
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsAddingPrice(false);
                                setPriceForm({ service: "", custom_price: "" });
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button variant="primary" onClick={handleAddPrice}>
                            Agregar
                        </Button>
                    </>
                }
            >
                <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start">
                            <TagIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-2" />
                            <div className="text-sm text-blue-800">
                                <strong>Cliente:</strong>{" "}
                                {selectedClientData?.name}
                            </div>
                        </div>
                    </div>

                    <SelectERP
                        label="Servicio"
                        value={priceForm.service}
                        onChange={(value) => {
                            const service = services.find(
                                (s) => s.id === value
                            );
                            setPriceForm({
                                service: value,
                                custom_price: service?.default_price || "",
                            });
                        }}
                        options={getAvailableServices()}
                        getOptionLabel={(opt) =>
                            `${opt.code} - ${opt.name} ($${parseFloat(
                                opt.default_price
                            ).toFixed(2)})`
                        }
                        searchable
                        required
                        getOptionValue={(opt) => opt.id}
                        searchable
                        required
                    />

                    <Input
                        label="Precio Personalizado"
                        type="number"
                        step="0.01"
                        value={priceForm.custom_price}
                        onChange={(e) =>
                            setPriceForm({
                                ...priceForm,
                                custom_price: e.target.value,
                            })
                        }
                        placeholder="0.00"
                        required
                    />

                    {priceForm.service && priceForm.custom_price && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                            {(() => {
                                const service = services.find(
                                    (s) => s.id === parseInt(priceForm.service)
                                );
                                const customPrice = parseFloat(
                                    priceForm.custom_price
                                );
                                const basePrice = parseFloat(
                                    service?.default_price || 0
                                );
                                const difference = customPrice - basePrice;
                                const percentDiff =
                                    basePrice > 0
                                        ? (difference / basePrice) * 100
                                        : 0;
                                const finalPrice = service?.applies_iva
                                    ? customPrice * 1.13
                                    : customPrice;

                                return (
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">
                                                Precio Base:
                                            </span>
                                            <span className="font-medium">
                                                ${basePrice.toFixed(2)}
                                            </span>
                                        </div>
                                        {Math.abs(difference) > 0.01 && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    Diferencia:
                                                </span>
                                                <span
                                                    className={`font-medium ${
                                                        difference > 0
                                                            ? "text-green-600"
                                                            : "text-red-600"
                                                    }`}
                                                >
                                                    {difference > 0 ? "+" : ""}$
                                                    {difference.toFixed(2)} (
                                                    {percentDiff > 0 ? "+" : ""}
                                                    {percentDiff.toFixed(1)}%)
                                                </span>
                                            </div>
                                        )}
                                        {service?.applies_iva && (
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">
                                                    IVA (13%):
                                                </span>
                                                <span className="font-medium">
                                                    $
                                                    {(
                                                        customPrice * 0.13
                                                    ).toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="pt-2 border-t border-gray-200">
                                            <div className="flex justify-between">
                                                <span className="text-gray-900 font-semibold">
                                                    Precio Final:
                                                </span>
                                                <span className="text-xl font-bold text-primary-600">
                                                    ${finalPrice.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default ClientPricing;
