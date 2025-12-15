import React from "react";
import {
    Menu,
    LogOut,
    ChevronDown,
    User,
    Settings,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import { useNavigate, useLocation } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "./ui/DropdownMenu";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";
import { NotificationsDropdown } from "./NotificationsDropdown";

/**
 * Header Component - Design System Corporativo GPRO
 * Barra superior con navegación, notificaciones y perfil de usuario
 */

// Mapeo de rutas a títulos de página
const pageTitles = {
    "/": "Dashboard",
    "/service-orders": "Órdenes de Servicio",
    "/transfers": "Transferencias",
    "/invoicing": "Facturación y CXC",
    "/account-statements": "Estados de Cuenta",
    "/clients": "Clientes",
    "/services": "Servicios y Tarifario",
    "/catalogs": "Catálogos Generales",
    "/users": "Usuarios",
    "/profile": "Mi Perfil",
    "/provider-payments": "Pagos a Proveedores",
    "/provider-statements": "Cuentas por Pagar",
};

export function Header({ onMenuClick }) {
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    // Obtener título de la página actual
    const currentPath = location.pathname;
    const pageTitle =
        pageTitles[currentPath] ||
        Object.entries(pageTitles).find(
            ([path]) => path !== "/" && currentPath.startsWith(path)
        )?.[1] ||
        "GPRO Logistic";

    // Obtener fecha formateada
    const formattedDate = new Date().toLocaleDateString("es-SV", {
        weekday: "long",
        day: "numeric",
        month: "long",
    });

    const getInitials = (name) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const getFullName = () => {
        const fullName = `${user?.first_name || ""} ${
            user?.last_name || ""
        }`.trim();
        return fullName || "Usuario";
    };

    return (
        <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
            {/* Left Section */}
            <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="lg:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Page Title */}
                <div className="flex flex-col">
                    <h1 className="text-base font-semibold text-slate-900 leading-tight">
                        {pageTitle}
                    </h1>
                    <span className="text-2xs text-slate-500 capitalize hidden sm:block">
                        {formattedDate}
                    </span>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-1 sm:gap-2">
                {/* Notifications */}
                <NotificationsDropdown />

                {/* Divider */}
                <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block" />

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        as={Button}
                        variant="ghost"
                        className="h-8 gap-2 px-2 hover:bg-slate-100"
                    >
                        <div className="h-6 w-6 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                            <span className="text-xs font-semibold text-slate-600">
                                {getInitials(getFullName())}
                            </span>
                        </div>
                        <span className="hidden text-sm font-medium text-slate-700 sm:inline-block max-w-[140px] truncate">
                            {getFullName()}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium text-slate-900">
                                    {getFullName()}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {user?.email || "usuario@gpro.com"}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => navigate("/profile")}
                            className="cursor-pointer"
                        >
                            <User className="mr-2 h-4 w-4" />
                            <span>Mi Perfil</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-danger-600 focus:text-danger-700 focus:bg-danger-50"
                        >
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Cerrar Sesión</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
