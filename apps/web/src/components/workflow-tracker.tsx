import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { formatDate, formatDateTime, cn, calculateCountdown } from '@/lib/utils';
import { workflowSteps, calculateWorkflowProgress, isStepCompleted, canCompleteStep } from '@/lib/workflow-config';
import { Check, Calendar, Clock, Calculator, DollarSign, AlertTriangle, Lock, ExternalLink, Eye } from 'lucide-react';
import { useCalculatePayment } from '@/hooks/use-cycles';
import { calculateDeadlineAlert, parseMonthLabel } from '@/lib/business-days';
import { getWorkHoursForMonthByNumber, getMonthName } from '@/lib/work-hours';
import { toast } from 'sonner';
import type { PayrollCycle } from '@vsol-admin/shared';
import { apiClient } from '@/lib/api-client';
import { useClientInvoiceByCycle, useCreateInvoiceFromCycle, useUpdateInvoiceStatus } from '@/hooks/use-client-invoices';
import { useNavigate } from 'react-router-dom';

interface WorkflowTrackerProps {
  cycle: PayrollCycle;
  onUpdateWorkflowDate: (fieldName: string, date: string | null) => Promise<void>;
}

export default function WorkflowTracker({ cycle, onUpdateWorkflowDate }: WorkflowTrackerProps) {
  const navigate = useNavigate();
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editDate, setEditDate] = useState('');
  const [editFundingDate, setEditFundingDate] = useState('');
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [noBonus, setNoBonus] = useState(false);
  const [receiptAmount, setReceiptAmount] = useState<string>('');
  const [recipientEmail, setRecipientEmail] = useState<string>('apmailbox@omnigo.com');
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  
  const calculatePaymentMutation = useCalculatePayment();
  const { data: invoiceData, refetch: refetchInvoice } = useClientInvoiceByCycle(cycle.id);
  const createInvoiceFromCycleMutation = useCreateInvoiceFromCycle();
  const updateInvoiceStatusMutation = useUpdateInvoiceStatus();

  // Update current time for countdown - more frequently when showing hours
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000); // Update every 10 seconds for accurate hour countdown
    
    return () => clearInterval(interval);
  }, []);

  // Auto-fill receipt amount from invoice when invoice data is available
  useEffect(() => {
    if (invoiceData?.total && !receiptAmount) {
      setReceiptAmount(invoiceData.total.toString());
    }
  }, [invoiceData, receiptAmount]);

  // Helper function to get next month's work hours data
  const getNextMonthInfo = () => {
    const parsed = parseMonthLabel(cycle.monthLabel);
    if (!parsed) return null;
    
    let nextMonth = parsed.month + 1;
    let nextYear = parsed.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear++;
    }
    
    const monthName = getMonthName(nextMonth);
    const workHours = getWorkHoursForMonthByNumber(nextYear, nextMonth);
    
    if (!monthName || workHours === null) {
      return null;
    }
    
    return {
      month: monthName,
      year: nextYear,
      data: {
        workHours,
        weekdays: Math.floor(workHours / 8)
      }
    };
  };

  const progress = calculateWorkflowProgress(cycle);

  const handleStepClick = (stepId: string, _fieldName: string, currentDate?: Date | string | null) => {
    setEditingStep(stepId);
    
    // For Payment Arrival step, load both expected date (with time) and completion date (date only)
    if (stepId === 'payment-arrival') {
      // Load expected arrival date (with time)
      if (cycle.paymentArrivalExpectedDate) {
        const expectedDate = new Date(cycle.paymentArrivalExpectedDate);
        const localExpectedDate = new Date(expectedDate.getTime() - (expectedDate.getTimezoneOffset() * 60000));
        const year = localExpectedDate.getFullYear();
        const month = String(localExpectedDate.getMonth() + 1).padStart(2, '0');
        const day = String(localExpectedDate.getDate()).padStart(2, '0');
        const hours = String(localExpectedDate.getHours()).padStart(2, '0');
        const minutes = String(localExpectedDate.getMinutes()).padStart(2, '0');
        setEditFundingDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setEditFundingDate('');
      }
      // Load completion date (date only)
      if (currentDate) {
        const date = new Date(currentDate);
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        setEditDate(localDate.toISOString().split('T')[0]);
      } else {
        setEditDate('');
      }
    } else if (stepId === 'payoneer-account-funded') {
      // For Payoneer Account Funded step, load completion date and funding date
      if (currentDate) {
        const date = new Date(currentDate);
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        setEditDate(localDate.toISOString().split('T')[0]);
      } else {
        setEditDate('');
      }
      if (cycle.payoneerFundingDate) {
        const fundingDate = new Date(cycle.payoneerFundingDate);
        const localFundingDate = new Date(fundingDate.getTime() - (fundingDate.getTimezoneOffset() * 60000));
        // Format as datetime-local string (YYYY-MM-DDTHH:mm)
        const year = localFundingDate.getFullYear();
        const month = String(localFundingDate.getMonth() + 1).padStart(2, '0');
        const day = String(localFundingDate.getDate()).padStart(2, '0');
        const hours = String(localFundingDate.getHours()).padStart(2, '0');
        const minutes = String(localFundingDate.getMinutes()).padStart(2, '0');
        setEditFundingDate(`${year}-${month}-${day}T${hours}:${minutes}`);
      } else {
        setEditFundingDate('');
      }
    } else {
      // For other steps, use date-only format
      if (currentDate) {
        const date = new Date(currentDate);
        // Use local date instead of UTC date to avoid timezone issues
        const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        setEditDate(localDate.toISOString().split('T')[0]);
      } else {
        setEditDate('');
      }
      setEditFundingDate('');
    }
  };

  const handleDateSave = async () => {
    if (!editingStep) return;

    const step = workflowSteps.find(s => s.id === editingStep);
    if (!step) return;

    try {
      // For Payoneer Account Funded step, save both dates independently
      if (editingStep === 'payoneer-account-funded') {
        // Save completion date (user can update or clear it)
        let completionDateToSave = null;
        if (editDate) {
          const localDate = new Date(editDate + 'T12:00:00');
          completionDateToSave = localDate.toISOString();
        }
        // Only update completion date if it was explicitly changed from current value
        const currentCompletionDate = cycle.payoneerAccountFundedDate 
          ? new Date(cycle.payoneerAccountFundedDate).toISOString().split('T')[0]
          : '';
        if (editDate !== currentCompletionDate) {
          await onUpdateWorkflowDate('payoneerAccountFundedDate', completionDateToSave);
        }
        
        // Always save funding date (can be saved independently)
        let fundingDateToSave = null;
        if (editFundingDate) {
          // editFundingDate is in datetime-local format (YYYY-MM-DDTHH:mm)
          const localFundingDate = new Date(editFundingDate);
          fundingDateToSave = localFundingDate.toISOString();
        }
        await onUpdateWorkflowDate('payoneerFundingDate', fundingDateToSave);
        
        setEditingStep(null);
        setEditFundingDate('');
        toast.success(`${step.title} dates updated`);
      } else if (editingStep === 'payment-arrival') {
        // For Payment Arrival step, save both expected date (with time) and completion date (date only)
        // Save expected arrival date (with time)
        let expectedDateToSave = null;
        if (editFundingDate) {
          const localDate = new Date(editFundingDate);
          expectedDateToSave = localDate.toISOString();
        }
        await onUpdateWorkflowDate('paymentArrivalExpectedDate', expectedDateToSave);
        
        // Save completion date (date only) - only if it was explicitly changed
        const currentCompletionDate = cycle.paymentArrivalDate 
          ? new Date(cycle.paymentArrivalDate).toISOString().split('T')[0]
          : '';
        if (editDate !== currentCompletionDate) {
          let completionDateToSave = null;
          if (editDate) {
            const localDate = new Date(editDate + 'T12:00:00');
            completionDateToSave = localDate.toISOString();
          }
          await onUpdateWorkflowDate('paymentArrivalDate', completionDateToSave);
        }
        
        setEditingStep(null);
        setEditFundingDate('');
        setEditDate('');
        toast.success(`${step.title} dates updated`);
      } else {
        let dateToSave = null;
        if (editDate) {
          // Create date in local timezone to match what user sees
          const localDate = new Date(editDate + 'T12:00:00'); // Use noon to avoid DST issues
          dateToSave = localDate.toISOString();
        }
        await onUpdateWorkflowDate(step.fieldName, dateToSave);
        setEditingStep(null);
        toast.success(`${step.title} date updated`);
      }
    } catch (error: any) {
      console.error('Failed to update workflow date:', error);
      toast.error(error.message || `Failed to update ${step.title} date`);
    }
  };

  const handleDateCancel = () => {
    setEditingStep(null);
    setEditDate('');
    setEditFundingDate('');
    setCalculationResult(null);
    setNoBonus(false);
    setReceiptAmount('');
    setRecipientEmail('apmailbox@omnigo.com');
  };

  const handleMarkComplete = async (step: typeof workflowSteps[0]) => {
    try {
      // For Payoneer Account Funded step, handle both dates
      if (step.id === 'payoneer-account-funded') {
        let completionDateToSave: string;
        if (editDate) {
          const localDate = new Date(editDate + 'T12:00:00');
          completionDateToSave = localDate.toISOString();
        } else {
          const now = new Date();
          const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
          completionDateToSave = localNoon.toISOString();
        }
        await onUpdateWorkflowDate('payoneerAccountFundedDate', completionDateToSave);
        
        // Funding date is optional, only save if provided
        if (editFundingDate) {
          // editFundingDate is in datetime-local format (YYYY-MM-DDTHH:mm)
          const localFundingDate = new Date(editFundingDate);
          await onUpdateWorkflowDate('payoneerFundingDate', localFundingDate.toISOString());
        }
        
        setEditingStep(null);
        setEditDate('');
        setEditFundingDate('');
        toast.success(`${step.title} marked as complete`);
      } else if (step.id === 'payment-arrival') {
        // For Payment Arrival step, handle both expected date (with time) and completion date (date only)
        // Save expected arrival date (with time) if provided
        if (editFundingDate) {
          const localDate = new Date(editFundingDate);
          await onUpdateWorkflowDate('paymentArrivalExpectedDate', localDate.toISOString());
        }
        
        // Save completion date (date only) - use today if not provided
        let completionDateToSave: string;
        if (editDate) {
          const localDate = new Date(editDate + 'T12:00:00');
          completionDateToSave = localDate.toISOString();
        } else {
          const now = new Date();
          const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
          completionDateToSave = localNoon.toISOString();
        }
        await onUpdateWorkflowDate('paymentArrivalDate', completionDateToSave);
        
        setEditingStep(null);
        setEditFundingDate('');
        setEditDate('');
        toast.success(`${step.title} marked as complete`);
      } else {
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
        toast.success(`${step.title} marked as complete`);
      }
    } catch (error: any) {
      console.error('Failed to mark step complete:', error);
      toast.error(error.message || `Failed to mark ${step.title} as complete`);
    }
  };

  const handleResetDate = async (step: typeof workflowSteps[0]) => {
    try {
      if (step.id === 'payoneer-account-funded') {
        await onUpdateWorkflowDate('payoneerAccountFundedDate', null);
        await onUpdateWorkflowDate('payoneerFundingDate', null);
        setEditingStep(null);
        setEditDate('');
        setEditFundingDate('');
        setCalculationResult(null);
        toast.success(`${step.title} dates reset`);
      } else if (step.id === 'payment-arrival') {
        await onUpdateWorkflowDate('paymentArrivalExpectedDate', null);
        await onUpdateWorkflowDate('paymentArrivalDate', null);
        setEditingStep(null);
        setEditDate('');
        setEditFundingDate('');
        setCalculationResult(null);
        toast.success(`${step.title} dates reset`);
      } else {
        await onUpdateWorkflowDate(step.fieldName, null);
        setEditingStep(null);
        setEditDate('');
        setCalculationResult(null);
        toast.success(`${step.title} date reset`);
      }
    } catch (error: any) {
      console.error('Failed to reset workflow date:', error);
      toast.error(error.message || `Failed to reset ${step.title} date`);
    }
  };

  const handleCalculatePayment = async () => {
    try {
      const result = await calculatePaymentMutation.mutateAsync({ cycleId: cycle.id, noBonus });
      setCalculationResult(result);
    } catch (error) {
      console.error('Failed to calculate payment:', error);
    }
  };

  const generateReceiptPreview = (): string => {
    const amount = parseFloat(receiptAmount) || 0;
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);

    const paymentDate = cycle.sendReceiptDate 
      ? (typeof cycle.sendReceiptDate === 'string' ? new Date(cycle.sendReceiptDate) : cycle.sendReceiptDate)
      : new Date();
    const formattedDate = paymentDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Calculate work period (next month after cycle month)
    const parsed = parseMonthLabel(cycle.monthLabel);
    let workPeriodText = 'the upcoming period';
    if (parsed) {
      let nextMonth = parsed.month + 1;
      let nextYear = parsed.year;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      const monthName = getMonthName(nextMonth);
      if (monthName) {
        workPeriodText = `${monthName} ${nextYear}`;
      }
    }

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h2 style="color: #2c3e50; margin-top: 0;">Payment Receipt</h2>
    <p>Dear Omnigo Accounts Payable Team,</p>
    <p>This email confirms receipt of payment for consultant services to be performed in ${workPeriodText}.</p>
    
    <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
      ${invoiceData?.invoiceNumber ? `<p style="margin: 5px 0;"><strong>Invoice Number:</strong> #${invoiceData.invoiceNumber}</p>` : ''}
      <p style="margin: 5px 0;"><strong>Receipt Amount:</strong> ${formattedAmount}</p>
      <p style="margin: 5px 0;"><strong>Payment Date:</strong> ${formattedDate}</p>
    </div>
    
    <p>Thank you for your prompt payment. We appreciate your business.</p>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p style="margin: 5px 0;"><strong>VSol Admin</strong></p>
      <p style="margin: 5px 0;">Phone: (407) 409-0874</p>
      <p style="margin: 5px 0;">Email: admin@vsol.software</p>
      <p style="margin: 5px 0;">Website: www.vsol.software</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  };

  const handlePreviewReceipt = () => {
    const amount = parseFloat(receiptAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid receipt amount greater than zero');
      return;
    }
    setShowPreview(true);
  };

  const handleSendReceipt = async () => {
    const amount = parseFloat(receiptAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid receipt amount greater than zero');
      return;
    }

    setSendingReceipt(true);
    try {
      await apiClient.sendReceipt(cycle.id, amount, recipientEmail, invoiceData?.invoiceNumber);
      toast.success(`Receipt sent successfully to ${recipientEmail}`);
      
      // Update the workflow date
      const now = new Date();
      const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      await onUpdateWorkflowDate('sendReceiptDate', localNoon.toISOString());
      
      // Close the popover and reset state
      setEditingStep(null);
      setReceiptAmount('');
      setRecipientEmail('apmailbox@omnigo.com');
      setShowPreview(false);
    } catch (error: any) {
      console.error('Failed to send receipt:', error);
      toast.error(error.message || 'Failed to send receipt');
    } finally {
      setSendingReceipt(false);
    }
  };

  const handleCreateInvoiceFromCycle = async () => {
    try {
      await createInvoiceFromCycleMutation.mutateAsync(cycle.id);
      toast.success('Invoice created successfully');
      await refetchInvoice();
    } catch (error: any) {
      console.error('Failed to create invoice:', error);
      toast.error(error.message || 'Failed to create invoice');
    }
  };

  const handlePreviewInvoice = () => {
    if (invoiceData) {
      setShowInvoicePreview(true);
    }
  };

  const handleMarkInvoiceAsSent = async () => {
    if (!invoiceData) return;

    try {
      await updateInvoiceStatusMutation.mutateAsync({
        id: invoiceData.id,
        status: 'SENT'
      });
      
      // Update cycle.sendInvoiceDate
      const now = new Date();
      const localNoon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
      await onUpdateWorkflowDate('sendInvoiceDate', localNoon.toISOString());
      
      toast.success('Invoice marked as sent');
      await refetchInvoice();
      setEditingStep(null);
    } catch (error: any) {
      console.error('Failed to mark invoice as sent:', error);
      toast.error(error.message || 'Failed to mark invoice as sent');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4 overflow-hidden">
          <CardTitle className="flex items-center gap-2 min-w-0 flex-shrink">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span className="truncate">Payroll Workflow</span>
          </CardTitle>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Badge variant="secondary">
              {progress.completedSteps} of {progress.totalSteps} completed
            </Badge>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{progress.percentage}%</span>
              <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
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
          {[...workflowSteps].sort((a, b) => a.order - b.order).map((step, index) => {
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
                          {step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate && (
                            <span className="ml-2 text-xs font-normal text-blue-700">
                              ({formatDateTime(cycle.paymentArrivalExpectedDate)})
                            </span>
                          )}
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
                          ) : step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate ? (
                            `Expected: ${formatDateTime(cycle.paymentArrivalExpectedDate)}`
                          ) : (
                            step.description
                          )}
                        </p>
                        {step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate && (() => {
                          const countdown = calculateCountdown(cycle.paymentArrivalExpectedDate);
                          if (!countdown) return null;
                          
                          const isUrgent = !countdown.isPast && countdown.days === 0;
                          const isPast = countdown.isPast;
                          
                          return (
                            <div className="mt-2">
                              <Badge 
                                variant={isPast ? "secondary" : isUrgent ? "destructive" : "default"}
                                className={cn(
                                  "flex items-center gap-1 text-xs font-semibold",
                                  isUrgent && "animate-pulse"
                                )}
                              >
                                <Clock className="w-3 h-3" />
                                {countdown.displayText}
                              </Badge>
                            </div>
                          );
                        })()}
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
                          <div className="text-xs mt-2 space-y-1">
                            <p className="font-mono text-gray-800">
                              {step.id === 'payment-arrival' 
                                ? `Arrival: ${formatDate(currentDate)}`
                                : `Completed: ${formatDate(currentDate)}`}
                            </p>
                            {step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate && (
                              <p className="font-mono text-blue-700">
                                Expected: {formatDateTime(cycle.paymentArrivalExpectedDate)}
                              </p>
                            )}
                            {step.id === 'payoneer-account-funded' && cycle.payoneerFundingDate && (
                              <p className="font-mono text-blue-700">
                                Funding: {formatDateTime(cycle.payoneerFundingDate)}
                              </p>
                            )}
                          </div>
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
                        setNoBonus(false);
                        setReceiptAmount('');
                        setRecipientEmail('apmailbox@omnigo.com');
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
                            <h4 className="font-medium">
                              {step.title}
                              {step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate && (
                                <span className="ml-2 text-sm font-normal text-blue-700">
                                  ({formatDateTime(cycle.paymentArrivalExpectedDate)})
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate 
                                ? `Expected: ${formatDateTime(cycle.paymentArrivalExpectedDate)}`
                                : step.description}
                            </p>
                            {step.id === 'payment-arrival' && cycle.paymentArrivalExpectedDate && (() => {
                              const countdown = calculateCountdown(cycle.paymentArrivalExpectedDate);
                              if (!countdown) return null;
                              
                              const isUrgent = !countdown.isPast && countdown.days === 0;
                              const isPast = countdown.isPast;
                              
                              return (
                                <div className="mt-2">
                                  <Badge 
                                    variant={isPast ? "secondary" : isUrgent ? "destructive" : "default"}
                                    className={cn(
                                      "flex items-center gap-1 text-xs font-semibold",
                                      isUrgent && "animate-pulse"
                                    )}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {countdown.displayText}
                                  </Badge>
                                </div>
                              );
                            })()}
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
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id="noBonus"
                                      checked={noBonus}
                                      onCheckedChange={(checked) => setNoBonus(checked as boolean)}
                                    />
                                    <Label htmlFor="noBonus" className="text-xs cursor-pointer">
                                      No bonus this month
                                    </Label>
                                  </div>
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
                                    This will calculate payment amounts and request funds from Payoneer to be debited from Wells Fargo account.
                                  </p>
                                  <div className="pt-2 border-t">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => window.open('https://partners.payoneer.com/', '_blank', 'noopener,noreferrer')}
                                    >
                                      <ExternalLink className="w-4 h-4 mr-2" />
                                      Open Payoneer Partners Portal
                                    </Button>
                                    <p className="text-xs text-gray-500 text-center mt-1">
                                      Request funds from your bank to fund Payoneer account
                                    </p>
                                  </div>
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
                                      <div className={`flex justify-between ${cycle.payoneerBalanceApplied && cycle.payoneerBalanceApplied > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                        <span>Payoneer Credit Applied:</span>
                                        <span className="font-mono">
                                          {cycle.payoneerBalanceApplied && cycle.payoneerBalanceApplied > 0 
                                            ? `-$${cycle.payoneerBalanceApplied.toFixed(2)}`
                                            : '$0.00'}
                                        </span>
                                      </div>
                                      <hr className="border-green-200" />
                                      <div className="flex justify-between font-medium">
                                        <span>Wells Fargo Transfer:</span>
                                        <span className="font-mono">${calculationResult.totalWellsFargoTransfer?.toFixed(2)}</span>
                                      </div>
                                      {cycle.payoneerBalanceApplied && cycle.payoneerBalanceApplied > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          Credit applied reduces the amount requested from Wells Fargo
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-1">
                                    <p>✓ {calculationResult.consultantPayments?.length} consultant payments calculated</p>
                                    {calculationResult.paymentMonthLabel && calculationResult.paymentMonthWorkHours && (
                                      <p className="text-blue-600 font-medium">
                                        Using {calculationResult.paymentMonthWorkHours} hours from {calculationResult.paymentMonthLabel}
                                      </p>
                                    )}
                                    {calculationResult.anomalies?.length > 0 && (
                                      <p className="text-amber-600">⚠ {calculationResult.anomalies.length} anomalies detected</p>
                                    )}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full mt-2"
                                    onClick={() => window.open('https://partners.payoneer.com/', '_blank', 'noopener,noreferrer')}
                                  >
                                    <ExternalLink className="w-4 h-4 mr-2" />
                                    Request Funds from Bank
                                  </Button>
                                  <p className="text-xs text-gray-500 text-center">
                                    Open Payoneer Partners portal to request ${calculationResult.totalWellsFargoTransfer?.toFixed(2)} from Wells Fargo
                                  </p>
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
                          ) : step.id === 'send-invoice' ? (
                            /* Send Invoice - Invoice Creation/Preview */
                            <div className="space-y-4">
                              {invoiceData ? (
                                <>
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-blue-900">
                                          Invoice #{invoiceData.invoiceNumber}
                                        </p>
                                        <p className="text-xs text-blue-700 mt-1">
                                          Status: <span className="font-semibold">{invoiceData.status}</span>
                                        </p>
                                        <p className="text-xs text-blue-700">
                                          Amount Due: <span className="font-semibold">${invoiceData.amountDue.toFixed(2)}</span>
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={handlePreviewInvoice}
                                      variant="outline"
                                      className="flex-1"
                                      size="sm"
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      Preview Invoice
                                    </Button>
                                    {invoiceData.status === 'DRAFT' && (
                                      <Button
                                        onClick={handleMarkInvoiceAsSent}
                                        disabled={updateInvoiceStatusMutation.isPending}
                                        className="flex-1"
                                        size="sm"
                                      >
                                        {updateInvoiceStatusMutation.isPending ? 'Sending...' : 'Mark as Sent'}
                                      </Button>
                                    )}
                                  </div>
                                  <Button
                                    onClick={() => navigate(`/client-invoices/${invoiceData.id}`)}
                                    variant="outline"
                                    className="w-full"
                                    size="sm"
                                  >
                                    Edit Invoice
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-gray-600">
                                    Create an invoice from this cycle's consultants and line items.
                                  </p>
                                  <Button
                                    onClick={handleCreateInvoiceFromCycle}
                                    disabled={createInvoiceFromCycleMutation.isPending}
                                    className="w-full"
                                    size="sm"
                                  >
                                    {createInvoiceFromCycleMutation.isPending ? 'Creating...' : 'Create Invoice from Cycle'}
                                  </Button>
                                </>
                              )}
                              {isCompleted && cycle.sendInvoiceDate && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-gray-600">
                                    Sent: <span className="font-mono">{formatDate(cycle.sendInvoiceDate)}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : step.id === 'send-receipt' ? (
                            /* Send Receipt - Receipt Amount Input */
                            <div className="space-y-4">
                              {invoiceData?.invoiceNumber && (
                                <div className="space-y-2">
                                  <Label htmlFor="invoiceNumber" className="text-xs">
                                    Invoice Number
                                  </Label>
                                  <Input
                                    id="invoiceNumber"
                                    type="text"
                                    value={`#${invoiceData.invoiceNumber}`}
                                    readOnly
                                    className="text-sm bg-gray-50"
                                  />
                                </div>
                              )}
                              <div className="space-y-2">
                                <Label htmlFor="receiptAmount" className="text-xs">
                                  Receipt Amount (USD)
                                </Label>
                                <Input
                                  id="receiptAmount"
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  value={receiptAmount}
                                  onChange={(e) => setReceiptAmount(e.target.value)}
                                  placeholder="0.00"
                                  className="text-sm"
                                />
                                <p className="text-xs text-gray-500">
                                  {invoiceData?.total 
                                    ? `Auto-filled from invoice total. Enter the invoice amount received from Omnigo`
                                    : 'Enter the invoice amount received from Omnigo'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="recipientEmail" className="text-xs">
                                  Recipient Email
                                </Label>
                                <Input
                                  id="recipientEmail"
                                  type="email"
                                  value={recipientEmail}
                                  onChange={(e) => setRecipientEmail(e.target.value)}
                                  placeholder="apmailbox@omnigo.com"
                                  className="text-sm"
                                />
                                <p className="text-xs text-gray-500">
                                  Receipt will be sent to this email address
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  onClick={handlePreviewReceipt}
                                  disabled={!receiptAmount || parseFloat(receiptAmount) <= 0}
                                  variant="outline"
                                  className="flex-1"
                                  size="sm"
                                >
                                  <Eye className="w-4 h-4 mr-2" />
                                  Preview
                                </Button>
                                <Button
                                  onClick={handleSendReceipt}
                                  disabled={sendingReceipt || !receiptAmount || parseFloat(receiptAmount) <= 0}
                                  className="flex-1"
                                  size="sm"
                                >
                                  {sendingReceipt ? 'Sending...' : 'Send Receipt'}
                                </Button>
                              </div>
                              {isCompleted && cycle.receiptAmount && (
                                <div className="pt-2 border-t">
                                  <p className="text-xs text-gray-600">
                                    Last sent amount: <span className="font-mono">${cycle.receiptAmount.toFixed(2)}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          ) : step.id === 'payoneer-account-funded' ? (
                            /* Payoneer Account Funded - Two Date Fields */
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="completionDate" className="text-xs">
                                  Completion Date
                                </Label>
                                <Input
                                  id="completionDate"
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="text-sm"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="fundingDate" className="text-xs">
                                  Funding Date & Time
                                </Label>
                                <Input
                                  id="fundingDate"
                                  type="datetime-local"
                                  value={editFundingDate}
                                  onChange={(e) => setEditFundingDate(e.target.value)}
                                  className="text-sm"
                                />
                                <p className="text-xs text-gray-500">
                                  Expected date and time when the deposit will clear in Payoneer account
                                </p>
                              </div>
                            </div>
                          ) : step.id === 'payment-arrival' ? (
                            /* Payment Arrival - Two Date Fields */
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="expectedArrivalDateTime" className="text-xs">
                                  Expected Arrival Date & Time
                                </Label>
                                <Input
                                  id="expectedArrivalDateTime"
                                  type="datetime-local"
                                  value={editFundingDate}
                                  onChange={(e) => setEditFundingDate(e.target.value)}
                                  className="text-sm"
                                />
                                <p className="text-xs text-gray-500">
                                  Date and time when funds are expected to arrive in Payoneer account
                                </p>
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="completionDate" className="text-xs">
                                  Completion Date
                                </Label>
                                <Input
                                  id="completionDate"
                                  type="date"
                                  value={editDate}
                                  onChange={(e) => setEditDate(e.target.value)}
                                  className="text-sm"
                                />
                                <p className="text-xs text-gray-500">
                                  Actual date when funds were confirmed to have arrived (date only, no time)
                                </p>
                              </div>
                            </div>
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
                              {(step.id === 'payoneer-account-funded' || step.id === 'payment-arrival') && (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={handleDateSave}
                                  className="text-xs"
                                >
                                  Save Dates
                                </Button>
                              )}
                              {step.id !== 'calculate-payment' && step.id !== 'send-receipt' && step.id !== 'send-invoice' && (
                                <Button 
                                  size="sm" 
                                  onClick={() => handleMarkComplete(step)}
                                  className="text-xs"
                                >
                                  Mark Complete
                                </Button>
                              )}
                              {step.id === 'send-invoice' && invoiceData && invoiceData.status === 'SENT' && (
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
                                  <Button 
                                    size="sm" 
                                    onClick={() => handleMarkComplete(step)}
                                    className="w-full text-xs"
                                  >
                                    Mark Complete
                                  </Button>
                                </div>
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

      {/* Receipt Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Receipt Email Preview</DialogTitle>
            <DialogDescription>
              This is how the receipt email will appear when sent to apmailbox@omnigo.com
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-lg overflow-hidden bg-gray-50">
            <iframe
              srcDoc={generateReceiptPreview()}
              className="w-full h-[600px] border-0"
              title="Receipt Email Preview"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
            >
              Close
            </Button>
            <Button
              onClick={() => {
                setShowPreview(false);
                handleSendReceipt();
              }}
              disabled={sendingReceipt || !receiptAmount || parseFloat(receiptAmount) <= 0}
            >
              {sendingReceipt ? 'Sending...' : 'Send Receipt'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Preview Dialog */}
      <Dialog open={showInvoicePreview} onOpenChange={setShowInvoicePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Invoice Preview</DialogTitle>
            <DialogDescription>
              Invoice #{invoiceData?.invoiceNumber} - {invoiceData?.status}
            </DialogDescription>
          </DialogHeader>
          {invoiceData && (
            <div className="mt-4 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="border rounded-lg p-6 bg-white">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">VSol Software</h3>
                    <p className="text-sm text-gray-600">3111 N University Dr. Ste 105</p>
                    <p className="text-sm text-gray-600">Coral Springs, Florida 33065</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-semibold text-lg mb-2">Invoice #{invoiceData.invoiceNumber}</h3>
                    <p className="text-sm text-gray-600">Date: {formatDate(invoiceData.invoiceDate)}</p>
                    <p className="text-sm text-gray-600">Due: {formatDate(invoiceData.dueDate)}</p>
                  </div>
                </div>
                <div className="border-t pt-4 mb-4">
                  <p className="font-semibold mb-2">Bill To:</p>
                  <p className="text-sm text-gray-600">{invoiceData.client?.name}</p>
                </div>
                <div className="border-t pt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Service</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceData.lineItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.serviceName}</TableCell>
                          <TableCell className="text-sm text-gray-600">{item.description}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-end">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(invoiceData.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tax:</span>
                          <span>{formatCurrency(invoiceData.tax)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t">
                          <span>Total:</span>
                          <span>{formatCurrency(invoiceData.total)}</span>
                        </div>
                        <div className="flex justify-between font-semibold pt-2">
                          <span>Amount Due:</span>
                          <span>{formatCurrency(invoiceData.amountDue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setShowInvoicePreview(false)}
            >
              Close
            </Button>
            {invoiceData && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowInvoicePreview(false);
                    navigate(`/client-invoices/${invoiceData.id}`);
                  }}
                >
                  Edit Invoice
                </Button>
                {invoiceData.status === 'DRAFT' && (
                  <Button
                    onClick={() => {
                      setShowInvoicePreview(false);
                      handleMarkInvoiceAsSent();
                    }}
                    disabled={updateInvoiceStatusMutation.isPending}
                  >
                    {updateInvoiceStatusMutation.isPending ? 'Sending...' : 'Send Invoice'}
                  </Button>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
