import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import { workflowSteps, calculateWorkflowProgress, isStepCompleted, canCompleteStep } from '@/lib/workflow-config';
import { Check, Calendar, Clock, Calculator, DollarSign, AlertTriangle, Lock } from 'lucide-react';
import { useCalculatePayment } from '@/hooks/use-cycles';
import { calculateDeadlineAlert, parseMonthLabel } from '@/lib/business-days';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { PayrollCycle } from '@vsol-admin/shared';

interface WorkflowTrackerProps {
  cycle: PayrollCycle;
  onUpdateWorkflowDate: (fieldName: string, date: string | null) => Promise<void>;
}

export default function WorkflowTracker({ cycle, onUpdateWorkflowDate }: WorkflowTrackerProps) {
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  
  const calculatePaymentMutation = useCalculatePayment();

  // Fetch monthly work hours data
  const { data: monthlyWorkHours } = useQuery({
    queryKey: ['monthly-work-hours'],
    queryFn: () => apiClient.getWorkHours(),
    staleTime: 5 * 60 * 1000,
  });

  // Helper function to get next month's work hours data
  const getNextMonthInfo = () => {
    const parsed = parseMonthLabel(cycle.monthLabel);
    if (!parsed || !monthlyWorkHours) return null;
    
    let nextMonth = parsed.month + 1;
    let nextYear = parsed.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    
    const nextMonthData = monthlyWorkHours?.find(
      (m: any) => m.year === nextYear && m.monthNumber === nextMonth
    );
    
    return {
      month: monthNames[nextMonth - 1],
      year: nextYear,
      data: nextMonthData
    };
  };

  const progress = calculateWorkflowProgress(cycle);

  const handleStepClick = (stepId: string, _fieldName: string, currentDate?: Date | string | null) => {
    setEditingStep(stepId);
    if (currentDate) {
      const date = new Date(currentDate);
      // Use local date instead of UTC date to avoid timezone issues
      const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
      setEditDate(localDate.toISOString().split('T')[0]);
    } else {
      setEditDate('');
    }
  };

  const handleDateSave = async () => {
    if (!editingStep) return;

    const step = workflowSteps.find(s => s.id === editingStep);
    if (!step) return;

    try {
      let dateToSave = null;
      if (editDate) {
        // Create date in local timezone to match what user sees
        const localDate = new Date(editDate + 'T12:00:00'); // Use noon to avoid DST issues
        dateToSave = localDate.toISOString();
      }
      await onUpdateWorkflowDate(step.fieldName, dateToSave);
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to update workflow date:', error);
    }
  };

  const handleDateCancel = () => {
    setEditingStep(null);
    setEditDate('');
    setCalculationResult(null);
  };

  const handleMarkComplete = async (step: typeof workflowSteps[0]) => {
    try {
      let dateToSave: string;
      
      if (editDate) {
        // User selected a specific date - use it
        const localDate = new Date(editDate + 'T12:00:00');
        dateToSave = localDate.toISOString();
      } else {
        // No date selected - use today
        const now = new Date();
        const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
        dateToSave = localNoon.toISOString();
      }
      
      await onUpdateWorkflowDate(step.fieldName, dateToSave);
      setEditingStep(null); // Close popup
      setEditDate(''); // Clear date state
    } catch (error) {
      console.error('Failed to mark step complete:', error);
    }
  };

  const handleResetDate = async (step: typeof workflowSteps[0]) => {
    try {
      await onUpdateWorkflowDate(step.fieldName, null);
      setEditingStep(null);
      setEditDate('');
      setCalculationResult(null);
    } catch (error) {
      console.error('Failed to reset workflow date:', error);
    }
  };

  const handleCalculatePayment = async () => {
    try {
      const result = await calculatePaymentMutation.mutateAsync(cycle.id);
      setCalculationResult(result);
    } catch (error) {
      console.error('Failed to calculate payment:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Payroll Workflow
          </CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="secondary">
              {progress.completedSteps} of {progress.totalSteps} completed
            </Badge>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{progress.percentage}%</span>
              <div className="w-24 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
        {progress.nextStep && (
          <p className="text-sm text-gray-600">
            Next: <span className="font-medium">{progress.nextStep.title}</span> - {progress.nextStep.description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {workflowSteps.map((step, index) => {
            const isCompleted = isStepCompleted(cycle, step);
            const canComplete = canCompleteStep(cycle, step);
            const isBlocked = !canComplete && !isCompleted;
            const currentDate = cycle[step.fieldName];
            const IconComponent = step.icon;
            
            // Calculate deadline alert for "Client Payment Scheduled Date" step
            const deadlineAlert = step.id === 'client-payment-scheduled-date' 
              ? calculateDeadlineAlert(cycle.monthLabel, currentDate)
              : null;
            
            // Determine if we should show deadline alert
            const showDeadlineAlert = deadlineAlert && !isCompleted;
            const isWarning = showDeadlineAlert && deadlineAlert.status === 'warning';
            const isCritical = showDeadlineAlert && deadlineAlert.status === 'critical';

            return (
              <div key={step.id} className="relative">
                {/* Connection line */}
                {index < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-4 h-0.5 bg-gray-200 transform translate-x-2" />
                )}

                <div
                  className={cn(
                    "border rounded-lg p-4 transition-all duration-200",
                    isCompleted ? step.color.complete : step.color.pending,
                    isBlocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer hover:shadow-md",
                    isWarning && "deadline-warning",
                    isCritical && "deadline-critical"
                  )}
                  onClick={() => !editingStep && !isBlocked && handleStepClick(step.id, step.fieldName, currentDate)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        isCompleted ? step.color.background : 'bg-gray-100'
                      )}>
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <IconComponent className="w-4 h-4" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {step.order}. {step.title}
                        </h4>
                        <p className={cn(
                          "text-xs mt-1",
                          isCritical ? "text-red-100" : "text-gray-600"
                        )}>
                          {step.id === 'hours-limit-changed' ? (
                            (() => {
                              const nextMonthInfo = getNextMonthInfo();
                              if (!nextMonthInfo) {
                                return step.description; // Fallback if can't parse
                              }
                              if (nextMonthInfo.data) {
                                return `Time Doctor limits updated for ${nextMonthInfo.month}: ${nextMonthInfo.data.workHours} hours`;
                              }
                              return null; // Will show warning badge below instead
                            })()
                          ) : (
                            step.description
                          )}
                        </p>
                        {isBlocked && step.dependsOn && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
                              <Lock className="w-3 h-3" />
                              Blocked: Complete "{workflowSteps.find(s => s.id === step.dependsOn)?.title}" first
                            </Badge>
                          </div>
                        )}
                        {step.id === 'hours-limit-changed' && (() => {
                          const nextMonthInfo = getNextMonthInfo();
                          return nextMonthInfo && !nextMonthInfo.data && (
                            <div className="mt-2">
                              <Link to="/work-hours">
                                <Badge variant="destructive" className="flex items-center gap-1 cursor-pointer hover:bg-red-700">
                                  <AlertTriangle className="w-3 h-3" />
                                  Missing work hours for {nextMonthInfo.month} {nextMonthInfo.year} - Update Work Hours
                                </Badge>
                              </Link>
                            </div>
                          );
                        })()}
                        {isCompleted && currentDate && (
                          <p className="text-xs font-mono mt-2 text-gray-800">
                            {formatDate(currentDate)}
                          </p>
                        )}
                        {showDeadlineAlert && deadlineAlert && (
                          <div className={cn(
                            "flex items-center gap-1 mt-2 text-xs font-medium",
                            isCritical ? "text-white" : "text-red-600"
                          )}>
                            <AlertTriangle className="w-3 h-3" />
                            <span>{deadlineAlert.message}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Edit Popover */}
                    <Popover open={editingStep === step.id} onOpenChange={(open) => {
                      if (!open) {
                        setEditingStep(null);
                        setCalculationResult(null);
                      }
                    }}>
                      <PopoverTrigger asChild disabled={isBlocked}>
                        <div className="opacity-0 hover:opacity-100 transition-opacity">
                          <Calendar className="w-4 h-4 text-gray-400 cursor-pointer" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-96">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">{step.title}</h4>
                            <p className="text-sm text-gray-600">{step.description}</p>
                            {showDeadlineAlert && deadlineAlert && (
                              <div className={cn(
                                "mt-3 p-2 rounded-lg border",
                                isCritical 
                                  ? "bg-red-50 border-red-300 text-red-700" 
                                  : "bg-amber-50 border-amber-300 text-amber-700"
                              )}>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <AlertTriangle className="w-4 h-4" />
                                  {deadlineAlert.message}
                                </div>
                                <div className="mt-2 text-xs space-y-1">
                                  <p>Consultant Payment: {formatDate(deadlineAlert.consultantPaymentDate)}</p>
                                  <p>Omnigo Deadline: {formatDate(deadlineAlert.omnigoDeadline)}</p>
                                </div>
                              </div>
                            )}
                          </div>

                          {step.id === 'calculate-payment' ? (
                            <>
                              {/* Payment Calculation Section */}
                              {!calculationResult ? (
                                <div className="space-y-3">
                                  <Button 
                                    onClick={handleCalculatePayment}
                                    disabled={calculatePaymentMutation.isPending}
                                    className="w-full"
                                    size="sm"
                                  >
                                    <Calculator className="w-4 h-4 mr-2" />
                                    {calculatePaymentMutation.isPending ? 'Calculating...' : 'Calculate Payment'}
                                  </Button>
                                  <p className="text-xs text-gray-500">
                                    This will calculate amounts for Wells Fargo transfer and prepare Payoneer dispersal data.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
                                      <DollarSign className="w-4 h-4" />
                                      Payment Calculated Successfully
                                    </div>
                                    <div className="mt-2 text-xs space-y-1">
                                      <div className="flex justify-between">
                                        <span>Total Consultant Payments:</span>
                                        <span className="font-mono">${calculationResult.totalConsultantPayments?.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Omnigo Bonus:</span>
                                        <span className="font-mono">${calculationResult.omnigoBonus?.toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span>Equipment USD:</span>
                                        <span className="font-mono">${calculationResult.equipmentsUSD?.toFixed(2)}</span>
                                      </div>
                                      <hr className="border-green-200" />
                                      <div className="flex justify-between font-medium">
                                        <span>Wells Fargo Transfer:</span>
                                        <span className="font-mono">${calculationResult.totalWellsFargoTransfer?.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600">
                                    <p>✓ {calculationResult.consultantPayments?.length} consultant payments calculated</p>
                                    {calculationResult.anomalies?.length > 0 && (
                                      <p className="text-amber-600">⚠ {calculationResult.anomalies.length} anomalies detected</p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Date Setting Section */}
                              {(calculationResult || isCompleted) && (
                                <div className="space-y-2 pt-3 border-t">
                                  <Label htmlFor="stepDate" className="text-xs">
                                    Completion Date
                                  </Label>
                                  <Input
                                    id="stepDate"
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="text-sm"
                                  />
                                </div>
                              )}
                            </>
                          ) : (
                            /* Standard Date Picker for Other Steps */
                            <div className="space-y-2">
                              <Label htmlFor="stepDate" className="text-xs">
                                Completion Date
                              </Label>
                              <Input
                                id="stepDate"
                                type="date"
                                value={editDate}
                                onChange={(e) => setEditDate(e.target.value)}
                                className="text-sm"
                              />
                            </div>
                          )}

                          <div className="flex justify-between gap-2">
                            <div>
                              {isCompleted && (
                                <Button 
                                  size="sm" 
                                  variant="destructive" 
                                  onClick={() => handleResetDate(step)}
                                  className="text-xs"
                                >
                                  Reset
                                </Button>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleDateCancel}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                              {step.id !== 'calculate-payment' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleMarkComplete(step)}
                                  className="text-xs"
                                >
                                  Mark Complete
                                </Button>
                              )}
                              {step.id === 'calculate-payment' && (calculationResult || isCompleted) && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleMarkComplete(step)}
                                  className="text-xs"
                                >
                                  Mark Complete
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        {progress.percentage === 100 && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <Check className="w-5 h-5" />
              <span className="font-medium">Payroll Cycle Complete</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              All workflow steps have been completed. The cycle is ready for archival.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
