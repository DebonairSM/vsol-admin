import { useState } from 'react';
import { useConsultants } from '@/hooks/use-consultants';
import { 
  useTimeDoctorSyncStatus, 
  useSyncAllTimeDoctorConsultants, 
  useSyncTimeDoctorConsultant,
  useToggleTimeDoctorSync 
} from '@/hooks/use-time-doctor';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

interface PayrollSettingsTableProps {
  className?: string;
}

export default function PayrollSettingsTable({ className }: PayrollSettingsTableProps) {
  const { data: consultants, isLoading: consultantsLoading } = useConsultants();
  const { data: syncStatus, isLoading: statusLoading, refetch: refetchStatus } = useTimeDoctorSyncStatus();
  const syncAllMutation = useSyncAllTimeDoctorConsultants();
  const syncConsultantMutation = useSyncTimeDoctorConsultant();
  const toggleSyncMutation = useToggleTimeDoctorSync();
  
  const [syncingConsultants, setSyncingConsultants] = useState<Record<number, boolean>>({});

  // Filter active consultants only
  const activeConsultants = consultants?.filter(c => !c.terminationDate) || [];

  const handleSyncAll = async () => {
    try {
      const result = await syncAllMutation.mutateAsync();
      if (result.success) {
        toast({
          title: 'Sync Complete',
          description: `Successfully synced ${result.synced} of ${result.totalConsultants} consultants`,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: result.message || 'Failed to sync consultants',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: 'An error occurred during synchronization',
        variant: 'destructive',
      });
    }
  };

  const handleSyncConsultant = async (consultantId: number) => {
    setSyncingConsultants(prev => ({ ...prev, [consultantId]: true }));
    
    try {
      const result = await syncConsultantMutation.mutateAsync(consultantId);
      if (result.success) {
        toast({
          title: 'Sync Complete',
          description: `Consultant synced successfully`,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: result.message || 'Failed to sync consultant',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Sync Error',
        description: 'An error occurred during synchronization',
        variant: 'destructive',
      });
    } finally {
      setSyncingConsultants(prev => ({ ...prev, [consultantId]: false }));
    }
  };

  const handleToggleSync = async (consultantId: number, enabled: boolean) => {
    try {
      await toggleSyncMutation.mutateAsync({ consultantId, enabled });
      toast({
        title: 'Sync Setting Updated',
        description: `Time Doctor sync ${enabled ? 'enabled' : 'disabled'} for consultant`,
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update sync setting',
        variant: 'destructive',
      });
    }
  };

  const getSyncStatusBadge = (consultant: any) => {
    if (!consultant.timeDoctorSyncEnabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    
    const lastSync = syncStatus?.status?.lastSyncTimes?.[consultant.id];
    if (!lastSync) {
      return <Badge variant="destructive">Never Synced</Badge>;
    }
    
    const syncDate = new Date(lastSync);
    const hoursSinceSync = (Date.now() - syncDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceSync < 24) {
      return <Badge variant="default">Recently Synced</Badge>;
    } else {
      return <Badge variant="outline">Outdated</Badge>;
    }
  };

  const getMaxRatePerPeriod = (consultant: any) => {
    if (!consultant.hourlyLimit) return '-';
    return formatCurrency(consultant.hourlyRate * consultant.hourlyLimit);
  };

  if (consultantsLoading || statusLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading payroll settings...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payroll Settings</CardTitle>
              <CardDescription>
                Time Doctor integration for payroll management
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                {syncStatus?.status?.apiConnected ? (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>API Connected</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-red-600">
                    <XCircle className="w-4 h-4" />
                    <span>API Disconnected</span>
                  </div>
                )}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => refetchStatus()}
                disabled={statusLoading}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
              <Button 
                onClick={handleSyncAll}
                disabled={syncAllMutation.isPending || !syncStatus?.status?.apiConnected}
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {syncAllMutation.isPending ? 'Syncing...' : 'Sync All'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Payee ID</TableHead>
                <TableHead>Rate Per Hour</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Hourly Limit</TableHead>
                <TableHead>Max Rate per Period</TableHead>
                <TableHead>Sync Status</TableHead>
                <TableHead>Sync Enabled</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeConsultants.map((consultant) => (
                <TableRow key={consultant.id}>
                  <TableCell className="font-medium">
                    <div>
                      <div className="font-semibold">{consultant.name}</div>
                      {consultant.payoneerID && (
                        <div className="text-xs text-blue-600">Payoneer: {consultant.payoneerID}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {consultant.timeDoctorPayeeId || (
                      <span className="text-gray-400 italic">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {formatCurrency(consultant.hourlyRate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{consultant.currency || 'USD'}</Badge>
                  </TableCell>
                  <TableCell>
                    {consultant.hourlyLimit ? (
                      <span className="font-mono">{consultant.hourlyLimit}h</span>
                    ) : (
                      <span className="text-gray-400 italic">Not set</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono">
                    {getMaxRatePerPeriod(consultant)}
                  </TableCell>
                  <TableCell>
                    {getSyncStatusBadge(consultant)}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={consultant.timeDoctorSyncEnabled}
                      onCheckedChange={(enabled) => handleToggleSync(consultant.id, enabled)}
                      disabled={toggleSyncMutation.isPending}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncConsultant(consultant.id)}
                      disabled={
                        syncingConsultants[consultant.id] || 
                        syncConsultantMutation.isPending ||
                        !consultant.timeDoctorSyncEnabled ||
                        !syncStatus?.status?.apiConnected
                      }
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {syncingConsultants[consultant.id] ? 'Syncing...' : 'Sync'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {activeConsultants.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p>No active consultants found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



