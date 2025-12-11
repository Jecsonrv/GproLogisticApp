import React, { useState, useEffect } from "react";
import {
    Clock,
    User,
    Filter,
    FileText,
    DollarSign,
    AlertCircle,
    CheckCircle,
    XCircle,
    Upload,
    Trash2,
    Edit,
    Play,
    Pause,
    RefreshCw,
} from "lucide-react";
import { EmptyState, Badge } from "./ui";
import axios from "../lib/axios";
import { formatDate, cn } from "../lib/utils";

/**
 * HistoryTab - Vista de historial completo de auditoría
 * Muestra timeline de todos los eventos de la OS
 */
const HistoryTab = ({ orderId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState("all");

    useEffect(() => {
        fetchHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `/orders/history/?service_order=${orderId}`
            );
            setHistory(response.data);
        } catch (error) {
            console.error("Error loading history:", error);
        } finally {
            setLoading(false);
        }
    };

    const getEventConfig = (eventType) => {
        const configs = {
            created: {
                icon: Play,
                label: "OS Creada",
                color: "text-brand-600",
                bgColor: "bg-brand-100",
            },
            updated: {
                icon: Edit,
                label: "OS Actualizada",
                color: "text-blue-600",
                bgColor: "bg-blue-100",
            },
            status_changed: {
                icon: RefreshCw,
                label: "Cambio de Estado",
                color: "text-purple-600",
                bgColor: "bg-purple-100",
            },
            charge_added: {
                icon: DollarSign,
                label: "Cargo Agregado",
                color: "text-green-600",
                bgColor: "bg-green-100",
            },
            charge_deleted: {
                icon: XCircle,
                label: "Cargo Eliminado",
                color: "text-danger-600",
                bgColor: "bg-danger-100",
            },
            payment_added: {
                icon: DollarSign,
                label: "Pago Registrado",
                color: "text-orange-600",
                bgColor: "bg-orange-100",
            },
            payment_updated: {
                icon: Edit,
                label: "Pago Actualizado",
                color: "text-orange-600",
                bgColor: "bg-orange-100",
            },
            payment_approved: {
                icon: CheckCircle,
                label: "Pago Aprobado",
                color: "text-teal-600",
                bgColor: "bg-teal-100",
            },
            payment_paid: {
                icon: CheckCircle,
                label: "Pago Ejecutado",
                color: "text-emerald-600",
                bgColor: "bg-emerald-100",
            },
            payment_deleted: {
                icon: Trash2,
                label: "Pago Eliminado",
                color: "text-danger-600",
                bgColor: "bg-danger-100",
            },
            document_uploaded: {
                icon: Upload,
                label: "Documento Subido",
                color: "text-blue-600",
                bgColor: "bg-blue-100",
            },
            document_deleted: {
                icon: Trash2,
                label: "Documento Eliminado",
                color: "text-danger-600",
                bgColor: "bg-danger-100",
            },
            invoice_generated: {
                icon: FileText,
                label: "Factura Generada",
                color: "text-indigo-600",
                bgColor: "bg-indigo-100",
            },
            invoice_payment: {
                icon: DollarSign,
                label: "Pago de Factura",
                color: "text-green-600",
                bgColor: "bg-green-100",
            },
            closed: {
                icon: Pause,
                label: "OS Cerrada",
                color: "text-slate-600",
                bgColor: "bg-slate-100",
            },
            reopened: {
                icon: RefreshCw,
                label: "OS Reabierta",
                color: "text-warning-600",
                bgColor: "bg-warning-100",
            },
        };
        return (
            configs[eventType] || {
                icon: AlertCircle,
                label: eventType,
                color: "text-slate-600",
                bgColor: "bg-slate-100",
            }
        );
    };

    const formatMetadataKey = (key) => {
        const translations = {
            order_number: "Número de Orden",
            duca: "DUCA",
            client: "Cliente",
            previous_status: "Estado Anterior",
            new_status: "Nuevo Estado",
            service: "Servicio",
            quantity: "Cantidad",
            unit_price: "Precio Unitario",
            total: "Total",
            provider: "Proveedor",
            amount: "Monto",
            transfer_type: "Tipo de Pago",
            status: "Estado",
            document_type: "Tipo de Documento",
            file_name: "Archivo",
            description: "Descripción",
        };
        return (
            translations[key] ||
            key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        );
    };

    const formatMetadataValue = (key, value) => {
        if (value === null || value === undefined || value === "") return "N/A";

        // Formatear montos
        if (
            ["amount", "total", "unit_price"].includes(key) &&
            typeof value === "number"
        ) {
            return new Intl.NumberFormat("es-SV", {
                style: "currency",
                currency: "USD",
            }).format(value);
        }

        // Formatear tipos de transferencia
        if (key === "transfer_type") {
            const types = {
                costos: "Costos Directo",
                cargos: "Cargo a Cliente",
                admin: "Gasto de Operación",
            };
            return types[value] || value;
        }

        // Formatear estados
        if (
            key === "status" ||
            key === "previous_status" ||
            key === "new_status"
        ) {
            const statuses = {
                pendiente: "Pendiente",
                aprobado: "Aprobado",
                pagado: "Pagado",
                abierta: "Abierta",
                cerrada: "Cerrada",
            };
            return statuses[value] || value;
        }

        // Formatear tipos de documento
        if (key === "document_type") {
            const types = {
                tramite: "Trámite",
                factura_venta: "Factura de Venta",
                factura_costo: "Factura de Costo",
                otros: "Otros",
            };
            return types[value] || value;
        }

        if (typeof value === "object") {
            return JSON.stringify(value, null, 2);
        }

        return String(value);
    };

    const renderMetadata = (metadata) => {
        if (!metadata || Object.keys(metadata).length === 0) return null;

        return (
            <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-xs font-semibold text-slate-700 mb-2.5">
                    Detalles del Evento
                </p>
                <div className="space-y-2">
                    {Object.entries(metadata).map(([key, value]) => (
                        <div
                            key={key}
                            className="flex items-start gap-3 text-sm"
                        >
                            <span className="font-medium text-slate-600 min-w-[140px] flex-shrink-0">
                                {formatMetadataKey(key)}:
                            </span>
                            <span className="text-slate-900 font-medium">
                                {formatMetadataValue(key, value)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Filtrar eventos
    const filteredHistory =
        filterType === "all"
            ? history
            : history.filter((event) => {
                  if (filterType === "payments") {
                      return [
                          "payment_added",
                          "payment_updated",
                          "payment_approved",
                          "payment_paid",
                          "payment_deleted",
                      ].includes(event.event_type);
                  }
                  if (filterType === "charges") {
                      return ["charge_added", "charge_deleted"].includes(
                          event.event_type
                      );
                  }
                  if (filterType === "documents") {
                      return ["document_uploaded", "document_deleted"].includes(
                          event.event_type
                      );
                  }
                  if (filterType === "status") {
                      return [
                          "created",
                          "status_changed",
                          "closed",
                          "reopened",
                      ].includes(event.event_type);
                  }
                  return true;
              });

    const filterOptions = [
        { value: "all", label: "Todos los Eventos", count: history.length },
        {
            value: "status",
            label: "Estados",
            count: history.filter((e) =>
                ["created", "status_changed", "closed", "reopened"].includes(
                    e.event_type
                )
            ).length,
        },
        {
            value: "payments",
            label: "Pagos",
            count: history.filter((e) => e.event_type.includes("payment"))
                .length,
        },
        {
            value: "charges",
            label: "Cargos",
            count: history.filter((e) => e.event_type.includes("charge"))
                .length,
        },
        {
            value: "documents",
            label: "Documentos",
            count: history.filter((e) => e.event_type.includes("document"))
                .length,
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500">
                        Cargando historial...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Filtros */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                    <Filter className="w-5 h-5 text-slate-400" />
                    <div className="flex items-center gap-2 flex-wrap">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFilterType(option.value)}
                                className={cn(
                                    "px-3 py-1.5 text-sm font-medium rounded-lg transition-all",
                                    filterType === option.value
                                        ? "bg-brand-600 text-white shadow-sm"
                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                )}
                            >
                                {option.label}
                                <span
                                    className={cn(
                                        "ml-1.5 px-1.5 py-0.5 text-xs rounded",
                                        filterType === option.value
                                            ? "bg-brand-700"
                                            : "bg-slate-200"
                                    )}
                                >
                                    {option.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Timeline */}
            {filteredHistory.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {filteredHistory.map((event, index) => {
                            const config = getEventConfig(event.event_type);
                            const Icon = config.icon;
                            const isLast = index === filteredHistory.length - 1;

                            return (
                                <div
                                    key={event.id}
                                    className="relative px-6 py-5 hover:bg-slate-50 transition-colors"
                                >
                                    {/* Timeline Line */}
                                    {!isLast && (
                                        <div className="absolute left-10 top-16 bottom-0 w-0.5 bg-slate-200"></div>
                                    )}

                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div
                                            className={cn(
                                                "relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
                                                config.bgColor
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "w-5 h-5",
                                                    config.color
                                                )}
                                            />
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 pt-1">
                                            <div className="flex items-start justify-between gap-4 mb-2">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-900">
                                                        {event.event_type_display ||
                                                            config.label}
                                                    </p>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        {event.description}
                                                    </p>
                                                </div>
                                                <time className="flex-shrink-0 text-xs text-slate-500 font-mono">
                                                    {formatDate(
                                                        event.timestamp,
                                                        { format: "long" }
                                                    )}
                                                </time>
                                            </div>

                                            {/* User Info */}
                                            {event.user_name && (
                                                <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                                                    <User className="w-3.5 h-3.5" />
                                                    <span className="font-medium">
                                                        {event.user_name}
                                                    </span>
                                                    {event.user_username && (
                                                        <span className="text-slate-500">
                                                            @
                                                            {
                                                                event.user_username
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* Metadata */}
                                            {renderMetadata(event.metadata)}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg py-12">
                    <EmptyState
                        icon={Clock}
                        title="Sin eventos en el historial"
                        description={
                            filterType === "all"
                                ? "Los eventos de esta orden aparecerán aquí"
                                : "No hay eventos que coincidan con este filtro"
                        }
                    />
                </div>
            )}

            {/* Summary Stats */}
            {history.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900 tabular-nums">
                                {history.length}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Total Eventos
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-brand-600 tabular-nums">
                                {
                                    history.filter((e) =>
                                        e.event_type.includes("payment")
                                    ).length
                                }
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Eventos de Pagos
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-green-600 tabular-nums">
                                {
                                    history.filter((e) =>
                                        e.event_type.includes("charge")
                                    ).length
                                }
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Eventos de Cargos
                            </p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-600 tabular-nums">
                                {
                                    history.filter((e) =>
                                        e.event_type.includes("document")
                                    ).length
                                }
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                                Eventos de Documentos
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryTab;
