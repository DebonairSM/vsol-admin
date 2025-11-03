/**
 * Business days calculation utilities for payment deadline alerts
 */

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

/**
 * Add business days to a date (skipping weekends)
 */
export function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      daysAdded++;
    }
  }
  
  return result;
}

/**
 * Subtract business days from a date (skipping weekends)
 */
export function subtractBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let daysSubtracted = 0;
  
  while (daysSubtracted < days) {
    result.setDate(result.getDate() - 1);
    if (!isWeekend(result)) {
      daysSubtracted++;
    }
  }
  
  return result;
}

/**
 * Count business days between two dates (excluding weekends)
 */
export function countBusinessDays(startDate: Date, endDate: Date): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Normalize to start of day
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (start >= end) {
    return 0;
  }
  
  let count = 0;
  const current = new Date(start);
  
  while (current < end) {
    if (!isWeekend(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
}

/**
 * Calculate the consultant payment date for a given month/year
 * The cycle follows a 3-month timeline:
 * - Month 1 (e.g., October): Invoice sent to Omnigo (cycle starts)
 * - Month 2 (e.g., November): Omnigo deposits payment into bank account
 * - Month 3 (e.g., December): Consultants are paid on the 1st (or next Monday if weekend)
 * 
 * Example: "October 2025" cycle → consultants paid December 1, 2025
 */
export function getConsultantPaymentDate(year: number, month: number): Date {
  // month is 1-indexed (1 = January, 12 = December)
  // Payment happens on the 1st TWO MONTHS after the cycle month
  let paymentMonth = month + 2;
  let paymentYear = year;
  
  // Handle year rollover
  if (paymentMonth > 12) {
    paymentMonth = paymentMonth - 12;
    paymentYear = year + 1;
  }
  
  const firstOfPaymentMonth = new Date(paymentYear, paymentMonth - 1, 1);
  
  if (isWeekend(firstOfPaymentMonth)) {
    // Find the next Monday
    const daysUntilMonday = firstOfPaymentMonth.getDay() === 0 ? 1 : 2; // Sunday = 1 day, Saturday = 2 days
    return new Date(paymentYear, paymentMonth - 1, 1 + daysUntilMonday);
  }
  
  return firstOfPaymentMonth;
}

/**
 * Calculate the deadline for Omnigo to schedule payment in Bill.com
 * This is 5 business days before the consultant payment date
 */
export function getOmnigoDepositDeadline(consultantPaymentDate: Date): Date {
  return subtractBusinessDays(consultantPaymentDate, 5);
}

/**
 * Parse month label (e.g., "January 2025") to get year and month number
 */
export function parseMonthLabel(monthLabel: string): { year: number; month: number } | null {
  const match = monthLabel.match(/^(\w+)\s+(\d{4})$/);
  if (!match) {
    return null;
  }
  
  const [, monthName, yearStr] = match;
  const year = parseInt(yearStr, 10);
  
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = monthNames.indexOf(monthName) + 1;
  if (month === 0) {
    return null;
  }
  
  return { year, month };
}

export type DeadlineAlertStatus = 'normal' | 'warning' | 'critical';

export interface DeadlineAlertInfo {
  status: DeadlineAlertStatus;
  consultantPaymentDate: Date;
  omnigoDeadline: Date;
  daysUntilDeadline: number;
  message: string;
}

/**
 * Calculate the deadline alert status for a payroll cycle
 * 
 * @param monthLabel - The month label for the payroll cycle (e.g., "January 2025")
 * @param clientPaymentScheduledDate - The date when payment is scheduled (if set)
 * @returns Alert information including status, dates, and message
 */
export function calculateDeadlineAlert(
  monthLabel: string,
  clientPaymentScheduledDate?: Date | string | null
): DeadlineAlertInfo | null {
  const parsed = parseMonthLabel(monthLabel);
  if (!parsed) {
    return null;
  }
  
  const { year, month } = parsed;
  const consultantPaymentDate = getConsultantPaymentDate(year, month);
  const omnigoDeadline = getOmnigoDepositDeadline(consultantPaymentDate);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // If payment is already scheduled, no alert needed
  if (clientPaymentScheduledDate) {
    return {
      status: 'normal',
      consultantPaymentDate,
      omnigoDeadline,
      daysUntilDeadline: 0,
      message: 'Payment scheduled'
    };
  }
  
  // Calculate business days until deadline
  const daysUntilDeadline = countBusinessDays(today, omnigoDeadline);
  
  // Determine alert status
  let status: DeadlineAlertStatus = 'normal';
  let message = '';
  
  if (today > omnigoDeadline) {
    status = 'critical';
    const daysOverdue = countBusinessDays(omnigoDeadline, today);
    message = `Deadline passed ${daysOverdue} business day${daysOverdue !== 1 ? 's' : ''} ago`;
  } else if (daysUntilDeadline <= 5) {
    status = 'warning';
    message = `${daysUntilDeadline} business day${daysUntilDeadline !== 1 ? 's' : ''} until deadline`;
  } else {
    status = 'normal';
    message = `${daysUntilDeadline} business days until deadline`;
  }
  
  return {
    status,
    consultantPaymentDate,
    omnigoDeadline,
    daysUntilDeadline,
    message
  };
}

