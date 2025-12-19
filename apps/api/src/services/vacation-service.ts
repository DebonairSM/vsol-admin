import { eq, and, gte, lte, between, isNull } from 'drizzle-orm';
import { db, vacationDays, consultants } from '../db';
import { CreateVacationDayRequest, CreateVacationRangeRequest, UpdateVacationDayRequest, VacationBalance, VacationCalendarEvent } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

interface VacationYearPeriod {
  start: Date;
  end: Date;
}

export class VacationService {
  /**
   * Calculate the vacation year period for a consultant based on their hire date
   * Vacation year runs from hire month/day to the same month/day next year
   * Example: Hired March 15, 2023 → vacation year is March 15, 2023 to March 14, 2024
   */
  static getVacationYearPeriod(consultant: { startDate: Date }, referenceDate: Date = new Date()): VacationYearPeriod {
    const startDate = new Date(consultant.startDate);
    const refDate = new Date(referenceDate);
    
    // Get the month and day of hire
    const hireMonth = startDate.getMonth();
    const hireDay = startDate.getDate();
    
    // Find the vacation year period that contains the reference date
    // Start with the current year
    let yearStart = new Date(refDate.getFullYear(), hireMonth, hireDay);
    let yearEnd = new Date(refDate.getFullYear() + 1, hireMonth, hireDay);
    yearEnd.setDate(yearEnd.getDate() - 1); // End date is one day before next year starts
    
    // If reference date is before the year start, use previous year
    if (refDate < yearStart) {
      yearStart = new Date(refDate.getFullYear() - 1, hireMonth, hireDay);
      yearEnd = new Date(refDate.getFullYear(), hireMonth, hireDay);
      yearEnd.setDate(yearEnd.getDate() - 1);
    }
    
    return { start: yearStart, end: yearEnd };
  }

  /**
   * Get vacation days for a specific consultant, optionally filtered by date range
   */
  static async getByConsultantId(consultantId: number, startDate?: Date, endDate?: Date) {
    const conditions = [eq(vacationDays.consultantId, consultantId)];
    
    if (startDate && endDate) {
      conditions.push(
        and(
          gte(vacationDays.vacationDate, startDate),
          lte(vacationDays.vacationDate, endDate)
        )!
      );
    } else if (startDate) {
      conditions.push(gte(vacationDays.vacationDate, startDate));
    } else if (endDate) {
      conditions.push(lte(vacationDays.vacationDate, endDate));
    }
    
    return db.query.vacationDays.findMany({
      where: and(...conditions),
      orderBy: (vacationDays, { asc }) => [asc(vacationDays.vacationDate)]
    });
  }

