import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

/**
 * Layout Principal - Design System Corporativo GPRO
 *
 * Features:
 * - Sidebar colapsable en móvil
 * - Header fijo con altura responsive
 * - Área de contenido con scroll independiente
 * - Safe areas para dispositivos móviles
 */
function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen h-[100dvh] bg-slate-100 overflow-hidden font-sans text-slate-900">
            {/* Sidebar - fixed en móvil, static en desktop */}
            <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
                {/* Header fijo */}
                <Header onMenuClick={() => setSidebarOpen(true)} />

                {/* Main Content - scroll independiente con padding responsive */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden pt-0 p-3 sm:p-4 md:p-6 lg:p-8">
                    <div className="mx-auto max-w-7xl animate-fade-in pb-safe">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Layout;
