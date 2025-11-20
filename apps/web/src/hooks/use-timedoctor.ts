import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface TimeDoctorUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
}

export interface TimeDoctorActivity {
  userId: string;
  userName: string;
  date: string;
  workHours: number;
  tasks: string;
  projects: string;
}

interface UsersResponse {
  success: boolean;
  count: number;
  users: TimeDoctorUser[];
}

interface ActivityResponse {
  success: boolean;
  count: number;
  activities: TimeDoctorActivity[];
}

/**
 * Hook to fetch all users from Time Doctor
 */
export function useTimeDoctorUsers() {
  return useQuery<UsersResponse>({
    queryKey: ['timedoctor', 'users'],
    queryFn: async () => {
      const response = await apiClient.get('/time-doctor/users');
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
 * Hook to fetch activity/work hours data from Time Doctor
 * @param params Object with from, to (required), and optional userId
 */
export function useTimeDoctorActivity(params: { from: string; to: string; userId?: string }) {
  return useQuery<ActivityResponse>({
    queryKey: ['timedoctor', 'activity', params.from, params.to, params.userId],
    queryFn: async () => {
      const response = await apiClient.get('/time-doctor/activity', {
        params: {
          from: params.from,
          to: params.to,
          userId: params.userId
        }
      });
      return response.data;
    },
    enabled: !!params.from && !!params.to,
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










