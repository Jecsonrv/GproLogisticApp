import React, { useState, useEffect, useMemo } from "react";
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
    ChevronDown,
    ChevronRight,
    History,
    ArrowRight,
} from "lucide-react";
import { EmptyState, Button } from "./ui";
import axios from "../lib/axios";
import { formatDate, cn } from "../lib/utils";

/**
 * HistoryTab - Vista de historial de auditoría corporativo
 * Diseño ERP profesional con timeline compacto y denso
 */
const HistoryTab = ({ orderId }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filterType, setFilterType] = useState("all");
    const [expandedEvents, setExpandedEvents] = useState({});

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
            // Error silencioso para producción
        } finally {
            setLoading(false);
        }
    };

    const EVENT_CONFIG = {
        created: {
            icon: Play,
            label: "OS Creada",
            color: "text-emerald-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "status",
        },
        updated: {
            icon: Edit,
            label: "OS Actualizada",
            color: "text-blue-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "status",
        },
        status_changed: {
            icon: RefreshCw,
            label: "Cambio de Estado",
            color: "text-violet-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "status",
        },
        charge_added: {
            icon: DollarSign,
            label: "Cargo Agregado",
            color: "text-green-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "charges",
        },
        charge_deleted: {
            icon: XCircle,
            label: "Cargo Eliminado",
            color: "text-red-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "charges",
        },
        payment_added: {
            icon: DollarSign,
            label: "Pago Registrado",
            color: "text-orange-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "payments",
        },
        payment_updated: {
            icon: Edit,
            label: "Pago Actualizado",
            color: "text-amber-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "payments",
        },
        payment_approved: {
            icon: CheckCircle,
            label: "Pago Aprobado",
            color: "text-teal-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "payments",
        },
        payment_paid: {
            icon: CheckCircle,
            label: "Pago Ejecutado",
            color: "text-emerald-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "payments",
        },
        payment_deleted: {
            icon: Trash2,
            label: "Pago Eliminado",
            color: "text-red-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "payments",
        },
        document_uploaded: {
            icon: Upload,
            label: "Documento Subido",
            color: "text-blue-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "documents",
        },
        document_deleted: {
            icon: Trash2,
            label: "Documento Eliminado",
            color: "text-red-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "documents",
        },
        invoice_generated: {
            icon: FileText,
            label: "Factura Generada",
            color: "text-indigo-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "invoices",
        },
        invoice_payment: {
            icon: DollarSign,
            label: "Pago de Factura",
            color: "text-green-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "invoices",
        },
        closed: {
            icon: Pause,
            label: "OS Cerrada",
            color: "text-slate-700",
            bgColor: "bg-slate-50",
            borderColor: "border-slate-300",
            category: "status",
        },
        reopened: {
            icon: RefreshCw,
            label: "OS Reabierta",
            color: "text-amber-700",
            bgColor: "bg-white",
            borderColor: "border-slate-200",
            category: "status",
        },
    };

    const getEventConfig = (eventType) => {
        return (
            EVENT_CONFIG[eventType] || {
                icon: AlertCircle,
                label: eventType,
                color: "text-slate-600",
                bgColor: "bg-white",
                borderColor: "border-slate-200",
                category: "other",
            }
        );
    };

    const METADATA_LABELS = {
        order_number: "N° Orden",
        duca: "DUCA",
        client: "Cliente",
        previous_status: "Estado Anterior",
        new_status: "Nuevo Estado",
        service: "Servicio",
        quantity: "Cantidad",
        unit_price: "Precio Unit.",
        total: "Total",
        provider: "Proveedor",
        amount: "Monto",
        transfer_type: "Tipo",
        status: "Estado",
        document_type: "Tipo Doc.",
        file_name: "Archivo",
        description: "Descripción",
    };

    const formatMetadataKey = (key) => {
        return (
            METADATA_LABELS[key] ||
            key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
        );
    };

    const formatMetadataValue = (key, value) => {
        if (value === null || value === undefined || value === "") return "—";

        if (["amount", "total", "unit_price"].includes(key) && !isNaN(value)) {
            return new Intl.NumberFormat("es-SV", {
                style: "currency",
                currency: "USD",
            }).format(value);
        }

        if (key === "transfer_type") {
            const types = {
                costos: "Costo Directo",
                cargos: "Cargo Cliente",
                admin: "Gasto Op.",
            };
            return types[value] || value;
        }

        if (["status", "previous_status", "new_status"].includes(key)) {
            const statuses = {
                pendiente: "Pendiente",
                aprobado: "Aprobado",
                pagado: "Pagado",
                abierta: "Abierta",
                cerrada: "Cerrada",
            };
            return statuses[value] || value;
        }

        if (key === "document_type") {
            const types = {
                tramite: "Trámite",
                factura_venta: "Fact. Venta",
                factura_costo: "Fact. Costo",
                otros: "Otros",
            };
            return types[value] || value;
        }

        if (typeof value === "object") {
            return JSON.stringify(value, null, 2);
        }

        return String(value);
    };

    const toggleEvent = (eventId) => {
        setExpandedEvents((prev) => ({
            ...prev,
            [eventId]: !prev[eventId],
        }));
    };

    // Filtrar eventos
    const filteredHistory = useMemo(() => {
        if (filterType === "all") return history;
        return history.filter((event) => {
            const config = getEventConfig(event.event_type);
            return config.category === filterType;
        });
    }, [history, filterType]);

    // Estadísticas por categoría
    const stats = useMemo(() => {
        const counts = {
            all: history.length,
            status: 0,
            payments: 0,
            charges: 0,
            documents: 0,
            invoices: 0,
        };
        history.forEach((event) => {
            const config = getEventConfig(event.event_type);
            if (counts[config.category] !== undefined) {
                counts[config.category]++;
            }
        });
        return counts;
    }, [history]);

    const FILTER_OPTIONS = [
        { value: "all", label: "Todos", icon: History },
        { value: "status", label: "Estados", icon: RefreshCw },
        { value: "payments", label: "Pagos", icon: DollarSign },
        { value: "charges", label: "Cargos", icon: DollarSign },
        { value: "documents", label: "Documentos", icon: FileText },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-200 border-t-slate-600 mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500 font-medium">
                        Cargando historial...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header con filtros compactos */}
            <div className="bg-white border border-slate-200 rounded-lg">
                <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-900">
                            Historial de Auditoría
                        </h3>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            {history.length} eventos
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchHistory}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>

                {/* Filtros inline */}
                <div className="px-4 py-2 flex items-center gap-1 overflow-x-auto">
                    {FILTER_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const count = stats[option.value] || 0;
                        const isActive = filterType === option.value;

                        return (
                            <button
                                key={option.value}
                                onClick={() => setFilterType(option.value)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap",
                                    isActive
                                        ? "bg-slate-900 text-white"
                                        : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                                )}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                {option.label}
                                {count > 0 && (
                                    <span
                                        className={cn(
                                            "px-1.5 py-0.5 text-[10px] font-bold rounded",
                                            isActive
                                                ? "bg-slate-700"
                                                : "bg-slate-200"
                                        )}
                                    >
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Timeline Compacto */}
            {filteredHistory.length > 0 ? (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    <div className="divide-y divide-slate-100">
                        {filteredHistory.map((event) => {
                            const config = getEventConfig(event.event_type);
                            const Icon = config.icon;
                            const isExpanded = expandedEvents[event.id];
                            const hasMetadata =
                                event.metadata &&
                                Object.keys(event.metadata).length > 0;

                            return (
                                <div
                                    key={event.id}
                                    className={cn(
                                        "transition-colors",
                                        hasMetadata
                                            ? "cursor-pointer hover:bg-slate-50"
                                            : ""
                                    )}
                                    onClick={() =>
                                        hasMetadata && toggleEvent(event.id)
                                    }
                                >
                                    {/* Fila principal compacta */}
                                    <div className="px-4 py-3 flex items-center gap-3">
                                        {/* Icono pequeño */}
                                        <div
                                            className={cn(
                                                "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border",
                                                config.bgColor,
                                                config.borderColor
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "w-4 h-4",
                                                    config.color
                                                )}
                                            />
                                        </div>

                                        {/* Contenido principal */}
                                        <div className="flex-1 min-w-0 mr-2">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-sm font-semibold text-slate-900 truncate">
                                                    {event.event_type_display ||
                                                        config.label}
                                                </span>
                                                {hasMetadata && (
                                                    <span className="text-slate-400">
                                                        {isExpanded ? (
                                                            <ChevronDown className="w-4 h-4" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4" />
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            {event.description && (
                                                <p className="text-xs text-slate-500 truncate">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Usuario */}
                                        {event.user_name && (
                                            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500">
                                                <User className="w-3.5 h-3.5" />
                                                <span className="font-medium">
                                                    {event.user_name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Timestamp */}
                                        <time className="flex-shrink-0 text-xs text-slate-400 font-mono tabular-nums">
                                            {formatDate(event.timestamp, {
                                                format: "short",
                                            })}
                                        </time>
                                    </div>

                                    {/* Metadata expandible */}
                                    {isExpanded && hasMetadata && (
                                        <div className="px-4 pb-3">
                                            <div className="ml-11 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                                                    {Object.entries(
                                                        event.metadata
                                                    ).map(([key, value]) => (
                                                        <div
                                                            key={key}
                                                            className="flex flex-col min-w-0"
                                                        >
                                                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                                                                {formatMetadataKey(
                                                                    key
                                                                )}
                                                            </span>
                                                            <span className="text-sm font-medium text-slate-900 break-words">
                                                                {formatMetadataValue(
                                                                    key,
                                                                    value
                                                                )}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                                {event.user_name && (
                                                    <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                                                        <User className="w-3 h-3" />
                                                        <span>
                                                            Por:{" "}
                                                            <span className="font-medium text-slate-700">
                                                                {
                                                                    event.user_name
                                                                }
                                                            </span>
                                                        </span>
                                                        {event.user_username && (
                                                            <span className="text-slate-400">
                                                                @
                                                                {
                                                                    event.user_username
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : (
                <div className="bg-white border border-slate-200 rounded-lg py-12">
                    <EmptyState
                        icon={Clock}
                        title="Sin eventos"
                        description={
                            filterType === "all"
                                ? "Los eventos de esta orden aparecerán aquí"
                                : "No hay eventos en esta categoría"
                        }
                    />
                </div>
            )}

            {/* Resumen compacto */}
            {history.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <p className="text-xl font-bold text-slate-900 tabular-nums">
                                    {stats.all}
                                </p>
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                                    Total
                                </p>
                            </div>
                            <div className="h-8 w-px bg-slate-200" />
                            <div className="flex items-center gap-4">
                                {[
                                    {
                                        key: "status",
                                        label: "Estados",
                                        color: "text-violet-600",
                                    },
                                    {
                                        key: "payments",
                                        label: "Pagos",
                                        color: "text-orange-600",
                                    },
                                    {
                                        key: "charges",
                                        label: "Cargos",
                                        color: "text-green-600",
                                    },
                                    {
                                        key: "documents",
                                        label: "Docs",
                                        color: "text-slate-700",
                                    },
                                ].map((item) => (
                                    <div key={item.key} className="text-center">
                                        <p
                                            className={cn(
                                                "text-lg font-bold tabular-nums",
                                                item.color
                                            )}
                                        >
                                            {stats[item.key] || 0}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-medium">
                                            {item.label}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">
                            Último evento:{" "}
                            {history.length > 0 &&
                                formatDate(history[0]?.timestamp, {
                                    format: "medium",
                                })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryTab;
