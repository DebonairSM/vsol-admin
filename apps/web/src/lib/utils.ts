import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  // Extract date components from UTC to avoid timezone shifts
  // Dates are stored as UTC (GMT) and should display the UTC date, not local date
  const utcYear = d.getUTCFullYear()
  const utcMonth = d.getUTCMonth()
  const utcDay = d.getUTCDate()
  
  // Create a date object in local timezone with the UTC date components
  // This ensures the date displays correctly regardless of timezone
  const localDate = new Date(utcYear, utcMonth, utcDay)
  return localDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export function isSameDate(date1: Date | string | null | undefined, date2: Date | string | null | undefined): boolean {
  if (!date1 || !date2) return false
  
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2
  
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

export function formatMonthName(monthNum: number | null | undefined): string {
  if (!monthNum || monthNum < 1 || monthNum > 12) return ''
  const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return monthNames[monthNum]
}

export function formatMonthAbbr(monthNum: number | null | undefined): string {
  if (!monthNum || monthNum < 1 || monthNum > 12) return ''
  const monthAbbrs = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return monthAbbrs[monthNum]
}

export function getMonthsList(): Array<{ value: number; label: string }> {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ]
}

export function calculateCountdown(targetDate: Date | string | null | undefined): {
  days: number;
  hours: number;
  minutes: number;
  isPast: boolean;
  displayText: string;
} | null {
  if (!targetDate) return null;
  
  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  
  const isPast = diffMs < 0;
  const absDiffMs = Math.abs(diffMs);
  
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((absDiffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  let displayText = '';
  if (isPast) {
    if (days > 0) {
      displayText = `${days} day${days !== 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      displayText = `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else {
      displayText = `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
  } else {
    if (days > 0) {
      displayText = `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      displayText = `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      displayText = `${minutes} minute${minutes !== 1 ? 's' : ''} left`;
    }
  }
  
  return {
    days,
    hours,
    minutes,
    isPast,
    displayText
  };
}