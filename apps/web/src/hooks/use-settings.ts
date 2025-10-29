import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { SystemSettings, UpdateSettingsRequest } from '@vsol-admin/shared';

export function useSettings() {
  return useQuery<SystemSettings>({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes - settings rarely change
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  
  return useMutation<SystemSettings, Error, UpdateSettingsRequest>({
    mutationFn: (data: UpdateSettingsRequest) => apiClient.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
