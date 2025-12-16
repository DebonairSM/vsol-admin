import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateClientInvoiceRequest, UpdateClientInvoiceRequest, ClientInvoiceStatus } from '@vsol-admin/shared';

export function useClientInvoices(cycleId?: number, status?: ClientInvoiceStatus) {
  return useQuery({
    queryKey: ['client-invoices', cycleId, status],
    queryFn: () => apiClient.getClientInvoices(cycleId, status),
  });
}

export function useClientInvoice(id: number) {
  return useQuery({
    queryKey: ['client-invoices', id],
    queryFn: () => apiClient.getClientInvoice(id),
    enabled: !!id,
  });
}

export function useClientInvoiceByCycle(cycleId: number) {
  return useQuery({
    queryKey: ['client-invoices', 'cycle', cycleId],
    queryFn: () => apiClient.getClientInvoiceByCycle(cycleId),
    enabled: !!cycleId,
  });
}

export function useCreateClientInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientInvoiceRequest) => apiClient.createClientInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    },
  });
}

export function useCreateInvoiceFromCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cycleId: number) => apiClient.createClientInvoiceFromCycle(cycleId),
    onSuccess: (_, cycleId) => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices', 'cycle', cycleId] });
    },
  });
}

export function useUpdateClientInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateClientInvoiceRequest }) =>
      apiClient.updateClientInvoice(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices', variables.id] });
    },
  });
}

export function useUpdateInvoiceStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: ClientInvoiceStatus }) =>
      apiClient.updateClientInvoiceStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-invoices', variables.id] });
    },
  });
}

export function useDeleteClientInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteClientInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-invoices'] });
    },
  });
}

