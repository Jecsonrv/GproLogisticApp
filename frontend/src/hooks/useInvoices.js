import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';

/**
 * Hook para obtener todas las facturas
 * @param {Object} filters - Filtros opcionales (status, client, etc.)
 */
export const useInvoices = (filters = {}) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      const { data } = await axios.get('/api/orders/invoices/', {
        params: filters,
      });
      return data;
    },
  });
};

/**
 * Hook para obtener una factura específica por ID
 * @param {number} id - ID de la factura
 */
export const useInvoice = (id) => {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: async () => {
      const { data} = await axios.get(`/api/orders/invoices/${id}/`);
      return data;
    },
    enabled: !!id,
  });
};

/**
 * Hook para crear una nueva factura
 */
export const useCreateInvoice = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceData) => {
      const { data } = await axios.post('/api/orders/invoices/', invoiceData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] }); // También invalida OS
    },
  });
};

/**
 * Hook para registrar un pago en una factura
 */
export const useCreatePayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentData) => {
      const { data } = await axios.post('/api/orders/invoice-payments/', paymentData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
    },
  });
};

/**
 * Hook para obtener el resumen de facturación
 */
export const useInvoiceSummary = () => {
  return useQuery({
    queryKey: ['invoices', 'summary'],
    queryFn: async () => {
      const { data } = await axios.get('/api/orders/invoices/summary/');
      return data;
    },
  });
};
