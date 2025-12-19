import { eq, and, gte, lte } from 'drizzle-orm';
import { db, holidays } from '../db';
import { Holiday, HolidayType } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class HolidayService {
  /**
   * Calculate Easter date using the anonymous Gregorian algorithm
   * Returns the date of Easter Sunday for a given year
   */
  private static calculateEaster(year: number): Date {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31) - 1; // Month is 0-indexed
    const day = ((h + l - 7 * m + 114) % 31) + 1;

    return new Date(year, month, day);
  }

  /**
   * Calculate Good Friday (Easter - 2 days)
   */
  private static calculateGoodFriday(year: number): Date {
    const easter = this.calculateEaster(year);
    const goodFriday = new Date(easter);
    goodFriday.setDate(easter.getDate() - 2);
    return goodFriday;
  }

  /**
   * Generate holidays for a given year
   * Idempotent - won't create duplicates
   */
  static async generateHolidaysForYear(year: number): Promise<Holiday[]> {
    // Check if holidays already exist for this year
    const existingHolidays = await db.query.holidays.findMany({
      where: eq(holidays.year, year)
    });

    const existingTypes = new Set(existingHolidays.map(h => h.holidayType));

    const holidaysToCreate: Array<{
      name: string;
      date: Date;
      year: number;
      isRecurring: boolean;
      holidayType: HolidayType;
    }> = [];

    // Good Friday
    if (!existingTypes.has('GOOD_FRIDAY')) {
      const goodFriday = this.calculateGoodFriday(year);
      holidaysToCreate.push({
        name: 'Good Friday',
        date: new Date(goodFriday.getFullYear(), goodFriday.getMonth(), goodFriday.getDate()),
        year,
        isRecurring: true,
        holidayType: 'GOOD_FRIDAY'
      });
    }

    // Christmas Eve
    if (!existingTypes.has('CHRISTMAS_EVE')) {
      holidaysToCreate.push({
        name: 'Christmas Eve',
        date: new Date(year, 11, 24), // December 24 (month is 0-indexed)
        year,
        isRecurring: true,
        holidayType: 'CHRISTMAS_EVE'
      });
    }

    // Christmas Day
    if (!existingTypes.has('CHRISTMAS_DAY')) {
      holidaysToCreate.push({
        name: 'Christmas Day',
        date: new Date(year, 11, 25), // December 25
        year,
        isRecurring: true,
        holidayType: 'CHRISTMAS_DAY'
      });
    }

    // New Year's Day
    if (!existingTypes.has('NEW_YEARS_DAY')) {
      holidaysToCreate.push({
        name: 'New Year\'s Day',
        date: new Date(year, 0, 1), // January 1
        year,
        isRecurring: true,
        holidayType: 'NEW_YEARS_DAY'
      });
    }

    if (holidaysToCreate.length > 0) {
      await db.insert(holidays).values(holidaysToCreate);
    }

    // Return all holidays for the year (including existing ones)
    return db.query.holidays.findMany({
      where: eq(holidays.year, year),
      orderBy: (holidays, { asc }) => [asc(holidays.date)]
    }) as Promise<Holiday[]>;
  }

  /**
   * Get holidays for a given year
   * Auto-generates if they don't exist
   */
  static async getHolidaysForYear(year: number): Promise<Holiday[]> {
    let existingHolidays = await db.query.holidays.findMany({
      where: eq(holidays.year, year),
      orderBy: (holidays, { asc }) => [asc(holidays.date)]
    });

    // If no holidays exist for this year, generate them
    if (existingHolidays.length === 0) {
      existingHolidays = await this.generateHolidaysForYear(year);
    }

    return existingHolidays as Holiday[];
  }

  /**
   * Update a holiday (e.g., override date)
   */
  static async updateHoliday(id: number, data: {
    name?: string;
    date?: Date;
    year?: number;
    isRecurring?: boolean;
  }): Promise<Holiday> {
    const holiday = await db.query.holidays.findFirst({
      where: eq(holidays.id, id)
    });

    if (!holiday) {
      throw new NotFoundError('Holiday not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.date !== undefined) updateData.date = data.date;
    if (data.year !== undefined) updateData.year = data.year;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    updateData.updatedAt = new Date();

    await db.update(holidays)
      .set(updateData)
      .where(eq(holidays.id, id));

    const updated = await db.query.holidays.findFirst({
      where: eq(holidays.id, id)
    });

    return updated as Holiday;
  }

  /**
   * Get all holidays within a date range (for calendar display)
   */
  static async getHolidaysForDateRange(startDate: Date, endDate: Date): Promise<Holiday[]> {
    return db.query.holidays.findMany({
      where: and(
        gte(holidays.date, startDate),
        lte(holidays.date, endDate)
      ),
      orderBy: (holidays, { asc }) => [asc(holidays.date)]
    }) as Promise<Holiday[]>;
  }
}

