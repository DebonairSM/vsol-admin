import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

/**
 * Hook to get Time Doctor sync status
 * Note: Polling disabled until Time Doctor integration is fully working
 */
export function useTimeDoctorSyncStatus() {
  return useQuery({
    queryKey: ['time-doctor', 'status'],
    queryFn: () => apiClient.getTimeDoctorSyncStatus(),
    staleTime: 30 * 1000, // 30 seconds
    // refetchInterval: 60 * 1000, // Disabled - polling removed until integration is complete
  });
}

/**
 * Hook to sync all consultants with Time Doctor
 */
export function useSyncAllTimeDoctorConsultants() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => apiClient.syncAllTimeDoctorConsultants(),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['time-doctor', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

/**
 * Hook to sync a single consultant with Time Doctor
 */
export function useSyncTimeDoctorConsultant() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (consultantId: number) => apiClient.syncTimeDoctorConsultant(consultantId),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['time-doctor', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

/**
 * Hook to toggle Time Doctor sync for a consultant
 */
export function useToggleTimeDoctorSync() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ consultantId, enabled }: { consultantId: number; enabled: boolean }) => 
      apiClient.toggleTimeDoctorSync(consultantId, enabled),
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['time-doctor', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    },
  });
}

/**
 * Hook to get Time Doctor payroll settings
 */
export function useTimeDoctorSettings() {
  return useQuery({
    queryKey: ['time-doctor', 'settings'],
    queryFn: () => apiClient.getTimeDoctorSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}



