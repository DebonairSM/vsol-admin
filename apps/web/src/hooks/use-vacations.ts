import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { CreateVacationDayRequest, CreateVacationRangeRequest, UpdateVacationDayRequest } from '@vsol-admin/shared';

export function useVacations(consultantId?: number, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['vacations', consultantId, startDate, endDate],
    queryFn: () => apiClient.getVacations(consultantId, startDate, endDate),
  });
}

export function useVacationBalances(referenceDate?: string) {
  return useQuery({
    queryKey: ['vacations', 'balances', referenceDate],
    queryFn: () => apiClient.getVacationBalances(referenceDate),
  });
}

export function useVacationBalance(consultantId: number, referenceDate?: string) {
  return useQuery({
    queryKey: ['vacations', 'balance', consultantId, referenceDate],
    queryFn: () => apiClient.getVacationBalance(consultantId, referenceDate),
    enabled: !!consultantId,
  });
}

export function useVacationCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['vacations', 'calendar', startDate, endDate],
    queryFn: () => apiClient.getVacationCalendar(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateVacationDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateVacationDayRequest) => apiClient.createVacationDay(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'balance', variables.consultantId] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'calendar'] });
    },
  });
}

export function useCreateVacationRange() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: CreateVacationRangeRequest) => apiClient.createVacationRange(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'balance', variables.consultantId] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'calendar'] });
    },
  });
}

export function useUpdateVacationDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVacationDayRequest }) => 
      apiClient.updateVacationDay(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'calendar'] });
    },
  });
}

export function useDeleteVacationDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteVacationDay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vacations'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'balances'] });
      queryClient.invalidateQueries({ queryKey: ['vacations', 'calendar'] });
    },
  });
}

