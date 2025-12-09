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
                axios.get("/api/orders/service-orders/"),
                axios.get("/api/catalogs/providers/"),
                axios.get("/api/catalogs/banks/"),
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

            await axios.post("/api/transfers/", formDataToSend, {
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
            await axios.delete(`/api/transfers/${id}/`);
            toast.success("Transferencia eliminada");
            refetch();
        } catch (error) {
            toast.error("Error al eliminar transferencia");
        }
    };

    const openEditModal = (transfer) => {
        setSelectedTransfer(transfer);
        setFormData({
            service_order: transfer.service_order?.id || "",
            transfer_type: transfer.transfer_type,
            provider: transfer.provider?.id || "",
            amount: transfer.amount,
            bank: transfer.bank?.id || "",
            payment_method: transfer.payment_method,
            supplier_invoice: transfer.supplier_invoice,
            status: transfer.status,
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
            const response = await axios.get("/api/transfers/export_excel/", {
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
                `/api/transfers/${transferId}/download_pdf/`,
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

    const columns = [
        {
            key: "service_order",
            label: "OS",
            render: (row) => row.service_order?.os_number || "N/A",
        },
        {
            key: "transfer_type",
            label: "Tipo",
            render: (row) => (
                <Badge
                    variant={
                        row.transfer_type === "terceros" ? "warning" : "default"
                    }
                >
                    {row.transfer_type === "terceros"
                        ? "Terceros"
                        : row.transfer_type === "propios"
                        ? "Propios"
                        : "Admin"}
                </Badge>
            ),
        },
        {
            key: "provider",
            label: "Proveedor",
            render: (row) => row.provider?.name || "-",
        },
        {
            key: "amount",
            label: "Monto",
            render: (row) => `$${parseFloat(row.amount).toFixed(2)}`,
        },
        {
            key: "bank",
            label: "Banco",
            render: (row) => row.bank?.name || "-",
        },
        {
            key: "status",
            label: "Estado",
            render: (row) => (
                <Badge
                    variant={row.status === "pagada" ? "success" : "warning"}
                >
                    {row.status === "provisionada" ? "Provisionada" : "Pagada"}
                </Badge>
            ),
        },
        {
            key: "pdf_file",
            label: "Archivo",
            render: (row) =>
                row.pdf_file ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(row.id);
                        }}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Descargar PDF"
                    >
                        <FileText className="h-4 w-4" />
                        <span className="text-xs">PDF</span>
                    </button>
                ) : (
                    <span className="text-gray-400 text-sm">-</span>
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

            {/* Modal Editar - Similar al de crear */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent size="lg">
                    <DialogHeader>
                        <DialogTitle>Editar Transferencia</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleEdit} className="space-y-4">
                        {/* Mismo contenido que el modal de crear */}
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
        </div>
    );
}

export default Transfers;
