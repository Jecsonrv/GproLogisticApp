import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Search,
    Plus,
    Phone,
    Mail,
    Building2,
    Clock,
    CheckCircle,
    DollarSign,
    CreditCard,
    AlertCircle,
    FileText,
    Edit,
    Calendar,
    ArrowRight,
} from "lucide-react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    StatCard,
} from "../components/ui/Card";
import { Badge, StatusBadge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import Modal, { ModalFooter } from "../components/ui/Modal";
import { Label } from "../components/ui/Label";
import { LoadingState } from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import api from "../lib/axios";
import { cn, formatCurrency } from "../lib/utils";

/**
 * Clients Module - Design System Corporativo GPRO
 * Directorio de clientes con gestión de crédito
 */
function Clients() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedClient, setSelectedClient] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await api.get("/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientDetails = async (clientId) => {
        try {
            const response = await api.get(`/clients/${clientId}/`);
            setSelectedClient(response.data);
            setShowDetailsModal(true);
        } catch (error) {
            console.error("Error fetching client details:", error);
        }
    };

    const filteredClients = clients.filter((client) => {
        const matchesSearch =
            client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            client.nit.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.email &&
                client.email.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesFilter =
            filterStatus === "all" ||
            (filterStatus === "active" && client.is_active) ||
            (filterStatus === "inactive" && !client.is_active);

        return matchesSearch && matchesFilter;
    });

    // Stats calculations
    const stats = {
        total: clients.length,
        active: clients.filter((c) => c.is_active).length,
        inactive: clients.filter((c) => !c.is_active).length,
        withCredit: clients.filter((c) => c.payment_condition === "credito")
            .length,
        totalCreditLimit: clients.reduce(
            (sum, c) => sum + parseFloat(c.credit_limit || 0),
            0
        ),
    };

    if (loading) {
        return <LoadingState message="Cargando clientes..." />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Clientes
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestiona tu directorio de clientes y condiciones de
                        crédito
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/clients/new")}
                    className="gap-1.5"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Cliente
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    title="Total Clientes"
                    value={stats.total}
                    icon={Users}
                />
                <StatCard
                    title="Activos"
                    value={stats.active}
                    icon={CheckCircle}
                />
                <StatCard
                    title="Con Crédito"
                    value={stats.withCredit}
                    icon={CreditCard}
                />
                <StatCard
                    title="Crédito Total"
                    value={formatCurrency(stats.totalCreditLimit, {
                        maximumFractionDigits: 0,
                    })}
                    icon={DollarSign}
                />
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Buscar por nombre, NIT o email..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={
                                    filterStatus === "all"
                                        ? "default"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setFilterStatus("all")}
                            >
                                Todos ({stats.total})
                            </Button>
                            <Button
                                variant={
                                    filterStatus === "active"
                                        ? "success"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setFilterStatus("active")}
                            >
                                Activos ({stats.active})
                            </Button>
                            <Button
                                variant={
                                    filterStatus === "inactive"
                                        ? "destructive"
                                        : "outline"
                                }
                                size="sm"
                                onClick={() => setFilterStatus("inactive")}
                            >
                                Inactivos ({stats.inactive})
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Clients Grid */}
            {filteredClients.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="No se encontraron clientes"
                    description="Intenta ajustar los filtros o crea un nuevo cliente"
                    action={
                        <Button
                            onClick={() => navigate("/clients/new")}
                            className="gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Crear Primer Cliente
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map((client) => (
                        <Card
                            key={client.id}
                            onClick={() => fetchClientDetails(client.id)}
                            className="cursor-pointer hover:shadow-md hover:border-brand-300 transition-all duration-150"
                        >
                            <CardContent className="p-4">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                                            {client.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            NIT: {client.nit}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            client.is_active
                                                ? "success"
                                                : "danger"
                                        }
                                    >
                                        {client.is_active
                                            ? "Activo"
                                            : "Inactivo"}
                                    </Badge>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-1.5 mb-3">
                                    {client.email && (
                                        <div className="flex items-center text-xs text-slate-600">
                                            <Mail className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                                            <span className="truncate">
                                                {client.email}
                                            </span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center text-xs text-slate-600">
                                            <Phone className="h-3.5 w-3.5 mr-1.5 text-slate-400 flex-shrink-0" />
                                            {client.phone}
                                        </div>
                                    )}
                                </div>

                                {/* Credit Info */}
                                {client.payment_condition === "credito" ? (
                                    <div className="bg-brand-50 border border-brand-100 rounded p-2.5 mb-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-medium text-brand-700">
                                                Límite de Crédito
                                            </span>
                                            <span className="text-sm font-bold text-brand-900 tabular-nums">
                                                {formatCurrency(
                                                    client.credit_limit || 0,
                                                    { maximumFractionDigits: 0 }
                                                )}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-brand-700">
                                                Plazo
                                            </span>
                                            <span className="text-sm font-bold text-brand-900">
                                                {client.credit_days} días
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 border border-slate-100 rounded p-2.5 mb-3 text-center">
                                        <span className="text-xs font-medium text-slate-600">
                                            Pago de Contado
                                        </span>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="pt-2 border-t border-slate-100">
                                    <p className="text-xs text-slate-400">
                                        Click para ver detalles
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Client Details Modal */}
            {selectedClient && (
                <Modal
                    isOpen={showDetailsModal}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedClient(null);
                    }}
                    title={selectedClient.name}
                    size="2xl"
                >
                    <div className="space-y-5">
                        {/* Client Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        {selectedClient.name}
                                    </h2>
                                    <Badge
                                        variant={
                                            selectedClient.is_active
                                                ? "success"
                                                : "danger"
                                        }
                                    >
                                        {selectedClient.is_active
                                            ? "Activo"
                                            : "Inactivo"}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-600">
                                    NIT: {selectedClient.nit}
                                </p>
                                {selectedClient.iva_registration && (
                                    <p className="text-sm text-slate-600">
                                        Registro IVA:{" "}
                                        {selectedClient.iva_registration}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                                Información de Contacto
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Email
                                    </p>
                                    <p className="text-sm text-slate-900">
                                        {selectedClient.email ||
                                            "No especificado"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Teléfono
                                    </p>
                                    <p className="text-sm text-slate-900">
                                        {selectedClient.phone ||
                                            "No especificado"}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Dirección
                                    </p>
                                    <p className="text-sm text-slate-900">
                                        {selectedClient.address ||
                                            "No especificada"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Persona de Contacto
                                    </p>
                                    <p className="text-sm text-slate-900">
                                        {selectedClient.contact_person ||
                                            "No especificado"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Terms */}
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                                Términos de Pago
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Condición
                                    </p>
                                    <Badge
                                        variant={
                                            selectedClient.payment_condition ===
                                            "credito"
                                                ? "primary"
                                                : "secondary"
                                        }
                                    >
                                        {selectedClient.payment_condition ===
                                        "credito"
                                            ? "Crédito"
                                            : "Contado"}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Límite de Crédito
                                    </p>
                                    <p className="text-lg font-semibold text-slate-900 tabular-nums">
                                        {formatCurrency(
                                            selectedClient.credit_limit || 0
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                                        Días de Crédito
                                    </p>
                                    <p className="text-lg font-semibold text-slate-900">
                                        {selectedClient.credit_days || 0} días
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedClient.notes && (
                            <div>
                                <h3 className="text-sm font-semibold text-slate-900 mb-3 pb-2 border-b border-slate-100">
                                    Notas
                                </h3>
                                <div className="bg-slate-50 rounded p-3">
                                    <p className="text-sm text-slate-700">
                                        {selectedClient.notes}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    <ModalFooter>
                        <Button
                            variant="ghost"
                            onClick={() => setShowDetailsModal(false)}
                        >
                            Cerrar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/clients/${selectedClient.id}/edit`)}
                            className="gap-1.5"
                        >
                            <Edit className="h-4 w-4" />
                            Editar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate(`/account-statements?client=${selectedClient.id}`)}
                            className="gap-1.5"
                        >
                            <FileText className="h-4 w-4" />
                            Estado de Cuenta
                        </Button>
                        <Button
                            onClick={() =>
                                navigate(
                                    `/service-orders?client=${selectedClient.id}`
                                )
                            }
                            className="gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Nueva Orden
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

export default Clients;
