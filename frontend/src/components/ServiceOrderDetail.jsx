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
    FileCheck,
    Check,
} from "lucide-react";
import {
    Badge,
    Button,
    Card,
    CardContent,
    Input,
    Select,
    SelectERP,
    EmptyState,
    Label,
    ConfirmDialog,
} from "./ui";
import ProviderPaymentsTab from "./ProviderPaymentsTab";
import DocumentsTabUnified from "./DocumentsTabUnified";
import HistoryTab from "./HistoryTab";
import ExpenseCalculatorTab from "./ExpenseCalculatorTab";
import BillingWizard from "./BillingWizard";
import api from "../lib/axios";
import axios from "axios";
import toast from "react-hot-toast";
import { formatCurrency } from "../lib/utils";

/**
 * ServiceOrderDetail - Vista detallada de Orden de Servicio con Tabs
 */
const ServiceOrderDetail = ({ orderId, onUpdate, onEdit }) => {
    const [activeTab, setActiveTab] = useState("info");
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showBillingWizard, setShowBillingWizard] = useState(false);
    const [showWithIva, setShowWithIva] = useState(true); // Toggle para mostrar con/sin IVA

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
        iva_type: "gravado", // Por defecto gravado (13% IVA)
    });

    // Edición de cargos
    const [editingChargeId, setEditingChargeId] = useState(null);
    const [editChargeForm, setEditChargeForm] = useState({
        quantity: 1,
        unit_price: "",
        discount: "",
        notes: "",
        iva_type: "gravado",
    });

    // Third Party Expenses
    const [expenses, setExpenses] = useState([]);

    // Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
    });

    const STATUS_OPTIONS = [
        { id: 'pendiente', name: 'Pendiente' },
        { id: 'en_transito', name: 'En Tránsito' },
        { id: 'en_puerto', name: 'En Puerto' },
        { id: 'en_almacen', name: 'En Almacenadora' },
        { id: 'finalizada', name: 'Finalizada' },
        { id: 'cerrada', name: 'Cerrada' },
    ];

    const handleStatusChange = async (newStatus) => {
        try {
            // Optimistic update
            const oldStatus = order.status;
            setOrder({ ...order, status: newStatus });

            await api.patch(`/orders/service-orders/${orderId}/`, {
                status: newStatus
            });

            toast.success(`Estado actualizado a: ${STATUS_OPTIONS.find(s => s.id === newStatus)?.name}`);
            if (onUpdate) onUpdate();
        } catch (error) {
            // El interceptor ya maneja el error
            fetchOrderDetail(false); // Revert on error
        }
    };

    useEffect(() => {
        const controller = new AbortController();
        if (orderId) {
            fetchOrderDetail(true, controller.signal);
            fetchServices(controller.signal);
            fetchProviders(controller.signal);
        }
        return () => controller.abort();
    }, [orderId]);

    // Fetch client prices when order is loaded (and we know the client)
    useEffect(() => {
        const controller = new AbortController();
        if (order?.client) {
            fetchClientPrices(order.client, controller.signal);
        }
        return () => controller.abort();
    }, [order?.client]);

    const fetchOrderDetail = async (showLoader = true, signal) => {
        try {
            if (showLoader) setLoading(true);
            const response = await api.get(
                `/orders/service-orders/${orderId}/`,
                { signal }
            );
            setOrder(response.data);
            setCharges(response.data.charges || []);
            setExpenses(response.data.third_party_expenses || []);
        } catch (error) {
            if (axios.isCancel(error)) return;
            // El interceptor ya maneja el error
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const fetchServices = async (signal) => {
        try {
            const response = await api.get("/catalogs/services/activos/", { signal });
            setServices(response.data);
        } catch (error) {
            if (!axios.isCancel(error)) {
                 // Silencioso para catálogos secundarios
            }
        }
    };

    const fetchProviders = async (signal) => {
        try {
            const response = await api.get("/catalogs/providers/", { signal });
            setProviders(response.data);
        } catch (error) {
             if (!axios.isCancel(error)) {
                // Silencioso para catálogos secundarios
             }
        }
    };

    const fetchClientPrices = async (clientId, signal) => {
        try {
            const response = await api.get(
                `/catalogs/client-service-prices/by-client/${clientId}/`,
                { signal }
            );
            setClientPrices(response.data);
        } catch (error) {
            if (!axios.isCancel(error)) {
                // Silencioso - precios personalizados son opcionales
            }
        }
    };

    const handleAddCharge = async () => {
        if (!chargeForm.service) {
            toast.error("Por favor seleccione un servicio de la lista");
            return;
        }

        try {
            await api.post(`/orders/service-orders/${orderId}/add_charge/`, {
                ...chargeForm,
                discount: parseFloat(chargeForm.discount || 0),
            });
            toast.success("Cargo agregado exitosamente");
            fetchOrderDetail(false);
            setIsAddingCharge(false);
        } catch (error) {
            // El interceptor ya maneja el error
        }
    };

    const handleDeleteCharge = (chargeId) => {
        setConfirmDialog({ open: true, id: chargeId });
    };

    const confirmDeleteCharge = async () => {
        const { id } = confirmDialog;
        setConfirmDialog({ open: false, id: null });

        try {
            await api.delete(`/orders/charges/${id}/`);
            toast.success("Cargo eliminado exitosamente");
            fetchOrderDetail(false);
            if (onUpdate) onUpdate(); // Update parent list totals
        } catch (error) {
            // El interceptor ya maneja el error
        }
    };

    const resetChargeForm = () => {
        setChargeForm({
            service: "",
            quantity: 1,
            unit_price: "",
            discount: "",
            notes: "",
            iva_type: "gravado",
        });
    };

    // Funciones de edición de cargos
    const handleEditCharge = (charge) => {
        setEditingChargeId(charge.id);
        setEditChargeForm({
            quantity: charge.quantity,
            unit_price: charge.unit_price,
            discount: charge.discount || "",
            notes: charge.description || "",
            iva_type: charge.iva_type || "gravado",
        });
    };

    const handleSaveEditCharge = async () => {
        try {
            const response = await api.patch(
                `/orders/service-orders/${orderId}/update_charge/`,
                {
                    charge_id: editingChargeId,
                    quantity: parseInt(editChargeForm.quantity),
                    unit_price: parseFloat(editChargeForm.unit_price),
                    discount: parseFloat(editChargeForm.discount || 0),
                    notes: editChargeForm.notes,
                    iva_type: editChargeForm.iva_type,
                }
            );

            toast.success("Servicio actualizado correctamente");
            setEditingChargeId(null);
            fetchOrderDetail(false); // Refresh sin loader
        } catch (error) {
            // El interceptor ya maneja el error
        }
    };

    const handleCancelEditCharge = () => {
        setEditingChargeId(null);
        setEditChargeForm({
            quantity: 1,
            unit_price: "",
            discount: "",
            notes: "",
            iva_type: "gravado",
        });
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
        { id: "charges", name: "Calculadora de Servicios", icon: DollarSign },
        { id: "expenses", name: "Costos de la Orden", icon: Truck },
        { id: "documents", name: "Documentos", icon: Folder },
        { id: "history", name: "Historial", icon: Clock },
    ];

    if (loading || !order) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="w-full md:w-auto">
                    <h2 className="text-2xl font-bold text-slate-900 break-words">
                        OS: {order.order_number}
                    </h2>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-2">
                        <div className="w-full sm:w-48">
                            <SelectERP
                                value={order.status}
                                onChange={handleStatusChange}
                                options={STATUS_OPTIONS}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                className="text-sm"
                                isClearable={false}
                            />
                        </div>
                        {order.facturado && (
                            <Badge
                                variant="success"
                                className="bg-success-50/50 border-success-100 text-success-600 font-bold w-fit"
                            >
                                <Check className="w-3.5 h-3.5" />
                                FACTURADO
                            </Badge>
                        )}
                    </div>
                </div>
                <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                    <div className="text-right w-full md:w-auto flex justify-between md:block items-center">
                        <div className="text-sm text-slate-500 md:mb-1">Total</div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {formatCurrency(order.total_amount || 0)}
                        </div>
                    </div>
                    {onEdit && ['pendiente', 'en_transito', 'en_puerto', 'en_almacen', 'finalizada'].includes(order.status) && (
                        <div className="flex flex-wrap justify-end gap-2 mt-1 w-full">
                            <Button
                                size="sm"
                                onClick={() => setShowBillingWizard(true)}
                                className="bg-slate-900 hover:bg-slate-800 text-white flex-1 sm:flex-none justify-center"
                            >
                                <DollarSign className="w-4 h-4 mr-2" />
                                Generar Factura
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit(order)}
                                className="border-slate-300 text-slate-700 hover:bg-slate-50 flex-1 sm:flex-none justify-center"
                            >
                                <Edit className="w-4 h-4 mr-2" />
                                Editar Orden
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Billing Wizard */}
            <BillingWizard
                isOpen={showBillingWizard}
                onClose={() => setShowBillingWizard(false)}
                serviceOrder={order}
                onInvoiceCreated={() => {
                    fetchOrderDetail();
                    if (onUpdate) onUpdate();
                }}
            />

            {/* Tabs */}
            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all
                  ${
                      activeTab === tab.id
                          ? "border-slate-900 text-slate-900"
                          : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                  }
                `}
                            >
                                <Icon
                                    className={`-ml-0.5 mr-2 h-4 w-4 transition-colors ${
                                        activeTab === tab.id
                                            ? "text-slate-900"
                                            : "text-slate-400 group-hover:text-slate-500"
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
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                                        Información del Cliente
                                    </h3>
                                    <dl className="space-y-4">
                                        <div>
                                            <dt className="text-sm font-medium text-slate-500">
                                                Cliente
                                            </dt>
                                            <dd className="mt-1 text-base font-medium text-slate-900">
                                                {order.client_name}
                                            </dd>
                                        </div>
                                        {order.sub_client_name && (
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500">
                                                    Sub-Cliente
                                                </dt>
                                                <dd className="mt-1 text-base text-slate-700">
                                                    {order.sub_client_name}
                                                </dd>
                                            </div>
                                        )}
                                        <div>
                                            <dt className="text-sm font-medium text-slate-500">
                                                Aforador
                                            </dt>
                                            <dd className="mt-1 text-base text-slate-700">
                                                {order.customs_agent_name ||
                                                    "—"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold text-slate-900 mb-4 pb-2 border-b border-slate-200">
                                        Información del Embarque
                                    </h3>
                                    <dl className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500">
                                                    DUCA
                                                </dt>
                                                <dd className="mt-1 text-base font-mono text-slate-900 bg-slate-50 px-2 py-1 rounded w-fit">
                                                    {order.duca}
                                                </dd>
                                            </div>
                                            <div>
                                                <dt className="text-sm font-medium text-slate-500">
                                                    BL / Referencia
                                                </dt>
                                                <dd className="mt-1 text-base text-slate-700">
                                                    {order.bl_reference || "—"}
                                                </dd>
                                            </div>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-slate-500">
                                                ETA
                                            </dt>
                                            <dd className="mt-1 text-base text-slate-700">
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
                                                    : "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-slate-500">
                                                Tipo de Embarque
                                            </dt>
                                            <dd className="mt-1 text-base text-slate-700">
                                                {order.shipment_type_name ||
                                                    "—"}
                                            </dd>
                                        </div>
                                        <div>
                                            <dt className="text-sm font-medium text-slate-500">
                                                Orden de Compra (PO)
                                            </dt>
                                            <dd className="mt-1 text-base text-slate-700">
                                                {order.purchase_order || "—"}
                                            </dd>
                                        </div>
                                    </dl>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Resumen Financiero
                                    </h3>
                                    {/* Toggle Neto / Con IVA */}
                                    <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                                        <button
                                            onClick={() =>
                                                setShowWithIva(false)
                                            }
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                                !showWithIva
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            Neto
                                        </button>
                                        <button
                                            onClick={() => setShowWithIva(true)}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                                showWithIva
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            Con IVA
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Servicios{" "}
                                            {showWithIva
                                                ? "(con IVA)"
                                                : "(Neto)"}
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                showWithIva
                                                    ? (order.fiscal_summary?.services?.total_con_iva ?? order.total_services ?? 0)
                                                    : (order.fiscal_summary?.services?.subtotal_neto ?? order.total_services ?? 0)
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Costos de la Orden{" "}
                                            {showWithIva
                                                ? "(con IVA)"
                                                : "(Neto)"}
                                        </div>
                                        <div className="text-2xl font-bold text-slate-900 mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                showWithIva
                                                    ? (order.fiscal_summary?.third_party?.total_con_iva ?? order.total_third_party ?? 0)
                                                    : (order.fiscal_summary?.third_party?.subtotal_neto ?? order.total_third_party ?? 0)
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 hover:shadow-md transition-shadow">
                                        <div className="text-xs font-medium text-slate-300 uppercase tracking-wide">
                                            Total a Facturar{" "}
                                            {showWithIva
                                                ? "(con IVA)"
                                                : "(Neto)"}
                                        </div>
                                        <div className="text-2xl font-bold text-white mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                showWithIva
                                                    ? (order.fiscal_summary?.consolidated?.total_con_iva ?? order.total_amount ?? 0)
                                                    : (order.fiscal_summary?.consolidated?.subtotal_neto ?? order.total_amount ?? 0)
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Desglose de IVA cuando se muestra Con IVA */}
                                {showWithIva && order.fiscal_summary?.consolidated?.iva_total > 0 && (
                                    <div className="mt-3 text-right text-sm text-slate-500">
                                        IVA incluido: {formatCurrency(order.fiscal_summary.consolidated.iva_total)}
                                    </div>
                                )}
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
                                    <h3 className="text-lg font-semibold text-slate-900">
                                        Calculadora de Servicios
                                    </h3>
                                    {order.status !== "cerrada" &&
                                        !isAddingCharge && (
                                            <Button
                                                size="sm"
                                                onClick={() =>
                                                    setIsAddingCharge(true)
                                                }
                                                className="bg-slate-900 hover:bg-slate-800 text-white"
                                            >
                                                <Plus className="mr-2 h-4 w-4" />{" "}
                                                Agregar Servicio
                                            </Button>
                                        )}
                                </div>

                                {/* Add Charge Form */}
                                {isAddingCharge && (
                                    <div className="bg-slate-50 p-6 rounded-xl mb-6 border border-slate-200 animate-fade-in">
                                        <h4 className="text-sm font-semibold text-slate-900 mb-4">
                                            Nuevo Cargo
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <Select
                                                    label="Servicio"
                                                    value={chargeForm.service}
                                                    onChange={(value) => {
                                                        // 1. Obtener precio y configuración pre-definida
                                                        const serviceId =
                                                            parseInt(value);

                                                        // Buscar si hay precio personalizado para este cliente
                                                        const customPrice =
                                                            clientPrices.find(
                                                                (cp) =>
                                                                    parseInt(
                                                                        cp.service
                                                                    ) ===
                                                                        serviceId ||
                                                                    parseInt(
                                                                        cp.service_id
                                                                    ) ===
                                                                        serviceId
                                                            );

                                                        // Buscar el servicio en el catálogo general
                                                        const service =
                                                            services.find(
                                                                (s) =>
                                                                    parseInt(
                                                                        s.id
                                                                    ) ===
                                                                    serviceId
                                                            );

                                                        // Determinar Precio Base
                                                        let unitPrice = 0;
                                                        if (customPrice) {
                                                            unitPrice =
                                                                parseFloat(
                                                                    customPrice.custom_price
                                                                );
                                                        } else if (service) {
                                                            unitPrice =
                                                                parseFloat(
                                                                    service.default_price
                                                                );
                                                        }

                                                        // Determinar Tratamiento Fiscal (Prioridad: Personalizado > General)
                                                        let defaultIvaType =
                                                            "gravado";

                                                        if (
                                                            customPrice &&
                                                            customPrice.iva_type
                                                        ) {
                                                            defaultIvaType =
                                                                customPrice.iva_type;
                                                        } else if (service) {
                                                            // Lógica robusta: Si applies_iva es false, forzar no_sujeto a menos que el tipo sea explícitamente otro
                                                            if (
                                                                service.applies_iva ===
                                                                false
                                                            ) {
                                                                defaultIvaType =
                                                                    service.iva_type &&
                                                                    service.iva_type !==
                                                                        "gravado"
                                                                        ? service.iva_type
                                                                        : "no_sujeto";
                                                            } else {
                                                                defaultIvaType =
                                                                    service.iva_type ||
                                                                    "gravado";
                                                            }
                                                        }

                                                        setChargeForm({
                                                            ...chargeForm,
                                                            service: value,
                                                            unit_price:
                                                                unitPrice,
                                                            iva_type:
                                                                defaultIvaType,
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
                                                            <span className="text-slate-500">
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
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        // Solo permitir enteros positivos
                                                        if (val === '' || (/^\d+$/.test(val) && parseInt(val) > 0)) {
                                                            setChargeForm({
                                                                ...chargeForm,
                                                                quantity: val,
                                                            });
                                                        }
                                                    }}
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
                                                    <span className="absolute left-3 top-2 text-slate-500">
                                                        $
                                                    </span>
                                                    <Input
                                                        className="pl-7"
                                                        type="number"
                                                        step="0.01"
                                                        min="0.01"
                                                        value={
                                                            chargeForm.unit_price
                                                        }
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === '' || parseFloat(val) >= 0) {
                                                                setChargeForm({
                                                                    ...chargeForm,
                                                                    unit_price: val,
                                                                })
                                                            }
                                                        }}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <Label className="mb-2 block">
                                                    Descuento (%)
                                                </Label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={chargeForm.discount}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (
                                                            val === "" ||
                                                            (parseFloat(val) >= 0 && parseFloat(val) <= 100)
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

                                        {/* Selector de Tipo de IVA */}
                                        <div className="mb-4">
                                            <Label className="mb-2 block">
                                                Tratamiento Fiscal
                                            </Label>
                                            <SelectERP
                                                options={[
                                                    {
                                                        id: "gravado",
                                                        name: "Gravado (13% IVA)",
                                                    },
                                                    {
                                                        id: "exento",
                                                        name: "Exento",
                                                    },
                                                    {
                                                        id: "no_sujeto",
                                                        name: "No Sujeto",
                                                    },
                                                ]}
                                                value={chargeForm.iva_type}
                                                onChange={(value) =>
                                                    setChargeForm({
                                                        ...chargeForm,
                                                        iva_type: value,
                                                    })
                                                }
                                                getOptionLabel={(opt) =>
                                                    opt.name
                                                }
                                                getOptionValue={(opt) => opt.id}
                                            />
                                            <p className="text-xs text-slate-500 mt-1">
                                                {chargeForm.iva_type ===
                                                "gravado"
                                                    ? "Se aplicará IVA del 13% sobre el precio"
                                                    : "No se aplicará IVA (fuera del ámbito de aplicación)"}
                                            </p>
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
                                                className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                onClick={handleAddCharge}
                                                className="bg-slate-900 hover:bg-slate-800 text-white"
                                            >
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
                                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            Tipo IVA
                                                        </th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                                                            IVA
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                                            Total
                                                        </th>
                                                        {order.status !==
                                                            "cerrada" && (
                                                            <th className="px-3 py-2.5 w-10"></th>
                                                        )}
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-slate-100">
                                                    {charges.map((charge) => {
                                                        const isBilled =
                                                            charge.invoice_id ||
                                                            charge.invoice_number;
                                                        return (
                                                            <tr
                                                                key={charge.id}
                                                                className={`transition-colors duration-75 ${
                                                                    isBilled
                                                                        ? "bg-slate-100 opacity-60"
                                                                        : "hover:bg-slate-50/70"
                                                                }`}
                                                            >
                                                                <td className="px-3 py-2.5">
                                                                    <div className="flex items-center gap-2">
                                                                        <div
                                                                            className={`text-sm font-medium ${
                                                                                isBilled
                                                                                    ? "text-slate-500"
                                                                                    : "text-slate-900"
                                                                            }`}
                                                                        >
                                                                            {charge.service_code
                                                                                ? `${charge.service_code} - `
                                                                                : ""}
                                                                            {
                                                                                charge.service_name
                                                                            }
                                                                        </div>
                                                                        {isBilled && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] px-1.5 py-0 bg-slate-200 text-slate-600 border-slate-300"
                                                                            >
                                                                                <FileCheck className="h-3 w-3 mr-0.5" />
                                                                                {charge.invoice_number ||
                                                                                    "Facturado"}
                                                                            </Badge>
                                                                        )}
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
                                                                {/* Cantidad */}
                                                                <td className="px-3 py-2.5 text-right text-sm">
                                                                    {editingChargeId ===
                                                                    charge.id ? (
                                                                        <Input
                                                                            type="number"
                                                                            min="1"
                                                                            step="1"
                                                                            value={
                                                                                editChargeForm.quantity
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const val = e.target.value;
                                                                                if (val === '' || (/^\d+$/.test(val) && parseInt(val) > 0)) {
                                                                                    setEditChargeForm(
                                                                                        {
                                                                                            ...editChargeForm,
                                                                                            quantity: val,
                                                                                        }
                                                                                    )
                                                                                }
                                                                            }}
                                                                            className="w-16 h-7 text-sm text-right"
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className={
                                                                                isBilled
                                                                                    ? "text-slate-500"
                                                                                    : "text-slate-700"
                                                                            }
                                                                        >
                                                                            {
                                                                                charge.quantity
                                                                            }
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Precio */}
                                                                <td className="px-3 py-2.5 text-right text-sm">
                                                                    {editingChargeId ===
                                                                    charge.id ? (
                                                                        <Input
                                                                            type="number"
                                                                            step="0.01"
                                                                            min="0.01"
                                                                            value={
                                                                                editChargeForm.unit_price
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const val = e.target.value;
                                                                                if (val === '' || parseFloat(val) >= 0) {
                                                                                    setEditChargeForm(
                                                                                        {
                                                                                            ...editChargeForm,
                                                                                            unit_price: val,
                                                                                        }
                                                                                    )
                                                                                }
                                                                            }}
                                                                            className="w-24 h-7 text-sm text-right"
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className={
                                                                                isBilled
                                                                                    ? "text-slate-500"
                                                                                    : "text-slate-700"
                                                                            }
                                                                        >
                                                                            {formatCurrency(
                                                                                charge.unit_price
                                                                            )}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Descuento */}
                                                                <td className="px-3 py-2.5 text-right text-sm">
                                                                    {editingChargeId ===
                                                                    charge.id ? (
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max="100"
                                                                            step="0.01"
                                                                            value={
                                                                                editChargeForm.discount
                                                                            }
                                                                            onChange={(
                                                                                e
                                                                            ) => {
                                                                                const val = e.target.value;
                                                                                if (
                                                                                    val === "" ||
                                                                                    (parseFloat(val) >= 0 && parseFloat(val) <= 100)
                                                                                ) {
                                                                                    setEditChargeForm(
                                                                                        {
                                                                                            ...editChargeForm,
                                                                                            discount: val,
                                                                                        }
                                                                                    )
                                                                                }
                                                                            }}
                                                                            className="w-16 h-7 text-sm text-right"
                                                                        />
                                                                    ) : (
                                                                        <span
                                                                            className={
                                                                                isBilled
                                                                                    ? "text-slate-500"
                                                                                    : "text-slate-700"
                                                                            }
                                                                        >
                                                                            {charge.discount >
                                                                            0
                                                                                ? `${charge.discount}%`
                                                                                : "-"}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Tipo IVA */}
                                                                <td className="px-3 py-2.5 text-center">
                                                                    {editingChargeId ===
                                                                    charge.id ? (
                                                                        <SelectERP
                                                                            options={[
                                                                                {
                                                                                    id: "gravado",
                                                                                    name: "Gravado 13%",
                                                                                },
                                                                                {
                                                                                    id: "no_sujeto",
                                                                                    name: "No Sujeto",
                                                                                },
                                                                            ]}
                                                                            value={
                                                                                editChargeForm.iva_type
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                setEditChargeForm(
                                                                                    {
                                                                                        ...editChargeForm,
                                                                                        iva_type:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                            getOptionLabel={(
                                                                                opt
                                                                            ) =>
                                                                                opt.name
                                                                            }
                                                                            getOptionValue={(
                                                                                opt
                                                                            ) =>
                                                                                opt.id
                                                                            }
                                                                            className="w-32"
                                                                        />
                                                                    ) : (
                                                                        <Badge
                                                                            variant="outline"
                                                                            className={`text-[10px] px-1.5 py-0.5 font-medium ${
                                                                                charge.iva_type ===
                                                                                "gravado"
                                                                                    ? "bg-slate-100 text-slate-700 border-slate-300"
                                                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                                                            }`}
                                                                        >
                                                                            {charge.iva_type ===
                                                                            "gravado"
                                                                                ? "Gravado 13%"
                                                                                : "No Sujeto"}
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={`px-3 py-2.5 text-center text-sm tabular-nums ${
                                                                        isBilled
                                                                            ? "text-slate-500"
                                                                            : "text-slate-700"
                                                                    }`}
                                                                >
                                                                    {parseFloat(
                                                                        charge.iva_amount
                                                                    ) > 0 ? (
                                                                        formatCurrency(
                                                                            charge.iva_amount
                                                                        )
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td
                                                                    className={`px-3 py-2.5 text-right text-sm font-semibold tabular-nums ${
                                                                        isBilled
                                                                            ? "text-slate-500"
                                                                            : "text-slate-900"
                                                                    }`}
                                                                >
                                                                    {formatCurrency(
                                                                        charge.total
                                                                    )}
                                                                </td>
                                                                {order.status !==
                                                                    "cerrada" && (
                                                                    <td className="px-3 py-2.5 text-center">
                                                                        {!isBilled ? (
                                                                            editingChargeId ===
                                                                            charge.id ? (
                                                                                <div className="flex gap-1 justify-center">
                                                                                    <button
                                                                                        onClick={
                                                                                            handleSaveEditCharge
                                                                                        }
                                                                                        className="text-slate-400 hover:text-success-600 transition-colors p-1 rounded hover:bg-success-50"
                                                                                        title="Guardar"
                                                                                    >
                                                                                        <Check className="h-4 w-4" />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={
                                                                                            handleCancelEditCharge
                                                                                        }
                                                                                        className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded hover:bg-slate-100"
                                                                                        title="Cancelar"
                                                                                    >
                                                                                        <Plus className="h-4 w-4 rotate-45" />
                                                                                    </button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex gap-1 justify-center">
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleEditCharge(
                                                                                                charge
                                                                                            )
                                                                                        }
                                                                                        className="text-slate-400 hover:text-slate-900 transition-colors p-1 rounded hover:bg-slate-100"
                                                                                        title="Editar"
                                                                                    >
                                                                                        <Edit className="h-4 w-4" />
                                                                                    </button>
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
                                                                                </div>
                                                                            )
                                                                        ) : (
                                                                            <span
                                                                                className="text-slate-300 text-xs"
                                                                                title="No se puede eliminar - Ya facturado"
                                                                            >
                                                                                -
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-slate-50 border-t-2 border-slate-300">
                                                    {(() => {
                                                        // Calcular subtotales y retención
                                                        const subtotal =
                                                            charges.reduce(
                                                                (sum, charge) =>
                                                                    sum +
                                                                    parseFloat(
                                                                        charge.amount ||
                                                                            0
                                                                    ),
                                                                0
                                                            );
                                                        const iva =
                                                            charges.reduce(
                                                                (sum, charge) =>
                                                                    sum +
                                                                    parseFloat(
                                                                        charge.iva_amount ||
                                                                            0
                                                                    ),
                                                                0
                                                            );
                                                        const totalBruto =
                                                            charges.reduce(
                                                                (sum, charge) =>
                                                                    sum +
                                                                    parseFloat(
                                                                        charge.total ||
                                                                            0
                                                                    ),
                                                                0
                                                            );

                                                        // Base gravada: solo items con iva_type === 'gravado'
                                                        const baseGravada =
                                                            charges
                                                                .filter(
                                                                    (charge) =>
                                                                        charge.iva_type === "gravado"
                                                                )
                                                                .reduce(
                                                                    (sum, charge) =>
                                                                        sum +
                                                                        parseFloat(
                                                                            charge.amount ||
                                                                                0
                                                                        ),
                                                                    0
                                                                );

                                                        const RETENCION_THRESHOLD = 100.0;
                                                        const RETENCION_RATE = 0.01;
                                                        const isGranContribuyente =
                                                            order.client_is_gran_contribuyente ||
                                                            false;

                                                        // Retención se aplica SOLO sobre la base gravada, no sobre montos no sujetos/exentos
                                                        let retencion = 0;
                                                        if (
                                                            isGranContribuyente &&
                                                            baseGravada >
                                                                RETENCION_THRESHOLD
                                                        ) {
                                                            retencion =
                                                                baseGravada *
                                                                RETENCION_RATE;
                                                        }

                                                        const totalNeto =
                                                            totalBruto -
                                                            retencion;

                                                        return (
                                                            <>
                                                                <tr>
                                                                    <td
                                                                        colSpan={
                                                                            6
                                                                        }
                                                                        className="px-3 py-2 text-right text-xs font-medium text-slate-600"
                                                                    >
                                                                        Subtotal
                                                                        (sin
                                                                        IVA):
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-sm tabular-nums font-medium text-slate-700">
                                                                        {formatCurrency(
                                                                            subtotal
                                                                        )}
                                                                    </td>
                                                                    {order.status !==
                                                                        "cerrada" && (
                                                                        <td></td>
                                                                    )}
                                                                </tr>
                                                                <tr>
                                                                    <td
                                                                        colSpan={
                                                                            6
                                                                        }
                                                                        className="px-3 py-2 text-right text-xs font-medium text-slate-600"
                                                                    >
                                                                        IVA
                                                                        (13%):
                                                                    </td>
                                                                    <td className="px-3 py-2 text-right text-sm tabular-nums font-medium text-slate-700">
                                                                        {formatCurrency(
                                                                            iva
                                                                        )}
                                                                    </td>
                                                                    {order.status !==
                                                                        "cerrada" && (
                                                                        <td></td>
                                                                    )}
                                                                </tr>
                                                                <tr className="border-t border-slate-200">
                                                                    <td
                                                                        colSpan={
                                                                            6
                                                                        }
                                                                        className="px-3 py-2.5 text-right text-xs font-semibold text-slate-700"
                                                                    >
                                                                        Total
                                                                        Bruto:
                                                                    </td>
                                                                    <td className="px-3 py-2.5 text-right font-semibold text-slate-900 text-base tabular-nums">
                                                                        {formatCurrency(
                                                                            totalBruto
                                                                        )}
                                                                    </td>
                                                                    {order.status !==
                                                                        "cerrada" && (
                                                                        <td></td>
                                                                    )}
                                                                </tr>
                                                                {retencion >
                                                                    0 && (
                                                                    <>
                                                                        <tr className="border-t border-slate-200">
                                                                            <td
                                                                                colSpan={
                                                                                    6
                                                                                }
                                                                                className="px-3 py-2 text-right text-xs font-medium text-slate-600"
                                                                            >
                                                                                <div className="flex items-center justify-end gap-1">
                                                                                    <AlertCircle className="w-3 h-3" />
                                                                                    <span>
                                                                                        Retención
                                                                                        1%:
                                                                                    </span>
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right text-sm font-medium tabular-nums text-slate-700">
                                                                                -{" "}
                                                                                {formatCurrency(
                                                                                    retencion
                                                                                )}
                                                                            </td>
                                                                            {order.status !==
                                                                                "cerrada" && (
                                                                                <td></td>
                                                                            )}
                                                                        </tr>
                                                                        <tr className="border-t-2 border-slate-400 bg-slate-100">
                                                                            <td
                                                                                colSpan={
                                                                                    6
                                                                                }
                                                                                className="px-3 py-2.5 text-right text-sm font-bold text-slate-800"
                                                                            >
                                                                                TOTAL
                                                                                NETO
                                                                                A
                                                                                PAGAR:
                                                                            </td>
                                                                            <td className="px-3 py-2.5 text-right font-bold text-slate-900 text-base tabular-nums">
                                                                                {formatCurrency(
                                                                                    totalNeto
                                                                                )}
                                                                            </td>
                                                                            {order.status !==
                                                                                "cerrada" && (
                                                                                <td></td>
                                                                            )}
                                                                        </tr>
                                                                    </>
                                                                )}
                                                                {retencion ===
                                                                    0 && (
                                                                    <tr className="border-t-2 border-slate-400 bg-slate-100">
                                                                        <td
                                                                            colSpan={
                                                                                6
                                                                            }
                                                                            className="px-3 py-2.5 text-right text-sm font-bold text-slate-800"
                                                                        >
                                                                            TOTAL
                                                                            A
                                                                            PAGAR:
                                                                        </td>
                                                                        <td className="px-3 py-2.5 text-right font-bold text-slate-900 text-base tabular-nums">
                                                                            {formatCurrency(
                                                                                totalBruto
                                                                            )}
                                                                        </td>
                                                                        {order.status !==
                                                                            "cerrada" && (
                                                                            <td></td>
                                                                        )}
                                                                    </tr>
                                                                )}
                                                            </>
                                                        );
                                                    })()}
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Calculadora de Gastos - Integrada en la misma pestaña */}
                        <ExpenseCalculatorTab
                            orderId={orderId}
                            orderStatus={order.status}
                            onUpdate={() => {
                                fetchOrderDetail();
                                if (onUpdate) onUpdate();
                            }}
                        />
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
                        orderNumber={order?.order_number}
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
