import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Users,
    Search,
    Plus,
    Phone,
    Mail,
    Building2, // Replaced BuildingOfficeIcon
    BarChart3, // Replaced ChartBarIcon
    Clock,
    CheckCircle,
    DollarSign,
    FileText,
    Truck,
    AlertCircle, // For error messages
    Loader2 // For loading states
} from "lucide-react";
import { 
    Card, 
    CardHeader, 
    CardTitle, 
    CardContent,
    Badge, 
    Button, 
    Input, 
    Modal, 
    ModalFooter, 
    Label // Assuming Label exists in ui
} from "../components/ui"; // Consolidated import
import { LoadingState } from "../components/ui/Spinner"; // Keep specific import for spinner
import EmptyState from "../components/ui/EmptyState";
import api from "../lib/axios";

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
            const response = await api.get("/clients/clients/");
            setClients(response.data);
        } catch (error) {
            console.error("Error fetching clients:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchClientDetails = async (clientId) => {
        try {
            const response = await api.get(`/clients/clients/${clientId}/`);
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

    if (loading) return <LoadingState message="Cargando clientes..." />;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Clientes
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestiona tu base de datos de clientes y su información financiera.
                    </p>
                </div>
                <Button onClick={() => navigate("/clients/new")}>
                    <Plus className="h-4 w-4 mr-2" /> Nuevo Cliente
                </Button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary-50 rounded-lg">
                                <Users className="h-5 w-5 text-primary-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                    Total Clientes
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {clients.length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary-50 rounded-lg">
                                <CheckCircle className="h-5 w-5 text-secondary-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                    Activos
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {clients.filter((c) => c.is_active).length}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 rounded-lg"> {/* Using generic purple from Tailwind */}
                                <DollarSign className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                    Crédito Total
                                </p>
                                <p className="text-lg font-bold text-gray-900">
                                    $
                                    {clients
                                        .reduce(
                                            (sum, c) =>
                                                sum +
                                                parseFloat(c.credit_limit || 0),
                                            0
                                        )
                                        .toLocaleString("en-US", {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-accent-50 rounded-lg">
                                <Clock className="h-5 w-5 text-accent-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">
                                    Con Crédito
                                </p>
                                <p className="text-xl font-bold text-gray-900">
                                    {
                                        clients.filter(
                                            (c) => c.payment_condition === "credito"
                                        ).length
                                    }
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search and Filters */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Buscar por nombre, NIT o email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant={filterStatus === "all" ? "default" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus("all")}
                            >
                                Todos ({clients.length})
                            </Button>
                            <Button
                                variant={filterStatus === "active" ? "secondary" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus("active")}
                            >
                                Activos ({clients.filter((c) => c.is_active).length}
                                )
                            </Button>
                            <Button
                                variant={filterStatus === "inactive" ? "destructive" : "outline"}
                                size="sm"
                                onClick={() => setFilterStatus("inactive")}
                            >
                                Inactivos (
                                {clients.filter((c) => !c.is_active).length})
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
                        <Button onClick={() => navigate("/clients/new")}>
                            <Plus className="h-4 w-4 mr-2" /> Crear Primer Cliente
                        </Button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredClients.map((client) => (
                        <Card
                            key={client.id}
                            onClick={() => fetchClientDetails(client.id)}
                            className="cursor-pointer hover:shadow-lg hover:border-primary-300 transition-all duration-200"
                        >
                            <CardContent className="p-5">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900 text-base mb-0.5">
                                            {client.name}
                                        </h3>
                                        <p className="text-xs text-gray-500">
                                            NIT: {client.nit}
                                        </p>
                                    </div>
                                    <Badge
                                        variant={
                                            client.is_active
                                                ? "secondary" // Active is green
                                                : "destructive" // Inactive is red
                                        }
                                    >
                                        {client.is_active ? "Activo" : "Inactivo"}
                                    </Badge>
                                </div>

                                {/* Contact Info */}
                                <div className="space-y-1.5 mb-3">
                                    {client.email && (
                                        <div className="flex items-center text-xs text-gray-600">
                                            <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                            <span className="truncate">
                                                {client.email}
                                            </span>
                                        </div>
                                    )}
                                    {client.phone && (
                                        <div className="flex items-center text-xs text-gray-600">
                                            <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                            {client.phone}
                                        </div>
                                    )}
                                </div>

                                {/* Credit Info */}
                                {client.payment_condition === "credito" && (
                                    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-lg p-3 mb-3">
                                        <div className="flex justify-between items-center mb-1.5">
                                            <span className="text-xs font-medium text-primary-700">
                                                Límite de Crédito
                                            </span>
                                            <span className="text-sm font-bold text-primary-900">
                                                $
                                                {parseFloat(
                                                    client.credit_limit || 0
                                                ).toLocaleString("en-US", {
                                                    minimumFractionDigits: 0,
                                                })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-medium text-primary-700">
                                                Plazo
                                            </span>
                                            <span className="text-sm font-bold text-primary-900">
                                                {client.credit_days} días
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {client.payment_condition !== "credito" && (
                                    <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                                        <span className="text-xs font-medium text-gray-600">
                                            💵 Pago de Contado
                                        </span>
                                    </div>
                                )}

                                {/* Footer info */}
                                <div className="pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-500">
                                        Click para ver detalles completos
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
                    size="xl"
                >
                    <div className="space-y-6">
                        {/* Client Header */}
                        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {selectedClient.name}
                                    </h2>
                                    <Badge
                                        variant={
                                            selectedClient.is_active
                                                ? "secondary"
                                                : "destructive"
                                        }
                                    >
                                        {selectedClient.is_active ? "Activo" : "Inactivo"}
                                    </Badge>
                                </div>
                                <p className="text-gray-600">
                                    NIT: {selectedClient.nit}
                                </p>
                                <p className="text-gray-600">
                                    Registro IVA:{" "}
                                    {selectedClient.iva_registration}
                                </p>
                            </div>
                        </div>

                        {/* Contact Information */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                                Información de Contacto
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Email
                                    </p>
                                    <p className="text-gray-900">
                                        {selectedClient.email ||
                                            "No especificado"}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Teléfono
                                    </p>
                                    <p className="text-gray-900">
                                        {selectedClient.phone ||
                                            "No especificado"}
                                    </p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-sm text-gray-500">
                                        Dirección
                                    </p>
                                    <p className="text-gray-900">
                                        {selectedClient.address}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Persona de Contacto
                                    </p>
                                    <p className="text-gray-900">
                                        {selectedClient.contact_person ||
                                            "No especificado"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Payment Terms */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                                Términos de Pago
                            </h3>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Condición
                                    </p>
                                    <Badge
                                        variant={
                                            selectedClient.payment_condition ===
                                            "credito"
                                                ? "default" // Credit default blue
                                                : "secondary" // Contado green
                                        }
                                    >
                                        {selectedClient.payment_condition ===
                                        "credito"
                                            ? "Crédito"
                                            : "Contado"}
                                    </Badge>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Límite de Crédito
                                    </p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        $
                                        {parseFloat(
                                            selectedClient.credit_limit || 0
                                        ).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">
                                        Días de Crédito
                                    </p>
                                    <p className="text-lg font-semibold text-gray-900">
                                        {selectedClient.credit_days} días
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {selectedClient.notes && (
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-3 border-b pb-2">
                                    Notas
                                </h3>
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-gray-700">
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
                            onClick={() =>
                                navigate(
                                    `/service-orders?client=${selectedClient.id}`
                                )
                            }
                        >
                            <Plus className="h-4 w-4 mr-2" /> Nueva Orden
                        </Button>
                    </ModalFooter>
                </Modal>
            )}
        </div>
    );
}

export default Clients;