import React, { useState, useEffect } from "react";
import {
    Plus,
    Search,
    Filter,
    DollarSign,
    TrendingUp,
    TrendingDown,
    Download,
    FileText,
    Eye,
} from "lucide-react";
import {
    Button,
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    DataTable,
    Badge,
    Select,
    Input,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Label,
    FileUpload,
    Skeleton,
    SkeletonTable,
} from "../components/ui";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import { useTransfers } from "../hooks/useTransfers";

function Transfers() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState(null);
    const [serviceOrders, setServiceOrders] = useState([]);
    const [providers, setProviders] = useState([]);
    const [banks, setBanks] = useState([]);
    const [isExporting, setIsExporting] = useState(false);

    // Filtros
    const [filters, setFilters] = useState({
        transfer_type: "",
        status: "",
        month: "",
        service_order: "",
    });

    // Form data
    const [formData, setFormData] = useState({
        service_order: "",
        transfer_type: "terceros",
        provider: "",
        amount: "",
        bank: "",
        payment_method: "transferencia",
        supplier_invoice: "",
        status: "provisionada",
        notes: "",
        pdf_file: null,
    });

    const { data: transfers, isLoading, refetch } = useTransfers(filters);

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const fetchCatalogs = async () => {
        try {
            const [ordersRes, providersRes, banksRes] = await Promise.all([
                axios.get("/orders/service-orders/"),
                axios.get("/catalogs/providers/"),
                axios.get("/catalogs/banks/"),
            ]);
            setServiceOrders(ordersRes.data);
            setProviders(providersRes.data);
            setBanks(banksRes.data);
        } catch (error) {
            toast.error("Error al cargar catálogos");
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const formDataToSend = new FormData();
            Object.keys(formData).forEach((key) => {
                if (formData[key]) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            await axios.post("/transfers/", formDataToSend, {
                headers: { "Content-Type": "multipart/form-data" },
            });

            toast.success("Transferencia creada exitosamente");
            setIsCreateModalOpen(false);
            resetForm();
            refetch();
        } catch (error) {
            toast.error(
                error.response?.data?.message || "Error al crear transferencia"
            );
        }
    };

    const handleEdit = async (e) => {
        e.preventDefault();
        try {
            const formDataToSend = new FormData();
            Object.keys(formData).forEach((key) => {
                if (formData[key]) {
                    formDataToSend.append(key, formData[key]);
                }
            });

            await axios.patch(
                `/api/transfers/${selectedTransfer.id}/`,
                formDataToSend,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            toast.success("Transferencia actualizada");
            setIsEditModalOpen(false);
            resetForm();
            refetch();
        } catch (error) {
            toast.error("Error al actualizar transferencia");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Eliminar esta transferencia?")) return;

        try {
            await axios.delete(`/transfers/${id}/`);
            toast.success("Transferencia eliminada");
            refetch();
        } catch (error) {
            toast.error("Error al eliminar transferencia");
        }
    };

    const openEditModal = (transfer) => {
        setSelectedTransfer(transfer);
        setFormData({
            service_order: transfer.service_order?.id
                ? String(transfer.service_order.id)
                : "",
            transfer_type: transfer.transfer_type || "",
            provider: transfer.provider?.id ? String(transfer.provider.id) : "",
            amount: transfer.amount ? String(transfer.amount) : "",
            bank: transfer.bank?.id ? String(transfer.bank.id) : "",
            payment_method: transfer.payment_method || "transferencia",
            supplier_invoice: transfer.supplier_invoice || "",
            status: transfer.status || "pendiente",
            notes: transfer.notes || "",
            pdf_file: null,
        });
        setIsEditModalOpen(true);
    };

    const resetForm = () => {
        setFormData({
            service_order: "",
            transfer_type: "terceros",
            provider: "",
            amount: "",
            bank: "",
            payment_method: "transferencia",
            supplier_invoice: "",
            status: "provisionada",
            notes: "",
            pdf_file: null,
        });
        setSelectedTransfer(null);
    };

    const handleExportExcel = async () => {
        if (!transfers || transfers.length === 0) {
            toast.error("No hay transferencias para exportar");
            return;
        }

        try {
            setIsExporting(true);
            const response = await axios.get("/transfers/export_excel/", {
                responseType: "blob",
                params: filters,
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            const timestamp = new Date().toISOString().split("T")[0];
            link.setAttribute("download", `transferencias_${timestamp}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Archivo exportado exitosamente");
        } catch (error) {
            const message =
                error.response?.data?.error || "Error al exportar archivo";
            toast.error(message);
            console.error("Export error:", error);
        } finally {
            setIsExporting(false);
        }
    };

    const handleDownloadPDF = async (transferId) => {
        try {
            const response = await axios.get(
                `/transfers/${transferId}/download_pdf/`,
                {
                    responseType: "blob",
                }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `transfer_${transferId}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("PDF descargado exitosamente");
        } catch (error) {
            const message =
                error.response?.data?.error || "Error al descargar PDF";
            toast.error(message);
            console.error("Download PDF error:", error);
        }
    };

    // Cálculo de totales
    const totals = {
        all:
            transfers?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) ||
            0,
        terceros:
            transfers
                ?.filter((t) => t.transfer_type === "terceros")
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
        propios:
            transfers
                ?.filter((t) => t.transfer_type === "propios")
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
        provisionada:
            transfers
                ?.filter((t) => t.status === "provisionada")
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
        pagada:
            transfers
                ?.filter((t) => t.status === "pagada")
                .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0) || 0,
    };

    const getTransferTypeLabel = (type) => {
        const labels = {
            costos: "Costos Directos",
            cargos: "Cargos a Cliente",
            admin: "Gastos de Operación",
            terceros: "Terceros (Legacy)",
            propios: "Propios (Legacy)",
        };
        return labels[type] || type;
    };

    const getStatusLabel = (status) => {
        const labels = {
            pendiente: "Pendiente",
            aprobado: "Aprobado",
            pagado: "Pagado",
            provisionada: "Provisionada (Legacy)",
        };
        return labels[status] || status;
    };

    const columns = [
        {
            key: "service_order",
            label: "OS",
            render: (row) => row.service_order_number || "Sin OS",
        },
        {
            key: "transfer_type",
            label: "Tipo",
            render: (row) => (
                <Badge
                    variant={
                        row.transfer_type === "costos"
                            ? "danger"
                            : row.transfer_type === "cargos"
                            ? "success"
                            : row.transfer_type === "terceros"
                            ? "warning"
                            : "default"
                    }
                >
                    {getTransferTypeLabel(row.transfer_type)}
                </Badge>
            ),
        },
        {
            key: "provider",
            label: "Proveedor",
            render: (row) => (
                <div className="min-w-[150px]">
                    <div className="font-medium text-slate-900">
                        {row.provider_name || "-"}
                    </div>
                    {row.description && (
                        <div
                            className="text-xs text-slate-500 truncate max-w-[200px]"
                            title={row.description}
                        >
                            {row.description}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: "amount",
            label: "Monto",
            render: (row) => (
                <span className="font-semibold text-slate-900 tabular-nums">
                    ${parseFloat(row.amount || 0).toFixed(2)}
                </span>
            ),
        },
        {
            key: "payment_method",
            label: "Método",
            render: (row) => {
                const methods = {
                    transferencia: "Transferencia",
                    efectivo: "Efectivo",
                    cheque: "Cheque",
                    tarjeta: "Tarjeta",
                };
                return (
                    <span className="text-sm text-slate-600">
                        {methods[row.payment_method] || "-"}
                    </span>
                );
            },
        },
        {
            key: "status",
            label: "Estado",
            render: (row) => (
                <Badge
                    variant={
                        row.status === "pagado"
                            ? "success"
                            : row.status === "aprobado"
                            ? "default"
                            : row.status === "pagada"
                            ? "success"
                            : "warning"
                    }
                >
                    {getStatusLabel(row.status)}
                </Badge>
            ),
        },
        {
            key: "invoice_number",
            label: "Factura",
            render: (row) => (
                <span className="text-xs text-slate-600 font-mono">
                    {row.invoice_number || "-"}
                </span>
            ),
        },
        {
            key: "actions",
            label: "Acciones",
            render: (row) => (
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransfer(row);
                        }}
                        title="Ver detalles"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(row)}
                    >
                        Editar
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(row.id)}
                    >
                        Eliminar
                    </Button>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24" />
                    ))}
                </div>
                <SkeletonTable rows={5} columns={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Transferencias y Gastos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Gestiona los traspasos de efectivo y gastos operativos
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={
                            isExporting || !transfers || transfers.length === 0
                        }
                    >
                        <Download className="h-4 w-4 mr-2" />
                        {isExporting ? "Exportando..." : "Exportar Excel"}
                    </Button>
                    <Button onClick={() => setIsCreateModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Registrar
                        Transferencia
                    </Button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Total Gastos
                                </p>
                                <p className="text-2xl font-bold text-gray-900">
                                    ${totals.all.toFixed(2)}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-gray-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Gastos a Terceros
                                </p>
                                <p className="text-2xl font-bold text-orange-600">
                                    ${totals.terceros.toFixed(2)}
                                </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-orange-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Gastos Propios
                                </p>
                                <p className="text-2xl font-bold text-blue-600">
                                    ${totals.propios.toFixed(2)}
                                </p>
                            </div>
                            <TrendingDown className="h-8 w-8 text-blue-400" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-500">
                                    Provisionados
                                </p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    ${totals.provisionada.toFixed(2)}
                                </p>
                            </div>
                            <Filter className="h-8 w-8 text-yellow-400" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filtros */}
            <Card>
                <CardHeader>
                    <CardTitle>Filtros</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label>Tipo</Label>
                            <Select
                                value={filters.transfer_type}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        transfer_type: e.target.value,
                                    })
                                }
                            >
                                <option value="">Todos</option>
                                <option value="terceros">Terceros</option>
                                <option value="propios">Propios</option>
                                <option value="admin">Administrativos</option>
                            </Select>
                        </div>
                        <div>
                            <Label>Estado</Label>
                            <Select
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="">Todos</option>
                                <option value="provisionada">
                                    Provisionada
                                </option>
                                <option value="pagada">Pagada</option>
                            </Select>
                        </div>
                        <div className="md:col-span-2">
                            <Label>Buscar</Label>
                            <Input
                                placeholder="Buscar por proveedor, factura..."
                                leftIcon={<Search className="h-4 w-4" />}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabla */}
            <Card>
                <CardContent className="p-0">
                    <DataTable
                        columns={columns}
                        data={transfers || []}
                        searchable
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
                        <DialogTitle>Registrar Transferencia</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Orden de Servicio</Label>
                                <Select
                                    value={formData.service_order}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            service_order: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {serviceOrders.map((os) => (
                                        <option key={os.id} value={os.id}>
                                            {os.os_number}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                            <div>
                                <Label>Tipo de Gasto</Label>
                                <Select
                                    value={formData.transfer_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            transfer_type: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="terceros">Terceros</option>
                                    <option value="propios">Propios</option>
                                    <option value="admin">
                                        Administrativos
                                    </option>
                                </Select>
                            </div>
                        </div>

                        {formData.transfer_type === "terceros" && (
                            <div>
                                <Label>Proveedor</Label>
                                <Select
                                    value={formData.provider}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            provider: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {providers.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Monto</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div>
                                <Label>Banco</Label>
                                <Select
                                    value={formData.bank}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            bank: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Seleccionar...</option>
                                    {banks.map((b) => (
                                        <option key={b.id} value={b.id}>
                                            {b.name}
                                        </option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Método de Pago</Label>
                                <Select
                                    value={formData.payment_method}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            payment_method: e.target.value,
                                        })
                                    }
                                >
                                    <option value="transferencia">
                                        Transferencia
                                    </option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="cheque">Cheque</option>
                                </Select>
                            </div>
                            <div>
                                <Label>Estado</Label>
                                <Select
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value,
                                        })
                                    }
                                >
                                    <option value="provisionada">
                                        Provisionada
                                    </option>
                                    <option value="pagada">Pagada</option>
                                </Select>
                            </div>
                        </div>

                        <div>
                            <Label>Factura del Proveedor (CCF)</Label>
                            <Input
                                value={formData.supplier_invoice}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        supplier_invoice: e.target.value,
                                    })
                                }
                            />
                        </div>

                        <div>
                            <Label>Archivo PDF (Opcional)</Label>
                            <FileUpload
                                accept=".pdf"
                                onFileChange={(file) =>
                                    setFormData({ ...formData, pdf_file: file })
                                }
                            />
                        </div>

                        <div>
                            <Label>Notas</Label>
                            <textarea
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                rows={3}
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        notes: e.target.value,
                                    })
                                }
                            />
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
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Editar */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent size="xl">
                    <DialogHeader>
                        <DialogTitle>Editar Pago a Proveedor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Orden de Servicio */}
                            <div>
                                <Label>Orden de Servicio</Label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.service_order}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            service_order: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Sin OS</option>
                                    {serviceOrders.map((os) => (
                                        <option key={os.id} value={os.id}>
                                            {os.order_number}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Tipo de Pago */}
                            <div>
                                <Label>Tipo de Pago</Label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.transfer_type}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            transfer_type: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="costos">
                                        Costos Directos
                                    </option>
                                    <option value="cargos">
                                        Cargos a Cliente
                                    </option>
                                    <option value="admin">
                                        Gastos de Operación
                                    </option>
                                    <option value="terceros">
                                        Terceros (Legacy)
                                    </option>
                                    <option value="propios">
                                        Propios (Legacy)
                                    </option>
                                </select>
                            </div>

                            {/* Proveedor */}
                            <div>
                                <Label>Proveedor</Label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.provider}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            provider: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">
                                        Seleccionar proveedor
                                    </option>
                                    {providers.map((prov) => (
                                        <option key={prov.id} value={prov.id}>
                                            {prov.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Monto */}
                            <div>
                                <Label>Monto</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            amount: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>

                            {/* Método de Pago */}
                            <div>
                                <Label>Método de Pago</Label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.payment_method}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            payment_method: e.target.value,
                                        })
                                    }
                                >
                                    <option value="transferencia">
                                        Transferencia
                                    </option>
                                    <option value="efectivo">Efectivo</option>
                                    <option value="cheque">Cheque</option>
                                    <option value="tarjeta">Tarjeta</option>
                                </select>
                            </div>

                            {/* Estado */}
                            <div>
                                <Label>Estado</Label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.status}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            status: e.target.value,
                                        })
                                    }
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="aprobado">Aprobado</option>
                                    <option value="pagado">Pagado</option>
                                    <option value="provisionada">
                                        Provisionada (Legacy)
                                    </option>
                                </select>
                            </div>

                            {/* Banco */}
                            <div>
                                <Label>Banco</Label>
                                <select
                                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                    value={formData.bank}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            bank: e.target.value,
                                        })
                                    }
                                >
                                    <option value="">Seleccionar banco</option>
                                    {banks.map((bank) => (
                                        <option key={bank.id} value={bank.id}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Número de Factura */}
                            <div>
                                <Label>Número de Factura/CCF</Label>
                                <Input
                                    type="text"
                                    value={formData.supplier_invoice}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            supplier_invoice: e.target.value,
                                        })
                                    }
                                    placeholder="Ej: F-2025-001"
                                />
                            </div>
                        </div>

                        {/* Notas */}
                        <div>
                            <Label>Notas Adicionales</Label>
                            <textarea
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[80px]"
                                value={formData.notes}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        notes: e.target.value,
                                    })
                                }
                                placeholder="Información adicional..."
                            />
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

            {/* Modal de Detalles */}
            <Dialog
                open={!!selectedTransfer && !isEditModalOpen}
                onOpenChange={(open) => !open && setSelectedTransfer(null)}
            >
                <DialogContent size="xl" className="!max-w-4xl w-full">
                    <DialogHeader>
                        <DialogTitle>Detalles del Pago</DialogTitle>
                    </DialogHeader>
                    {selectedTransfer && (
                        <div className="space-y-6">
                            {/* Header con monto y estado */}
                            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                                <div>
                                    <div className="text-sm text-slate-500 mb-1">
                                        Monto Total
                                    </div>
                                    <div className="text-3xl font-bold text-brand-600 tabular-nums">
                                        $
                                        {parseFloat(
                                            selectedTransfer.amount || 0
                                        ).toFixed(2)}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <Badge
                                        variant={
                                            selectedTransfer.status ===
                                                "pagado" ||
                                            selectedTransfer.status === "pagada"
                                                ? "success"
                                                : selectedTransfer.status ===
                                                  "aprobado"
                                                ? "default"
                                                : "warning"
                                        }
                                        className="mb-2"
                                    >
                                        {getStatusLabel(
                                            selectedTransfer.status
                                        )}
                                    </Badge>
                                    <div className="text-xs text-slate-500">
                                        {selectedTransfer.transaction_date &&
                                            new Date(
                                                selectedTransfer.transaction_date
                                            ).toLocaleDateString("es-SV", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                    </div>
                                </div>
                            </div>

                            {/* Información General */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                        Tipo de Pago
                                    </div>
                                    <Badge
                                        variant={
                                            selectedTransfer.transfer_type ===
                                            "costos"
                                                ? "danger"
                                                : selectedTransfer.transfer_type ===
                                                  "cargos"
                                                ? "success"
                                                : "default"
                                        }
                                    >
                                        {getTransferTypeLabel(
                                            selectedTransfer.transfer_type
                                        )}
                                    </Badge>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                        Orden de Servicio
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {selectedTransfer.service_order_number ||
                                            "Sin OS vinculada"}
                                    </div>
                                </div>
                            </div>

                            {/* Proveedor y Método */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                        Proveedor
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {selectedTransfer.provider_name ||
                                            "No especificado"}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                        Método de Pago
                                    </div>
                                    <div className="text-sm font-medium text-slate-900">
                                        {selectedTransfer.payment_method
                                            ? {
                                                  transferencia:
                                                      "Transferencia Bancaria",
                                                  efectivo: "Efectivo",
                                                  cheque: "Cheque",
                                                  tarjeta: "Tarjeta",
                                              }[
                                                  selectedTransfer
                                                      .payment_method
                                              ] ||
                                              selectedTransfer.payment_method
                                            : "No especificado"}
                                    </div>
                                </div>
                            </div>

                            {/* Factura y Banco */}
                            {(selectedTransfer.invoice_number ||
                                selectedTransfer.bank) && (
                                <div className="grid grid-cols-2 gap-4">
                                    {selectedTransfer.invoice_number && (
                                        <div>
                                            <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                                Número de Factura
                                            </div>
                                            <div className="text-sm font-mono text-slate-900">
                                                {
                                                    selectedTransfer.invoice_number
                                                }
                                            </div>
                                        </div>
                                    )}
                                    {selectedTransfer.bank && (
                                        <div>
                                            <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                                Banco
                                            </div>
                                            <div className="text-sm text-slate-900">
                                                {selectedTransfer.bank.name ||
                                                    selectedTransfer.bank}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Descripción */}
                            {selectedTransfer.description && (
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                        Descripción
                                    </div>
                                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        {selectedTransfer.description}
                                    </div>
                                </div>
                            )}

                            {/* Notas */}
                            {selectedTransfer.notes && (
                                <div>
                                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                        Notas Adicionales
                                    </div>
                                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        {selectedTransfer.notes}
                                    </div>
                                </div>
                            )}

                            {/* Fechas */}
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                                {selectedTransfer.created_at && (
                                    <div>
                                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                            Fecha de Registro
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            {new Date(
                                                selectedTransfer.created_at
                                            ).toLocaleDateString("es-SV", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </div>
                                    </div>
                                )}
                                {selectedTransfer.payment_date && (
                                    <div>
                                        <div className="text-xs font-medium text-slate-500 uppercase mb-1">
                                            Fecha de Pago
                                        </div>
                                        <div className="text-sm text-slate-600">
                                            {new Date(
                                                selectedTransfer.payment_date
                                            ).toLocaleDateString("es-SV", {
                                                day: "2-digit",
                                                month: "long",
                                                year: "numeric",
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Usuario creador */}
                            {selectedTransfer.created_by_username && (
                                <div className="text-xs text-slate-500 pt-2 border-t border-slate-200">
                                    Registrado por:{" "}
                                    <span className="font-medium text-slate-700">
                                        {selectedTransfer.created_by_username}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setSelectedTransfer(null)}
                        >
                            Cerrar
                        </Button>
                        <Button
                            onClick={() => {
                                openEditModal(selectedTransfer);
                                setSelectedTransfer(null);
                            }}
                        >
                            Editar Pago
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default Transfers;
