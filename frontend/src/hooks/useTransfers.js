import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../lib/axios";

/**
 * Hook para obtener todas las transferencias
 * @param {Object} filters - Filtros opcionales (type, status, service_order, etc.)
 */
export const useTransfers = (filters = {}) => {
    return useQuery({
        queryKey: ["transfers", filters],
        queryFn: async () => {
            const { data } = await axios.get("/transfers/", {
                params: filters,
            });
            return data;
        },
    });
};

/**
 * Hook para obtener una transferencia específica por ID
 * @param {number} id - ID de la transferencia
 */
export const useTransfer = (id) => {
    return useQuery({
        queryKey: ["transfers", id],
        queryFn: async () => {
            const { data } = await axios.get(`/transfers/${id}/`);
            return data;
        },
        enabled: !!id,
    });
};

/**
 * Hook para crear una nueva transferencia
 */
export const useCreateTransfer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (transferData) => {
            const { data } = await axios.post("/transfers/", transferData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            queryClient.invalidateQueries({ queryKey: ["service-orders"] }); // También invalida OS
        },
    });
};

/**
 * Hook para actualizar una transferencia
 */
export const useUpdateTransfer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...transferData }) => {
            const { data } = await axios.patch(
                `/transfers/${id}/`,
                transferData
            );
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            queryClient.invalidateQueries({ queryKey: ["transfers", data.id] });
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        },
    });
};

/**
 * Hook para eliminar una transferencia
 */
export const useDeleteTransfer = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id) => {
            await axios.delete(`/transfers/${id}/`);
            return id;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["transfers"] });
            queryClient.invalidateQueries({ queryKey: ["service-orders"] });
        },
    });
};
