import React, { useState, useEffect } from "react";
import {
    User,
    Mail,
    Lock,
    Save,
    Eye,
    EyeOff,
    Shield,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Input,
    Label,
} from "../components/ui";
import useAuthStore from "../stores/authStore";
import axios from "../lib/axios";
import toast from "react-hot-toast";

/**
 * Profile Page - Gestión de Perfil de Usuario
 * Diseño ERP sobrio y profesional
 */
function Profile() {
    const user = useAuthStore((state) => state.user);
    const checkAuth = useAuthStore((state) => state.checkAuth);

    // Estado del formulario de perfil
    const [profileForm, setProfileForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
    });

    // Estado del formulario de contraseña
    const [passwordForm, setPasswordForm] = useState({
        old_password: "",
        new_password: "",
        new_password_confirm: "",
    });

    // UI state
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Cargar datos del usuario
    useEffect(() => {
        if (user) {
            setProfileForm({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                email: user.email || "",
            });
        }
    }, [user]);

    // Actualizar perfil
    const handleUpdateProfile = async (e) => {
        e.preventDefault();

        if (!profileForm.first_name.trim()) {
            toast.error("El nombre es requerido");
            return;
        }

        if (!profileForm.email.trim()) {
            toast.error("El correo electrónico es requerido");
            return;
        }

        try {
            setIsUpdatingProfile(true);
            await axios.patch("/users/me/", profileForm);
            toast.success("Perfil actualizado correctamente");
            // Refrescar datos del usuario en el store
            await checkAuth();
        } catch (error) {
            // El error es manejado globalmente
            console.error(error);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    // Cambiar contraseña
    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (!passwordForm.old_password) {
            toast.error("Ingrese su contraseña actual");
            return;
        }

        if (!passwordForm.new_password) {
            toast.error("Ingrese la nueva contraseña");
            return;
        }

        if (passwordForm.new_password.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        if (passwordForm.new_password !== passwordForm.new_password_confirm) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        try {
            setIsUpdatingPassword(true);
            await axios.post("/users/change_password/", passwordForm);
            toast.success("Contraseña actualizada correctamente");
            setPasswordForm({
                old_password: "",
                new_password: "",
                new_password_confirm: "",
            });
        } catch (error) {
            // El error es manejado globalmente
            console.error(error);
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    // Formatear fecha
    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("es-SV", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Obtener iniciales
    const getInitials = (firstName, lastName) => {
        const first = firstName?.[0] || "";
        const last = lastName?.[0] || "";
        return (first + last).toUpperCase() || "U";
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-xl font-semibold text-slate-900">
                    Mi Perfil
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    Gestione su información personal y seguridad
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel izquierdo - Info del usuario */}
                <div className="lg:col-span-1">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex flex-col items-center text-center">
                                {/* Avatar */}
                                <div className="h-20 w-20 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-semibold text-slate-600">
                                        {getInitials(
                                            user?.first_name,
                                            user?.last_name
                                        )}
                                    </span>
                                </div>

                                {/* Nombre */}
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {user?.first_name} {user?.last_name}
                                </h2>
                                <p className="text-sm text-slate-500 mt-0.5">
                                    @{user?.username}
                                </p>

                                {/* Rol */}
                                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full">
                                    <Shield className="w-3.5 h-3.5 text-slate-500" />
                                    <span className="text-xs font-medium text-slate-600">
                                        {user?.role_display || "Usuario"}
                                    </span>
                                </div>

                                {/* Info adicional */}
                                <div className="w-full mt-6 pt-6 border-t border-slate-100 space-y-3">
                                    <div className="flex items-center gap-3 text-sm">
                                        <Mail className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-600 truncate">
                                            {user?.email || "Sin correo"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Calendar className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-600">
                                            Registrado:{" "}
                                            {formatDate(user?.date_joined)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm">
                                        <Clock className="w-4 h-4 text-slate-400" />
                                        <span className="text-slate-600">
                                            Último acceso:{" "}
                                            {formatDate(user?.last_login)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel derecho - Formularios */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Información Personal */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <User className="w-4 h-4 text-slate-500" />
                                Información Personal
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleUpdateProfile}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="first_name">
                                            Nombre *
                                        </Label>
                                        <Input
                                            id="first_name"
                                            value={profileForm.first_name}
                                            onChange={(e) =>
                                                setProfileForm({
                                                    ...profileForm,
                                                    first_name: e.target.value,
                                                })
                                            }
                                            placeholder="Ej: Juan"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="last_name">
                                            Apellido
                                        </Label>
                                        <Input
                                            id="last_name"
                                            value={profileForm.last_name}
                                            onChange={(e) =>
                                                setProfileForm({
                                                    ...profileForm,
                                                    last_name: e.target.value,
                                                })
                                            }
                                            placeholder="Ej: Pérez"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="email">
                                        Correo Electrónico *
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={profileForm.email}
                                        onChange={(e) =>
                                            setProfileForm({
                                                ...profileForm,
                                                email: e.target.value,
                                            })
                                        }
                                        placeholder="usuario@ejemplo.com"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <p className="text-xs text-slate-500">
                                        El nombre de usuario no puede
                                        modificarse
                                    </p>
                                    <Button
                                        type="submit"
                                        disabled={isUpdatingProfile}
                                        className="gap-2 bg-slate-900 hover:bg-slate-800 text-white"
                                    >
                                        <Save className="w-4 h-4" />
                                        {isUpdatingProfile
                                            ? "Guardando..."
                                            : "Guardar Cambios"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Cambiar Contraseña */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                                <Lock className="w-4 h-4 text-slate-500" />
                                Cambiar Contraseña
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleChangePassword}
                                className="space-y-4"
                            >
                                <div>
                                    <Label htmlFor="old_password">
                                        Contraseña Actual *
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="old_password"
                                            type={
                                                showOldPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            value={passwordForm.old_password}
                                            onChange={(e) =>
                                                setPasswordForm({
                                                    ...passwordForm,
                                                    old_password:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="••••••••"
                                            className="pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowOldPassword(
                                                    !showOldPassword
                                                )
                                            }
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        >
                                            {showOldPassword ? (
                                                <EyeOff className="w-4 h-4" />
                                            ) : (
                                                <Eye className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="new_password">
                                            Nueva Contraseña *
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="new_password"
                                                type={
                                                    showNewPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={
                                                    passwordForm.new_password
                                                }
                                                onChange={(e) =>
                                                    setPasswordForm({
                                                        ...passwordForm,
                                                        new_password:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="••••••••"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowNewPassword(
                                                        !showNewPassword
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showNewPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="new_password_confirm">
                                            Confirmar Contraseña *
                                        </Label>
                                        <div className="relative">
                                            <Input
                                                id="new_password_confirm"
                                                type={
                                                    showConfirmPassword
                                                        ? "text"
                                                        : "password"
                                                }
                                                value={
                                                    passwordForm.new_password_confirm
                                                }
                                                onChange={(e) =>
                                                    setPasswordForm({
                                                        ...passwordForm,
                                                        new_password_confirm:
                                                            e.target.value,
                                                    })
                                                }
                                                placeholder="••••••••"
                                                className="pr-10"
                                            />
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowConfirmPassword(
                                                        !showConfirmPassword
                                                    )
                                                }
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="w-4 h-4" />
                                                ) : (
                                                    <Eye className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Indicadores de seguridad */}
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                                    <p className="text-xs font-medium text-slate-600 mb-2">
                                        Requisitos de contraseña:
                                    </p>
                                    <ul className="space-y-1">
                                        <li
                                            className={`text-xs flex items-center gap-1.5 ${
                                                passwordForm.new_password
                                                    .length >= 8
                                                    ? "text-emerald-600"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            {passwordForm.new_password.length >=
                                            8 ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <AlertCircle className="w-3.5 h-3.5" />
                                            )}
                                            Mínimo 8 caracteres
                                        </li>
                                        <li
                                            className={`text-xs flex items-center gap-1.5 ${
                                                passwordForm.new_password ===
                                                    passwordForm.new_password_confirm &&
                                                passwordForm
                                                    .new_password_confirm
                                                    .length > 0
                                                    ? "text-emerald-600"
                                                    : "text-slate-500"
                                            }`}
                                        >
                                            {passwordForm.new_password ===
                                                passwordForm.new_password_confirm &&
                                            passwordForm.new_password_confirm
                                                .length > 0 ? (
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                            ) : (
                                                <AlertCircle className="w-3.5 h-3.5" />
                                            )}
                                            Las contraseñas coinciden
                                        </li>
                                    </ul>
                                </div>

                                <div className="flex justify-end pt-2">
                                    <Button
                                        type="submit"
                                        variant="outline"
                                        disabled={isUpdatingPassword}
                                        className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                                    >
                                        <Lock className="w-4 h-4" />
                                        {isUpdatingPassword
                                            ? "Actualizando..."
                                            : "Cambiar Contraseña"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default Profile;
