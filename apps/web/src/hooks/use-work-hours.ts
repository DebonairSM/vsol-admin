import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useWorkHoursByYear(year: number) {
  return useQuery({
    queryKey: ['work-hours', year],
    queryFn: async () => {
      const data = await apiClient.getWorkHoursByYear(year);
      // Log for debugging
      console.log(`[useWorkHoursByYear] Fetched data for ${year}:`, data);
      return data;
    },
    enabled: !!year,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useSuggestedWorkHours(monthLabel: string) {
  return useQuery({
    queryKey: ['work-hours', 'suggestion', monthLabel],
    queryFn: () => apiClient.getSuggestedWorkHours(monthLabel),
    enabled: !!monthLabel,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

