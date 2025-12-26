import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateSprintCeremonyRequest, UpdateSprintCeremonyRequest, SprintCeremony } from '@vsol-admin/shared';
import { useToast } from '@/hooks/use-toast';

export function useSprintCeremonies(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['sprint-ceremonies', startDate, endDate],
    queryFn: () => apiClient.getSprintCeremonies(startDate, endDate),
  });
}

export function useCeremonyOccurrences(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['ceremony-occurrences', startDate, endDate],
    queryFn: () => apiClient.getCeremonyOccurrences(startDate, endDate),
  });
}

export function useSprintCeremony(id: number) {
  return useQuery({
    queryKey: ['sprint-ceremony', id],
    queryFn: () => apiClient.getSprintCeremony(id),
    enabled: !!id,
  });
}

export function useCreateSprintCeremony() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data: CreateSprintCeremonyRequest) => apiClient.createSprintCeremony(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint-ceremonies'] });
      queryClient.invalidateQueries({ queryKey: ['ceremony-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Success',
        description: 'Sprint ceremony created successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create sprint ceremony',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateSprintCeremony() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateSprintCeremonyRequest }) =>
      apiClient.updateSprintCeremony(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint-ceremonies'] });
      queryClient.invalidateQueries({ queryKey: ['ceremony-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Success',
        description: 'Sprint ceremony updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update sprint ceremony',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteSprintCeremony() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteSprintCeremony(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint-ceremonies'] });
      queryClient.invalidateQueries({ queryKey: ['ceremony-occurrences'] });
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      toast({
        title: 'Success',
        description: 'Sprint ceremony deleted successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete sprint ceremony',
        variant: 'destructive',
      });
    },
  });
}



