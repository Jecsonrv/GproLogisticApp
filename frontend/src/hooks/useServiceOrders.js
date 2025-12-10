import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../lib/axios";

/**
 * Hook para obtener todas las órdenes de servicio
 * @param {Object} filters - Filtros opcionales (status, client, etc.)
 */
export const useServiceOrders = (filters = {}) => {
    return useQuery({
        queryKey: ["service-orders", filters],
        queryFn: async () => {
            const { data } = await axios.get("/orders/service-orders/", {
                params: filters,
            });
            return data;
        },
    });
};

/**
 * Hook para obtener una orden de servicio específica por ID
 * @param {number} id - ID de la orden
 */
export const useServiceOrder = (id) => {
    return useQuery({
        queryKey: ["service-orders", id],
        queryFn: async () => {
            const { data } = await axios.get(`/orders/service-orders/${id}/`);
            return data;
        },
        enabled: !!id,
    });
};

/**
 * Hook para crear una nueva orden de servicio
 */
export const useCreateServiceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (orderData) => {
            const { data } = await axios.post(
                "/orders/service-orders/",
                orderData
            );
            return data;
        },
        onSuccess: () => {
            // Invalidar cache para forzar refetch
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        },
    });
};

/**
 * Hook para actualizar una orden de servicio
 */
export const useUpdateServiceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...orderData }) => {
            const { data } = await axios.patch(
                `/orders/service-orders/${id}/`,
                orderData
            );
            return data;
        },
        onSuccess: (data) => {
            // Invalidar cache de la lista y del item específico
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
            queryClient.invalidateQueries({
                queryKey: ["service-orders", data.id],
            });
        },
    });
};

/**
 * Hook para eliminar una orden de servicio
 */
export const useDeleteServiceOrder = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await axios.delete(`/orders/service-orders/${id}/`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        },
    });
};
