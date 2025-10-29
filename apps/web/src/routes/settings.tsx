import { useState, useEffect } from 'react';
import { useSettings, useUpdateSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/utils';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const [defaultOmnigoBonus, setDefaultOmnigoBonus] = useState<string>('');

  // Initialize form with settings data
  useEffect(() => {
    if (settings) {
      setDefaultOmnigoBonus(settings.defaultOmnigoBonus.toString());
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateSettings.mutateAsync({
        defaultOmnigoBonus: parseFloat(defaultOmnigoBonus) || 0,
      });
      
      toast.success('Settings updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600">Manage global system defaults</p>
      </div>

      {/* Global Defaults Card */}
      <Card>
        <CardHeader>
          <CardTitle>Global Defaults</CardTitle>
          <CardDescription>
            These values will be used as defaults when creating new payroll cycles. You can override them per-cycle when needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="defaultOmnigoBonus" className="text-sm font-medium">
                Default Omnigo Bonus (USD)
              </label>
              <Input
                id="defaultOmnigoBonus"
                type="number"
                step="0.01"
                min="0"
                value={defaultOmnigoBonus}
                onChange={(e) => setDefaultOmnigoBonus(e.target.value)}
                placeholder={settings?.defaultOmnigoBonus.toString() || '0.00'}
                className="font-mono"
              />
              <p className="text-xs text-gray-500">
                Current value: {formatCurrency(settings?.defaultOmnigoBonus || 0)}
              </p>
            </div>

            <div className="flex justify-end">
              <Button 
                type="submit" 
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
