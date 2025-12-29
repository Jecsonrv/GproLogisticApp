import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
    Button,
    Modal,
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    Input,
    Label,
    SelectERP,
} from "../components/ui";
import ServiceOrderDetailComponent from "../components/ServiceOrderDetail";
import axios from "../lib/axios";
import toast from "react-hot-toast";
import {
    useServiceOrder,
    useUpdateServiceOrder,
} from "../hooks/useServiceOrders";

function ServiceOrderDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { data: order, refetch: refetchOrder } = useServiceOrder(id);
    const updateOrderMutation = useUpdateServiceOrder();

    // Catalogs for Edit Form
    const [clients, setClients] = useState([]);
    const [providers, setProviders] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        client: "",
        sub_client: null,
        shipment_type: "",
        provider: "",
        customs_agent: "",
        purchase_order: "",
        bl_reference: "",
        eta: "",
        duca: "",
    });

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const fetchCatalogs = async () => {
        try {
            const [clientsRes, providersRes, typesRes] = await Promise.all([
                axios.get("/clients/active/"),
                axios.get("/catalogs/providers/"),
                axios.get("/catalogs/shipment-types/"),
            ]);
            setClients(clientsRes.data);
            setProviders(providersRes.data);
            setShipmentTypes(typesRes.data);
        } catch (error) {
            // Error silencioso - catálogos opcionales
        }
    };

    const handleEditOrder = (orderData) => {
        setEditFormData({
            client: orderData.client || "",
            sub_client: orderData.sub_client || null,
            shipment_type: orderData.shipment_type || "",
            provider: orderData.provider || "",
            purchase_order: orderData.purchase_order || "",
            bl_reference: orderData.bl_reference || "",
            eta: orderData.eta || "",
            duca: orderData.duca || "",
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateOrder = async (e) => {
        e.preventDefault();
        try {
            await updateOrderMutation.mutateAsync({ id, ...editFormData });
            toast.success("La orden ha sido actualizada correctamente.");
            setIsEditModalOpen(false);
            // Invalidar el cache para refrescar los datos sin recargar la página
            queryClient.invalidateQueries({ queryKey: ["service-orders", id] });
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
            refetchOrder();
        } catch (error) {
            console.error("Error updating order:", error);
            let errorMessage = "No se pudo actualizar la orden. Intente nuevamente.";
            if (error.response?.data) {
                const data = error.response.data;
                if (data.message) errorMessage = data.message;
                else if (data.error) errorMessage = data.error;
                else if (data.detail) errorMessage = data.detail;
                else if (typeof data === 'object') {
                    const keys = Object.keys(data);
                    if (keys.length > 0) {
                        const firstError = data[keys[0]];
                        if (Array.isArray(firstError)) errorMessage = firstError[0];
                        else if (typeof firstError === 'string') errorMessage = firstError;
                    }
                }
            }
            toast.error(errorMessage);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/service-orders")}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Listado
                </Button>
            </div>

            <ServiceOrderDetailComponent
                orderId={id}
                onEdit={handleEditOrder}
            />

            {/* Edit Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Editar Orden: {order?.order_number}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdateOrder} className="space-y-6">
                        {/* Client Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">
                                        1
                                    </span>
                                    Información del Cliente
                                </h4>
                            </div>
                            <SelectERP
                                label="Cliente"
                                value={editFormData.client}
                                onChange={(val) =>
                                    setEditFormData({
                                        ...editFormData,
                                        client: val,
                                    })
                                }
                                options={clients}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                                clearable
                                required
                            />
                        </div>

                        <div className="border-t border-slate-100 my-4"></div>

                        {/* Shipment Info */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-2">
                                <h4 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs">
                                        2
                                    </span>
                                    Datos del Embarque
                                </h4>
                            </div>
                            <SelectERP
                                label="Tipo de Embarque"
                                value={editFormData.shipment_type}
                                onChange={(val) =>
                                    setEditFormData({
                                        ...editFormData,
                                        shipment_type: val,
                                    })
                                }
                                options={shipmentTypes}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                clearable
                                required
                            />
                            <SelectERP
                                label="Proveedor Logístico"
                                value={editFormData.provider}
                                onChange={(val) =>
                                    setEditFormData({
                                        ...editFormData,
                                        provider: val,
                                    })
                                }
                                options={providers}
                                getOptionLabel={(opt) => opt.name}
                                getOptionValue={(opt) => opt.id}
                                searchable
                                clearable
                            />
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <Label className="mb-1.5 block text-xs font-medium text-slate-700">
                                        DUCA
                                    </Label>
                                    <Input
                                        value={editFormData.duca}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                duca: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: 4-12345"
                                        required
                                        className="font-mono uppercase"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-xs font-medium text-slate-700">
                                        BL / Guía
                                    </Label>
                                    <Input
                                        value={editFormData.bl_reference}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                bl_reference: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: MAEU123456789"
                                        className="font-mono uppercase"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-xs font-medium text-slate-700">
                                        Fecha ETA
                                    </Label>
                                    <Input
                                        type="date"
                                        value={editFormData.eta}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                eta: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="mb-1.5 block text-xs font-medium text-slate-700">
                                        Orden de Compra (PO)
                                    </Label>
                                    <Input
                                        value={editFormData.purchase_order}
                                        onChange={(e) =>
                                            setEditFormData({
                                                ...editFormData,
                                                purchase_order: e.target.value,
                                            })
                                        }
                                        placeholder="Ej: PO-998877"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditModalOpen(false)}
                                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                className="bg-slate-900 hover:bg-slate-800 text-white"
                            >
                                Guardar Cambios
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default ServiceOrderDetailPage;
