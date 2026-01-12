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
    Package,
    Receipt,
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
import CostsTab from "./CostsTab";
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
    const [, setProviders] = useState([]); // catálogos no usados directamente
    const [clientPrices, setClientPrices] = useState([]);
    const [providerInvoices, setProviderInvoices] = useState([]); // Costos directos disponibles

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
        is_third_party_service: false, // Servicio tercerizado
        provider_invoice_id: "", // Factura de proveedor asociada
        // Campos para cálculo de margen en servicios tercerizados
        cost_amount: "", // Monto del costo base
        margin_percentage: "",
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
    const [, setExpenses] = useState([]); // se mantiene para compatibilidad

    // Confirm Dialog
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        id: null,
    });

    // Confirm Close Dialog
    const [confirmCloseDialog, setConfirmCloseDialog] = useState({
        open: false,
        newStatus: null,
    });

    const STATUS_OPTIONS = [
        { id: "pendiente", name: "Pendiente" },
        { id: "en_transito", name: "En Tránsito" },
        { id: "en_puerto", name: "En Puerto" },
        { id: "en_almacen", name: "En Almacenadora" },
        { id: "finalizada", name: "Finalizada" },
        { id: "cerrada", name: "Cerrada" },
    ];

    const handleStatusChange = async (newStatus) => {
        // Si se está cerrando la orden, mostrar confirmación
        if (newStatus === "cerrada" && order.status !== "cerrada") {
            setConfirmCloseDialog({ open: true, newStatus });
            return;
        }

        // Proceder con el cambio de estado normal
        await executeStatusChange(newStatus);
    };

    const executeStatusChange = async (newStatus) => {
        try {
            // Optimistic update
            setOrder({ ...order, status: newStatus });

            await api.patch(`/orders/service-orders/${orderId}/`, {
                status: newStatus,
            });

            toast.success(
                `Estado actualizado a: ${
                    STATUS_OPTIONS.find((s) => s.id === newStatus)?.name
                }`
            );
            if (onUpdate) onUpdate();
        } catch {
            // El interceptor ya maneja el error
            fetchOrderDetail(false); // Revert on error
        }
    };

    const confirmClose = async () => {
        await executeStatusChange(confirmCloseDialog.newStatus);
        setConfirmCloseDialog({ open: false, newStatus: null });
    };

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

    useEffect(() => {
        const controller = new AbortController();
        if (orderId) {
            fetchOrderDetail(true, controller.signal);
            fetchServices(controller.signal);
            fetchProviders(controller.signal);
            fetchProviderInvoices(controller.signal);
        }
        return () => controller.abort();
        // fetch* functions are stable enough; omit from deps intentionally
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    // Fetch client prices when order is loaded (and we know the client)
    useEffect(() => {
        const controller = new AbortController();
        if (order?.client) {
            fetchClientPrices(order.client, controller.signal);
        }
        return () => controller.abort();
    }, [order?.client]);

    const fetchServices = async (signal) => {
        try {
            const response = await api.get("/catalogs/services/activos/", {
                signal,
            });
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

    const fetchProviderInvoices = async (signal) => {
        try {
            const response = await api.get(
                `/transfers/provider-invoices/by_service_order/?service_order=${orderId}`,
                { signal }
            );
            setProviderInvoices(response.data || []);
        } catch (error) {
            if (!axios.isCancel(error)) {
                // Silencioso - facturas de proveedor son opcionales
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

        // Validar que si es tercerizado, debe tener factura asociada
        if (
            chargeForm.is_third_party_service &&
            !chargeForm.provider_invoice_id
        ) {
            toast.error(
                "Seleccione una factura de proveedor para el servicio tercerizado"
            );
            return;
        }

        // Validaciones específicas para servicios tercerizados
        if (chargeForm.is_third_party_service) {
            const costAmount = parseFloat(chargeForm.cost_amount);
            const quantity = parseInt(chargeForm.quantity) || 1;
            const marginPercent = parseFloat(chargeForm.margin_percentage);

            if (!costAmount || costAmount <= 0) {
                toast.error("Ingrese el costo base del servicio tercerizado");
                return;
            }

            if (
                marginPercent === null ||
                marginPercent === undefined ||
                marginPercent === ""
            ) {
                toast.error("Ingrese el porcentaje de margen");
                return;
            }

            // Validar que el costo total no exceda el disponible
            const selectedInvoice = providerInvoices.find(
                (inv) => inv.id === chargeForm.provider_invoice_id
            );
            const totalCost = costAmount * quantity;

            if (
                selectedInvoice &&
                totalCost > parseFloat(selectedInvoice.unallocated_amount)
            ) {
                toast.error(
                    `El costo total (${formatCurrency(
                        totalCost
                    )}) excede el monto disponible de la factura (${formatCurrency(
                        selectedInvoice.unallocated_amount
                    )})`
                );
                return;
            }

            // Calcular precio de venta automáticamente
            const calculatedUnitPrice = costAmount * (1 + marginPercent / 100);
            chargeForm.unit_price = calculatedUnitPrice.toFixed(2);
        }

        try {
            const payload = {
                ...chargeForm,
                discount: parseFloat(chargeForm.discount || 0),
                is_third_party_service: chargeForm.is_third_party_service,
            };

            // Agregar el cargo
            const response = await api.post(
                `/orders/service-orders/${orderId}/add_charge/`,
                payload
            );

            // Si es tercerizado y hay factura, crear la asignacion de costo
            if (
                chargeForm.is_third_party_service &&
                chargeForm.provider_invoice_id &&
                response.data?.charge_id
            ) {
                try {
                    const allocResponse = await api.post(
                        `/transfers/provider-invoices/${chargeForm.provider_invoice_id}/allocate_cost/`,
                        {
                            order_charge_id: response.data.charge_id,
                            cost_amount:
                                parseFloat(chargeForm.cost_amount) *
                                parseInt(chargeForm.quantity || 1),
                            description: `Costo tercerizado - ${
                                chargeForm.notes || ""
                            }`.trim(),
                        }
                    );

                    // Mostrar warning si existe
                    if (allocResponse.data?.warning) {
                        toast(allocResponse.data.warning, {
                            id: "warning-margin",
                            icon: "⚠️",
                            duration: 5000,
                            style: {
                                background: "#fef3c7",
                                color: "#92400e",
                                border: "1px solid #fbbf24",
                            },
                        });
                    }
                } catch (allocError) {
                    // Si falla la asignacion, al menos el cargo se creo
                    console.warn(
                        "No se pudo vincular automaticamente al costo directo:",
                        allocError
                    );
                }
            }

            toast.success("Cargo agregado exitosamente", { id: "success-add" });
            fetchOrderDetail(false);
            fetchProviderInvoices(); // Refrescar facturas
            setIsAddingCharge(false);
            resetChargeForm();
        } catch {
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
            toast.success("Cargo eliminado exitosamente", { id: "success-delete" });
            fetchOrderDetail(false);
            fetchProviderInvoices(); // Refrescar facturas disponibles
            if (onUpdate) onUpdate(); // Update parent list totals
        } catch {
            // El interceptor ya maneja el error
        }
    };

    const resetChargeForm = () => {
        setChargeForm({
            service: "",
            quantity: 1,
            unit_price: "",
            cost_amount: "",
            margin_percentage: "",
            discount: "",
            notes: "",
            iva_type:
                order?.client_type === "internacional"
                    ? "no_sujeto"
                    : "gravado",
            is_third_party_service: false,
            provider_invoice_id: "",
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
            await api.patch(
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

            toast.success("Servicio actualizado correctamente", { id: "success-update" });
            setEditingChargeId(null);
            fetchOrderDetail(false); // Refresh sin loader
        } catch {
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

    const tabs = [
        { id: "info", name: "Info General", icon: FileText },
        { id: "charges", name: "Servicios", icon: DollarSign },
        { id: "costs", name: "Costos de la Orden", icon: Truck },
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
                    {order.purchase_order && (
                        <div className="text-sm text-slate-500 font-medium mt-0.5">
                            PO: {order.purchase_order}
                        </div>
                    )}
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
                        <div className="text-sm text-slate-500 md:mb-1">
                            Total
                        </div>
                        <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {formatCurrency(order.total_amount || 0)}
                        </div>
                    </div>
                    {onEdit &&
                        [
                            "pendiente",
                            "en_transito",
                            "en_puerto",
                            "en_almacen",
                            "finalizada",
                        ].includes(order.status) && (
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
                                                Aduana
                                            </dt>
                                            <dd className="mt-1 text-base text-slate-700">
                                                {order.customs_name || "—"}
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
                                        {order.notes && (
                                            <div className="pt-3 border-t border-slate-100">
                                                <dt className="text-sm font-medium text-slate-500">
                                                    Concepto / Información Adicional
                                                </dt>
                                                <dd className="mt-1 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3 whitespace-pre-wrap">
                                                    {order.notes}
                                                </dd>
                                            </div>
                                        )}
                                    </dl>
                                </div>
                            </div>

                            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-100">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4">
                                    <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                                        Resumen Financiero
                                    </h3>
                                    {/* Toggle Neto / Con IVA - Responsive */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-100 rounded-lg p-1 w-full sm:w-auto">
                                        <button
                                            onClick={() =>
                                                setShowWithIva(false)
                                            }
                                            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                                !showWithIva
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            Neto
                                        </button>
                                        <button
                                            onClick={() => setShowWithIva(true)}
                                            className={`flex-1 sm:flex-none px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                                                showWithIva
                                                    ? "bg-white text-slate-900 shadow-sm"
                                                    : "text-slate-600 hover:text-slate-900"
                                            }`}
                                        >
                                            Con IVA
                                        </button>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Servicios{" "}
                                            {showWithIva
                                                ? "(con IVA)"
                                                : "(Neto)"}
                                        </div>
                                        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 sm:mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                showWithIva
                                                    ? order.fiscal_summary
                                                          ?.services
                                                          ?.total_con_iva ??
                                                          order.total_services ??
                                                          0
                                                    : order.fiscal_summary
                                                          ?.services
                                                          ?.subtotal_neto ??
                                                          order.total_services ??
                                                          0
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-white p-3 sm:p-4 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                                        <div className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Costos de la Orden{" "}
                                            {showWithIva
                                                ? "(con IVA)"
                                                : "(Neto)"}
                                        </div>
                                        <div className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 sm:mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                showWithIva
                                                    ? order.fiscal_summary
                                                          ?.third_party
                                                          ?.total_con_iva ??
                                                          order.total_third_party ??
                                                          0
                                                    : order.fiscal_summary
                                                          ?.third_party
                                                          ?.subtotal_neto ??
                                                          order.total_third_party ??
                                                          0
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 p-3 sm:p-4 rounded-lg sm:rounded-xl border border-slate-800 hover:shadow-md transition-shadow">
                                        <div className="text-[10px] sm:text-xs font-medium text-slate-300 uppercase tracking-wide">
                                            Total a Facturar{" "}
                                            {showWithIva
                                                ? "(con IVA)"
                                                : "(Neto)"}
                                        </div>
                                        <div className="text-xl sm:text-2xl font-bold text-white mt-1 sm:mt-1.5 tabular-nums">
                                            {formatCurrency(
                                                showWithIva
                                                    ? order.fiscal_summary
                                                          ?.consolidated
                                                          ?.total_con_iva ??
                                                          order.total_amount ??
                                                          0
                                                    : order.fiscal_summary
                                                          ?.consolidated
                                                          ?.subtotal_neto ??
                                                          order.total_amount ??
                                                          0
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/* Desglose de IVA cuando se muestra Con IVA */}
                                {showWithIva &&
                                    order.fiscal_summary?.consolidated
                                        ?.iva_total > 0 && (
                                        <div className="mt-2 sm:mt-3 text-right text-xs sm:text-sm text-slate-500">
                                            IVA incluido:{" "}
                                            {formatCurrency(
                                                order.fiscal_summary
                                                    .consolidated.iva_total
                                            )}
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
                                                        // SI ES INTERNACIONAL -> SIEMPRE DEFAULT A NO SUJETO
                                                        let defaultIvaType =
                                                            "gravado";

                                                        if (
                                                            order?.client_type ===
                                                            "internacional"
                                                        ) {
                                                            defaultIvaType =
                                                                "no_sujeto";
                                                        } else if (
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
                                                        const val =
                                                            e.target.value;
                                                        // Solo permitir enteros positivos
                                                        if (
                                                            val === "" ||
                                                            (/^\d+$/.test(
                                                                val
                                                            ) &&
                                                                parseInt(val) >
                                                                    0)
                                                        ) {
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
                                                    {chargeForm.is_third_party_service && (
                                                        <span className="ml-2 text-xs font-normal text-slate-500 italic">
                                                            Calculado
                                                            automáticamente
                                                        </span>
                                                    )}
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
                                                            chargeForm.is_third_party_service
                                                                ? (() => {
                                                                      const cost =
                                                                          parseFloat(
                                                                              chargeForm.cost_amount
                                                                          ) ||
                                                                          0;
                                                                      const margin =
                                                                          parseFloat(
                                                                              chargeForm.margin_percentage
                                                                          ) ||
                                                                          0;
                                                                      return cost >
                                                                          0
                                                                          ? (
                                                                                cost *
                                                                                (1 +
                                                                                    margin /
                                                                                        100)
                                                                            ).toFixed(
                                                                                2
                                                                            )
                                                                          : "";
                                                                  })()
                                                                : chargeForm.unit_price
                                                        }
                                                        onChange={(e) => {
                                                            if (
                                                                !chargeForm.is_third_party_service
                                                            ) {
                                                                const val =
                                                                    e.target
                                                                        .value;
                                                                if (
                                                                    val ===
                                                                        "" ||
                                                                    parseFloat(
                                                                        val
                                                                    ) >= 0
                                                                ) {
                                                                    setChargeForm(
                                                                        {
                                                                            ...chargeForm,
                                                                            unit_price:
                                                                                val,
                                                                        }
                                                                    );
                                                                }
                                                            }
                                                        }}
                                                        disabled={
                                                            chargeForm.is_third_party_service
                                                        }
                                                        required
                                                        placeholder={
                                                            chargeForm.is_third_party_service
                                                                ? "Se calcula con margen"
                                                                : "0.00"
                                                        }
                                                    />
                                                </div>
                                                {chargeForm.is_third_party_service && (
                                                    <p className="text-xs text-slate-500 mt-1">
                                                        Basado en costo + margen
                                                        configurado
                                                    </p>
                                                )}
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
                                                        const val =
                                                            e.target.value;
                                                        if (
                                                            val === "" ||
                                                            (parseFloat(val) >=
                                                                0 &&
                                                                parseFloat(
                                                                    val
                                                                ) <= 100)
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

                                        {/* Checkbox Servicio Tercerizado */}
                                        <div className="mb-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    id="is_third_party_service"
                                                    checked={
                                                        chargeForm.is_third_party_service
                                                    }
                                                    onChange={(e) =>
                                                        setChargeForm({
                                                            ...chargeForm,
                                                            is_third_party_service:
                                                                e.target
                                                                    .checked,
                                                            provider_invoice_id:
                                                                e.target.checked
                                                                    ? chargeForm.provider_invoice_id
                                                                    : "",
                                                            cost_amount: "",
                                                            margin_percentage:
                                                                "",
                                                            unit_price: e.target
                                                                .checked
                                                                ? ""
                                                                : chargeForm.unit_price,
                                                        })
                                                    }
                                                    className="w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-500"
                                                />
                                                <div>
                                                    <Label
                                                        htmlFor="is_third_party_service"
                                                        className="font-medium text-slate-800 cursor-pointer"
                                                    >
                                                        Servicio Tercerizado
                                                    </Label>
                                                    <p className="text-xs text-slate-500">
                                                        Servicio prestado por
                                                        proveedor externo con
                                                        costo directo
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Selector de Factura de Proveedor + Calculadora de Margen */}
                                            {chargeForm.is_third_party_service &&
                                                (() => {
                                                    const availableInvoices =
                                                        providerInvoices.filter(
                                                            (inv) =>
                                                                parseFloat(
                                                                    inv.unallocated_amount
                                                                ) > 0
                                                        );

                                                    // Obtener factura seleccionada
                                                    const selectedInvoice =
                                                        availableInvoices.find(
                                                            (inv) =>
                                                                inv.id ===
                                                                chargeForm.provider_invoice_id
                                                        );

                                                    // Cálculos automáticos
                                                    const costAmount =
                                                        parseFloat(
                                                            chargeForm.cost_amount
                                                        ) || 0;
                                                    const marginPercent =
                                                        parseFloat(
                                                            chargeForm.margin_percentage
                                                        ) || 0;
                                                    const calculatedPrice =
                                                        costAmount > 0
                                                            ? costAmount *
                                                              (1 +
                                                                  marginPercent /
                                                                      100)
                                                            : 0;
                                                    const quantity =
                                                        parseInt(
                                                            chargeForm.quantity
                                                        ) || 1;
                                                    const subtotal =
                                                        calculatedPrice *
                                                        quantity;
                                                    const ivaAmount =
                                                        chargeForm.iva_type ===
                                                        "gravado"
                                                            ? subtotal * 0.13
                                                            : 0;
                                                    const totalWithIva =
                                                        subtotal + ivaAmount;
                                                    const profit =
                                                        subtotal -
                                                        costAmount * quantity;

                                                    return (
                                                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                                                            {/* Selector de Factura */}
                                                            <div>
                                                                <Label className="mb-2 block text-sm font-medium text-slate-700">
                                                                    Factura de
                                                                    Proveedor
                                                                    (Costo
                                                                    Directo){" "}
                                                                    <span className="text-red-600">
                                                                        *
                                                                    </span>
                                                                </Label>
                                                                {availableInvoices.length >
                                                                0 ? (
                                                                    <Select
                                                                        value={
                                                                            chargeForm.provider_invoice_id
                                                                        }
                                                                        onChange={(
                                                                            value
                                                                        ) => {
                                                                            const invoice =
                                                                                availableInvoices.find(
                                                                                    (
                                                                                        inv
                                                                                    ) =>
                                                                                        inv.id ===
                                                                                        value
                                                                                );
                                                                            setChargeForm(
                                                                                {
                                                                                    ...chargeForm,
                                                                                    provider_invoice_id:
                                                                                        value,
                                                                                    // Sugerir el monto disponible como costo inicial
                                                                                    cost_amount:
                                                                                        invoice
                                                                                            ? invoice.unallocated_amount
                                                                                            : "",
                                                                                }
                                                                            );
                                                                        }}
                                                                        options={
                                                                            availableInvoices
                                                                        }
                                                                        getOptionLabel={(
                                                                            opt
                                                                        ) =>
                                                                            `${
                                                                                opt.invoice_number
                                                                            } - ${
                                                                                opt.provider_name
                                                                            } ${opt.notes ? `(${opt.notes}) ` : ''}(Disp: ${formatCurrency(
                                                                                opt.unallocated_amount
                                                                            )})`
                                                                        }
                                                                        getOptionValue={(
                                                                            opt
                                                                        ) =>
                                                                            opt.id
                                                                        }
                                                                        placeholder="Seleccione factura..."
                                                                    />
                                                                ) : (
                                                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                                                                        <p className="text-sm text-slate-600">
                                                                            Sin
                                                                            facturas
                                                                            disponibles
                                                                        </p>
                                                                        <p className="text-xs text-slate-500 mt-1">
                                                                            Registre
                                                                            un
                                                                            costo
                                                                            directo
                                                                            en
                                                                            la
                                                                            pestaña
                                                                            "Costos
                                                                            de
                                                                            la
                                                                            Orden".
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Calculadora de Margen */}
                                                            {chargeForm.provider_invoice_id && (
                                                                <div className="space-y-3 bg-white rounded-lg p-4 border border-slate-200">
                                                                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                                                                        <DollarSign className="w-4 h-4 text-slate-600" />
                                                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                                                            Calculadora
                                                                            de
                                                                            Margen
                                                                        </span>
                                                                    </div>

                                                                    {/* Monto de Costo y Precio de Venta */}
                                                                    <div className="grid grid-cols-2 gap-3">
                                                                        <div>
                                                                            <Label className="mb-1.5 block text-xs">
                                                                                Costo Base (Unitario)
                                                                            </Label>
                                                                            <div className="relative">
                                                                                <span className="absolute left-3 top-2 text-slate-500 text-sm">
                                                                                    $
                                                                                </span>
                                                                                <Input
                                                                                    className="pl-7"
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0.01"
                                                                                    max={
                                                                                        selectedInvoice?.unallocated_amount
                                                                                    }
                                                                                    value={
                                                                                        chargeForm.cost_amount
                                                                                    }
                                                                                    onChange={(
                                                                                        e
                                                                                    ) => {
                                                                                        const val =
                                                                                            e
                                                                                                .target
                                                                                                .value;
                                                                                        const cost = parseFloat(val);
                                                                                        const price = parseFloat(chargeForm.unit_price);
                                                                                        let margin = chargeForm.margin_percentage;

                                                                                                                                                if (!isNaN(cost) && cost > 0 && !isNaN(price)) {
                                                                                                                                                    margin = parseFloat((((price / cost) - 1) * 100).toFixed(4));
                                                                                                                                                }
                                                                                        
                                                                                                                                                if (
                                                                                                                                                    val ===                                                                                                "" ||
                                                                                            parseFloat(
                                                                                                val
                                                                                            ) >=
                                                                                                0
                                                                                        ) {
                                                                                            setChargeForm(
                                                                                                {
                                                                                                    ...chargeForm,
                                                                                                    cost_amount:
                                                                                                        val,
                                                                                                    margin_percentage: margin
                                                                                                }
                                                                                            );
                                                                                        }
                                                                                    }}
                                                                                    placeholder="0.00"
                                                                                    required
                                                                                />
                                                                            </div>
                                                                            {selectedInvoice && (
                                                                                <p className="text-xs text-slate-500 mt-1">
                                                                                    Disponible:{" "}
                                                                                    {formatCurrency(
                                                                                        selectedInvoice.unallocated_amount
                                                                                    )}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                        <div>
                                                                            <Label className="mb-1.5 block text-xs">
                                                                                Precio Venta (Unitario)
                                                                            </Label>
                                                                            <div className="relative">
                                                                                <span className="absolute left-3 top-2 text-slate-500 text-sm">$</span>
                                                                                <Input
                                                                                    className="pl-7"
                                                                                    type="number"
                                                                                    step="0.01"
                                                                                    min="0"
                                                                                    value={chargeForm.unit_price}
                                                                                    onChange={(e) => {
                                                                                        const val = e.target.value;
                                                                                        const price = parseFloat(val);
                                                                                        const cost = parseFloat(chargeForm.cost_amount);
                                                                                        let margin = 0;

                                                                                        if (!isNaN(price) && !isNaN(cost) && cost > 0) {
                                                                                            margin = parseFloat((((price / cost) - 1) * 100).toFixed(4));
                                                                                        }

                                                                                        setChargeForm({
                                                                                            ...chargeForm,
                                                                                            unit_price: val,
                                                                                            margin_percentage: margin
                                                                                        });
                                                                                    }}
                                                                                    placeholder="0.00"
                                                                                    required
                                                                                />
                                                                            </div>
                                                                            <p className="text-xs text-slate-500 mt-1">
                                                                                Margen calc: {chargeForm.margin_percentage ? parseFloat(chargeForm.margin_percentage).toFixed(2) : 0}%
                                                                            </p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Vista Previa de Cálculos */}
                                                                    {costAmount >
                                                                        0 && (
                                                                        <div className="pt-3 border-t border-slate-200 space-y-2">
                                                                            <div className="flex justify-between items-center text-sm">
                                                                                <span className="text-slate-600">
                                                                                    Precio
                                                                                    Venta
                                                                                    Unitario
                                                                                    (sin
                                                                                    IVA):
                                                                                </span>
                                                                                <span className="font-bold text-slate-900 tabular-nums">
                                                                                    {formatCurrency(
                                                                                        calculatedPrice
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-sm">
                                                                                <span className="text-slate-600">
                                                                                    Cantidad:
                                                                                </span>
                                                                                <span className="font-semibold text-slate-800 tabular-nums">
                                                                                    x
                                                                                    {
                                                                                        quantity
                                                                                    }
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-200">
                                                                                <span className="text-slate-600">
                                                                                    Subtotal
                                                                                    (sin
                                                                                    IVA):
                                                                                </span>
                                                                                <span className="font-bold text-slate-900 tabular-nums">
                                                                                    {formatCurrency(
                                                                                        subtotal
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            {chargeForm.iva_type ===
                                                                                "gravado" && (
                                                                                <div className="flex justify-between items-center text-xs">
                                                                                    <span className="text-slate-500">
                                                                                        IVA
                                                                                        13%:
                                                                                    </span>
                                                                                    <span className="text-slate-700 tabular-nums">
                                                                                        {formatCurrency(
                                                                                            ivaAmount
                                                                                        )}
                                                                                    </span>
                                                                                </div>
                                                                            )}
                                                                            <div className="flex justify-between items-center text-sm font-bold pt-2 border-t border-slate-200">
                                                                                <span className="text-slate-800">
                                                                                    Total
                                                                                    al
                                                                                    Cliente:
                                                                                </span>
                                                                                <span className="text-lg text-emerald-700 tabular-nums">
                                                                                    {formatCurrency(
                                                                                        totalWithIva
                                                                                    )}
                                                                                </span>
                                                                            </div>
                                                                            <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-200">
                                                                                <span className="text-xs text-slate-600">
                                                                                    Ganancia
                                                                                    Neta:
                                                                                </span>
                                                                                <span
                                                                                    className={`font-bold tabular-nums ${
                                                                                        profit >=
                                                                                        0
                                                                                            ? "text-emerald-700"
                                                                                            : "text-red-600"
                                                                                    }`}
                                                                                >
                                                                                    {formatCurrency(
                                                                                        profit
                                                                                    )}
                                                                                </span>
                                                                            </div>

                                                                            {/* Validaciones visuales */}
                                                                            {costAmount *
                                                                                quantity >
                                                                                (selectedInvoice?.unallocated_amount ||
                                                                                    0) && (
                                                                                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mt-2">
                                                                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                                                                    <p className="text-xs text-red-700">
                                                                                        <strong>
                                                                                            Error:
                                                                                        </strong>{" "}
                                                                                        El
                                                                                        costo
                                                                                        total
                                                                                        (
                                                                                        {formatCurrency(
                                                                                            costAmount *
                                                                                                quantity
                                                                                        )}

                                                                                        )
                                                                                        excede
                                                                                        el
                                                                                        monto
                                                                                        disponible
                                                                                        de
                                                                                        la
                                                                                        factura.
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                            {marginPercent <
                                                                                0 && (
                                                                                <div className="flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg mt-2">
                                                                                    <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                                                                                    <p className="text-xs text-red-700">
                                                                                        <strong>
                                                                                            Advertencia:
                                                                                        </strong>{" "}
                                                                                        Margen
                                                                                        negativo
                                                                                        generará
                                                                                        pérdida.
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div className="pt-2 border-t border-slate-200">
                                                                        <p className="text-xs text-slate-500 italic">
                                                                            El
                                                                            precio
                                                                            de
                                                                            venta
                                                                            se
                                                                            calculará
                                                                            automáticamente
                                                                            al
                                                                            guardar.
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
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
                                                        <th className="px-3 py-2.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider min-w-[200px]">
                                                            Servicio
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">
                                                            Cant.
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            Costo
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            Precio
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            Ganancia
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-20">
                                                            Margen
                                                        </th>
                                                        <th className="px-3 py-2.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            Tipo IVA
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-24">
                                                            IVA
                                                        </th>
                                                        <th className="px-3 py-2.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider w-28">
                                                            Subtotal
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
                                                                    <div className="flex items-center gap-2 flex-wrap">
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
                                                                        {charge.is_third_party_service && (
                                                                            <Badge
                                                                                variant="outline"
                                                                                className="text-[10px] px-1.5 py-0.5 font-medium bg-slate-100 text-slate-600 border-slate-300"
                                                                            >
                                                                                Tercerizado
                                                                            </Badge>
                                                                        )}
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
                                                                                const val =
                                                                                    e
                                                                                        .target
                                                                                        .value;
                                                                                if (
                                                                                    val ===
                                                                                        "" ||
                                                                                    (/^\d+$/.test(
                                                                                        val
                                                                                    ) &&
                                                                                        parseInt(
                                                                                            val
                                                                                        ) >
                                                                                            0)
                                                                                ) {
                                                                                    setEditChargeForm(
                                                                                        {
                                                                                            ...editChargeForm,
                                                                                            quantity:
                                                                                                val,
                                                                                        }
                                                                                    );
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
                                                                {/* Costo */}
                                                                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                                                                    {charge.cost_allocation_info ? (
                                                                        <span
                                                                            className={
                                                                                isBilled
                                                                                    ? "text-slate-500"
                                                                                    : "text-slate-700"
                                                                            }
                                                                        >
                                                                            {formatCurrency(
                                                                                charge
                                                                                    .cost_allocation_info
                                                                                    .cost_amount
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
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
                                                                                const val =
                                                                                    e
                                                                                        .target
                                                                                        .value;
                                                                                if (
                                                                                    val ===
                                                                                        "" ||
                                                                                    parseFloat(
                                                                                        val
                                                                                    ) >=
                                                                                        0
                                                                                ) {
                                                                                    setEditChargeForm(
                                                                                        {
                                                                                            ...editChargeForm,
                                                                                            unit_price:
                                                                                                val,
                                                                                        }
                                                                                    );
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
                                                                {/* Ganancia */}
                                                                <td className="px-3 py-2.5 text-right text-sm tabular-nums">
                                                                    {charge.cost_allocation_info ? (
                                                                        <span
                                                                            className={`font-medium ${
                                                                                charge
                                                                                    .cost_allocation_info
                                                                                    .profit >=
                                                                                0
                                                                                    ? isBilled
                                                                                        ? "text-emerald-600/70"
                                                                                        : "text-emerald-700"
                                                                                    : isBilled
                                                                                    ? "text-red-600/70"
                                                                                    : "text-red-700"
                                                                            }`}
                                                                        >
                                                                            {formatCurrency(
                                                                                charge
                                                                                    .cost_allocation_info
                                                                                    .profit
                                                                            )}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {/* Margen */}
                                                                <td className="px-3 py-2.5 text-right text-xs tabular-nums">
                                                                    {charge.cost_allocation_info ? (
                                                                        editingChargeId ===
                                                                        charge.id ? (
                                                                            <span className="text-slate-600 font-bold bg-slate-100 px-1 py-0.5 rounded">
                                                                                {(() => {
                                                                                    const cost =
                                                                                        parseFloat(
                                                                                            charge
                                                                                                .cost_allocation_info
                                                                                                .cost_amount
                                                                                        ) || 0;
                                                                                    const price =
                                                                                        parseFloat(
                                                                                            editChargeForm.unit_price
                                                                                        ) || 0;
                                                                                    if (
                                                                                        cost >
                                                                                        0
                                                                                    ) {
                                                                                        return (
                                                                                            ((price /
                                                                                                cost) -
                                                                                                1) *
                                                                                            100
                                                                                        ).toFixed(
                                                                                            2
                                                                                        );
                                                                                    }
                                                                                    return "0.00";
                                                                                })()}
                                                                                %
                                                                            </span>
                                                                        ) : (
                                                                            <span
                                                                                className={`${
                                                                                    charge
                                                                                        .cost_allocation_info
                                                                                        .margin_percentage >=
                                                                                    0
                                                                                        ? isBilled
                                                                                            ? "text-slate-500"
                                                                                            : "text-slate-600"
                                                                                        : isBilled
                                                                                        ? "text-red-600/70"
                                                                                        : "text-red-700"
                                                                                }`}
                                                                            >
                                                                                {charge.cost_allocation_info.margin_percentage.toFixed(
                                                                                    2
                                                                                )}
                                                                                %
                                                                            </span>
                                                                        )
                                                                    ) : (
                                                                        <span className="text-slate-300">
                                                                            -
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
                                                                                    id: "exento",
                                                                                    name: "Exento",
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
                                                                                    : charge.iva_type ===
                                                                                      "exento"
                                                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                                    : "bg-slate-50 text-slate-600 border-slate-200"
                                                                            }`}
                                                                        >
                                                                            {charge.iva_type ===
                                                                            "gravado"
                                                                                ? "Gravado 13%"
                                                                                : charge.iva_type ===
                                                                                  "exento"
                                                                                ? "Exento"
                                                                                : "No Sujeto"}
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                {/* IVA */}
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
                                                                {/* Subtotal */}
                                                                <td
                                                                    className={`px-3 py-2.5 text-right text-sm tabular-nums ${
                                                                        isBilled
                                                                            ? "text-slate-500"
                                                                            : "text-slate-700"
                                                                    }`}
                                                                >
                                                                    {formatCurrency(
                                                                        charge.amount
                                                                    )}
                                                                </td>
                                                                {/* Total */}
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
                                                                        charge.iva_type ===
                                                                        "gravado"
                                                                )
                                                                .reduce(
                                                                    (
                                                                        sum,
                                                                        charge
                                                                    ) =>
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
                                                                            9
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
                                                                            9
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
                                                                {retencion >
                                                                    0 && (
                                                                    <>
                                                                        <tr className="border-t border-slate-200">
                                                                            <td
                                                                                colSpan={
                                                                                    9
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
                                                                                    9
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
                                                                                9
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
                            orderStatus={order?.status}
                            clientType={order?.client_type}
                            onUpdate={() => {
                                fetchOrderDetail();
                                if (onUpdate) onUpdate();
                            }}
                        />
                    </div>
                )}

                {/* Costos de la Orden - Unificado */}
                {activeTab === "costs" && (
                    <CostsTab
                        orderId={orderId}
                        isClosed={order?.status === "cerrada"}
                        onUpdate={() => {
                            fetchOrderDetail();
                            fetchProviderInvoices(); // Refrescar facturas disponibles
                            if (onUpdate) onUpdate();
                        }}
                    />
                )}

                {/* Documentos - Vista Unificada */}
                {activeTab === "documents" && (
                    <DocumentsTabUnified
                        orderId={orderId}
                        orderNumber={order?.order_number}
                        isClosed={order?.status === "cerrada"}
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

            {/* Confirm Close Dialog */}
            <ConfirmDialog
                open={confirmCloseDialog.open}
                onClose={() =>
                    setConfirmCloseDialog({ open: false, newStatus: null })
                }
                onConfirm={confirmClose}
                title="¿Cerrar Orden de Servicio?"
                description="Al cerrar la orden, se bloqueará la edición de costos y precios. Solo podrá reabrirse por un administrador."
                confirmText="Cerrar Orden"
                cancelText="Cancelar"
                variant="warning"
            />
        </div>
    );
};

export default ServiceOrderDetail;
