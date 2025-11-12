import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface SettingResponse {
  key: string;
  value: string;
}

interface UpdateSettingResponse {
  key: string;
  success: boolean;
  updatedAt: Date;
}

interface TestConnectionResponse {
  success: boolean;
  message: string;
}

/**
 * Hook to get a specific setting by key
 */
export function useGetSetting(key: string, options?: { enabled?: boolean }) {
  return useQuery<SettingResponse | null>({
    queryKey: ['settings', 'kv', key],
    queryFn: async () => {
      try {
        const response = await apiClient.get(`/settings/kv/${key}`);
        return response.data;
      } catch (error: any) {
        // Return null for 404s (setting doesn't exist yet)
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
    retry: false, // Don't retry if setting doesn't exist
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options?.enabled !== false // Allow disabling the query
  });
}

/**
 * Hook to update a setting
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation<UpdateSettingResponse, Error, { key: string; value: string }>({
    mutationFn: async ({ key, value }) => {
      const response = await apiClient.put(`/settings/kv/${key}`, {
        key,
        value
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate the specific setting query
      queryClient.invalidateQueries({ queryKey: ['settings', 'kv', variables.key] });
      // Also invalidate the keys list
      queryClient.invalidateQueries({ queryKey: ['settings', 'keys'] });
    }
  });
}

/**
 * Hook to list all setting keys
 */
export function useListSettingKeys() {
  return useQuery<string[]>({
    queryKey: ['settings', 'keys'],
    queryFn: async () => {
      const response = await apiClient.get('/settings/keys');
      return response.data.keys;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

/**
 * Hook to test Payoneer API connection
 */
export function useTestPayoneerConnection() {
  return useMutation<TestConnectionResponse, Error>({
    mutationFn: async () => {
      const response = await apiClient.get('/payoneer/test');
      return response.data;
    }
  });
}

/**
 * Hook to test Time Doctor API connection
 */
export function useTestTimeDoctorConnection() {
  return useMutation<TestConnectionResponse, Error>({
    mutationFn: async () => {
      const response = await apiClient.get('/time-doctor/test');
      return response.data;
    }
  });
}

/**
 * Hook to get all settings as an object
 */
export function useSettings() {
  return useQuery<any>({
    queryKey: ['settings'],
    queryFn: async () => {
      const response = await apiClient.getSettings();
      return response;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}