import React from "react";
import { Menu, LogOut, Bell, User, Settings } from "lucide-react";
import useAuthStore from "../stores/authStore";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/DropdownMenu";
import { Button } from "./ui/Button";

export function Header({ onMenuClick }) {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="lg:hidden -ml-2 p-2 text-gray-500 hover:text-gray-900"
          onClick={onMenuClick}
        >
          <Menu className="h-6 w-6" />
        </button>
        
        {/* Breadcrumb replacement / Page Title area */}
        <div className="hidden md:flex flex-col">
          <span className="text-sm text-gray-500 font-medium">
             {new Date().toLocaleDateString("es-SV", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-600 ring-2 ring-white" />
        </Button>

        <div className="h-6 w-px bg-gray-200 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full bg-primary-100 p-0 text-primary-700 hover:bg-primary-200 sm:h-auto sm:w-auto sm:bg-transparent sm:px-2 sm:py-1.5 sm:hover:bg-gray-100">
               <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 sm:mr-2">
                 <span className="text-sm font-bold text-primary-700">{user?.first_name?.[0] || "U"}</span>
               </span>
               <span className="hidden text-sm font-medium text-gray-700 sm:inline-block">
                 {user?.first_name || "Usuario"}
               </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              <User className="mr-2 h-4 w-4" />
              <span>Perfil</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Configuración</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600 hover:text-red-700 focus:text-red-700 focus:bg-red-50">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}