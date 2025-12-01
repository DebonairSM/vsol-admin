import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { UpdateBonusWorkflowRequest } from '@vsol-admin/shared';

export function useBonusWorkflow(cycleId: number) {
  return useQuery({
    queryKey: ['bonus-workflow', cycleId],
    queryFn: () => apiClient.getBonusWorkflow(cycleId),
    enabled: !!cycleId,
    staleTime: 0
  });
}

export function useCreateBonusWorkflow(cycleId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.createBonusWorkflow(cycleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-workflow', cycleId] });
    }
  });
}

export function useUpdateBonusWorkflow(cycleId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBonusWorkflowRequest) => apiClient.updateBonusWorkflow(cycleId, data),
    onSuccess: async () => {
      // Invalidate and refetch to ensure fresh data
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['bonus-workflow', cycleId] }),
        queryClient.invalidateQueries({ queryKey: ['cycles', cycleId, 'lines'] }),
        queryClient.invalidateQueries({ queryKey: ['cycles', cycleId] })
      ]);
      // Force refetch to ensure UI updates immediately
      await queryClient.refetchQueries({ queryKey: ['cycles', cycleId, 'lines'] });
    }
  });
}

export function useGenerateBonusEmail(cycleId: number) {
  return useMutation({
    mutationFn: (consultantId?: number | null) => apiClient.generateBonusEmail(cycleId, consultantId)
  });
}

