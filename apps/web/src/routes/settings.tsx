import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetSetting, useUpdateSetting, useTestPayoneerConnection, useTestTimeDoctorConnection } from '@/hooks/use-settings';
import { useBackups, useCreateBackup, useRestoreBackup, useBackupStatus, useTriggerBackup } from '@/hooks/use-backups';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertTriangle, Database, RefreshCw, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { ShippingAddress } from '@vsol-admin/shared';

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [defaultOmnigoBonus, setDefaultOmnigoBonus] = useState<number>(0);
  const [payoneerConfig, setPayoneerConfig] = useState({
    apiKey: '',
    programId: '',
    apiUrl: 'https://api.payoneer.com/v4'
  });

  const [timeDoctorConfig, setTimeDoctorConfig] = useState({
    apiToken: '',
    companyId: '',
    apiUrl: 'https://api2.timedoctor.com/api/1.0'
  });

  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    companyName: '',
    address: '',
    neighborhood: '',
    city: '',
    state: '',
    cep: ''
  });

  // Backup restore dialog state
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string | null>(null);

  // Load system settings
  const { data: systemSettings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.getSettings()
  });

  // Load Payoneer settings
  const { data: apiKeyData } = useGetSetting('payoneer_api_key');
  const { data: programIdData } = useGetSetting('payoneer_program_id');
  const { data: apiUrlData } = useGetSetting('payoneer_api_url');

  // Load Time Doctor settings
  const { data: tdTokenData } = useGetSetting('timedoctor_api_token');
  const { data: tdCompanyIdData } = useGetSetting('timedoctor_company_id');
  const { data: tdApiUrlData } = useGetSetting('timedoctor_api_url');

  // Load shipping address setting
  const { data: shippingAddressData } = useGetSetting('shipping_from_address');

  // Mutations
  const updateSystemSettings = useMutation({
    mutationFn: (data: { defaultOmnigoBonus: number }) => apiClient.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
  const updateSetting = useUpdateSetting();
  const testConnection = useTestPayoneerConnection();
  const testTDConnection = useTestTimeDoctorConnection();

  // Backup hooks
  const { data: backupsData, isLoading: isLoadingBackups } = useBackups();
  const backups = backupsData?.backups || [];
  const backupDirectory = backupsData?.backupDirectory || '';
  const createBackup = useCreateBackup();
  const restoreBackup = useRestoreBackup();
  const { data: backupStatus, isLoading: isLoadingStatus, refetch: refetchStatus } = useBackupStatus();
  const triggerBackup = useTriggerBackup();

  // Set default backup to latest when backups load
  useEffect(() => {
    if (backups && backups.length > 0 && !selectedBackup) {
      setSelectedBackup(backups[0].filename);
    }
  }, [backups, selectedBackup]);

  // Initialize system settings
  useEffect(() => {
    if (systemSettings?.defaultOmnigoBonus !== undefined) {
      setDefaultOmnigoBonus(systemSettings.defaultOmnigoBonus);
    }
  }, [systemSettings]);

  // Initialize Payoneer config
  useEffect(() => {
    if (apiKeyData && apiKeyData.value) {
      setPayoneerConfig(prev => ({ ...prev, apiKey: apiKeyData.value }));
    }
  }, [apiKeyData]);

  useEffect(() => {
    if (programIdData && programIdData.value) {
      setPayoneerConfig(prev => ({ ...prev, programId: programIdData.value }));
    }
  }, [programIdData]);

  useEffect(() => {
    if (apiUrlData && apiUrlData.value) {
      setPayoneerConfig(prev => ({ ...prev, apiUrl: apiUrlData.value }));
    }
  }, [apiUrlData]);

  // Initialize Time Doctor config
  useEffect(() => {
    if (tdTokenData && tdTokenData.value) {
      setTimeDoctorConfig(prev => ({ ...prev, apiToken: tdTokenData.value }));
    }
  }, [tdTokenData]);

  useEffect(() => {
    if (tdCompanyIdData && tdCompanyIdData.value) {
      setTimeDoctorConfig(prev => ({ ...prev, companyId: tdCompanyIdData.value }));
    }
  }, [tdCompanyIdData]);

  useEffect(() => {
    if (tdApiUrlData && tdApiUrlData.value) {
      setTimeDoctorConfig(prev => ({ ...prev, apiUrl: tdApiUrlData.value }));
    }
  }, [tdApiUrlData]);

  // Initialize shipping address
  useEffect(() => {
    if (shippingAddressData && shippingAddressData.value) {
      try {
        const parsed = JSON.parse(shippingAddressData.value);
        setShippingAddress(parsed);
      } catch (e) {
        console.error('Failed to parse shipping address:', e);
      }
    }
  }, [shippingAddressData]);

  const handleSaveSystemSettings = async () => {
    try {
      await updateSystemSettings.mutateAsync({ defaultOmnigoBonus });
      
      toast({
        title: 'Settings Saved',
        description: 'System settings have been saved successfully',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save system settings',
        variant: 'destructive'
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.message,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to test connection',
        variant: 'destructive'
      });
    }
  };

  const handleSavePayoneerConfig = async () => {
    try {
      // Save all three settings
      await Promise.all([
        updateSetting.mutateAsync({ key: 'payoneer_api_key', value: payoneerConfig.apiKey }),
        updateSetting.mutateAsync({ key: 'payoneer_program_id', value: payoneerConfig.programId }),
        updateSetting.mutateAsync({ key: 'payoneer_api_url', value: payoneerConfig.apiUrl })
      ]);

      toast({
        title: 'Settings Saved',
        description: 'Payoneer configuration has been saved successfully',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    }
  };

  const handleTestTDConnection = async () => {
    try {
      const result = await testTDConnection.mutateAsync();
      
      if (result.success) {
        toast({
          title: 'Connection Successful',
          description: result.message,
          variant: 'default'
        });
      } else {
        toast({
          title: 'Connection Failed',
          description: result.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Connection Error',
        description: error.message || 'Failed to test Time Doctor connection',
        variant: 'destructive'
      });
    }
  };

  const handleSaveTimeDoctorConfig = async () => {
    try {
      // Save all three settings
      await Promise.all([
        updateSetting.mutateAsync({ key: 'timedoctor_api_token', value: timeDoctorConfig.apiToken }),
        updateSetting.mutateAsync({ key: 'timedoctor_company_id', value: timeDoctorConfig.companyId }),
        updateSetting.mutateAsync({ key: 'timedoctor_api_url', value: timeDoctorConfig.apiUrl })
      ]);

      toast({
        title: 'Settings Saved',
        description: 'Time Doctor configuration has been saved successfully',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save Time Doctor settings',
        variant: 'destructive'
      });
    }
  };

  const handleSaveShippingAddress = async () => {
    // Validate required fields
    if (!shippingAddress.companyName || !shippingAddress.address || !shippingAddress.city || !shippingAddress.state || !shippingAddress.cep) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: 'shipping_from_address',
        value: JSON.stringify(shippingAddress)
      });

      toast({
        title: 'Settings Saved',
        description: 'Shipping address has been saved successfully',
        variant: 'default'
      });
    } catch (error: any) {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save shipping address',
        variant: 'destructive'
      });
    }
  };

  const handleRestoreClick = () => {
    if (selectedBackup) {
      setRestoreDialogOpen(true);
    }
  };

  const handleCreateBackup = async () => {
    try {
      // Use the new triggerBackup hook which uses the system endpoint
      const result = await triggerBackup.mutateAsync();
      
      toast({
        title: 'Backup Created',
        description: result.message || 'Database backup created successfully',
        variant: 'default'
      });

      if (result.deletedOldBackups && result.deletedOldBackups.length > 0) {
        toast({
          title: 'Old Backups Cleaned',
          description: `Removed ${result.deletedOldBackups.length} old backup(s) to maintain retention policy`,
          variant: 'default'
        });
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create database backup';
      toast({
        title: 'Backup Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleRestoreConfirm = async () => {
    if (!selectedBackup) return;

    try {
      const result = await restoreBackup.mutateAsync(selectedBackup);
      
      toast({
        title: 'Database Restored',
        description: result.message || 'Database has been restored successfully. Please restart the server.',
        variant: 'default'
      });

      if (result.preRestoreBackup) {
        toast({
          title: 'Pre-restore Backup Created',
          description: `A backup of your current database was created: ${result.preRestoreBackup}`,
          variant: 'default'
        });
      }

      setRestoreDialogOpen(false);
      setSelectedBackup(null);
    } catch (error: any) {
      toast({
        title: 'Restore Failed',
        description: error.message || 'Failed to restore database',
        variant: 'destructive'
      });
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const isSavingSystem = updateSystemSettings.isPending;
  const isSavingPayoneer = updateSetting.isPending;
  const isTesting = testConnection.isPending;
  const isTestingTD = testTDConnection.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure application settings and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Settings</CardTitle>
          <CardDescription>
            Configure default values for the payroll system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultOmnigoBonus">Default Omnigo Bonus (USD)</Label>
            <Input
              id="defaultOmnigoBonus"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={defaultOmnigoBonus}
              onChange={(e) => setDefaultOmnigoBonus(parseFloat(e.target.value) || 0)}
              disabled={isSavingSystem}
            />
            <p className="text-sm text-gray-500">
              Default value for the Omnigo bonus field when creating new payroll cycles
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveSystemSettings}
              disabled={isSavingSystem}
            >
              {isSavingSystem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save System Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Equipment Shipping Address
          </CardTitle>
          <CardDescription>
            Configure the "From" address used when printing shipping labels for equipment sent to consultants.
            This is your company's shipping address in Brazil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="shippingCompanyName">Company Name *</Label>
            <Input
              id="shippingCompanyName"
              type="text"
              placeholder="Your company name"
              value={shippingAddress.companyName}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, companyName: e.target.value }))}
              disabled={updateSetting.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingAddress">Street Address *</Label>
            <Input
              id="shippingAddress"
              type="text"
              placeholder="Rua Example, 123"
              value={shippingAddress.address}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, address: e.target.value }))}
              disabled={updateSetting.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingNeighborhood">Neighborhood *</Label>
            <Input
              id="shippingNeighborhood"
              type="text"
              placeholder="Bairro"
              value={shippingAddress.neighborhood}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, neighborhood: e.target.value }))}
              disabled={updateSetting.isPending}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="shippingCity">City *</Label>
              <Input
                id="shippingCity"
                type="text"
                placeholder="São Paulo"
                value={shippingAddress.city}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, city: e.target.value }))}
                disabled={updateSetting.isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shippingState">State *</Label>
              <Input
                id="shippingState"
                type="text"
                placeholder="SP"
                maxLength={2}
                value={shippingAddress.state}
                onChange={(e) => setShippingAddress(prev => ({ ...prev, state: e.target.value.toUpperCase() }))}
                disabled={updateSetting.isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shippingCep">CEP *</Label>
            <Input
              id="shippingCep"
              type="text"
              placeholder="12345-678"
              value={shippingAddress.cep}
              onChange={(e) => setShippingAddress(prev => ({ ...prev, cep: e.target.value }))}
              disabled={updateSetting.isPending}
            />
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSaveShippingAddress}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Shipping Address
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payoneer Configuration</CardTitle>
          <CardDescription>
            Configure Payoneer Mass Payouts API credentials to enable payment integration.
            Your API key will be encrypted before storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Payoneer API key"
              value={payoneerConfig.apiKey}
              onChange={(e) => setPayoneerConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              disabled={isSavingPayoneer}
            />
            <p className="text-sm text-gray-500">
              Your API key will be encrypted and stored securely
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="programId">Program ID</Label>
            <Input
              id="programId"
              type="text"
              placeholder="Enter your Payoneer program ID"
              value={payoneerConfig.programId}
              onChange={(e) => setPayoneerConfig(prev => ({ ...prev, programId: e.target.value }))}
              disabled={isSavingPayoneer}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiUrl">API URL</Label>
            <Input
              id="apiUrl"
              type="url"
              placeholder="https://api.payoneer.com/v4"
              value={payoneerConfig.apiUrl}
              onChange={(e) => setPayoneerConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              disabled={isSavingPayoneer}
            />
            <p className="text-sm text-gray-500">
              Default: https://api.payoneer.com/v4
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSavePayoneerConfig}
              disabled={isSavingPayoneer || !payoneerConfig.apiKey || !payoneerConfig.programId}
            >
              {isSavingPayoneer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>

            <Button
              variant="outline"
              onClick={handleTestConnection}
              disabled={isTesting || !payoneerConfig.apiKey || !payoneerConfig.programId}
            >
              {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Link to="/payoneer/payees">
              <Button variant="secondary">
                View Payoneer Payees
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Doctor Configuration</CardTitle>
          <CardDescription>
            Configure Time Doctor API credentials to fetch work hours and activity data.
            Your API token will be encrypted before storage.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tdApiToken">API Token</Label>
            <Input
              id="tdApiToken"
              type="password"
              placeholder="Enter your Time Doctor JWT token"
              value={timeDoctorConfig.apiToken}
              onChange={(e) => setTimeDoctorConfig(prev => ({ ...prev, apiToken: e.target.value }))}
              disabled={isSavingPayoneer}
            />
            <p className="text-sm text-gray-500">
              Your JWT token will be encrypted and stored securely. Tokens expire after approximately 6 months.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tdCompanyId">Company ID</Label>
            <Input
              id="tdCompanyId"
              type="text"
              placeholder="Enter your Time Doctor company/workspace ID"
              value={timeDoctorConfig.companyId}
              onChange={(e) => setTimeDoctorConfig(prev => ({ ...prev, companyId: e.target.value }))}
              disabled={isSavingPayoneer}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tdApiUrl">API URL</Label>
            <Input
              id="tdApiUrl"
              type="url"
              placeholder="https://api2.timedoctor.com/api/1.0"
              value={timeDoctorConfig.apiUrl}
              onChange={(e) => setTimeDoctorConfig(prev => ({ ...prev, apiUrl: e.target.value }))}
              disabled={isSavingPayoneer}
            />
            <p className="text-sm text-gray-500">
              Default: https://api2.timedoctor.com/api/1.0
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSaveTimeDoctorConfig}
              disabled={isSavingPayoneer || !timeDoctorConfig.apiToken || !timeDoctorConfig.companyId}
            >
              {isSavingPayoneer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>

            <Button
              variant="outline"
              onClick={handleTestTDConnection}
              disabled={isTestingTD || !timeDoctorConfig.apiToken || !timeDoctorConfig.companyId}
            >
              {isTestingTD && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Test Connection
            </Button>
          </div>

          <div className="pt-4 border-t">
            <Link to="/timedoctor/activity">
              <Button variant="secondary">
                View Time Doctor Activity
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Database Backups</CardTitle>
          <CardDescription>
            Automatic backups are created hourly while the server is running. You can also create manual backups or restore from a previous backup. A backup of the current database will be created before restoring.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Backup Status Section */}
          {!isLoadingStatus && backupStatus && (
            <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900">Backup Status</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    refetchStatus();
                    queryClient.invalidateQueries({ queryKey: ['backups'] });
                  }}
                  disabled={isLoadingStatus}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStatus ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Backups</p>
                  <p className="font-medium text-gray-900">{backupStatus.totalCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Environment</p>
                  <p className="font-medium text-gray-900 uppercase">{backupStatus.environment}</p>
                </div>
                {backupStatus.lastBackup && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Last Backup</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(backupStatus.lastBackup.created), 'PPP pp')}
                    </p>
                    <p className="text-xs text-gray-500 mt-1 font-mono">
                      {backupStatus.lastBackup.filename}
                    </p>
                  </div>
                )}
              </div>

              {backupStatus.recentBackups && backupStatus.recentBackups.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500 mb-2">Recent Backups</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {backupStatus.recentBackups.map((backup) => (
                      <div key={backup.filename} className="flex items-center justify-between text-xs">
                        <span className="font-mono text-gray-700 truncate flex-1">{backup.filename}</span>
                        <span className="text-gray-500 ml-2">
                          {format(new Date(backup.created), 'MMM d, HH:mm')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {backupDirectory && (
            <div className="p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-start gap-2">
                <Database className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 mb-1">Backup Directory</p>
                  <p className="text-xs text-gray-600 font-mono break-all">{backupDirectory}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pb-4 border-b">
            <Button
              onClick={handleCreateBackup}
              disabled={triggerBackup.isPending}
            >
              {triggerBackup.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Create Backup
                </>
              )}
            </Button>
          </div>

          {isLoadingBackups ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Loading backups...</p>
            </div>
          ) : !backups || backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No backups available</p>
              <p className="text-xs text-gray-400 mt-2">Click "Create Backup" to create your first backup</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="backup-select">Select Backup to Restore</Label>
                  <Select
                    value={selectedBackup || ''}
                    onValueChange={(value) => setSelectedBackup(value)}
                  >
                    <SelectTrigger id="backup-select">
                      <SelectValue placeholder="Select a backup">
                        {selectedBackup && backups?.find(b => b.filename === selectedBackup) && (
                          <div className="flex items-center justify-between w-full">
                            <span className="truncate">
                              {backups.find(b => b.filename === selectedBackup)?.filename}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({format(new Date(backups.find(b => b.filename === selectedBackup)!.created), 'PPp')})
                            </span>
                          </div>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {backups.map((backup) => (
                        <SelectItem key={backup.filename} value={backup.filename}>
                          <div className="flex flex-col">
                            <span className="font-medium">{backup.filename}</span>
                            <span className="text-xs text-gray-500">
                              {format(new Date(backup.created), 'PPP pp')} • {formatFileSize(backup.size)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleRestoreClick}
                    disabled={restoreBackup.isPending || !selectedBackup}
                    className="flex-1"
                  >
                    {restoreBackup.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Restoring...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Restore Selected Backup
                      </>
                    )}
                  </Button>
                </div>

                {selectedBackup && backups?.find(b => b.filename === selectedBackup) && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="text-sm space-y-1">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">Selected Backup Details</span>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1 ml-6">
                        <div>
                          <span className="font-medium">Filename:</span> {selectedBackup}
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {format(new Date(backups.find(b => b.filename === selectedBackup)!.created), 'PPP pp')}
                        </div>
                        <div>
                          <span className="font-medium">Size:</span> {formatFileSize(backups.find(b => b.filename === selectedBackup)!.size)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important:</p>
                    <p>After restoring, you must manually restart the server for the changes to take effect. The restored database will not be active until the server restarts.</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600">
          <p>To set up Payoneer integration:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Ensure the <code className="bg-gray-100 px-1 py-0.5 rounded">SETTINGS_ENCRYPTION_KEY</code> environment variable is set in your backend .env file</li>
            <li>Generate a 64-character hex key using: <code className="bg-gray-100 px-1 py-0.5 rounded">node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"</code></li>
            <li>Obtain your Payoneer API credentials from the Payoneer developer portal</li>
            <li>Enter your API key and program ID above</li>
            <li>Click "Test Connection" to verify your credentials</li>
            <li>Click "Save Configuration" to store your settings securely</li>
          </ol>
        </CardContent>
      </Card>

      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirm Database Restore
            </DialogTitle>
            <DialogDescription className="pt-2">
              This action will restore the database from the selected backup file. The current database will be backed up automatically before the restore.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-sm font-medium text-red-900 mb-2">Warning: This is a destructive operation</p>
              <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                <li>All current database data will be replaced</li>
                <li>A backup of the current database will be created first</li>
                <li>You must restart the server after restoring</li>
                <li>Any unsaved changes will be lost</li>
              </ul>
            </div>
            {selectedBackup && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-900 mb-1">Backup file:</p>
                <p className="text-sm text-gray-600 font-mono">{selectedBackup}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRestoreDialogOpen(false);
                setSelectedBackup(null);
              }}
              disabled={restoreBackup.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRestoreConfirm}
              disabled={restoreBackup.isPending || !selectedBackup}
            >
              {restoreBackup.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                'Restore Database'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
