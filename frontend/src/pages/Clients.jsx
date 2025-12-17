import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    Plus,
    Search,
    Download,
    RefreshCw,
    Building2,
    CreditCard,
    FileText,
    Edit,
    Eye,
    MoreHorizontal,
    X,
    CheckCircle,
    XCircle,
    Filter,
} from "lucide-react";
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    Badge,
    DataTable,
    Modal,
    SelectERP,
    Spinner,
    EmptyState,
} from "../components/ui";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
} from "../components/ui/DropdownMenu";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { formatCurrency, cn, formatDateTime } from "../lib/utils";

/**
 * Clients - Gestión de Clientes
 * Diseño ERP Profesional
 */

// KPI Card consistente con otras páginas
const KPICard = ({ title, value, variant = "default" }) => {
    const variants = {
        default: "text-slate-900",
        success: "text-emerald-600",
        muted: "text-slate-400",
        info: "text-blue-600",
        purple: "text-purple-600",
    };

    return (
        <Card>
            <CardContent className="p-5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                    {title}
                </p>
                <p
                    className={cn(
                        "text-2xl font-semibold mt-1.5",
                        variants[variant]
                    )}
                >
                    {value}
                </p>
            </CardContent>
        </Card>
    );
};

function Clients() {
    const navigate = useNavigate();

    // State
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState(null);
    const [paymentFilter, setPaymentFilter] = useState(null);
    const [selectedClient, setSelectedClient] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    // Stats
    const stats = useMemo(() => {
        const total = clients.length;
        const active = clients.filter((c) => c.is_active).length;
        const inactive = total - active;
        const withCredit = clients.filter(
            (c) => c.payment_condition === "credito"
        ).length;
        const granContribuyente = clients.filter(
            (c) => c.is_gran_contribuyente
        ).length;

        return { total, active, inactive, withCredit, granContribuyente };
    }, [clients]);

    // Fetch clients
    const fetchClients = async () => {
        try {
            setLoading(true);
            const response = await axios.get("/clients/");
            setClients(response.data);
        } catch {
            toast.error("Error al cargar clientes");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClients();
    }, []);

    // Filter clients
    const filteredClients = useMemo(() => {
        return clients.filter((client) => {
            const matchesSearch =
                !searchTerm ||
                client.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.nit?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                client.email
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase()) ||
                client.contact_person
                    ?.toLowerCase()
                    .includes(searchTerm.toLowerCase());

            const matchesStatus =
                !statusFilter ||
                (statusFilter === "active" && client.is_active) ||
                (statusFilter === "inactive" && !client.is_active);

            const matchesPayment =
                !paymentFilter || client.payment_condition === paymentFilter;

            return matchesSearch && matchesStatus && matchesPayment;
        });
    }, [clients, searchTerm, statusFilter, paymentFilter]);

    // Check if any filter is active
    const hasActiveFilters = statusFilter || paymentFilter;

    // Clear all filters
    const clearFilters = () => {
        setSearchTerm("");
        setStatusFilter(null);
        setPaymentFilter(null);
    };

    // Toggle client status
    const toggleClientStatus = async (client) => {
        try {
            await axios.patch(`/clients/${client.id}/`, {
                is_active: !client.is_active,
            });
            toast.success(
                `Cliente ${client.is_active ? "desactivado" : "activado"}`
            );
            fetchClients();
        } catch {
            toast.error("Error al actualizar estado");
        }
    };

    // View client details
    const viewClientDetails = (client) => {
        setSelectedClient(client);
        setIsDetailModalOpen(true);
    };

    // Export to Excel
    const exportToExcel = async () => {
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('search', searchTerm);
            if (statusFilter) params.append('is_active', statusFilter === 'active' ? 'True' : 'False');
            if (paymentFilter) params.append('payment_condition', paymentFilter);

            const response = await axios.get('/clients/export_clients_excel/', {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `clientes_gpro_${new Date().toISOString().slice(0, 10)}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Listado de clientes exportado correctamente");
        } catch (error) {
            console.error("Error exporting clients:", error);
            toast.error("Error al exportar clientes");
        }
    };

    // Status filter options
    const statusOptions = [
        { id: "active", name: "Activos" },
        { id: "inactive", name: "Inactivos" },
    ];

    // Payment filter options
    const paymentOptions = [
        { id: "contado", name: "Contado" },
        { id: "credito", name: "Crédito" },
    ];

    // Table columns
    const columns = [
        {
            header: "Cliente",
            accessor: "name",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-3 py-2">
                    <div className="w-9 h-9 rounded bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium text-slate-900 truncate">
                            {row.name}
                        </div>
                        {row.legal_name && row.legal_name !== row.name && (
                            <div className="text-xs text-slate-500 truncate">
                                {row.legal_name}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            header: "NIT",
            accessor: "nit",
            sortable: true,
            render: (row) => (
                <span className="font-mono text-sm text-slate-700 py-2">
                    {row.nit}
                </span>
            ),
        },
        {
            header: "Registro IVA",
            accessor: "iva_registration",
            render: (row) => (
                <span className="font-mono text-sm text-slate-600 py-2">
                    {row.iva_registration || "—"}
                </span>
            ),
        },
        {
            header: "Contacto",
            accessor: "contact_person",
            render: (row) => (
                <div className="text-sm py-2">
                    <div className="text-slate-700">
                        {row.contact_person || "—"}
                    </div>
                    <div className="text-xs text-slate-500">
                        {row.phone || "—"}
                    </div>
                </div>
            ),
        },
        {
            header: "Condición Pago",
            accessor: "payment_condition",
            sortable: true,
            render: (row) => (
                <div className="py-2">
                    <Badge
                        variant={
                            row.payment_condition === "credito"
                                ? "info"
                                : "default"
                        }
                    >
                        {row.payment_condition === "credito"
                            ? "Crédito"
                            : "Contado"}
                    </Badge>
                    {row.payment_condition === "credito" &&
                        row.credit_days > 0 && (
                            <div className="text-xs text-slate-500 mt-1">
                                {row.credit_days} días
                            </div>
                        )}
                </div>
            ),
        },
        {
            header: "Límite Crédito",
            accessor: "credit_limit",
            sortable: true,
            render: (row) => (
                <div className="text-right py-2">
                    {row.payment_condition === "credito" ? (
                        <span className="font-medium text-slate-900 tabular-nums">
                            {formatCurrency(row.credit_limit)}
                        </span>
                    ) : (
                        <span className="text-slate-400">—</span>
                    )}
                </div>
            ),
        },
        {
            header: "Tipo",
            accessor: "is_gran_contribuyente",
            render: (row) => (
                <div className="py-2">
                    {row.is_gran_contribuyente ? (
                        <Badge variant="purple" className="whitespace-nowrap">
                            Gran Contrib.
                        </Badge>
                    ) : (
                        <span className="text-slate-400 text-sm">Normal</span>
                    )}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "is_active",
            sortable: true,
            render: (row) => (
                <div className="flex items-center gap-1.5 py-2">
                    {row.is_active ? (
                        <>
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-sm text-emerald-700">
                                Activo
                            </span>
                        </>
                    ) : (
                        <>
                            <div className="w-2 h-2 rounded-full bg-slate-400" />
                            <span className="text-sm text-slate-500">
                                Inactivo
                            </span>
                        </>
                    )}
                </div>
            ),
        },
        {
            header: "",
            accessor: "actions",
            render: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            onClick={() => viewClientDetails(row)}
                        >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => navigate(`/clients/${row.id}/edit`)}
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                                navigate(`/account-statements?client=${row.id}`)
                            }
                        >
                            <FileText className="h-4 w-4 mr-2" />
                            Estado de cuenta
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() =>
                                navigate(`/client-pricing?client=${row.id}`)
                            }
                        >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Precios personalizados
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => toggleClientStatus(row)}
                            className={
                                row.is_active
                                    ? "text-amber-600"
                                    : "text-emerald-600"
                            }
                        >
                            {row.is_active ? (
                                <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Desactivar
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Activar
                                </>
                            )}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        Clientes
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestión de clientes y cuentas por cobrar
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchClients}
                        disabled={loading}
                    >
                        <RefreshCw
                            className={cn(
                                "h-4 w-4 mr-2",
                                loading && "animate-spin"
                            )}
                        />
                        Actualizar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportToExcel}
                        disabled={filteredClients.length === 0}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar Excel
                    </Button>
                    <Button onClick={() => navigate("/clients/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nuevo Cliente
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <KPICard title="Total Clientes" value={stats.total} />
                <KPICard
                    title="Activos"
                    value={stats.active}
                    variant="success"
                />
                <KPICard
                    title="Inactivos"
                    value={stats.inactive}
                    variant="muted"
                />
                <KPICard
                    title="Con Crédito"
                    value={stats.withCredit}
                    variant="info"
                />
                <KPICard
                    title="Gran Contribuyente"
                    value={stats.granContribuyente}
                    variant="purple"
                />
            </div>

            {/* Search, Filters and Table Card */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="flex items-center gap-2 flex-1 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por nombre, NIT, email o contacto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9"
                            />
                        </div>

                        <Button
                            variant={isFiltersOpen ? "secondary" : "outline"}
                            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            className={cn(isFiltersOpen && "bg-slate-100")}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filtros
                            {hasActiveFilters && (
                                <span className="ml-1.5 bg-brand-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                    {(statusFilter ? 1 : 0) +
                                        (paymentFilter ? 1 : 0)}
                                </span>
                            )}
                        </Button>

                        {(searchTerm || hasActiveFilters) && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearFilters}
                                className="text-red-600 hover:text-red-700"
                            >
                                <XCircle className="h-4 w-4 mr-1" />
                                Limpiar
                            </Button>
                        )}
                    </div>
                    <div className="text-sm text-slate-500 hidden md:block">
                        <span className="font-semibold text-slate-900">
                            {filteredClients.length}
                        </span>{" "}
                        clientes
                    </div>
                </CardHeader>

                {/* Filters Panel */}
                {isFiltersOpen && (
                    <CardContent className="pt-0 pb-4 border-b border-slate-100 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg">
                            <SelectERP
                                label="Estado"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={statusOptions}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                                placeholder="Todos los estados"
                                size="sm"
                            />
                            <SelectERP
                                label="Condición de Pago"
                                value={paymentFilter}
                                onChange={setPaymentFilter}
                                options={paymentOptions}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                                placeholder="Todas las condiciones"
                                size="sm"
                            />
                        </div>
                    </CardContent>
                )}

                {/* Table Content */}
                <CardContent className="px-5 pb-5 pt-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner size="lg" />
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <EmptyState
                            icon={Building2}
                            title="No se encontraron clientes"
                            description={
                                searchTerm || hasActiveFilters
                                    ? "Intenta ajustar los filtros de búsqueda"
                                    : "Comienza agregando tu primer cliente"
                            }
                            action={
                                !searchTerm &&
                                !hasActiveFilters && (
                                    <Button
                                        onClick={() => navigate("/clients/new")}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primer cliente
                                    </Button>
                                )
                            }
                        />
                    ) : (
                        <DataTable
                            columns={columns}
                            data={filteredClients}
                            searchable={false}
                            onRowClick={(row) => viewClientDetails(row)}
                            emptyMessage="No hay clientes"
                        />
                    )}
                </CardContent>
            </Card>

            {/* Detail Modal */}
            <Modal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                title="Detalle del Cliente"
                size="lg"
            >
                {selectedClient && (
                    <div className="space-y-6">
                        {/* Header info */}
                        <div className="flex items-start gap-4 pb-4 border-b border-slate-200">
                            <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center">
                                <Building2 className="w-7 h-7 text-slate-500" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-slate-900">
                                    {selectedClient.name}
                                </h3>
                                {selectedClient.legal_name &&
                                    selectedClient.legal_name !==
                                        selectedClient.name && (
                                        <p className="text-sm text-slate-500">
                                            {selectedClient.legal_name}
                                        </p>
                                    )}
                                <div className="flex items-center gap-2 mt-2">
                                    {selectedClient.is_active ? (
                                        <Badge variant="success">Activo</Badge>
                                    ) : (
                                        <Badge variant="default">
                                            Inactivo
                                        </Badge>
                                    )}
                                    {selectedClient.is_gran_contribuyente && (
                                        <Badge variant="purple">
                                            Gran Contribuyente
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Details grid */}
                        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    NIT
                                </label>
                                <p className="text-sm font-mono text-slate-900 mt-1">
                                    {selectedClient.nit}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Registro IVA
                                </label>
                                <p className="text-sm font-mono text-slate-900 mt-1">
                                    {selectedClient.iva_registration || "—"}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Teléfono
                                </label>
                                <p className="text-sm text-slate-900 mt-1">
                                    {selectedClient.phone || "—"}
                                    {selectedClient.secondary_phone && (
                                        <span className="text-slate-500">
                                            {" "}
                                            / {selectedClient.secondary_phone}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Email
                                </label>
                                <p className="text-sm text-slate-900 mt-1">
                                    {selectedClient.email || "—"}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Persona de Contacto
                                </label>
                                <p className="text-sm text-slate-900 mt-1">
                                    {selectedClient.contact_person || "—"}
                                </p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Condición de Pago
                                </label>
                                <p className="text-sm text-slate-900 mt-1">
                                    {selectedClient.payment_condition ===
                                    "credito"
                                        ? "Crédito"
                                        : "Contado"}
                                </p>
                            </div>
                            {selectedClient.payment_condition === "credito" && (
                                <>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Días de Crédito
                                        </label>
                                        <p className="text-sm font-medium text-slate-900 mt-1">
                                            {selectedClient.credit_days} días
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                            Límite de Crédito
                                        </label>
                                        <p className="text-sm font-medium text-slate-900 mt-1">
                                            {formatCurrency(
                                                selectedClient.credit_limit
                                            )}
                                        </p>
                                    </div>
                                </>
                            )}
                            <div className="col-span-2">
                                <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                    Dirección
                                </label>
                                <p className="text-sm text-slate-900 mt-1">
                                    {selectedClient.address || "—"}
                                </p>
                            </div>
                            {selectedClient.notes && (
                                <div className="col-span-2">
                                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                                        Notas
                                    </label>
                                    <p className="text-sm text-slate-700 mt-1 bg-slate-50 p-3 rounded">
                                        {selectedClient.notes}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Timestamps */}
                        <div className="pt-4 border-t border-slate-200 flex gap-6 text-xs text-slate-500">
                            <span>
                                Creado:{" "}
                                {formatDateTime(selectedClient.created_at, { includeTime: true })}
                            </span>
                            <span>
                                Actualizado:{" "}
                                {formatDateTime(selectedClient.updated_at, { includeTime: true })}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                            <Button
                                variant="outline"
                                onClick={() =>
                                    navigate(
                                        `/account-statements?client=${selectedClient.id}`
                                    )
                                }
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Estado de Cuenta
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() =>
                                    navigate(
                                        `/service-orders?client=${selectedClient.id}`
                                    )
                                }
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Orden
                            </Button>
                            <Button
                                onClick={() =>
                                    navigate(
                                        `/clients/${selectedClient.id}/edit`
                                    )
                                }
                            >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar Cliente
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default Clients;
