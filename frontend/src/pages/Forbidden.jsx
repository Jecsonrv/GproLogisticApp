import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "../components/ui";

/**
 * Página 403 - Acceso Denegado
 * Se muestra cuando un usuario intenta acceder a una ruta sin permisos
 */
const Forbidden = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center">
                {/* Icono */}
                <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                    <ShieldX className="w-10 h-10 text-red-600" />
                </div>

                {/* Código de error */}
                <h1 className="text-7xl font-bold text-slate-900 mb-2">403</h1>

                {/* Título */}
                <h2 className="text-2xl font-semibold text-slate-800 mb-3">
                    Acceso Denegado
                </h2>

                {/* Descripción */}
                <p className="text-slate-600 mb-8 leading-relaxed">
                    No tiene permisos para acceder a esta sección.
                    <br />
                    Si cree que esto es un error, contacte al administrador del
                    sistema.
                </p>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        variant="outline"
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver
                    </Button>
                    <Button
                        onClick={() => navigate("/")}
                        className="bg-slate-900 hover:bg-slate-800 inline-flex items-center gap-2"
                    >
                        <Home className="w-4 h-4" />
                        Ir al Dashboard
                    </Button>
                </div>

                {/* Info adicional */}
                <div className="mt-10 pt-6 border-t border-slate-200">
                    <p className="text-xs text-slate-500">
                        Si necesita acceso a esta funcionalidad, solicite los
                        permisos correspondientes a su supervisor o al equipo de
                        IT.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Forbidden;
