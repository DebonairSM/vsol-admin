import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateCycle, useCycles } from '@/hooks/use-cycles';
import { useSettings } from '@/hooks/use-settings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { getMonthlyWorkHoursForYear, type MonthlyWorkHoursData } from '@/lib/work-hours';

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
  
  // Calculate monthly work hours for the current year and next year (for December -> January)
  const monthlyWorkHours = getMonthlyWorkHoursForYear(currentYear);
  const nextYearWorkHours = getMonthlyWorkHoursForYear(currentYear + 1);

  const [formData, setFormData] = useState({
    monthLabel: '',
    globalWorkHours: latestCycle?.globalWorkHours || 168,
    omnigoBonus: settings?.defaultOmnigoBonus || 0
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
  // The cycle starts in the selected month, but the work hours are for the NEXT month (the month being paid)
  useEffect(() => {
    if (monthlyWorkHours && selectedMonthNumber) {
      const selectedMonthNum = parseInt(selectedMonthNumber);
      let nextMonthNum = selectedMonthNum + 1;
      let nextYear = currentYear;
      
      // Handle December -> January of next year
      if (nextMonthNum > 12) {
        nextMonthNum = 1;
        nextYear = currentYear + 1;
      }
      
      // Get work hours for the next month
      // If next year, use the pre-calculated next year data
      const nextMonthWorkHours = nextYear === currentYear
        ? monthlyWorkHours.find((m: MonthlyWorkHoursData) => m.monthNumber === nextMonthNum)
        : nextYearWorkHours.find((m: MonthlyWorkHoursData) => m.monthNumber === nextMonthNum);
      
      if (nextMonthWorkHours) {
        setFormData(prev => ({ 
          ...prev, 
          globalWorkHours: nextMonthWorkHours.workHours 
        }));
      }
    }
  }, [selectedMonthNumber, monthlyWorkHours, currentYear]);

  // Auto-set month label based on selected month
  useEffect(() => {
    if (monthlyWorkHours && selectedMonthNumber) {
      const selected = monthlyWorkHours.find(
        (m: MonthlyWorkHoursData) => m.monthNumber === parseInt(selectedMonthNumber)
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
            {/* Month Selection */}
            <div className="space-y-2">
              <label htmlFor="monthSelector" className="text-sm font-medium">
                Select Cycle Start Month *
              </label>
              {monthlyWorkHours && monthlyWorkHours.length > 0 ? (
                <Select value={selectedMonthNumber} onValueChange={handleMonthChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a month">
                      {monthlyWorkHours.find((m: MonthlyWorkHoursData) => m.monthNumber === parseInt(selectedMonthNumber))?.month || 'Select a month'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {monthlyWorkHours.map((m: MonthlyWorkHoursData) => {
                      // Calculate next month for display
                      let nextMonthNum = m.monthNumber + 1;
                      let nextYear = currentYear;
                      if (nextMonthNum > 12) {
                        nextMonthNum = 1;
                        nextYear = currentYear + 1;
                      }
                      const nextMonthData = nextYear === currentYear
                        ? monthlyWorkHours.find((n: MonthlyWorkHoursData) => n.monthNumber === nextMonthNum)
                        : nextYearWorkHours.find((n: MonthlyWorkHoursData) => n.monthNumber === nextMonthNum);
                      const nextMonthName = nextMonthData?.month || 'Unknown';
                      const nextMonthHours = nextMonthData?.workHours || 0;
                      
                      return (
                        <SelectItem key={m.monthNumber} value={m.monthNumber.toString()}>
                          {m.month} (pays for {nextMonthName}: {nextMonthHours} hours)
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <p className="text-sm text-amber-800">
                    Unable to calculate work hours for {currentYear}.
                  </p>
                </div>
              )}
              <p className="text-xs text-gray-500">
                The cycle starts in the selected month. Work hours are calculated for the next month (the month being paid).
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
                Work hours for the month being paid (automatically set to the next month after the cycle start month). Individual consultants can override this value.
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
