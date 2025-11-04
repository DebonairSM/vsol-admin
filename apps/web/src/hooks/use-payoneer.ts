import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface PayoneerPayee {
  payeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  paymentMethod?: string;
}

interface PayeesResponse {
  success: boolean;
  count: number;
  payees: PayoneerPayee[];
}

/**
 * Hook to fetch all payees from Payoneer
 */
export function usePayoneerPayees() {
  return useQuery<PayeesResponse>({
    queryKey: ['payoneer', 'payees'],
    queryFn: async () => {
      const response = await apiClient.get('/payoneer/payees');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 401 (invalid credentials)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 2;
    }
  });
}

/**
 * Hook to fetch a specific payee by ID
 */
export function usePayoneerPayee(payeeId: string) {
  return useQuery<{ success: boolean; payee: PayoneerPayee }>({
    queryKey: ['payoneer', 'payees', payeeId],
    queryFn: async () => {
      const response = await apiClient.get(`/payoneer/payees/${payeeId}`);
      return response.data;
    },
    enabled: !!payeeId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });
}

