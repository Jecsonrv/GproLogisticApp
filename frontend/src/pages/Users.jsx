import React, { useState, useEffect } from "react";
import { PlusIcon, UserIcon } from "@heroicons/react/24/outline";
import { Button } from "../components/ui/Button";
import { LoadingState } from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";

function Users() {
    const [loading, setLoading] = useState(false);
    const [users, setUsers] = useState([]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Administra los usuarios del sistema
                    </p>
                </div>
                <Button
                    variant="primary"
                    icon={<PlusIcon className="h-5 w-5" />}
                >
                    Agregar Usuario
                </Button>
            </div>

            {/* Contenido */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12">
                <EmptyState
                    icon={UserIcon}
                    title="Módulo en Desarrollo"
                    description="La gestión de usuarios estará disponible próximamente"
                />
            </div>
        </div>
    );
}

export default Users;
