import React, { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";
import usePermissionStore from "../stores/permissionStore";
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
} from "lucide-react";

/**
 * Sidebar Navigation - Design System Corporativo GPRO
 * Estilo: Sobrio, Corporativo, Profesional
 *
 * RBAC: Los items se renderizan condicionalmente según los permisos del usuario
 */

// Definición de menú con módulos RBAC asociados
const menuSections = [
    {
        title: null,
        items: [
            {
                name: "Dashboard",
                path: "/",
                icon: LayoutDashboard,
                module: "dashboard", // Accesible por todos
            },
        ],
    },
    {
        title: "OPERACIONES",
        items: [
            {
                name: "Órdenes de Servicio",
                path: "/service-orders",
                icon: ClipboardList,
                module: "service_orders", // Todos los operativos
            },
            {
                name: "Pagos a Proveedores",
                path: "/provider-payments",
                icon: Banknote,
                module: "provider_payments", // Todos los operativos
            },
        ],
    },
    {
        title: "FINANZAS",
        items: [
            {
                name: "Facturación y CXC",
                path: "/invoicing",
                icon: Banknote,
                module: "invoicing", // Solo admin y operativo2
            },
            {
                name: "Estados de Cuenta",
                path: "/account-statements",
                icon: FileText,
                module: "account_statements", // Solo admin y operativo2
            },
            {
                name: "Cuentas por Pagar",
                path: "/provider-statements",
                icon: ArrowRightLeft,
                module: "provider_statements", // Solo admin y operativo2
            },
        ],
    },
    {
        title: "CATÁLOGOS",
        items: [
            {
                name: "Clientes",
                path: "/clients",
                icon: Users,
                module: "clients", // Todos los operativos
            },
            {
                name: "Servicios y Tarifario",
                path: "/services",
                icon: Package,
                module: "services", // Todos los operativos
            },
            {
                name: "Catálogos Generales",
                path: "/catalogs",
                icon: Boxes,
                module: "catalogs", // Todos los operativos
            },
        ],
    },
    {
        title: "ADMINISTRACIÓN",
        items: [
            {
                name: "Usuarios",
                path: "/users",
                icon: ShieldCheck,
                module: "users", // Solo admin
            },
        ],
    },
];

export function Sidebar({ isOpen, onClose }) {
    const location = useLocation();
    const hasModuleAccess = usePermissionStore(
        (state) => state.hasModuleAccess
    );
    const permissions = usePermissionStore((state) => state.permissions);

    // Filtrar secciones y items según permisos RBAC
    const filteredMenuSections = useMemo(() => {
        if (!permissions) {
            // Si no hay permisos cargados, mostrar menú básico
            return menuSections
                .map((section) => ({
                    ...section,
                    items: section.items.filter((item) =>
                        [
                            "dashboard",
                            "service_orders",
                            "provider_payments",
                            "catalogs",
                            "clients",
                            "services",
                        ].includes(item.module)
                    ),
                }))
                .filter((section) => section.items.length > 0);
        }

        return (
            menuSections
                .map((section) => ({
                    ...section,
                    // Filtrar items según permisos del usuario
                    items: section.items.filter((item) =>
                        hasModuleAccess(item.module)
                    ),
                }))
                // Eliminar secciones vacías
                .filter((section) => section.items.length > 0)
        );
    }, [permissions, hasModuleAccess]);

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
                            className="h-10 w-auto"
                        />
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 leading-tight">
                                G-PRO LOGISTIC
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

                {/* Navigation - Renderizado condicional RBAC */}
                <nav className="flex-1 overflow-y-auto py-3 px-2.5 scrollbar-hide">
                    <div className="space-y-5">
                        {filteredMenuSections.map((section, sectionIndex) => (
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
                                                    "flex items-center gap-2.5 px-2.5 py-2 text-sm font-medium rounded-lg transition-all duration-150",
                                                    isActive
                                                        ? "bg-slate-900 text-white shadow-sm"
                                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                                )}
                                            >
                                                <Icon
                                                    className={cn(
                                                        "h-4 w-4 flex-shrink-0",
                                                        isActive
                                                            ? "text-white"
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

                {/* Footer con versión */}
                <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex-shrink-0">
                    <div className="flex items-center justify-center">
                        <span className="text-2xs text-slate-400">
                            GPRO Logistic ERP v1.0
                        </span>
                    </div>
                </div>
            </aside>
        </>
    );
}
