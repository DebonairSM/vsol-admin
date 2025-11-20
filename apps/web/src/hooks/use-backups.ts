import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface BackupFile {
  filename: string;
  size: number;
  created: string;
  modified: string;
}

interface RestoreResponse {
  success: boolean;
  message: string;
  preRestoreBackup: string | null;
}

interface BackupsResponse {
  backups: BackupFile[];
  backupDirectory: string;
}

/**
 * Hook to list all available backup files and get backup directory path
 */
export function useBackups() {
  return useQuery<BackupsResponse>({
    queryKey: ['backups'],
    queryFn: async () => {
      const response = await apiClient.listBackups();
      return {
        backups: response.backups,
        backupDirectory: response.backupDirectory
      };
    },
    staleTime: 30 * 1000, // 30 seconds - backups don't change frequently but may be added
  });
}

/**
 * Hook to create a new database backup
 */
export function useCreateBackup() {
  const queryClient = useQueryClient();

  return useMutation<
    { success: boolean; message: string; backup: { filename: string; size: number; created: string }; deletedOldBackups: string[] },
    Error,
    void
  >({
    mutationFn: async () => {
      return await apiClient.createBackup();
    },
    onSuccess: () => {
      // Invalidate backups query after creating backup
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}

/**
 * Hook to restore database from a backup file
 */
export function useRestoreBackup() {
  const queryClient = useQueryClient();

  return useMutation<RestoreResponse, Error, string>({
    mutationFn: async (filename: string) => {
      return await apiClient.restoreFromBackup(filename);
    },
    onSuccess: () => {
      // Invalidate backups query after restore (new backup may have been created)
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });
}
