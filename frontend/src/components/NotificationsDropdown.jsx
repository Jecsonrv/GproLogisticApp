import React, { useEffect } from "react";
import {
    Bell,
    Check,
    Clock,
    AlertTriangle,
    Info,
    AlertCircle,
    Trash2,
    Loader2,
} from "lucide-react";
import useNotificationStore from "../stores/notificationStore";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "./ui/DropdownMenu";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

export function NotificationsDropdown() {
    const {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearRead,
    } = useNotificationStore();

    // Cargar notificaciones al montar el componente
    useEffect(() => {
        fetchNotifications();

        // Polling cada 60 segundos para nuevas notificaciones
        const interval = setInterval(() => {
            fetchNotifications(false);
        }, 60000);

        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const getIcon = (type) => {
        switch (type) {
            case "warning":
                return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case "error":
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            case "success":
                return <Check className="h-4 w-4 text-emerald-500" />;
            default:
                return <Info className="h-4 w-4 text-blue-500" />;
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return "Hace un momento";
        if (diffInSeconds < 3600)
            return `Hace ${Math.floor(diffInSeconds / 60)} min`;
        if (diffInSeconds < 86400)
            return `Hace ${Math.floor(diffInSeconds / 3600)} h`;
        return date.toLocaleDateString("es-SV", {
            month: "short",
            day: "numeric",
        });
    };

    const handleNotificationClick = (notification) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }
    };

    const handleDelete = (e, id) => {
        e.stopPropagation();
        deleteNotification(id);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                as={Button}
                variant="ghost"
                size="icon-sm"
                className="relative text-slate-400 hover:text-slate-600"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 border border-white"></span>
                    </span>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                className="w-80 p-0 shadow-xl border-slate-200"
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="font-semibold text-sm text-slate-800">
                        Notificaciones
                    </h3>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Marcar todo leído
                        </button>
                    )}
                </div>

                <div className="max-h-[350px] overflow-y-auto">
                    {loading && notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                            <Loader2 className="h-8 w-8 mx-auto mb-2 text-slate-300 animate-spin" />
                            <p className="text-sm">
                                Cargando notificaciones...
                            </p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="py-8 text-center text-slate-500">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                            <p className="text-sm">No tienes notificaciones</p>
                            <p className="text-xs text-slate-400 mt-1">
                                Las alertas del sistema aparecerán aquí
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() =>
                                        handleNotificationClick(notification)
                                    }
                                    className={cn(
                                        "flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer group",
                                        !notification.read
                                            ? "bg-blue-50/30"
                                            : "bg-white"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "mt-0.5 flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center border",
                                            notification.read
                                                ? "bg-slate-50 border-slate-200"
                                                : "bg-white border-slate-200 shadow-sm"
                                        )}
                                    >
                                        {getIcon(notification.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p
                                                className={cn(
                                                    "text-sm font-medium leading-none",
                                                    !notification.read
                                                        ? "text-slate-900"
                                                        : "text-slate-600"
                                                )}
                                            >
                                                {notification.title}
                                            </p>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {!notification.read && (
                                                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                                )}
                                                <button
                                                    onClick={(e) =>
                                                        handleDelete(
                                                            e,
                                                            notification.id
                                                        )
                                                    }
                                                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded transition-all"
                                                    title="Eliminar notificación"
                                                >
                                                    <Trash2 className="h-3 w-3 text-slate-400 hover:text-red-500" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-1.5">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center text-[10px] text-slate-400">
                                            <Clock className="h-3 w-3 mr-1" />
                                            {formatTime(notification.timestamp)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {notifications.length > 0 && (
                    <div className="p-2 border-t border-slate-100 bg-slate-50/50 flex justify-between">
                        <button
                            onClick={clearRead}
                            className="text-xs text-slate-500 hover:text-slate-800 font-medium py-1 px-2 transition-colors hover:bg-slate-100 rounded"
                        >
                            Limpiar leídas
                        </button>
                        <button
                            onClick={() => fetchNotifications(true)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium py-1 px-2 transition-colors hover:bg-blue-50 rounded"
                        >
                            Actualizar
                        </button>
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
