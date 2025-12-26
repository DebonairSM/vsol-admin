import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { InitiateTerminationRequest } from '@vsol-admin/shared';

interface TerminationStatus {
  isTerminated: boolean;
  consultant: any;
  equipmentStatus?: {
    total: number;
    requireReturn: number;
    returned: number;
    pending: number;
    pendingItems: any[];
    allReturned: boolean;
  };
  processStatus?: {
    isEquipmentReturned: boolean;
    isContractSigned: boolean;
    isProcessComplete: boolean;
    equipmentDeadlinePassed: boolean;
  };
  nextSteps?: string[];
}

interface DocumentGenerationCheck {
  canGenerate: boolean;
  reasons?: string[];
}

export function useTerminationStatus(consultantId: number) {
  return useQuery({
    queryKey: ['termination', consultantId, 'status'],
    queryFn: async (): Promise<TerminationStatus> => {
      const response = await apiClient.get(`/consultants/${consultantId}/termination/status`);
      return response.data;
    },
    enabled: !!consultantId
  });
}

export function useInitiateTermination() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ consultantId, data }: { consultantId: number; data: InitiateTerminationRequest }) => {
      const response = await apiClient.post(`/consultants/${consultantId}/termination/initiate`, data);
      return response.data;
    },
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['termination', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useSignTerminationContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      consultantId, 
      contractSignedDate 
    }: { 
      consultantId: number; 
      contractSignedDate?: Date 
    }) => {
      const response = await apiClient.post(
        `/consultants/${consultantId}/termination/sign-contract`,
        { contractSignedDate: contractSignedDate?.toISOString() }
      );
      return response.data;
    },
    onSuccess: (_, { consultantId }) => {
      queryClient.invalidateQueries({ queryKey: ['termination', consultantId] });
      queryClient.invalidateQueries({ queryKey: ['consultants'] });
    }
  });
}

export function useGenerateTerminationDocument() {
  return useMutation({
    mutationFn: async (consultantId: number): Promise<Blob> => {
      return await apiClient.downloadTerminationDocument(consultantId);
    }
  });
}

export function useCanGenerateTerminationDocument(consultantId: number) {
  return useQuery({
    queryKey: ['termination', consultantId, 'can-generate'],
    queryFn: async (): Promise<DocumentGenerationCheck> => {
      const result = await apiClient.getTerminationDocumentEligibility(consultantId);
      return {
        canGenerate: result.canGenerate,
        reasons: result.reasons || (result.missingFields?.length ? [`Missing fields: ${result.missingFields.join(', ')}`] : undefined)
      };
    },
    enabled: !!consultantId,
    retry: false
  });
}

export function downloadTerminationDocument(blob: Blob, consultantName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  
  // Generate filename
  const cleanName = consultantName.replace(/[^a-zA-Z0-9]/g, '_');
  const timestamp = new Date().toISOString().split('T')[0];
  link.download = `distrato_${cleanName}_${timestamp}.pdf`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

