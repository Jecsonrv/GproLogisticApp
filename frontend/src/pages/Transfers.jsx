import React, { useState } from "react";
import { Plus, Banknote } from "lucide-react"; // Using Lucide React
import { Button } from "../components/ui"; // Named import
import EmptyState from "../components/ui/EmptyState";

function Transfers() {
    const [transfers, setTransfers] = useState([]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Transferencias y Gastos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestiona los traspasos de efectivo y gastos operativos.
                    </p>
                </div>
                <Button>
                    <Plus className="h-4 w-4 mr-2" /> Registrar Transferencia
                </Button>
            </div>

            {/* Contenido */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-12">
                <EmptyState
                    icon={Banknote} // Using Lucide icon
                    title="Módulo en Desarrollo"
                    description="La gestión de transferencias y gastos estará disponible próximamente"
                />
            </div>
        </div>
    );
}

export default Transfers;