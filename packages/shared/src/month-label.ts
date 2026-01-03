const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

export interface ParsedMonthLabel {
  year: number;
  month: number; // 1-12
}

export function getMonthName(month: number): MonthName | null {
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  return MONTH_NAMES[month - 1] ?? null;
}

export function formatMonthLabel(year: number, month: number): string {
  const monthName = getMonthName(month);
  if (!monthName || !Number.isInteger(year) || year < 1900 || year > 3000) {
    throw new Error(`Invalid year/month for month label: year=${year}, month=${month}`);
  }
  return `${monthName} ${year}`;
}

/**
 * Parse strict "Month YYYY" labels (e.g., "January 2025").
 * Returns null if the format is not recognized.
 */
export function parseMonthLabel(monthLabel: string): ParsedMonthLabel | null {
  const match = monthLabel.match(/^(\w+)\s+(\d{4})$/);
  if (!match) return null;

  const [, monthNameRaw, yearStr] = match;
  const year = parseInt(yearStr, 10);
  if (!Number.isInteger(year)) return null;

  const monthIndex = MONTH_NAMES.findIndex((m) => m.toLowerCase() === monthNameRaw.toLowerCase());
  if (monthIndex === -1) return null;

  return { year, month: monthIndex + 1 };
}

/**
 * Add a month delta to a (year, month) pair.
 * month is 1-12.
 */
export function addMonthsToYearMonth(
  year: number,
  month: number,
  deltaMonths: number
): { year: number; month: number } {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(deltaMonths)) {
    throw new Error('addMonthsToYearMonth expects integer year, month, and deltaMonths');
  }
  const zeroBased = (year * 12 + (month - 1)) + deltaMonths;
  const nextYear = Math.floor(zeroBased / 12);
  const nextMonth = (zeroBased % 12) + 1;
  return { year: nextYear, month: nextMonth };
}

export function getYearMonthFromDate(date: Date): { year: number; month: number } {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

