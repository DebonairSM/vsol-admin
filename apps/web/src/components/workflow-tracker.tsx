import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';
import { workflowSteps, calculateWorkflowProgress, isStepCompleted, type PayrollCycleWorkflow } from '@/lib/workflow-config';
import { Check, Calendar, Clock } from 'lucide-react';
import type { PayrollCycle } from '@vsol-admin/shared';

interface WorkflowTrackerProps {
  cycle: PayrollCycle;
  onUpdateWorkflowDate: (fieldName: string, date: string | null) => Promise<void>;
}

export default function WorkflowTracker({ cycle, onUpdateWorkflowDate }: WorkflowTrackerProps) {
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');

  const progress = calculateWorkflowProgress(cycle);

  const handleStepClick = (stepId: string, fieldName: string, currentDate?: Date | string | null) => {
    setEditingStep(stepId);
    setEditDate(currentDate ? new Date(currentDate).toISOString().split('T')[0] : '');
  };

  const handleDateSave = async () => {
    if (!editingStep) return;

    const step = workflowSteps.find(s => s.id === editingStep);
    if (!step) return;

    try {
      await onUpdateWorkflowDate(
        step.fieldName, 
        editDate ? new Date(editDate).toISOString() : null
      );
      setEditingStep(null);
    } catch (error) {
      console.error('Failed to update workflow date:', error);
    }
  };

  const handleDateCancel = () => {
    setEditingStep(null);
    setEditDate('');
  };

  const handleMarkComplete = async (step: typeof workflowSteps[0]) => {
    try {
      await onUpdateWorkflowDate(step.fieldName, new Date().toISOString());
    } catch (error) {
      console.error('Failed to mark step complete:', error);
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
            const currentDate = cycle[step.fieldName];
            const IconComponent = step.icon;

            return (
              <div key={step.id} className="relative">
                {/* Connection line */}
                {index < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-full w-4 h-0.5 bg-gray-200 transform translate-x-2" />
                )}

                <div
                  className={cn(
                    "border rounded-lg p-4 transition-all duration-200 cursor-pointer hover:shadow-md",
                    isCompleted ? step.color.complete : step.color.pending
                  )}
                  onClick={() => !editingStep && handleStepClick(step.id, step.fieldName, currentDate)}
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
                        <p className="text-xs text-gray-600 mt-1">
                          {step.description}
                        </p>
                        {isCompleted && currentDate && (
                          <p className="text-xs font-mono mt-2 text-gray-800">
                            {formatDate(currentDate)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Edit Popover */}
                    <Popover open={editingStep === step.id} onOpenChange={(open) => {
                      if (!open) setEditingStep(null);
                    }}>
                      <PopoverTrigger asChild>
                        <div className="opacity-0 hover:opacity-100 transition-opacity">
                          <Calendar className="w-4 h-4 text-gray-400 cursor-pointer" />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium">{step.title}</h4>
                            <p className="text-sm text-gray-600">{step.description}</p>
                          </div>

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

                          <div className="flex justify-between gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleMarkComplete(step)}
                              className="text-xs"
                            >
                              Mark Complete Now
                            </Button>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={handleDateCancel}
                                className="text-xs"
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={handleDateSave}
                                className="text-xs"
                              >
                                Save
                              </Button>
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
