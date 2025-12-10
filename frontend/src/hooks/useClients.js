import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "../lib/axios";

/**
 * Hook para obtener todos los clientes
 * @param {Object} filters - Filtros opcionales
 */
export const useClients = (filters = {}) => {
    return useQuery({
        queryKey: ["clients", filters],
        queryFn: async () => {
            const { data } = await axios.get("/clients/", {
                params: filters,
            });
            return data;
        },
    });
};

/**
 * Hook para obtener un cliente específico por ID
 * @param {number} id - ID del cliente
 */
export const useClient = (id) => {
    return useQuery({
        queryKey: ["clients", id],
        queryFn: async () => {
            const { data } = await axios.get(`/clients/${id}/`);
            return data;
        },
        enabled: !!id,
    });
};

/**
 * Hook para crear un nuevo cliente
 */
export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (clientData) => {
            const { data } = await axios.post("/clients/", clientData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};

/**
 * Hook para actualizar un cliente
 */
export const useUpdateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, ...clientData }) => {
            const { data } = await axios.patch(`/clients/${id}/`, clientData);
            return data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", data.id] });
        },
    });
};
