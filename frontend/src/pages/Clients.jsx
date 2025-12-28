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
    Edit2,
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
    Skeleton,
    SkeletonTable,
} from "../components/ui";
import ExportButton from "../components/ui/ExportButton";
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

// ============================================
// KPI CARD - CORPORATE STYLE (Aligned with ProviderPayments)
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
    const [isExporting, setIsExporting] = useState(false);

    // Stats
    const stats = useMemo(() => {
        const total = clients.length;
        const active = clients.filter((c) => c.is_active).length;
        const withCredit = clients.filter(
            (c) => c.payment_condition === "credito"
        ).length;
        const granContribuyente = clients.filter(
            (c) => c.is_gran_contribuyente
        ).length;

        return { total, active, withCredit, granContribuyente };
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

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse mt-2">
                {/* KPIs Skeleton */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>

                {/* Table Skeleton */}
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex gap-4 justify-between">
                        <Skeleton className="h-9 flex-1 max-w-2xl rounded-lg" />
                        <div className="flex gap-2">
                            <Skeleton className="h-9 w-24 rounded-lg" />
                            <Skeleton className="h-9 w-32 rounded-lg" />
                            <Skeleton className="h-9 w-32 rounded-lg" />
                        </div>
                    </div>
                    <div className="p-0">
                        <SkeletonTable rows={10} columns={6} />
                    </div>
                </div>
            </div>
        );
    }

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
    const exportToExcel = async (exportType = "all") => {
        const dataToExport = exportType === "filtered" ? filteredClients : clients;

        if (dataToExport.length === 0) {
            toast.error("No hay datos para exportar");
            return;
        }

        try {
            setIsExporting(true);

            const params = new URLSearchParams();

            // Solo aplicar filtros si es exportación filtrada
            if (exportType === "filtered") {
                if (searchTerm) params.append("search", searchTerm);
                if (statusFilter)
                    params.append(
                        "is_active",
                        statusFilter === "active" ? "True" : "False"
                    );
                if (paymentFilter)
                    params.append("payment_condition", paymentFilter);
            }

            const response = await axios.get("/clients/export_clients_excel/", {
                params,
                responseType: "blob",
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = exportType === "filtered"
                ? `GPRO_Clientes_Filtrados_${timestamp}.xlsx`
                : `GPRO_Clientes_${timestamp}.xlsx`;
            link.setAttribute("download", filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            const message = exportType === "filtered"
                ? `${dataToExport.length} cliente(s) exportado(s)`
                : "Todos los clientes exportados correctamente";
            toast.success(message);
        } catch {
            toast.error("Error al exportar clientes");
        } finally {
            setIsExporting(false);
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
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-3 py-1">
                    <div className="w-9 h-9 rounded bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                        <div className="font-semibold text-slate-700 truncate text-sm">
                            {row.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                            NIT: {row.nit}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            header: "Contacto",
            accessor: "contact_person",
            sortable: false,
            render: (row) => (
                <div className="text-sm py-1">
                    <div className="text-slate-700 font-medium">
                        {row.contact_person || "—"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                        {row.email || row.phone || "—"}
                    </div>
                </div>
            ),
        },
        {
            header: "Condición",
            accessor: "payment_condition",
            sortable: false,
            render: (row) => (
                <Badge
                    variant={
                        row.payment_condition === "credito" ? "info" : "default"
                    }
                    className="uppercase text-[9px] font-bold tracking-wider"
                >
                    {row.payment_condition === "credito"
                        ? "Crédito"
                        : "Contado"}
                </Badge>
            ),
        },
        {
            header: "Crédito",
            accessor: "credit_limit",
            sortable: false,
            render: (row) => (
                <div className="text-right py-1">
                    {row.payment_condition === "credito" ? (
                        <span className="font-semibold text-slate-700 tabular-nums text-xs">
                            {formatCurrency(row.credit_limit)}
                        </span>
                    ) : (
                        <span className="text-slate-300">—</span>
                    )}
                </div>
            ),
        },
        {
            header: "Estado",
            accessor: "is_active",
            sortable: false,
            render: (row) => (
                <div className="flex items-center gap-1.5 py-1">
                    {row.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
                            Activo
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-200 uppercase tracking-wide">
                            Inactivo
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: "Acciones",
            accessor: "actions",
            className: "w-[140px] text-center",
            headerClassName: "text-center",
            sortable: false,
            render: (row) => (
                <div className="grid grid-cols-3 gap-1 w-full max-w-[100px] mx-auto">
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                viewClientDetails(row);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                            title="Ver detalles"
                        >
                            <Eye className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${row.id}/edit`);
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
                                toggleClientStatus(row);
                            }}
                            className={cn(
                                "p-1.5 rounded-md transition-colors",
                                row.is_active
                                    ? "text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                    : "text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                            )}
                            title={row.is_active ? "Desactivar" : "Activar"}
                        >
                            {row.is_active ? (
                                <XCircle className="w-4 h-4" />
                            ) : (
                                <CheckCircle className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 mt-2">
            {/* Bloque Superior (Estratégico): KPIs Compactos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <KPICard
                    label="Total Clientes"
                    value={stats.total}
                    icon={Building2}
                />
                <KPICard
                    label="Activos"
                    value={stats.active}
                    icon={CheckCircle}
                />
                <KPICard
                    label="Inactivos"
                    value={stats.total - stats.active}
                    icon={XCircle}
                />
                <KPICard
                    label="Con Crédito"
                    value={stats.withCredit}
                    icon={CreditCard}
                />
                <KPICard
                    label="Gran Contribuyente"
                    value={stats.granContribuyente}
                    icon={FileText}
                />
            </div>

            {/* Bloque Operativo: Tabla + Acciones */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
                {/* Barra de Herramientas Unificada */}
                <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row items-center justify-between gap-4 bg-slate-50/30">
                    {/* Izquierda: Buscador y Filtros */}
                    <div className="flex items-center gap-3 flex-1 w-full lg:max-w-2xl">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, NIT, email o contacto..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:border-slate-400 focus:outline-none focus:ring-0 transition-all placeholder:text-slate-400 bg-white"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                            className={cn(
                                "border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all whitespace-nowrap",
                                isFiltersOpen &&
                                    "ring-2 ring-slate-900/5 border-slate-900 bg-slate-50"
                            )}
                        >
                            <Filter className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Filtros
                            {hasActiveFilters && (
                                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-slate-900 text-white rounded-full">
                                    {(statusFilter ? 1 : 0) +
                                        (paymentFilter ? 1 : 0)}
                                </span>
                            )}
                        </Button>
                    </div>

                    {/* Derecha: Botones de Acción */}
                    <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                        <div className="text-sm text-slate-500 hidden md:block">
                            <span className="font-semibold text-slate-900">
                                {filteredClients.length}
                            </span>{" "}
                            clientes
                        </div>
                        <div className="h-6 w-px bg-slate-200 hidden lg:block" />

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchClients}
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

                        <ExportButton
                            onExportAll={() => exportToExcel("all")}
                            onExportFiltered={() => exportToExcel("filtered")}
                            filteredCount={filteredClients.length}
                            totalCount={clients.length}
                            isExporting={isExporting}
                            allLabel="Todos los Clientes"
                            allDescription="Exportar el registro completo de clientes"
                            filteredLabel="Clientes Filtrados"
                            filteredDescription="Exportar solo los clientes visibles actualmente"
                        />

                        <Button
                            size="sm"
                            onClick={() => navigate("/clients/new")}
                            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm h-9 px-4 transition-all active:scale-95 whitespace-nowrap"
                        >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Nuevo Cliente
                        </Button>
                    </div>
                </div>

                {/* Panel de Filtros Expandido */}
                {isFiltersOpen && (
                    <div className="p-5 bg-slate-50 border-b border-slate-200 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            <SelectERP
                                label="Estado"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={statusOptions}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                                placeholder="Todos los estados"
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
                            />
                        </div>
                        <div className="flex justify-end pt-5">
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter(null);
                                    setPaymentFilter(null);
                                }}
                                className="flex items-center gap-2 text-xs font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wider"
                            >
                                <XCircle className="w-4 h-4" />
                                Restablecer Filtros
                            </button>
                        </div>
                    </div>
                )}

                {/* Contenido de la Tabla */}
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Spinner size="lg" />
                    </div>
                ) : filteredClients.length === 0 ? (
                    <div className="p-8">
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
                                        className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Crear primer cliente
                                    </Button>
                                )
                            }
                        />
                    </div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={filteredClients}
                        searchable={false}
                        onRowClick={(row) => viewClientDetails(row)}
                        emptyMessage="No hay clientes"
                    />
                )}
            </div>

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
                                {formatDateTime(selectedClient.created_at, {
                                    includeTime: true,
                                })}
                            </span>
                            <span>
                                Actualizado:{" "}
                                {formatDateTime(selectedClient.updated_at, {
                                    includeTime: true,
                                })}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    navigate(
                                        `/account-statements?client=${selectedClient.id}`
                                    )
                                }
                                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Estado de Cuenta
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    navigate(
                                        `/service-orders?client=${selectedClient.id}`
                                    )
                                }
                                className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Nueva Orden
                            </Button>
                            <Button
                                size="sm"
                                onClick={() =>
                                    navigate(
                                        `/clients/${selectedClient.id}/edit`
                                    )
                                }
                                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all active:scale-95"
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
