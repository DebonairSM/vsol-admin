import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { 
  ConsultantEquipment, 
  CreateEquipmentRequest, 
  UpdateEquipmentRequest 
} from '@vsol-admin/shared';

export function useConsultantEquipment(consultantId: number) {
  return useQuery({
    queryKey: ['equipment', consultantId],
    queryFn: async (): Promise<ConsultantEquipment[]> => {
      const response = await apiClient.get(`/consultants/${consultantId}/equipment`);
      return response.data;
    },
    enabled: !!consultantId
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ consultantId, data }: { consultantId: number; data: CreateEquipmentRequest }) => {
      const response = await apiClient.post(`/consultants/${consultantId}/equipment`, data);
      return response.data;
    },
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      consultantId, 
      equipmentId, 
      data 
    }: { 
      consultantId: number; 
      equipmentId: number; 
      data: UpdateEquipmentRequest 
    }) => {
      const response = await apiClient.put(`/consultants/${consultantId}/equipment/${equipmentId}`, data);
      return response.data;
    },
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ consultantId, equipmentId }: { consultantId: number; equipmentId: number }) => {
      const response = await apiClient.delete(`/consultants/${consultantId}/equipment/${equipmentId}`);
      return response.data;
    },
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useMarkEquipmentReturned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      consultantId, 
      equipmentId, 
      returnedDate 
    }: { 
      consultantId: number; 
      equipmentId: number; 
      returnedDate?: Date 
    }) => {
      const response = await apiClient.post(
        `/consultants/${consultantId}/equipment/${equipmentId}/return`,
        { returnedDate: returnedDate?.toISOString() }
      );
      return response.data;
    },
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function usePendingEquipmentReturns(consultantId: number) {
  return useQuery({
    queryKey: ['equipment', consultantId, 'pending-returns'],
    queryFn: async (): Promise<ConsultantEquipment[]> => {
      const response = await apiClient.get(`/consultants/${consultantId}/equipment/pending-returns`);
      return response.data;
    },
    enabled: !!consultantId
  });
}

