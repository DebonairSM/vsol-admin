import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { BonusWorkflow, UpdateBonusWorkflowRequest } from '@vsol-admin/shared';

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bonus-workflow', cycleId] });
    }
  });
}

export function useGenerateBonusEmail(cycleId: number) {
  return useMutation({
    mutationFn: () => apiClient.generateBonusEmail(cycleId)
  });
}

