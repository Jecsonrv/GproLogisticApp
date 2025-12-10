import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff, AlertCircle, Ship } from "lucide-react";
import useAuthStore from "../stores/authStore";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Label } from "../components/ui/Label";
import { cn } from "../lib/utils";

/**
 * Login Page - Design System Corporativo GPRO
 * Estilo minimalista y profesional
 */
function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const login = useAuthStore((state) => state.login);
    const loading = useAuthStore((state) => state.loading);
    const error = useAuthStore((state) => state.error);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(username, password);
        if (success) {
            navigate("/");
        }
    };

    return (
        <div className="min-h-screen flex bg-slate-50">
            {/* Left Side - Login Form */}
            <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-20 xl:px-24 bg-white">
                <div className="max-w-sm w-full space-y-8">
                    {/* Logo and Title */}
                    <div className="text-center">
                        <div className="mx-auto mb-6 flex items-center justify-center">
                            <div className="w-14 h-14 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg">
                                <Ship className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            GPRO Logistic
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Sistema ERP de Gestión Aduanera
                        </p>
                    </div>

                    {/* Login Form */}
                    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {/* Username Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="username" className="text-slate-700">
                                    Usuario
                                </Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Ingresa tu usuario"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        className="pl-9"
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-slate-700">
                                    Contraseña
                                </Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Ingresa tu contraseña"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-9 pr-10"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="rounded-md bg-danger-50 border border-danger-200 p-3">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-4 w-4 text-danger-500 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-danger-700">{error}</p>
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <Button
                            type="submit"
                            variant="default"
                            size="default"
                            className="w-full"
                            loading={loading}
                        >
                            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
                        </Button>

                        {/* Footer */}
                        <div className="text-center pt-4 border-t border-slate-100">
                            <p className="text-xs text-slate-400">
                                GPRO Logistic ERP &middot; v2.0
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                                © {new Date().getFullYear()} Todos los derechos reservados
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Side - Brand Panel (Desktop only) */}
            <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#grid)" />
                    </svg>
                </div>

                {/* Content */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full p-12">
                    <div className="max-w-md text-center">
                        <div className="mb-8">
                            <Ship className="w-20 h-20 text-white/90 mx-auto" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-4">
                            Sistema de Gestión Integral
                        </h2>
                        <p className="text-brand-100 text-lg leading-relaxed">
                            Plataforma ERP especializada en operaciones de comercio exterior,
                            gestión aduanera y control logístico empresarial.
                        </p>

                        {/* Features List */}
                        <div className="mt-10 space-y-3">
                            {[
                                "Órdenes de Servicio y Trazabilidad",
                                "Facturación Electrónica (CCF/IVA 13%)",
                                "Control de Cuentas por Cobrar",
                                "Reportes y Análisis Ejecutivo",
                            ].map((feature, index) => (
                                <div
                                    key={index}
                                    className="flex items-center justify-center gap-2 text-brand-100"
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-brand-300" />
                                    <span className="text-sm">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 translate-y-1/2" />
                <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/3 -translate-y-1/3" />
            </div>
        </div>
    );
}

export default Login;
