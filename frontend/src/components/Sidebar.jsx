import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import {
    LayoutDashboard,
    ClipboardList,
    PlusCircle,
    Banknote,
    ArrowRightLeft,
    FileText,
    Users,
    Tags,
    Settings,
    Package,
    ShieldCheck,
    X,
} from "lucide-react";
import useAuthStore from "../stores/authStore";

const menuItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    {
        name: "Órdenes de Servicio",
        path: "/service-orders",
        icon: ClipboardList,
    },
    { name: "Facturación", path: "/invoicing", icon: Banknote },
    { name: "Clientes", path: "/clients", icon: Users },
    { name: "Estados de Cuenta", path: "/account-statements", icon: FileText },
    { name: "Precios", path: "/client-pricing", icon: Tags },
    { name: "Servicios", path: "/services", icon: Package },
    { name: "Usuarios", path: "/users", icon: ShieldCheck },
];

export function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-900/50 lg:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo.png"
                            alt="GPRO Logistic"
                            className="h-10 w-auto"
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden text-gray-500 hover:text-gray-900"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={onClose}
                                    className={cn(
                                        "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                        isActive
                                            ? "bg-primary-50 text-primary-800"
                                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "mr-3 h-5 w-5 flex-shrink-0",
                                            isActive
                                                ? "text-primary-800"
                                                : "text-gray-400"
                                        )}
                                    />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <div className="p-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                            {user?.first_name?.[0] || "U"}
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate">
                                {user?.first_name || "Usuario"}
                            </span>
                            <span className="text-xs text-gray-500 truncate">
                                {user?.email}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
