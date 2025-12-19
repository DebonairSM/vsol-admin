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

// Consultant-specific hooks
export function useConsultantVacations(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['consultant', 'vacations', startDate, endDate],
    queryFn: () => apiClient.getConsultantVacations(startDate, endDate),
  });
}

export function useConsultantVacationBalance(referenceDate?: string) {
  return useQuery({
    queryKey: ['consultant', 'vacations', 'balance', referenceDate],
    queryFn: () => apiClient.getConsultantVacationBalance(referenceDate),
  });
}

export function useConsultantVacationCalendar(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ['consultant', 'vacations', 'calendar', startDate, endDate],
    queryFn: () => apiClient.getConsultantVacationCalendar(startDate, endDate),
    enabled: !!startDate && !!endDate,
  });
}

export function useCreateConsultantVacationDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<CreateVacationDayRequest, 'consultantId'>) => 
      apiClient.createConsultantVacationDay(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'calendar'] });
    },
  });
}

export function useCreateConsultantVacationRange() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Omit<CreateVacationRangeRequest, 'consultantId'>) => 
      apiClient.createConsultantVacationRange(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'calendar'] });
    },
  });
}

export function useUpdateConsultantVacationDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateVacationDayRequest }) => 
      apiClient.updateConsultantVacationDay(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'calendar'] });
    },
  });
}

export function useDeleteConsultantVacationDay() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => apiClient.deleteConsultantVacationDay(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'balance'] });
      queryClient.invalidateQueries({ queryKey: ['consultant', 'vacations', 'calendar'] });
    },
  });
}

