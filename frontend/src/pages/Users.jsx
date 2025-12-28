import React, { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Shield,
    UserCircle,
    Mail,
    Eye,
    EyeOff,
    Search,
    RefreshCw,
    Edit2,
    Trash2,
    Key,
    XCircle,
    Users as UsersIcon,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Badge,
    ConfirmDialog,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    SelectERP,
    Skeleton,
    SkeletonTable,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import useAuthStore from "../stores/authStore";
import { cn } from "../lib/utils";

// ============================================
// KPI CARD - CORPORATE STYLE
// ============================================
const KPICard = ({ label, value, icon: Icon }) => {
    return (
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-between gap-4">
            <div className="min-w-0">
                <p
                    className="text-sm font-medium text-slate-500 mb-1 truncate"
                    title={label}
                >
                    {label}
                </p>
                <p className="text-2xl font-bold text-slate-900 tabular-nums tracking-tight">
                    {value}
                </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">
                {Icon && <Icon className="w-6 h-6 text-slate-400" />}
            </div>
        </div>
    );
};

function Users() {
    const currentUser = useAuthStore((state) => state.user);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
        useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
        password_confirm: "",
        role: "operativo",
        is_active: true,
    });

    const [passwordData, setPasswordData] = useState({
        new_password: "",
        confirm_password: "",
    });
    const [confirmDeleteDialog, setConfirmDeleteDialog] = useState({
        open: false,
        id: null
    });

    useEffect(() => {
        // Solo admin puede ver usuarios
        if (currentUser?.role !== "admin") {
            toast.error("No tiene permisos para acceder a esta sección.");
            return;
        }
        fetchUsers();
    }, [currentUser]);

    const filteredUsers = useMemo(() => {
        if (!searchTerm) return users;
        const lowerTerm = searchTerm.toLowerCase();
        return users.filter(
            (user) =>
                user.username.toLowerCase().includes(lowerTerm) ||
                user.email.toLowerCase().includes(lowerTerm) ||
                (user.first_name &&
                    user.first_name.toLowerCase().includes(lowerTerm)) ||
                (user.last_name &&
                    user.last_name.toLowerCase().includes(lowerTerm))
        );
    }, [users, searchTerm]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/users/");
            setUsers(response.data);
        } catch (error) {
            toast.error("No se pudieron cargar los usuarios.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();

        // Validar que las contraseñas coincidan
        if (formData.password !== formData.password_confirm) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        try {
            await axios.post("/users/", formData);
            toast.success("El usuario ha sido creado correctamente.");
            setIsCreateModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "No se pudo crear el usuario."
            );
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...formData };
            delete dataToSend.password; // No enviar password en edición

            await axios.patch(`/users/${selectedUser.id}/`, dataToSend);
            toast.success("El usuario ha sido actualizado correctamente.");
            setIsEditModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            toast.error("No se pudo actualizar el usuario.");
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("Las contraseñas no coinciden. Verifique nuevamente.");
            return;
        }

        try {
            await axios.post(`/users/${selectedUser.id}/change_password/`, {
                password: passwordData.new_password,
            });
            toast.success("La contraseña ha sido actualizada correctamente.");
            setIsChangePasswordModalOpen(false);
            setPasswordData({ new_password: "", confirm_password: "" });
        } catch (error) {
            toast.error("No se pudo actualizar la contraseña.");
        }
    };

    const handleDelete = (id) => {
        setConfirmDeleteDialog({ open: true, id });
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/users/${confirmDeleteDialog.id}/`);
            toast.success("El usuario ha sido eliminado correctamente.");
            fetchUsers();
        } catch (error) {
            toast.error("No se pudo eliminar el usuario.");
        } finally {
            setConfirmDeleteDialog({ open: false, id: null });
        }
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            is_active: user.is_active,
        });
        setIsEditModalOpen(true);
    };

    const openChangePasswordModal = (user) => {
        setSelectedUser(user);
        setIsChangePasswordModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            username: "",
            email: "",
            first_name: "",
            last_name: "",
            password: "",
            password_confirm: "",
            role: "operativo",
            is_active: true,
        });
        setSelectedUser(null);
    };

    const getRoleBadge = (role) => {
        const variants = {
            admin: "destructive",
            operativo2: "warning",
            operativo: "default",
        };

        const labels = {
            admin: "Administrador",
            operativo2: "Operativo 2",
            operativo: "Operativo",
        };

        return <Badge variant={variants[role]}>{labels[role] || role}</Badge>;
    };

    const columns = [
        {
            accessor: "username",
            header: "Usuario",
            render: (row) => (
                <div className="flex items-center gap-2 py-2">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-semibold border border-slate-200">
                        {row.first_name?.[0] || row.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-900">
                        {row.username}
                    </span>
                </div>
            ),
        },
        {
            accessor: "email",
            header: "Email",
            render: (row) => (
                <div className="py-2 text-sm text-slate-600">{row.email}</div>
            ),
        },
        {
            header: "Nombre Completo",
            render: (row) => (
                <div className="py-2 text-sm text-slate-700">
                    {row.first_name} {row.last_name}
                </div>
            ),
        },
        {
            accessor: "role",
            header: "Rol",
            render: (row) => (
                <div className="py-2">{getRoleBadge(row.role)}</div>
            ),
        },
        {
            accessor: "is_active",
            header: "Estado",
            render: (row) => (
                <div className="py-2">
                    <Badge variant={row.is_active ? "success" : "default"}>
                        {row.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                </div>
            ),
        },
        {
            header: "Acciones",
            className: "w-[160px] text-center",
            headerClassName: "text-center",
            render: (row) => (
                <div
                    className="grid grid-cols-3 gap-1 w-full max-w-[120px] mx-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openEditModal(row);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                openChangePasswordModal(row);
                            }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Cambiar Contraseña"
                        >
                            <Key className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        {currentUser?.id !== row.id && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(row.id);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Eliminar"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            ),
        },
    ];

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-slate-900">
                        Acceso Denegado
                    </h2>
                    <p className="text-sm text-slate-500 mt-2">
                        Solo los administradores pueden gestionar usuarios
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse mt-2">
                {/* KPIs Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>

                {/* Table Skeleton */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex gap-4 justify-between">
                        <Skeleton className="h-9 flex-1 max-w-lg rounded-lg" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24 rounded-lg" />
                            <Skeleton className="h-9 w-32 rounded-lg" />
                        </div>
                    </div>
                    <div className="p-0">
                        <SkeletonTable rows={5} columns={6} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-2">
            {/* Bloque Superior: KPIs Corporativos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <KPICard
                    label="Total Usuarios"
                    value={users.length}
                    icon={UsersIcon}
                />
                <KPICard
                    label="Usuarios Activos"
                    value={users.filter((u) => u.is_active).length}
                    icon={UserCircle}
                />
                <KPICard
                    label="Administradores"
                    value={users.filter((u) => u.role === "admin").length}
                    icon={Shield}
                />
            </div>

            {/* Bloque Operativo: Tabla + Herramientas */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Barra de Herramientas Unificada */}
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50/30">
                    {/* Izquierda: Buscador */}
                    <div className="flex items-center gap-3 flex-1 w-full lg:max-w-lg">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar usuario por nombre, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                            />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="flex items-center gap-2 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Derecha: Contador y Botón */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        <div className="text-sm text-slate-500 hidden md:block">
                            <span className="font-semibold text-slate-900">
                                {filteredUsers.length}
                            </span>{" "}
                            usuarios
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden lg:block" />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchUsers()}
                            disabled={loading}
                            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm h-9 px-3 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <RefreshCw
                                className={cn(
                                    "w-3.5 h-3.5 mr-2",
                                    loading && "animate-spin"
                                )}
                            />
                            Actualizar
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setIsCreateModalOpen(true)}
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nuevo Usuario
                        </Button>
                    </div>
                </div>

                {/* Tabla */}
                <DataTable
                    columns={columns}
                    data={filteredUsers}
                    searchable={false}
                    pagination
                />
            </div>

            {/* Modal Crear */}
            <Dialog
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
            >
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Usuario *</Label>
                                <Input
                                    value={formData.username}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            username: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label>Email *</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nombre *</Label>
                                <Input
                                    value={formData.first_name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            first_name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label>Apellido *</Label>
                                <Input
                                    value={formData.last_name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            last_name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Contraseña *</Label>
                                <div className="relative">
                                    <Input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={formData.password}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                password: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <Label>Confirmar Contraseña *</Label>
                                <div className="relative">
                                    <Input
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        value={formData.password_confirm}
                                        onChange={(e) =>
                                            setFormData({
                                                ...formData,
                                                password_confirm:
                                                    e.target.value,
                                            })
                                        }
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <SelectERP
                                    label="Rol"
                                    value={formData.role}
                                    onChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            role: value,
                                        })
                                    }
                                    options={[
                                        { id: "operativo", name: "Operativo" },
                                        {
                                            id: "operativo2",
                                            name: "Operativo 2",
                                        },
                                        { id: "admin", name: "Administrador" },
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-8">
                                <input
                                    type="checkbox"
                                    id="is_active_create"
                                    checked={formData.is_active}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            is_active: e.target.checked,
                                        })
                                    }
                                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                />
                                <Label htmlFor="is_active_create">
                                    Usuario Activo
                                </Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsCreateModalOpen(false);
                                    resetForm();
                                }}
                                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Crear Usuario
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Editar */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>Editar Usuario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Usuario</Label>
                                <Input
                                    value={formData.username}
                                    disabled
                                    className="bg-slate-50 text-slate-500 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <Label>Email *</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            email: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Nombre *</Label>
                                <Input
                                    value={formData.first_name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            first_name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label>Apellido *</Label>
                                <Input
                                    value={formData.last_name}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            last_name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <SelectERP
                                    label="Rol"
                                    value={formData.role}
                                    onChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            role: value,
                                        })
                                    }
                                    options={[
                                        { id: "operativo", name: "Operativo" },
                                        {
                                            id: "operativo2",
                                            name: "Operativo 2",
                                        },
                                        { id: "admin", name: "Administrador" },
                                    ]}
                                    getOptionLabel={(opt) => opt.name}
                                    getOptionValue={(opt) => opt.id}
                                    required
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-8">
                                <input
                                    type="checkbox"
                                    id="is_active_edit"
                                    checked={formData.is_active}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            is_active: e.target.checked,
                                        })
                                    }
                                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-500"
                                />
                                <Label htmlFor="is_active_edit">
                                    Usuario Activo
                                </Label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    resetForm();
                                }}
                                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Actualizar
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Cambiar Contraseña */}
            <Dialog
                open={isChangePasswordModalOpen}
                onOpenChange={setIsChangePasswordModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Cambiar Contraseña</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                        <div>
                            <Label>Nueva Contraseña *</Label>
                            <Input
                                type="password"
                                value={passwordData.new_password}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        new_password: e.target.value,
                                    })
                                }
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <Label>Confirmar Contraseña *</Label>
                            <Input
                                type="password"
                                value={passwordData.confirm_password}
                                onChange={(e) =>
                                    setPasswordData({
                                        ...passwordData,
                                        confirm_password: e.target.value,
                                    })
                                }
                                required
                                minLength={6}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsChangePasswordModalOpen(false);
                                    setPasswordData({
                                        new_password: "",
                                        confirm_password: "",
                                    });
                                }}
                                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Cambiar Contraseña
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={confirmDeleteDialog.open}
                onClose={() => setConfirmDeleteDialog({ open: false, id: null })}
                onConfirm={confirmDelete}
                title="¿Eliminar Usuario?"
                description="Esta acción eliminará permanentemente al usuario y no se podrá deshacer."
                confirmText="Eliminar"
                cancelText="Cancelar"
                variant="danger"
            />
        </div>
    );
}

export default Users;
