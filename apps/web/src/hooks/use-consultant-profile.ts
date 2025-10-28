import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { UpdateConsultantRequest } from '@vsol-admin/shared';

export function useConsultantProfile(id: number) {
  return useQuery({
    queryKey: ['consultant', id],
    queryFn: () => apiClient.getConsultant(id),
    enabled: !!id,
  });
}

export function useUpdateConsultantProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateConsultantRequest }) =>
      apiClient.updateConsultant(id, data),
    onSuccess: (_, variables) => {
      // Invalidate and refetch consultant data
      queryClient.invalidateQueries({ queryKey: ['consultant', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

export function useUploadConsultantDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      consultantId, 
      documentType, 
      file 
    }: { 
      consultantId: number; 
      documentType: 'cnh' | 'address_proof'; 
      file: File;
    }) =>
      apiClient.uploadConsultantDocument(consultantId, documentType, file),
    onSuccess: (_, variables) => {
      // Invalidate consultant data to refresh with new document paths
      queryClient.invalidateQueries({ queryKey: ['consultant', variables.consultantId] });
    },
  });
}

export function useDeleteConsultant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteConsultant(id),
    onSuccess: () => {
      // Invalidate consultants list
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}
