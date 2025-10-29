import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useCycles() {
  return useQuery({
    queryKey: ['cycles'],
    queryFn: () => apiClient.getCycles(),
  });
}

export function useCycle(id: number) {
  return useQuery({
    queryKey: ['cycles', id],
    queryFn: () => apiClient.getCycle(id),
    enabled: !!id,
  });
}

export function useCycleSummary(id: number) {
  return useQuery({
    queryKey: ['cycles', id, 'summary'],
    queryFn: () => apiClient.getCycleSummary(id),
    enabled: !!id,
  });
}

export function useCycleLines(id: number) {
  return useQuery({
    queryKey: ['cycles', id, 'lines'],
    queryFn: () => apiClient.getCycleLines(id),
    enabled: !!id,
  });
}

export function useCreateCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.createCycle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}

export function useUpdateCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiClient.updateCycle(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['cycles', id] });
      queryClient.invalidateQueries({ queryKey: ['cycles', id, 'summary'] });
    },
  });
}

export function useUpdateLineItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ cycleId, lineId, data }: { cycleId: number; lineId: number; data: any }) => 
      apiClient.updateLineItem(cycleId, lineId, data),
    onSuccess: (_, { cycleId }) => {
      queryClient.invalidateQueries({ queryKey: ['cycles', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycles', cycleId, 'lines'] });
      queryClient.invalidateQueries({ queryKey: ['cycles', cycleId, 'summary'] });
    },
  });
}

export function useCalculatePayment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (cycleId: number) => apiClient.calculatePayment(cycleId),
    onSuccess: (_, cycleId) => {
      // Invalidate cycle data to refresh the calculatedPaymentDate field
      queryClient.invalidateQueries({ queryKey: ['cycles', cycleId] });
      queryClient.invalidateQueries({ queryKey: ['cycles', cycleId, 'summary'] });
    },
  });
}

export function useDeleteCycle() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteCycle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycles'] });
    },
  });
}