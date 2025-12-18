import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCycle, useCycles } from '@/hooks/use-cycles';
import { useSettings } from '@/hooks/use-settings';
import { useWorkHoursByYear } from '@/hooks/use-work-hours';
import { getMonthlyWorkHoursForYear, type MonthlyWorkHoursData } from '@/lib/work-hours';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export default function NewCyclePage() {
  const navigate = useNavigate();
  const { data: cycles } = useCycles();
  const { data: settings } = useSettings();
  const createCycle = useCreateCycle();

  // Get defaults from the latest cycle (for globalWorkHours) and global settings (for omnigoBonus)
  const latestCycle = cycles?.[0];
  
  // Get current month for defaulting
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
  
  // Fetch work hours from API for current year and next year (for December -> January)
  const { data: apiWorkHours = [], isLoading: isLoadingWorkHours, error: workHoursError } = useWorkHoursByYear(currentYear);
  const { data: nextYearApiWorkHours = [] } = useWorkHoursByYear(currentYear + 1);
  
  // Fallback to calculated work hours if API returns empty (for backwards compatibility)
  const calculatedWorkHours = useMemo(() => getMonthlyWorkHoursForYear(currentYear), [currentYear]);
  const calculatedNextYearWorkHours = useMemo(() => getMonthlyWorkHoursForYear(currentYear + 1), [currentYear]);
  
  // Use API data if available, otherwise fall back to calculated
  const monthlyWorkHours = apiWorkHours.length > 0 ? apiWorkHours : calculatedWorkHours;
  const nextYearWorkHours = nextYearApiWorkHours.length > 0 ? nextYearApiWorkHours : calculatedNextYearWorkHours;

  const [formData, setFormData] = useState({
    monthLabel: '',
    globalWorkHours: latestCycle?.globalWorkHours || 168,
    omnigoBonus: settings?.defaultOmnigoBonus || 0,
    invoiceBonus: undefined as number | undefined
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedMonthNumber, setSelectedMonthNumber] = useState<string>(currentMonth.toString());
  const hasSetOmnigoBonus = useRef(false);

  // Update form data when settings load (to populate omnigoBonus default)
  useEffect(() => {
    if (settings && !hasSetOmnigoBonus.current) {
      setFormData(prev => ({
        ...prev,
        omnigoBonus: settings.defaultOmnigoBonus || 0
      }));
      hasSetOmnigoBonus.current = true;
    }
  }, [settings]);

  // Auto-populate work hours when month is selected
  // The monthLabel represents the month the consultants worked, so use the SAME month's work hours
  useEffect(() => {
    if (monthlyWorkHours && selectedMonthNumber) {
      const selectedMonthNum = parseInt(selectedMonthNumber);
      
      // Get work hours for the selected month (same month as monthLabel)
      const selectedMonthWorkHours = monthlyWorkHours.find(
        (m: any) => m.monthNumber === selectedMonthNum
      );
      
      if (selectedMonthWorkHours) {
        setFormData(prev => ({ 
          ...prev, 
          globalWorkHours: selectedMonthWorkHours.workHours 
        }));
      }
    }
  }, [selectedMonthNumber, monthlyWorkHours]);

  // Auto-set month label based on selected month
  useEffect(() => {
    if (monthlyWorkHours && selectedMonthNumber) {
      const selected = monthlyWorkHours.find(
        (m: any) => m.monthNumber === parseInt(selectedMonthNumber)
      );
      if (selected) {
        // Always update the month label when month selection changes
        setFormData(prev => ({
          ...prev,
          monthLabel: `${selected.month} ${currentYear}`
        }));
      }
    }
  }, [selectedMonthNumber, monthlyWorkHours, currentYear]);

  const handleMonthChange = (value: string) => {
    setSelectedMonthNumber(value);
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
        omnigoBonus: formData.omnigoBonus || undefined,
        invoiceBonus: formData.invoiceBonus || undefined
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
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/dashboard')}
          className="w-full sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create New Cycle</h1>
          <p className="text-sm sm:text-base text-gray-600">Set up a new payroll cycle</p>
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
            {/* Month Selection */}
            <div className="space-y-2">
              <label htmlFor="monthSelector" className="text-sm font-medium">
                Select Cycle Start Month *
              </label>
              {isLoadingWorkHours ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-sm text-blue-800">
                    Loading work hours data...
                  </p>
                </div>
              ) : workHoursError ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">
                    Error loading work hours: {workHoursError instanceof Error ? workHoursError.message : 'Unknown error'}
                  </p>
                </div>
              ) : monthlyWorkHours && monthlyWorkHours.length > 0 ? (
                <Select value={selectedMonthNumber} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a month">
                      {monthlyWorkHours.find((m: any) => m.monthNumber === parseInt(selectedMonthNumber))?.month || 'Select a month'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {monthlyWorkHours.map((m: any) => {
                      return (
                        <SelectItem key={m.monthNumber} value={m.monthNumber.toString()}>
                          {m.month} ({m.workHours} hours)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    No work hours data found for {currentYear}. Please import work hours data first.
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    You can still create a cycle by manually entering the work hours below.
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                The selected month is the month the consultants worked. Work hours are automatically set from the database.
              </p>
            </div>

            {/* Month Label - Auto-populated but can be edited */}
            <div className="space-y-2">
              <label htmlFor="monthLabel" className="text-sm font-medium">
                Month Label (Auto-filled) *
              </label>
              <Input
                id="monthLabel"
                type="text"
                value={formData.monthLabel}
                onChange={(e) => handleInputChange('monthLabel', e.target.value)}
                placeholder="e.g., January 2025"
                className={errors.monthLabel ? 'border-red-500' : ''}
              />
              {errors.monthLabel && (
                <p className="text-sm text-red-600">{errors.monthLabel}</p>
              )}
              <p className="text-xs text-gray-500">
                This is automatically set based on your selection, but you can edit it if needed.
              </p>
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
              <p className="text-xs text-gray-500">
                Work hours for the month being paid (automatically set from the database based on the selected month). Individual consultants can override this value.
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

            {/* Invoice Bonus */}
            <div className="space-y-2">
              <label htmlFor="invoiceBonus" className="text-sm font-medium">
                Invoice Bonus ($)
              </label>
              <Input
                id="invoiceBonus"
                type="number"
                min="0"
                step="0.01"
                value={formData.invoiceBonus ?? ''}
                onChange={(e) => handleInputChange('invoiceBonus', e.target.value === '' ? undefined : parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500">
                Optional bonus amount to charge on invoices sent to Omnigo (independent from Omnigo Bonus paid to consultants).
              </p>
            </div>

            {/* Submit Error */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="submit"
                disabled={createCycle.isPending}
                className="flex-1 w-full sm:w-auto"
              >
                {createCycle.isPending ? 'Creating...' : 'Create Cycle'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                disabled={createCycle.isPending}
                className="w-full sm:w-auto"
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
