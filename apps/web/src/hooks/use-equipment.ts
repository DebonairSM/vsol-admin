import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CreateEquipmentRequest, UpdateEquipmentRequest } from '@vsol-admin/shared';

// Query keys
const equipmentKeys = {
  all: ['equipment'] as const,
  byConsultant: (consultantId: number) => ['equipment', 'consultant', consultantId] as const,
  detail: (id: number) => ['equipment', id] as const,
  pendingReturns: ['equipment', 'pending-returns'] as const,
  pendingReturnsByConsultant: (consultantId: number) => ['equipment', 'pending-returns', consultantId] as const,
};

// Get all equipment
export function useEquipment(consultantId?: number) {
  return useQuery({
    queryKey: consultantId ? equipmentKeys.byConsultant(consultantId) : equipmentKeys.all,
    queryFn: () => apiClient.getEquipment(consultantId),
    staleTime: 1000 * 60, // 1 minute
  });
}

// Get specific equipment item
export function useEquipmentById(id: number) {
  return useQuery({
    queryKey: equipmentKeys.detail(id),
    queryFn: () => apiClient.getEquipmentById(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Get pending equipment returns
export function usePendingReturns(consultantId?: number) {
  return useQuery({
    queryKey: consultantId 
      ? equipmentKeys.pendingReturnsByConsultant(consultantId) 
      : equipmentKeys.pendingReturns,
    queryFn: () => apiClient.getPendingReturns(consultantId),
    staleTime: 1000 * 60, // 1 minute
  });
}

// Create equipment
export function useCreateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateEquipmentRequest) => apiClient.createEquipment(data),
    onSuccess: (newEquipment) => {
      // Invalidate and refetch equipment list
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all });
      
      // If assigned to a specific consultant, invalidate their equipment list
      if (newEquipment.consultantId) {
        queryClient.invalidateQueries({ 
          queryKey: equipmentKeys.byConsultant(newEquipment.consultantId) 
        });
      }
      
      // Invalidate pending returns
      queryClient.invalidateQueries({ queryKey: equipmentKeys.pendingReturns });
    },
  });
}

// Update equipment
export function useUpdateEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEquipmentRequest }) => 
      apiClient.updateEquipment(id, data),
    onSuccess: (updatedEquipment, { id }) => {
      // Update the specific equipment item in cache
      queryClient.setQueryData(equipmentKeys.detail(id), updatedEquipment);
      
      // Invalidate equipment lists
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all });
      
      // If assigned to a consultant, invalidate their equipment list
      if (updatedEquipment.consultantId) {
        queryClient.invalidateQueries({ 
          queryKey: equipmentKeys.byConsultant(updatedEquipment.consultantId) 
        });
      }
      
      // Invalidate pending returns in case return status changed
      queryClient.invalidateQueries({ queryKey: equipmentKeys.pendingReturns });
    },
  });
}

// Delete equipment
export function useDeleteEquipment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteEquipment(id),
    onSuccess: (_, id) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: equipmentKeys.detail(id) });
      
      // Invalidate equipment lists
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all });
      queryClient.invalidateQueries({ queryKey: equipmentKeys.pendingReturns });
    },
  });
}

// Mark equipment as returned
export function useMarkEquipmentReturned() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, returnedDate }: { id: number; returnedDate?: string }) => 
      apiClient.markEquipmentReturned(id, returnedDate),
    onSuccess: (updatedEquipment, { id }) => {
      // Update the specific equipment item in cache
      queryClient.setQueryData(equipmentKeys.detail(id), updatedEquipment);
      
      // Invalidate equipment lists
      queryClient.invalidateQueries({ queryKey: equipmentKeys.all });
      
      // Invalidate pending returns
      queryClient.invalidateQueries({ queryKey: equipmentKeys.pendingReturns });
      
      // If assigned to a consultant, invalidate their equipment list
      if (updatedEquipment.consultantId) {
        queryClient.invalidateQueries({ 
          queryKey: equipmentKeys.byConsultant(updatedEquipment.consultantId) 
        });
      }
    },
  });
}
