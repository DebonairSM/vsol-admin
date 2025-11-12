import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetSetting, useUpdateSetting, useTestPayoneerConnection, useTestTimeDoctorConnection } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
    </div>
  );
}
