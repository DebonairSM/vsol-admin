import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useConsultants() {
  return useQuery({
    queryKey: ['consultants'],
    queryFn: () => apiClient.getConsultants(),
  });
}

export function useActiveConsultants() {
  return useQuery({
    queryKey: ['consultants', 'active'],
    queryFn: () => apiClient.getActiveConsultants(),
  });
}

export function useConsultant(id: number) {
  return useQuery({
    queryKey: ['consultants', id],
    queryFn: () => apiClient.getConsultant(id),
    enabled: !!id,
  });
}

export function useCreateConsultant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => apiClient.createConsultant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

export function useUpdateConsultant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiClient.updateConsultant(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
      queryClient.invalidateQueries({ queryKey: ['consultants', id] });
    },
  });
}

export function useDeleteConsultant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteConsultant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}
