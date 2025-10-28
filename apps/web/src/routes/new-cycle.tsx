import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCycle, useCycles } from '@/hooks/use-cycles';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft } from 'lucide-react';

export default function NewCyclePage() {
  const navigate = useNavigate();
  const { data: cycles } = useCycles();
  const createCycle = useCreateCycle();

  // Get defaults from the latest cycle
  const latestCycle = cycles?.[0];
  
  const [formData, setFormData] = useState({
    monthLabel: '',
    globalWorkHours: latestCycle?.globalWorkHours || 168,
    omnigoBonus: latestCycle?.omnigoBonus || 0
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [suggestedHours, setSuggestedHours] = useState<number | null>(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);

  // Fetch suggested work hours when month label changes
  useEffect(() => {
    const fetchSuggestedHours = async () => {
      if (!formData.monthLabel.trim()) {
        setSuggestedHours(null);
        return;
      }

      setLoadingSuggestion(true);
      try {
        const result = await apiClient.getSuggestedWorkHours(formData.monthLabel);
        setSuggestedHours(result.suggestedHours);
      } catch (error) {
        console.error('Failed to fetch suggested hours:', error);
        setSuggestedHours(null);
      } finally {
        setLoadingSuggestion(false);
      }
    };

    // Debounce the API call
    const timeoutId = setTimeout(fetchSuggestedHours, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.monthLabel]);

  const handleUseSuggestedHours = () => {
    if (suggestedHours !== null) {
      setFormData(prev => ({ ...prev, globalWorkHours: suggestedHours }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});

    // Validate required fields
    const newErrors: Record<string, string> = {};
    if (!formData.monthLabel.trim()) {
      newErrors.monthLabel = 'Month label is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const cycle = await createCycle.mutateAsync({
        monthLabel: formData.monthLabel.trim(),
        globalWorkHours: formData.globalWorkHours || undefined,
        omnigoBonus: formData.omnigoBonus || undefined
      });

      // Redirect to the new cycle's Golden Sheet
      navigate(`/cycles/${cycle.id}`);
    } catch (error) {
      console.error('Failed to create cycle:', error);
      setErrors({ submit: 'Failed to create cycle. Please try again.' });
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Cycle</h1>
          <p className="text-gray-600">Set up a new payroll cycle</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Cycle Details</CardTitle>
          <CardDescription>
            Enter the details for the new payroll cycle. Line items will be automatically created for all active consultants.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Month Label */}
            <div className="space-y-2">
              <label htmlFor="monthLabel" className="text-sm font-medium">
                Month Label *
              </label>
              <Input
                id="monthLabel"
                type="text"
                value={formData.monthLabel}
                onChange={(e) => handleInputChange('monthLabel', e.target.value)}
                placeholder="e.g., January 2024, 2024-01"
                className={errors.monthLabel ? 'border-red-500' : ''}
              />
              {errors.monthLabel && (
                <p className="text-sm text-red-600">{errors.monthLabel}</p>
              )}
            </div>

            {/* Global Work Hours */}
            <div className="space-y-2">
              <label htmlFor="globalWorkHours" className="text-sm font-medium">
                Global Work Hours
              </label>
              <Input
                id="globalWorkHours"
                type="number"
                min="1"
                step="1"
                value={formData.globalWorkHours}
                onChange={(e) => handleInputChange('globalWorkHours', parseInt(e.target.value) || 0)}
                placeholder="168"
              />
              
              {/* Work Hours Suggestion */}
              {loadingSuggestion && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="animate-spin w-3 h-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
                  Looking up suggested hours...
                </div>
              )}
              
              {suggestedHours !== null && !loadingSuggestion && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-blue-800">
                      💡 Suggested: {suggestedHours} hours
                    </p>
                    <p className="text-xs text-blue-600">
                      Based on work hours reference data for this month
                    </p>
                  </div>
                  {formData.globalWorkHours !== suggestedHours && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleUseSuggestedHours}
                      className="text-xs h-6 px-2 border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      Use {suggestedHours}
                    </Button>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-500">
                Default work hours for all consultants in this cycle. Individual consultants can override this value.
              </p>
            </div>

            {/* Omnigo Bonus */}
            <div className="space-y-2">
              <label htmlFor="omnigoBonus" className="text-sm font-medium">
                Omnigo Bonus ($)
              </label>
              <Input
                id="omnigoBonus"
                type="number"
                min="0"
                step="0.01"
                value={formData.omnigoBonus}
                onChange={(e) => handleInputChange('omnigoBonus', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                Optional bonus amount to be included in the cycle calculations.
              </p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={createCycle.isPending}
                className="flex-1"
              >
                {createCycle.isPending ? 'Creating...' : 'Create Cycle'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                disabled={createCycle.isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>What happens next?</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <ul className="space-y-2">
            <li>• Line items will be automatically created for all active consultants</li>
            <li>• Each consultant's current hourly rate will be snapshotted</li>
            <li>• You'll be redirected to the Golden Sheet to start editing</li>
            <li>• All calculations will be performed in real-time</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