  /**
   * Get all vacation days, optionally filtered by date range (for calendar view)
   */
  static async getAll(startDate?: Date, endDate?: Date) {
    const conditions = [];
    
    if (startDate && endDate) {
      conditions.push(
        and(
          gte(vacationDays.vacationDate, startDate),
          lte(vacationDays.vacationDate, endDate)
        )!
      );
    } else if (startDate) {
      conditions.push(gte(vacationDays.vacationDate, startDate));
    } else if (endDate) {
      conditions.push(lte(vacationDays.vacationDate, endDate));
    }
    
    return db.query.vacationDays.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        consultant: true
      },
      orderBy: (vacationDays, { asc }) => [asc(vacationDays.vacationDate)]
    });
  }

  /**
   * Create a single vacation day
   */
  static async createDay(data: CreateVacationDayRequest, userId?: number) {
    // Verify consultant exists
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, data.consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    // Check if consultant is terminated
    if (consultant.terminationDate) {
      const terminationDate = new Date(consultant.terminationDate);
      const vacationDate = new Date(data.vacationDate);
      if (vacationDate > terminationDate) {
        throw new ValidationError('Cannot create vacation day for terminated consultant after termination date');
      }
    }

    // Check vacation balance before creating
    const balance = await this.getBalance(data.consultantId);
    if (balance.daysRemaining <= 0) {
      throw new ValidationError('Consultant has no remaining vacation days');
    }

    // Check if vacation date is in the past (allow but warn in validation)
    const vacationDate = new Date(data.vacationDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    vacationDate.setHours(0, 0, 0, 0);
    
    // Check if this date already has a vacation for this consultant
    const existing = await db.query.vacationDays.findFirst({
      where: and(
        eq(vacationDays.consultantId, data.consultantId),
        eq(vacationDays.vacationDate, vacationDate)
      )
    });

    if (existing) {
      throw new ValidationError('Vacation day already exists for this date');
    }

    const [vacation] = await db.insert(vacationDays).values({
      consultantId: data.consultantId,
      vacationDate: vacationDate,
      notes: data.notes || null,
      createdBy: userId || null,
      updatedAt: new Date()
    }).returning();

    return vacation;
  }

  /**
   * Create multiple vacation days for a date range
   */
  static async createRange(data: CreateVacationRangeRequest, userId?: number) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (startDate > endDate) {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    // Verify consultant exists
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, data.consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    // Generate all dates in the range
    const dates: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    // Check vacation balance
    const balance = await this.getBalance(data.consultantId);
    if (dates.length > balance.daysRemaining) {
      throw new ValidationError(`Insufficient vacation days. Remaining: ${balance.daysRemaining}, Requested: ${dates.length}`);
    }

    // Check for existing vacations in this range
    const existing = await db.query.vacationDays.findMany({
      where: and(
        eq(vacationDays.consultantId, data.consultantId),
        gte(vacationDays.vacationDate, startDate),
        lte(vacationDays.vacationDate, endDate)
      )
    });

    if (existing.length > 0) {
      throw new ValidationError(`Some dates in this range already have vacation days`);
    }

    // Create all vacation days in a transaction
    const vacations = await db.insert(vacationDays).values(
      dates.map(date => ({
        consultantId: data.consultantId,
        vacationDate: date,
        notes: data.notes || null,
        createdBy: userId || null,
        updatedAt: new Date()
      }))
    ).returning();

    return vacations;
  }

  /**
   * Update a vacation day
   */
  static async updateDay(id: number, data: UpdateVacationDayRequest) {
    const existing = await db.query.vacationDays.findFirst({
      where: eq(vacationDays.id, id)
    });

    if (!existing) {
      throw new NotFoundError('Vacation day not found');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.vacationDate !== undefined) {
      updateData.vacationDate = new Date(data.vacationDate);
      
      // Check if new date conflicts with existing vacation
      const conflict = await db.query.vacationDays.findFirst({
        where: and(
          eq(vacationDays.consultantId, existing.consultantId),
          eq(vacationDays.vacationDate, updateData.vacationDate),
          // Exclude current vacation day
          // Note: Drizzle doesn't have a direct NOT operator, so we'll check manually
        )
      });

      if (conflict && conflict.id !== id) {
        throw new ValidationError('Vacation day already exists for this date');
      }
    }

    if (data.notes !== undefined) {
      updateData.notes = data.notes || null;
    }

    const [updated] = await db.update(vacationDays)
      .set(updateData)
      .where(eq(vacationDays.id, id))
      .returning();

    return updated;
  }

  /**
   * Delete a vacation day
   */
  static async deleteDay(id: number) {
    const existing = await db.query.vacationDays.findFirst({
      where: eq(vacationDays.id, id)
    });

    if (!existing) {
      throw new NotFoundError('Vacation day not found');
    }

    await db.delete(vacationDays).where(eq(vacationDays.id, id));

    return { success: true };
  }

  /**
   * Calculate vacation balance for a consultant
   */
  static async getBalance(consultantId: number, referenceDate: Date = new Date()): Promise<VacationBalance> {
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    const period = this.getVacationYearPeriod(consultant, referenceDate);
    
    // Get all vacation days in the current vacation year period
    const vacations = await db.query.vacationDays.findMany({
      where: and(
        eq(vacationDays.consultantId, consultantId),
        gte(vacationDays.vacationDate, period.start),
        lte(vacationDays.vacationDate, period.end)
      )
    });

    const daysUsed = vacations.length;
    const daysRemaining = Math.max(0, 20 - daysUsed);

    // Calculate expired days from previous periods
    // Get all vacations before the current period
    const previousVacations = await db.query.vacationDays.findMany({
      where: and(
        eq(vacationDays.consultantId, consultantId),
        lte(vacationDays.vacationDate, period.start)
      )
    });

    // Count days that expired (from periods that ended before current period started)
    // For simplicity, we'll count all previous vacations as potentially expired
    // In a more sophisticated system, we'd track which periods expired
    const expiredDays = previousVacations.length;

    return {
      consultantId: consultant.id,
      consultantName: consultant.name,
      currentYearStart: period.start,
      currentYearEnd: period.end,
      totalAllocated: 20,
      daysUsed,
      daysRemaining,
      expiredDays
    };
  }

  /**
   * Get vacation balances for all consultants
   */
  static async getAllBalances(referenceDate: Date = new Date()): Promise<VacationBalance[]> {
    const allConsultants = await db.query.consultants.findMany({
      where: isNull(consultants.terminationDate) // Only active consultants
    });

    const balances = await Promise.all(
      allConsultants.map(consultant => this.getBalance(consultant.id, referenceDate))
    );

    return balances;
  }

  /**
   * Get vacations formatted for calendar view
   */
  static async getCalendarEvents(startDate: Date, endDate: Date): Promise<VacationCalendarEvent[]> {
    const vacations = await this.getAll(startDate, endDate);
    
    return vacations.map(vacation => ({
      date: vacation.vacationDate.toISOString().split('T')[0], // ISO date string (YYYY-MM-DD)
      consultantId: vacation.consultantId,
      consultantName: vacation.consultant?.name || 'Unknown',
      notes: vacation.notes
    }));
  }
}

