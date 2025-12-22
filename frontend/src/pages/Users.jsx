import React, { useState, useEffect, useMemo } from "react";
import {
    Plus,
    Shield,
    UserCircle,
    Mail,
    Eye,
    EyeOff,
    Search,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Badge,
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

    useEffect(() => {
        // Solo admin puede ver usuarios
        if (currentUser?.role !== "admin") {
            toast.error("No tienes permisos para acceder a esta sección");
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
            toast.error("Error al cargar usuarios");
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
            toast.success("Usuario creado exitosamente");
            setIsCreateModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Error al crear usuario"
            );
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const dataToSend = { ...formData };
            delete dataToSend.password; // No enviar password en edición

            await axios.patch(`/users/${selectedUser.id}/`, dataToSend);
            toast.success("Usuario actualizado exitosamente");
            setIsEditModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            toast.error("Error al actualizar usuario");
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();

        if (passwordData.new_password !== passwordData.confirm_password) {
            toast.error("Las contraseñas no coinciden");
            return;
        }

        try {
            await axios.post(`/users/${selectedUser.id}/change_password/`, {
                password: passwordData.new_password,
            });
            toast.success("Contraseña actualizada exitosamente");
            setIsChangePasswordModalOpen(false);
            setPasswordData({ new_password: "", confirm_password: "" });
        } catch (error) {
            toast.error("Error al cambiar contraseña");
        }
    };

    const handleDelete = async (id) => {
        if (
            !window.confirm(
                "¿Eliminar este usuario? Esta acción no se puede deshacer."
            )
        )
            return;

        try {
            await axios.delete(`/users/${id}/`);
            toast.success("Usuario eliminado exitosamente");
            fetchUsers();
        } catch (error) {
            toast.error("Error al eliminar usuario");
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
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                        {row.first_name?.[0] || row.username[0].toUpperCase()}
                    </div>
                    <span className="font-medium">{row.username}</span>
                </div>
            ),
        },
        {
            accessor: "email",
            header: "Email",
            render: (row) => (
                <div className="py-2 text-sm text-gray-700">{row.email}</div>
            ),
        },
        {
            header: "Nombre Completo",
            render: (row) => (
                <div className="py-2 text-sm text-gray-900">
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
            render: (row) => (
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(row);
                        }}
                    >
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            openChangePasswordModal(row);
                        }}
                    >
                        Cambiar Contraseña
                    </Button>
                    {currentUser?.id !== row.id && (
                        <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(row.id);
                            }}
                        >
                            Eliminar
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    if (currentUser?.role !== "admin") {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900">
                        Acceso Denegado
                    </h2>
                    <p className="text-sm text-gray-500 mt-2">
                        Solo los administradores pueden gestionar usuarios
                    </p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <SkeletonTable rows={5} columns={5} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Gestión de Usuarios
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Administra los usuarios y sus permisos en el sistema
                    </p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Usuario
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Total Usuarios
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.length}
                                </p>
                            </div>
                            <UserCircle className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Usuarios Activos
                                </p>
                                <p className="text-2xl font-bold text-green-600">
                                    {users.filter((u) => u.is_active).length}
                                </p>
                            </div>
                            <Shield className="h-8 w-8 text-green-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Administradores
                                </p>
                                <p className="text-2xl font-bold text-red-600">
                                    {
                                        users.filter((u) => u.role === "admin")
                                            .length
                                    }
                                </p>
                            </div>
                            <Shield className="h-8 w-8 text-red-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar usuario por nombre, email..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="px-5 pb-5 pt-0">
                    <DataTable
                        columns={columns}
                        data={filteredUsers}
                        searchable={false}
                        pagination
                    />
                </CardContent>
            </Card>

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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                                    className="rounded border-gray-300"
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
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">Crear Usuario</Button>
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
                                    className="bg-gray-50"
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
                                    className="rounded border-gray-300"
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
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">Actualizar</Button>
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
                            >
                                Cancelar
                            </Button>
                            <Button type="submit">Cambiar Contraseña</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Users;
