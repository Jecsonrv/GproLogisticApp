import React, { useState, useEffect } from "react";
import {
    FileText,
    DollarSign,
    Truck,
    Folder,
    Clock,
    Trash2,
    Plus,
    AlertCircle,
    Edit,
} from "lucide-react";
import {
    Badge,
    Button,
    Card,
    CardContent,
    Input,
    Select,
    EmptyState,
    Label,
    ConfirmDialog,
} from "./ui";
import ProviderPaymentsTab from "./ProviderPaymentsTab";
import DocumentsTabUnified from "./DocumentsTabUnified";
import HistoryTab from "./HistoryTab";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";

/**
 * ServiceOrderDetail - Vista detallada de Orden de Servicio con Tabs
 */
const ServiceOrderDetail = ({ orderId, onUpdate, onEdit }) => {
    const [activeTab, setActiveTab] = useState("info");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    // Data for dropdowns
    const [services, setServices] = useState([]);
    const [providers, setProviders] = useState([]);
    const [clientPrices, setClientPrices] = useState([]);

    // Charges
    const [charges, setCharges] = useState([]);
    const [isAddingCharge, setIsAddingCharge] = useState(false);
    const [chargeForm, setChargeForm] = useState({
        service: "",
        quantity: 1,
        unit_price: "",
        discount: "",
        notes: "",
    });

    // Third Party Expenses
    const [expenses, setExpenses] = useState([]);

    // Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
    });

    useEffect(() => {
        if (orderId) {
            fetchOrderDetail();
            fetchServices();
            fetchProviders();
        }
    }, [orderId]);

    // Fetch client prices when order is loaded (and we know the client)
    useEffect(() => {
        if (order?.client) {
            fetchClientPrices(order.client);
        }
    }, [order?.client]);

    const fetchOrderDetail = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/orders/service-orders/${orderId}/`
            );
            setOrder(response.data);
            setCharges(response.data.charges || []);
            setExpenses(response.data.third_party_expenses || []);
        } catch (error) {
            // toast.error('Error al cargar detalle de OS');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchServices = async () => {
        try {
            const response = await axios.get("/catalogs/services/activos/");
            setServices(response.data);
        } catch (error) {
            console.error("Error loading services");
        }
    };

    const fetchProviders = async () => {
        try {
            const response = await axios.get("/catalogs/providers/");
            setProviders(response.data);
        } catch (error) {
            console.error("Error loading providers");
        }
    };

    const fetchClientPrices = async (clientId) => {
        try {
            const response = await axios.get(
                `/catalogs/client-service-prices/by-client/${clientId}/`
            );
            setClientPrices(response.data);
        } catch (error) {
            console.error("Error loading client prices", error);
        }
    };

    const handleAddCharge = async () => {
        try {
            await axios.post(`/orders/service-orders/${orderId}/add_charge/`, {
                ...chargeForm,
                discount: parseFloat(chargeForm.discount || 0),
            });
            toast.success("Cargo agregado exitosamente");
            fetchOrderDetail();
            setIsAddingCharge(false);
            resetChargeForm();
            if (onUpdate) onUpdate(); // Update parent list totals
        } catch (error) {
            toast.error(
                error.response?.data?.error || "Error al agregar cargo"
            );
        }
    };

    const handleDeleteCharge = (chargeId) => {
        setConfirmDialog({ open: true, id: chargeId });
    };

    const confirmDeleteCharge = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null });

        try {
            await axios.delete(`/orders/charges/${id}/`);
            toast.success("Cargo eliminado exitosamente");
            fetchOrderDetail();
            if (onUpdate) onUpdate(); // Update parent list totals
        } catch (error) {
            const errorMessage =
                error.response?.data?.error ||
                error.response?.data?.detail ||
                "Error al eliminar cargo";
            toast.error(errorMessage);
        }
    };

    const resetChargeForm = () => {
        setChargeForm({
            service: "",
            quantity: 1,
            unit_price: "",
            discount: "",
            notes: "",
        });
    };

    const calculateChargeTotal = (charge) => {
        const quantity = parseFloat(charge.quantity) || 0;
        const unitPrice = parseFloat(charge.unit_price) || 0;
        const exchangeRate = parseFloat(charge.exchange_rate) || 1;

        const subtotal = quantity * unitPrice;
        const discount = subtotal * (parseFloat(charge.discount || 0) / 100);
        const base = subtotal - discount;

        // Calcular IVA sobre el monto base (en moneda original)
        const iva = charge.applies_iva ? base * 0.13 : 0;

        // Total en moneda original
        const totalOriginal = base + iva;

        // Retornar total convertido a moneda base (GTQ)
        return totalOriginal * exchangeRate;
    };

    const getServicePrice = (serviceId) => {
        // 1. Check if there is a custom price for this client
        const customPrice = clientPrices.find(
            (cp) => cp.service === parseInt(serviceId)
        );
        if (customPrice) {
            return parseFloat(customPrice.custom_price);
        }

        // 2. Fallback to default service price
        const service = services.find((s) => s.id === parseInt(serviceId));
        return service ? parseFloat(service.default_price) : 0;
    };

    const tabs = [
        { id: "info", name: "Info General", icon: FileText },
        { id: "charges", name: "Cobros/Servicios", icon: DollarSign },
        { id: "expenses", name: "Costos de la Orden", icon: Truck },
        { id: "documents", name: "Documentos", icon: Folder },
        { id: "history", name: "Historial", icon: Clock },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="text-center py-12 text-gray-500">
                No se encontró la orden
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                        OS: {order.order_number}
                    </h2>
                    <div className="flex items-center space-x-3 mt-2">
                        <Badge
                            variant={
                                order.status === "abierta"
                                    ? "default"
                                    : "secondary"
                            }
                        >
                            {order.status === "abierta" ? "Abierta" : "Cerrada"}
                        </Badge>
                        {order.facturado && (
                            <Badge
                                variant="outline"
                                className="text-emerald-600 border-emerald-200 bg-emerald-50"
                            >
                                Facturado
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Total</div>
                        <div className="text-3xl font-bold text-blue-700">
                            {formatCurrency(order.total_amount || 0)}
                        </div>
                    </div>
                    {onEdit && order.status === "abierta" && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEdit(order)}
                            className="mt-1"
                        >
                            <Edit className="w-4 h-4 mr-2" />
                            Editar Orden
                        </Button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                  ${
                      activeTab === tab.id
                          ? "border-blue-500 text-blue-700"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
                            >
                                <Icon
                                    className={`-ml-0.5 mr-2 h-4 w-4 ${
                                        activeTab === tab.id
                                            ? "text-blue-500"
                                            : "text-gray-400 group-hover:text-gray-500"
                                    }`}
                                />
                                {tab.name}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
                {/* Info General */}
                {activeTab === "info" && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                                        Información del Cliente
                                    </h3>
                                    <dl className="space-y-4">
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">
                                                Cliente
                                            </dt>
                                            <dd className="mt-1 text-base font-medium text-gray-900">
                                                {order.client_name}
                                            </dd>
                                        </div>
                                        {order.sub_client_name && (
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">
                                                    Sub-Cliente
                                                </dt>
                                                <dd className="mt-1 text-base text-gray-900">
                                                    {order.sub_client_name}
                                                </dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">
                                                Aforador
                                            </dt>
                                            <dd className="mt-1 text-base text-gray-900">
                                                {order.customs_agent_name ||
                                                    "N/A"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">
                                        Información del Embarque
                                    </h3>
                                    <dl className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">
                                                    DUCA
                                                </dt>
                                                <dd className="mt-1 text-base font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded w-fit">
                                                    {order.duca}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-gray-500">
                                                    BL / Referencia
                                                </dt>
                                                <dd className="mt-1 text-base text-gray-900">
                                                    {order.bl_reference ||
                                                        "N/A"}
                                                </dd>
                                            </div>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">
                                                ETA
                                            </dt>
                                            <dd className="mt-1 text-base text-gray-900">
                                                {order.eta
                                                    ? new Date(
                                                          order.eta +
                                                              "T00:00:00"
                                                      ).toLocaleDateString(
                                                          "es-SV",
                                                          {
                                                              weekday: "long",
                                                              year: "numeric",
                                                              month: "long",
                                                              day: "numeric",
                                                          }
                                                      )
                                                    : "N/A"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">
                                                Tipo de Embarque
                                            </dt>
                                            <dd className="mt-1 text-base text-gray-900">
                                                {order.shipment_type_name ||
                                                    "N/A"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-gray-500">
                                                Purchase Order
                                            </dt>
                                            <dd className="mt-1 text-base text-gray-900">
                                                {order.purchase_order || "N/A"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h3 className="text-lg font-semibold text-slate-900 mb-4">
                                    Resumen Financiero
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Servicios (Ingresos)
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                order.total_services || 0
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Costos de la Orden
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                order.total_third_party || 0
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Total General
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                order.total_amount || 0
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Cobros/Servicios */}
                {activeTab === "charges" && (
                    <div className="space-y-4">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900">
                                        Calculadora de Cobros
                                    </h3>
                                    {order.status === "abierta" &&
                                        !isAddingCharge && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setIsAddingCharge(true)
                                                }
                                            >
                                                <Plus className="mr-2 h-4 w-4" />{" "}
                                                Agregar Servicio
                                            </Button>
                                        )}
                                </div>

                                {/* Add Charge Form */}
                                {isAddingCharge && (
                                    <div className="bg-gray-50 p-6 rounded-lg mb-6 border border-gray-200 animate-fade-in">
                                        <h4 className="text-sm font-semibold text-gray-900 mb-4">
                                            Nuevo Cargo
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <Select
                                                    label="Servicio"
                                                    value={chargeForm.service}
                                                    onChange={(value) => {
                                                        const price =
                                                            getServicePrice(
                                                                value
                                                            );
                                                        setChargeForm({
                                                            ...chargeForm,
                                                            service: value,
                                                            unit_price: price,
                                                        });
                                                    }}
                                                    options={services}
                                                    getOptionLabel={(opt) =>
                                                        opt.code
                                                            ? `${opt.code} - ${opt.name}`
                                                            : opt.name
                                                    }
                                                    getOptionValue={(opt) =>
                                                        opt.id
                                                    }
                                                    searchable
                                                    required
                                                />
                                                {chargeForm.service && (
                                                    <div className="mt-1 text-xs">
                                                        {clientPrices.some(
                                                            (cp) =>
                                                                cp.service ===
                                                                parseInt(
                                                                    chargeForm.service
                                                                )
                                                        ) ? (
                                                            <span className="text-emerald-600 font-medium">
                                                                ✓ Precio
                                                                preferencial
                                                                aplicado
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-500">
                                                                Precio de lista
                                                                base
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <Label className="mb-2 block">
                                                    Cantidad
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    value={chargeForm.quantity}
                                                    onChange={(e) =>
                                                        setChargeForm({
                                                            ...chargeForm,
                                                            quantity:
                                                                parseFloat(
                                                                    e.target
                                                                        .value
                                                                ) || 1,
                                                        })
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <Label className="mb-2 block">
                                                    Precio Unitario (Sin IVA)
                                                </Label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-2 text-gray-500">
                                                        $
                                                    </span>
                                                    <Input
                                                        className="pl-7"
                                                        type="number"
                                                        step="0.01"
                                                        value={
                                                            chargeForm.unit_price
                                                        }
                                                        onChange={(e) =>
                                                            setChargeForm({
                                                                ...chargeForm,
                                                                unit_price:
                                                                    e.target
                                                                        .value,
                                                            })
                                                        }
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="mb-2 block">
                                                    Descuento (%)
                                                </Label>
                                                <Input
                                                    type="text"
                                                    placeholder="0.00"
                                                    value={chargeForm.discount}
                                                    onChange={(e) => {
                                                        const val =
                                                            e.target.value;
                                                        if (
                                                            val === "" ||
                                                            /^\d*\.?\d*$/.test(
                                                                val
                                                            )
                                                        ) {
                                                            setChargeForm({
                                                                ...chargeForm,
                                                                discount: val,
                                                            });
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <Label className="mb-2 block">
                                                Notas
                                            </Label>
                                            <Input
                                                value={chargeForm.notes}
                                                onChange={(e) =>
                                                    setChargeForm({
                                                        ...chargeForm,
                                                        notes: e.target.value,
                                                    })
                                                }
                                                placeholder="Detalles adicionales del servicio..."
                                            />
                                        </div>

                                        <div className="flex justify-end space-x-2 pt-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                    setIsAddingCharge(false);
                                                    resetChargeForm();
                                                }}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button onClick={handleAddCharge}>
                                                Guardar Cargo
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Charges Table - Responsive */}
                                {charges.length === 0 ? (
                                    <EmptyState
                                        icon={DollarSign}
                                        title="No hay servicios agregados"
                                        description="Agregue servicios para calcular el cobro de esta orden"
                                    />
                                ) : (
                                    <div className="border border-slate-200 rounded-sm overflow-hidden">
                                        {/* Tabla responsive con scroll horizontal */}
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-slate-200 text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[180px]">
                                                            Servicio
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                                                            Cant.
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            Precio
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                                                            Desc.
                                                        </th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-14">
                                                            IVA
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                                            Total
                                                        </th>
                                                        {order.status ===
                                                            "abierta" && (
                                                            <th className="px-3 py-2.5 w-10"></th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {charges.map((charge) => (
                                                        <tr
                                                            key={charge.id}
                                                            className="hover:bg-slate-50/70 transition-colors duration-75"
                                                        >
                                                            <td className="px-3 py-2.5">
                                                                <div className="text-sm font-medium text-slate-900">
                                                                    {charge.service_code
                                                                        ? `${charge.service_code} - `
                                                                        : ""}
                                                                    {
                                                                        charge.service_name
                                                                    }
                                                                </div>
                                                                {charge.notes && (
                                                                    <div
                                                                        className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]"
                                                                        title={
                                                                            charge.notes
                                                                        }
                                                                    >
                                                                        {
                                                                            charge.notes
                                                                        }
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right text-sm text-slate-700 tabular-nums">
                                                                {
                                                                    charge.quantity
                                                                }
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right text-sm text-slate-700 tabular-nums">
                                                                {formatCurrency(
                                                                    charge.unit_price
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right text-sm text-slate-700 tabular-nums">
                                                                {charge.discount >
                                                                0
                                                                    ? `${charge.discount}%`
                                                                    : "-"}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-center">
                                                                {charge.applies_iva ? (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        size="sm"
                                                                    >
                                                                        IVA
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-slate-300">
                                                                        -
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right text-sm font-semibold text-slate-900 tabular-nums">
                                                                {formatCurrency(
                                                                    calculateChargeTotal(
                                                                        charge
                                                                    )
                                                                )}
                                                            </td>
                                                            {order.status ===
                                                                "abierta" && (
                                                                <td className="px-3 py-2.5 text-center">
                                                                    <button
                                                                        onClick={() =>
                                                                            handleDeleteCharge(
                                                                                charge.id
                                                                            )
                                                                        }
                                                                        className="text-slate-400 hover:text-danger-600 transition-colors p-1 rounded hover:bg-danger-50"
                                                                        title="Eliminar"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                                    <tr>
                                                        <td
                                                            colSpan={5}
                                                            className="px-3 py-2.5 text-right text-sm font-semibold text-slate-700"
                                                        >
                                                            Total Servicios:
                                                        </td>
                                                        <td className="px-3 py-2.5 text-right font-bold text-brand-700 text-base tabular-nums">
                                                            {formatCurrency(
                                                                order.total_services ||
                                                                    0
                                                            )}
                                                        </td>
                                                        {order.status ===
                                                            "abierta" && (
                                                            <td></td>
                                                        )}
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Pagos a Proveedores */}
                {activeTab === "expenses" && (
                    <ProviderPaymentsTab
                        orderId={orderId}
                        onUpdate={() => {
                            fetchOrderDetail();
                            if (onUpdate) onUpdate();
                        }}
                    />
                )}

                {/* Documentos - Vista Unificada */}
                {activeTab === "documents" && (
                    <DocumentsTabUnified
                        orderId={orderId}
                        onUpdate={() => {
                            fetchOrderDetail();
                            if (onUpdate) onUpdate();
                        }}
                    />
                )}

                {/* Historial */}
                {activeTab === "history" && <HistoryTab orderId={orderId} />}
            </div>

            {/* Confirm Delete Dialog - Cobros */}
            <ConfirmDialog
                open={confirmDialog.open}
                onClose={() => setConfirmDialog({ open: false, id: null })}
                onConfirm={confirmDeleteCharge}
                title="¿Eliminar este cargo?"
                description="Esta acción no se puede deshacer. El cargo será eliminado permanentemente de la orden de servicio."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
};

export default ServiceOrderDetail;
