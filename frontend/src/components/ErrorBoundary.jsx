import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

/**
 * Error Boundary para capturar errores de React y mostrar UI de fallback
 * Evita que la aplicación completa se rompa por errores en componentes
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error) {
        // Actualizar estado para mostrar UI de fallback
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Puedes enviar el error a un servicio de logging aquí
        console.error("Error capturado por ErrorBoundary:", error, errorInfo);

        this.setState({
            error,
            errorInfo,
        });

        // Opcional: Enviar a servicio de monitoreo
        // logErrorToService(error, errorInfo);
    }

    handleReload = () => {
        window.location.reload();
    };

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
                    <div className="max-w-lg w-full bg-white border border-gray-200 shadow-lg rounded-lg overflow-hidden">
                        {/* Header de Error Corporativo */}
                        <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex items-center gap-3">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                            <h1 className="text-lg font-semibold text-red-800">
                                Interrupción del Sistema
                            </h1>
                        </div>

                        <div className="p-8">
                            {/* Mensaje Profesional */}
                            <div className="mb-6 text-center">
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                    No pudimos procesar su solicitud
                                </h2>
                                <p className="text-gray-600 text-sm leading-relaxed">
                                    El sistema ha detectado una anomalía técnica inesperada que impide visualizar esta sección correctamente. Esta incidencia ha sido registrada para su análisis.
                                </p>
                            </div>

                            {/* Detalles Técnicos (Solo Desarrollo) - Estilo Terminal */}
                            {process.env.NODE_ENV === "development" && this.state.error && (
                                <div className="mb-6 bg-gray-900 rounded-md overflow-hidden text-left">
                                    <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between items-center">
                                        <span className="text-xs text-gray-400 font-mono uppercase tracking-wider">Stack Trace</span>
                                        <span className="text-xs text-red-400 font-mono">Dev Mode Only</span>
                                    </div>
                                    <div className="p-4 overflow-auto max-h-48 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                        <p className="text-xs text-red-300 font-mono mb-2 font-bold">
                                            {this.state.error.toString()}
                                        </p>
                                        {this.state.errorInfo && (
                                            <pre className="text-xs text-gray-400 font-mono leading-tight">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Acciones */}
                            <div className="space-y-3">
                                <button
                                    onClick={this.handleReload}
                                    className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-2.5 px-4 rounded-md hover:bg-gray-800 transition-all duration-200 text-sm font-medium shadow-sm"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                    Restablecer Aplicación
                                </button>
                                
                                <div className="text-center pt-4">
                                    <p className="text-xs text-gray-400">
                                        Código de Referencia: ERR-{Math.floor(Math.random() * 10000)}-SYS
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
