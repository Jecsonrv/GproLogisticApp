import React from "react";
import {
    Menu,
    LogOut,
    ChevronDown,
    User,
    Settings,
} from "lucide-react";
import useAuthStore from "../stores/authStore";
import useHeaderStore from "../stores/headerStore"; // Importar store
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
    "/provider-payments": "Gestión de Pagos",
    "/provider-statements": "Cuentas por Pagar",
};

export function Header({ onMenuClick }) {
    const logout = useAuthStore((state) => state.logout);
    const user = useAuthStore((state) => state.user);
    const actions = useHeaderStore((state) => state.actions); // Obtener acciones dinámicas
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
        <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 transition-all">
            {/* Left Section */}
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    type="button"
                    className="lg:hidden p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    onClick={onMenuClick}
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Page Title */}
                <div className="flex flex-col justify-center">
                    <h1 className="text-xl font-bold text-slate-900 leading-none tracking-tight">
                        {pageTitle}
                    </h1>
                    <span className="text-[11px] text-slate-500 font-medium capitalize mt-1">
                        {formattedDate}
                    </span>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
                
                {/* Dynamic Page Actions (Injected via Portal/Store) */}
                {actions && (
                    <div className="flex items-center gap-2 mr-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        {actions}
                        <div className="h-6 w-px bg-slate-200 mx-1" />
                    </div>
                )}

                {/* Notifications */}
                <NotificationsDropdown />

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                {/* User Dropdown */}
                <DropdownMenu>
                    <DropdownMenuTrigger
                        as={Button}
                        variant="ghost"
                        className="h-9 gap-2 px-2 hover:bg-slate-100 rounded-full sm:rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                    >
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden">
                            <span className="text-xs font-bold text-slate-700">
                                {getInitials(getFullName())}
                            </span>
                        </div>
                        <div className="hidden flex-col items-start sm:flex">
                            <span className="text-sm font-medium text-slate-700 leading-none max-w-[120px] truncate">
                                {getFullName()}
                            </span>
                        </div>
                        <ChevronDown className="h-4 w-4 text-slate-400 hidden sm:block opacity-50" />
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium text-slate-900 leading-none">
                                    {getFullName()}
                                </p>
                                <p className="text-xs text-slate-500 truncate leading-none">
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
                            className="text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer"
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
