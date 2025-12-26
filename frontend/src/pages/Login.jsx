import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Eye, EyeOff, AlertCircle, Ship } from "lucide-react";
import useAuthStore from "../stores/authStore";
import { Input } from "../components/ui/Input";
import { Button } from "../components/ui/Button";
import { Label } from "../components/ui/Label";

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
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            {/* Login Form */}
            <div className="max-w-md w-full mx-4">
                <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
                    {/* Logo and Title */}
                    <div className="text-center">
                        <div className="mx-auto mb-6 flex items-center justify-center">
                            <img
                                src="/logo/logo.png"
                                alt="G-PRO LOGISTIC"
                                className="h-20 w-auto"
                            />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                            G-PRO LOGISTIC
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Sistema de Administración y Gestión
                        </p>
                    </div>

                    {/* Login Form */}
                    <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                        <div className="space-y-4">
                            {/* Username Field */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="username"
                                    className="text-slate-700"
                                >
                                    Usuario
                                </Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <Input
                                        id="username"
                                        type="text"
                                        placeholder="Ingrese su usuario"
                                        value={username}
                                        onChange={(e) =>
                                            setUsername(e.target.value)
                                        }
                                        className="pl-9"
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password Field */}
                            <div className="space-y-1.5">
                                <Label
                                    htmlFor="password"
                                    className="text-slate-700"
                                >
                                    Contraseña
                                </Label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-slate-400" />
                                    </div>
                                    <Input
                                        id="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Ingrese su contraseña"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        className="pl-9 pr-10"
                                        required
                                        autoComplete="current-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
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
                                    <p className="text-sm text-danger-700">
                                        {error}
                                    </p>
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
                            <p className="text-xs text-slate-400 mt-1">
                                © {new Date().getFullYear()} Todos los derechos
                                reservados
                            </p>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Login;
