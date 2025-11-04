import { CalendarDays, DollarSign, FileText, Clock, Receipt, UserCheck, Calendar } from 'lucide-react';
import type { PayrollCycle } from '@vsol-admin/shared';

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  fieldName: keyof Pick<PayrollCycle, 'calculatedPaymentDate' | 'paymentArrivalDate' | 'sendInvoiceDate' | 'clientInvoicePaymentDate' | 'clientPaymentScheduledDate' | 'consultantsPaidDate' | 'timeDoctorMarkedPaidDate' | 'hoursLimitChangedOn' | 'sendReceiptDate'>;
  icon: any;
  color: {
    complete: string;
    pending: string;
    background: string;
  };
  order: number;
  dependsOn?: string; // Optional: ID of step that must be completed first
}

export type PayrollCycleWorkflow = Pick<PayrollCycle, 'calculatedPaymentDate' | 'paymentArrivalDate' | 'sendInvoiceDate' | 'clientInvoicePaymentDate' | 'clientPaymentScheduledDate' | 'consultantsPaidDate' | 'timeDoctorMarkedPaidDate' | 'hoursLimitChangedOn' | 'sendReceiptDate'>;

export const workflowSteps: WorkflowStep[] = [
  {
    id: 'send-invoice',
    title: 'Send Invoice',
    description: 'Invoices sent to clients via Wave Apps',
    fieldName: 'sendInvoiceDate',
    icon: FileText,
    color: {
      complete: 'text-purple-600 border-purple-200 bg-purple-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-purple-100'
    },
    order: 1
  },
  {
    id: 'client-invoice-payment-date',
    title: 'Invoice accepted',
    description: 'Invoice accepted by Omnigo',
    fieldName: 'clientInvoicePaymentDate',
    icon: UserCheck,
    color: {
      complete: 'text-teal-600 border-teal-200 bg-teal-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-teal-100'
    },
    order: 2
  },
  {
    id: 'consultants-paid',
    title: 'Consultants Paid',
    description: 'Consultants paid through Payoneer',
    fieldName: 'consultantsPaidDate',
    icon: UserCheck,
    color: {
      complete: 'text-orange-600 border-orange-200 bg-orange-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-orange-100'
    },
    order: 3
  },
  {
    id: 'time-doctor-marked-paid',
    title: 'Mark Time Doctor As Paid',
    description: 'Payment status synced to Time Doctor',
    fieldName: 'timeDoctorMarkedPaidDate',
    icon: Clock,
    color: {
      complete: 'text-emerald-600 border-emerald-200 bg-emerald-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-emerald-100'
    },
    order: 4
  },
  {
    id: 'hours-limit-changed',
    title: 'Hours Limit Changed',
    description: 'Time Doctor limits updated',
    fieldName: 'hoursLimitChangedOn',
    icon: Clock,
    dependsOn: 'time-doctor-marked-paid',
    color: {
      complete: 'text-indigo-600 border-indigo-200 bg-indigo-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-indigo-100'
    },
    order: 5
  },
  {
    id: 'client-payment-scheduled-date',
    title: 'Client Payment Scheduled Date',
    description: 'Date when Bill.com schedules payment after confirming invoice receipt',
    fieldName: 'clientPaymentScheduledDate',
    icon: Calendar,
    color: {
      complete: 'text-cyan-600 border-cyan-200 bg-cyan-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-cyan-100'
    },
    order: 6
  },
  {
    id: 'calculate-payment',
    title: 'Calculate Payment',
    description: 'Calculate amounts and prepare payment data',
    fieldName: 'calculatedPaymentDate',
    icon: CalendarDays,
    color: {
      complete: 'text-green-600 border-green-200 bg-green-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-green-100'
    },
    order: 7
  },
  {
    id: 'payment-arrival',
    title: 'Payment Arrival',
    description: 'Funds arrived in Payoneer account',
    fieldName: 'paymentArrivalDate',
    icon: DollarSign,
    color: {
      complete: 'text-blue-600 border-blue-200 bg-blue-50',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-blue-100'
    },
    order: 8
  },
  {
    id: 'send-receipt',
    title: 'Send Receipt',
    description: 'Final receipts sent - cycle complete',
    fieldName: 'sendReceiptDate',
    icon: Receipt,
    color: {
      complete: 'text-green-700 border-green-300 bg-green-100',
      pending: 'text-gray-400 border-gray-200 bg-gray-50',
      background: 'bg-green-200'
    },
    order: 9
  }
];

export function calculateWorkflowProgress(cycle: PayrollCycleWorkflow): {
  completedSteps: number;
  totalSteps: number;
  percentage: number;
  nextStep?: WorkflowStep;
} {
  const completedSteps = workflowSteps.filter(step => {
    const value = cycle[step.fieldName];
    return value !== null && value !== undefined;
  });

  const nextPendingStep = workflowSteps.find(step => {
    const value = cycle[step.fieldName];
    return value === null || value === undefined;
  });

  const totalSteps = workflowSteps.length;
  const percentage = Math.round((completedSteps.length / totalSteps) * 100);

  return {
    completedSteps: completedSteps.length,
    totalSteps,
    percentage,
    nextStep: nextPendingStep
  };
}

export function isStepCompleted(cycle: PayrollCycleWorkflow, step: WorkflowStep): boolean {
  const value = cycle[step.fieldName];
  return value !== null && value !== undefined;
}

export function canCompleteStep(cycle: PayrollCycleWorkflow, step: WorkflowStep): boolean {
  if (!step.dependsOn) return true;
  
  const dependencyStep = workflowSteps.find(s => s.id === step.dependsOn);
  if (!dependencyStep) return true;
  
  return isStepCompleted(cycle, dependencyStep);
}
