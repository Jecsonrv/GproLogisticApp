import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
    Button,
    Modal,
} from "../components/ui";
import ServiceOrderDetailComponent from "../components/ServiceOrderDetail";
import ServiceOrderForm from "../components/ServiceOrderForm";
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
    const [subClients, setSubClients] = useState([]);
    const [providers, setProviders] = useState([]);
    const [shipmentTypes, setShipmentTypes] = useState([]);
    const [customs, setCustoms] = useState([]);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const fetchCatalogs = async () => {
        try {
            const [
                clientsRes,
                subClientsRes,
                providersRes,
                typesRes,
                categoriesRes,
                customsRes
            ] = await Promise.all([
                axios.get("/clients/active/"),
                axios.get("/catalogs/sub-clients/"),
                axios.get("/catalogs/providers/"),
                axios.get("/catalogs/shipment-types/"),
                axios.get("/catalogs/provider-categories/"),
                axios.get("/catalogs/customs/"),
            ]);
            setClients(clientsRes.data);
            setSubClients(subClientsRes.data);
            setShipmentTypes(typesRes.data);
            setCustoms(customsRes.data);

            // Filtrar proveedores: Naviera, Agencia de Carga y Aerolínea (Case Insensitive)
            const allowedCategories = [
                "naviera",
                "agencia de carga",
                "aerolínea",
                "aerolinea",
                "transportista",
            ];

            const validCategories = categoriesRes.data.filter((cat) =>
                allowedCategories.includes(cat.name.toLowerCase())
            );

            const validCategoryIds = validCategories.map((cat) => cat.id);

            const filteredProviders = providersRes.data.filter(
                (prov) =>
                    prov.category && validCategoryIds.includes(prov.category)
            );

            setProviders(filteredProviders);
        } catch {
            // Error silencioso - catálogos opcionales
        }
    };

    useEffect(() => {
        fetchCatalogs();
    }, []);

    const handleEditOrder = () => {
        setIsEditModalOpen(true);
    };

    const handleUpdateOrder = async (formData) => {
        try {
            await updateOrderMutation.mutateAsync({ id, ...formData });
            toast.success("La orden ha sido actualizada correctamente.");
            setIsEditModalOpen(false);
            // Invalidar el cache para refrescar los datos sin recargar la página
            queryClient.invalidateQueries({ queryKey: ["service-orders", id] });
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
            refetchOrder();
        } catch (error) {
            console.error("Error updating order:", error);
            let errorMessage =
                "No se pudo actualizar la orden. Intente nuevamente.";
            if (error.response?.data) {
                const data = error.response.data;
                if (data.message) errorMessage = data.message;
                else if (data.error) errorMessage = data.error;
                else if (data.detail) errorMessage = data.detail;
                else if (typeof data === "object") {
                    const keys = Object.keys(data);
                    if (keys.length > 0) {
                        const firstError = data[keys[0]];
                        if (Array.isArray(firstError))
                            errorMessage = firstError[0];
                        else if (typeof firstError === "string")
                            errorMessage = firstError;
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
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title={`Editar Orden: ${order?.order_number || ""}`}
                size="2xl"
            >
                {order && (
                    <ServiceOrderForm
                        initialData={order}
                        isEditing={true}
                        clients={clients}
                        subClients={subClients}
                        shipmentTypes={shipmentTypes}
                        providers={providers}
                        customs={customs}
                        onSubmit={handleUpdateOrder}
                        onCancel={() => setIsEditModalOpen(false)}
                        isLoading={updateOrderMutation.isPending}
                    />
                )}
            </Modal>
        </div>
    );
}

export default ServiceOrderDetailPage;
