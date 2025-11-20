/**
 * Work hours calculation utilities
 * 
 * Centralized logic for calculating weekdays and work hours for any year/month.
 * Assumes 8 hours per weekday (Monday through Friday).
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'
] as const;

export interface MonthlyWorkHoursData {
  month: string;
  monthNumber: number;
  weekdays: number;
  workHours: number;
}

/**
 * Calculate the number of weekdays (Monday-Friday) in a given month
 * @param year - The year (e.g., 2025)
 * @param monthIndex - The month index (0-11, where 0 = January, 11 = December)
 * @returns The number of weekdays in the month
 */
export function getWeekdaysInMonth(year: number, monthIndex: number): number {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  let weekdays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const dayOfWeek = new Date(year, monthIndex, day).getDay();
    // 0 = Sunday, 6 = Saturday, so weekdays are 1-5 (Monday-Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      weekdays++;
    }
  }

  return weekdays;
}

/**
 * Calculate work hours for a given month (weekdays * 8 hours)
 * @param year - The year (e.g., 2025)
 * @param monthIndex - The month index (0-11, where 0 = January, 11 = December)
 * @returns The total work hours for the month
 */
export function getWorkHoursForMonth(year: number, monthIndex: number): number {
  const weekdays = getWeekdaysInMonth(year, monthIndex);
  return weekdays * 8;
}

/**
 * Get all monthly work hours data for a given year
 * @param year - The year (e.g., 2025)
 * @returns Array of monthly work hours data for all 12 months
 */
export function getMonthlyWorkHoursForYear(year: number): MonthlyWorkHoursData[] {
  const months: MonthlyWorkHoursData[] = [];

  for (let i = 0; i < 12; i++) {
    const weekdays = getWeekdaysInMonth(year, i);
    const workHours = weekdays * 8;

    months.push({
      month: MONTH_NAMES[i],
      monthNumber: i + 1,
      weekdays,
      workHours
    });
  }

  return months;
}

/**
 * Get work hours for a specific month by month number (1-12)
 * @param year - The year (e.g., 2025)
 * @param monthNumber - The month number (1-12, where 1 = January, 12 = December)
 * @returns The work hours for the month, or null if monthNumber is invalid
 */
export function getWorkHoursForMonthByNumber(year: number, monthNumber: number): number | null {
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }

  const monthIndex = monthNumber - 1;
  return getWorkHoursForMonth(year, monthIndex);
}

/**
 * Get month name by month number (1-12)
 * @param monthNumber - The month number (1-12)
 * @returns The month name, or null if monthNumber is invalid
 */
export function getMonthName(monthNumber: number): string | null {
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  return MONTH_NAMES[monthNumber - 1];
}

