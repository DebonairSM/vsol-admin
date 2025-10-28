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
    queryFn: (): Promise<ConsultantEquipment[]> => apiClient.getEquipment(consultantId),
    enabled: !!consultantId
  });
}

export function useCreateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ data, consultantId }: { data: CreateEquipmentRequest; consultantId: number }) => 
      apiClient.createEquipment({ ...data, consultantId }),
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      equipmentId, 
      data 
    }: { 
      consultantId: number; 
      equipmentId: number; 
      data: UpdateEquipmentRequest 
    }) => apiClient.updateEquipment(equipmentId, data),
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ equipmentId }: { consultantId: number; equipmentId: number }) => 
      apiClient.deleteEquipment(equipmentId),
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useMarkEquipmentReturned() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      consultantId, 
      equipmentId, 
      returnedDate 
    }: { 
      consultantId: number; 
      equipmentId: number; 
      returnedDate?: Date 
    }) => apiClient.markEquipmentReturned(equipmentId, returnedDate?.toISOString()),
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function usePendingEquipmentReturns(consultantId: number) {
  return useQuery({
    queryKey: ['equipment', consultantId, 'pending-returns'],
    queryFn: (): Promise<ConsultantEquipment[]> => apiClient.getPendingReturns(consultantId),
    enabled: !!consultantId
  });
}

