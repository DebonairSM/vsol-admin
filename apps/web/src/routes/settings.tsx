import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGetSetting, useUpdateSetting, useTestPayoneerConnection } from '@/hooks/use-settings';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
  const { toast } = useToast();
  const [payoneerConfig, setPayoneerConfig] = useState({
    apiKey: '',
    programId: '',
    apiUrl: 'https://api.payoneer.com/v4'
  });

  // Load existing settings
  const { data: apiKeyData } = useGetSetting('payoneer_api_key');
  const { data: programIdData } = useGetSetting('payoneer_program_id');
  const { data: apiUrlData } = useGetSetting('payoneer_api_url');

  // Mutations
  const updateSetting = useUpdateSetting();
  const testConnection = useTestPayoneerConnection();

  // Initialize form with loaded data
  useState(() => {
    if (apiKeyData?.value && !payoneerConfig.apiKey) {
      setPayoneerConfig(prev => ({ ...prev, apiKey: apiKeyData.value }));
    }
    if (programIdData?.value && !payoneerConfig.programId) {
      setPayoneerConfig(prev => ({ ...prev, programId: programIdData.value }));
    }
    if (apiUrlData?.value && !payoneerConfig.apiUrl) {
      setPayoneerConfig(prev => ({ ...prev, apiUrl: apiUrlData.value }));
    }
  });

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

  const handleSave = async () => {
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

  const isSaving = updateSetting.isPending;
  const isTesting = testConnection.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Configure application settings and integrations</p>
      </div>

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
              disabled={isSaving}
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
              disabled={isSaving}
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
              disabled={isSaving}
            />
            <p className="text-sm text-gray-500">
              Default: https://api.payoneer.com/v4
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving || !payoneerConfig.apiKey || !payoneerConfig.programId}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
