import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import {
    LayoutDashboard,
    ClipboardList,
    Banknote,
    ArrowRightLeft,
    FileText,
    Users,
    Package,
    ShieldCheck,
    X,
    Boxes,
    Ship,
} from "lucide-react";
import useAuthStore from "../stores/authStore";

/**
 * Sidebar Navigation - Design System Corporativo GPRO
 * Estilo: Sobrio, Corporativo, Profesional
 */

const menuSections = [
    {
        title: null,
        items: [{ name: "Dashboard", path: "/", icon: LayoutDashboard }],
    },
    {
        title: "OPERACIONES",
        items: [
            {
                name: "Órdenes de Servicio",
                path: "/service-orders",
                icon: ClipboardList,
            },
            {
                name: "Transferencias",
                path: "/transfers",
                icon: ArrowRightLeft,
            },
        ],
    },
    {
        title: "FINANZAS",
        items: [
            { name: "Facturación y CXC", path: "/invoicing", icon: Banknote },
            {
                name: "Estados de Cuenta",
                path: "/account-statements",
                icon: FileText,
            },
        ],
    },
    {
        title: "CATÁLOGOS",
        items: [
            { name: "Clientes", path: "/clients", icon: Users },
            { name: "Servicios y Tarifario", path: "/services", icon: Package },
            { name: "Catálogos Generales", path: "/catalogs", icon: Boxes },
        ],
    },
    {
        title: "ADMINISTRACIÓN",
        items: [{ name: "Usuarios", path: "/users", icon: ShieldCheck }],
    },
];

export function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const user = useAuthStore((state) => state.user);

    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            {/* Mobile Backdrop */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-60 bg-white border-r border-slate-200 transition-transform duration-200 ease-out lg:static lg:translate-x-0 flex flex-col",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex h-14 items-center justify-between px-4 border-b border-slate-200 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <img
                            src="/logo/logo.png"
                            alt="G-PRO LOGISTIC"
                            className="h-8 w-auto"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 leading-tight">
                                G-PRO LOGISTIC
                            </span>
                            <span className="text-2xs text-slate-500 leading-tight">
                                Sistema ERP
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-hide">
                    <div className="space-y-5">
                        {menuSections.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                                {/* Section Title */}
                                {section.title && (
                                    <h3 className="px-2.5 text-2xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                                        {section.title}
                                    </h3>
                                )}

                                {/* Section Items */}
                                <div className="space-y-0.5">
                                    {section.items.map((item) => {
                                        const isActive =
                                            location.pathname === item.path ||
                                            (item.path !== "/" &&
                                                location.pathname.startsWith(
                                                    item.path
                                                ));
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={onClose}
                                                className={cn(
                                                    "flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-sm transition-all duration-150",
                                                    isActive
                                                        ? "bg-brand-50 text-brand-700 border-l-2 border-brand-600 -ml-0.5 pl-2"
                                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "h-4 w-4 flex-shrink-0",
                                                        isActive
                                                            ? "text-brand-600"
                                                            : "text-slate-400"
                                                    )}
                                                />
                                                <span className="truncate">
                                                    {item.name}
                                                </span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </nav>

                {/* User Profile */}
                <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-xs flex-shrink-0">
                            {getInitials(user?.first_name)}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-sm font-medium text-slate-900 truncate">
                                {user?.first_name || "Usuario"}
                            </span>
                            <span className="text-2xs text-slate-500 truncate">
                                {user?.email || "usuario@gpro.com"}
                            </span>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
