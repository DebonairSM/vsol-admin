import { eq } from 'drizzle-orm';
import { db, monthlyWorkHours } from '../db';
import { ValidationError, NotFoundError } from '../middleware/errors';

export interface ImportWorkHoursData {
  year: number;
  months: Array<{
    month: string;
    monthNumber: number;
    weekdays: number;
    workHours: number;
  }>;
}

export interface WorkHoursReference {
  id: number;
  year: number;
  month: string;
  monthNumber: number;
  weekdays: number;
  workHours: number;
  createdAt: Date;
  updatedAt: Date;
}

export class WorkHoursService {
  static async getAll() {
    return db.query.monthlyWorkHours.findMany({
      orderBy: (workHours, { desc, asc }) => [desc(workHours.year), asc(workHours.monthNumber)]
    });
  }

  static async getByYear(year: number) {
    return db.query.monthlyWorkHours.findMany({
      where: eq(monthlyWorkHours.year, year),
      orderBy: (workHours, { asc }) => [asc(workHours.monthNumber)]
    });
  }

  static async getByYearMonth(year: number, monthNumber: number): Promise<WorkHoursReference | null> {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fb9a9584-6af1-4baa-9069-fbe3fcc81587',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'work-hours-service.ts:40',message:'getByYearMonth entry',data:{year,monthNumber},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    const result = await db.query.monthlyWorkHours.findFirst({
      where: (workHours, { and, eq }) => and(
        eq(workHours.year, year),
        eq(workHours.monthNumber, monthNumber)
      )
    });
    
    // Check what records exist in the database for this year for debugging
    const allYearRecords = await db.query.monthlyWorkHours.findMany({
      where: eq(monthlyWorkHours.year, year),
      columns: { year: true, month: true, monthNumber: true, workHours: true }
    });
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/fb9a9584-6af1-4baa-9069-fbe3fcc81587',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'work-hours-service.ts:50',message:'getByYearMonth result and database check',data:{year,monthNumber,result:result?{id:result.id,workHours:result.workHours,month:result.month}:null,allYearRecords:allYearRecords.map(r=>({month:r.month,monthNumber:r.monthNumber,workHours:r.workHours}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run2',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    return result || null;
  }

  static async importWorkHours(data: ImportWorkHoursData): Promise<{ imported: number; updated: number }> {
    let imported = 0;
    let updated = 0;

    // Validate year
    if (data.year < 2020 || data.year > 2030) {
      throw new ValidationError('Year must be between 2020 and 2030');
    }

    // Validate months data
    if (!data.months || data.months.length === 0) {
      throw new ValidationError('No months data provided');
    }

    for (const monthData of data.months) {
      if (monthData.monthNumber < 1 || monthData.monthNumber > 12) {
        throw new ValidationError(`Invalid month number: ${monthData.monthNumber}`);
      }

      if (monthData.workHours < 0 || monthData.workHours > 200) {
        throw new ValidationError(`Invalid work hours for ${monthData.month}: ${monthData.workHours}`);
      }

      // Check if record exists
      const existing = await this.getByYearMonth(data.year, monthData.monthNumber);

      if (existing) {
        // Update existing record
        await db.update(monthlyWorkHours)
          .set({
            month: monthData.month,
            weekdays: monthData.weekdays,
            workHours: monthData.workHours,
            updatedAt: new Date()
          })
          .where(eq(monthlyWorkHours.id, existing.id));
        updated++;
      } else {
        // Insert new record
        await db.insert(monthlyWorkHours).values({
          year: data.year,
          month: monthData.month,
          monthNumber: monthData.monthNumber,
          weekdays: monthData.weekdays,
          workHours: monthData.workHours
        });
        imported++;
      }
    }

    return { imported, updated };
  }

  static async parseJSON(jsonContent: string): Promise<ImportWorkHoursData[]> {
    try {
      const data = JSON.parse(jsonContent);
      
      // Handle single year object or array of years
      const yearsArray = Array.isArray(data) ? data : [data];
      const results: ImportWorkHoursData[] = [];

      for (const yearData of yearsArray) {
        // Validate year structure
        if (!yearData.year || typeof yearData.year !== 'number') {
          throw new Error('Each year object must have a "year" property');
        }

        if (!yearData.months || !Array.isArray(yearData.months)) {
          throw new Error('Each year object must have a "months" array');
        }

        const validatedMonths: ImportWorkHoursData['months'] = [];

        for (const monthData of yearData.months) {
          // Validate month structure
          if (!monthData.month || typeof monthData.month !== 'string') {
            throw new Error('Each month must have a "month" name');
          }

          if (typeof monthData.weekdays !== 'number' || monthData.weekdays < 1 || monthData.weekdays > 31) {
            throw new Error(`Invalid weekdays for ${monthData.month}: ${monthData.weekdays}`);
          }

          if (typeof monthData.workHours !== 'number' || monthData.workHours < 0 || monthData.workHours > 250) {
            throw new Error(`Invalid work hours for ${monthData.month}: ${monthData.workHours}`);
          }

          // Convert month name to number or use provided monthNumber
          let monthNumber = monthData.monthNumber || this.getMonthNumber(monthData.month);
          if (monthNumber === -1) {
            throw new Error(`Invalid month name: ${monthData.month}`);
          }

          validatedMonths.push({
            month: monthData.month,
            monthNumber,
            weekdays: monthData.weekdays,
            workHours: monthData.workHours
          });
        }

        results.push({
          year: yearData.year,
          months: validatedMonths
        });
      }

      return results;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError('Invalid JSON format: ' + error.message);
      }
      throw error;
    }
  }

  private static getMonthNumber(monthName: string): number {
    const months: Record<string, number> = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    
    return months[monthName.toLowerCase()] || -1;
  }

  static async deleteYear(year: number): Promise<number> {
    const result = await db.delete(monthlyWorkHours)
      .where(eq(monthlyWorkHours.year, year));
    
    // Drizzle returns the number of affected rows
    return (result as any).rowsAffected || 0;
  }

  /**
   * Get suggested work hours for a given month/year for cycle creation
   */
  static async getSuggestedHours(monthLabel: string): Promise<number | null> {
    // Try to parse year and month from monthLabel (e.g., "March 2025", "2025-03")
    const currentYear = new Date().getFullYear();
    
    // Extract month name and year from various formats
    let monthName: string = '';
    let year: number = currentYear;
    
    // Handle formats like "March 2025" or "March"
    const parts = monthLabel.trim().split(/\s+/);
    if (parts.length === 2 && /^\d{4}$/.test(parts[1])) {
      monthName = parts[0];
      year = parseInt(parts[1]);
    } else if (parts.length === 1) {
      monthName = parts[0];
    }
    
    // Handle formats like "2025-03" or "03/2025"
    const dateMatch = monthLabel.match(/(\d{4})[/-](\d{1,2})|(\d{1,2})[/-](\d{4})/);
    if (dateMatch) {
      if (dateMatch[1] && dateMatch[2]) {
        year = parseInt(dateMatch[1]);
        const monthNum = parseInt(dateMatch[2]);
        monthName = this.getMonthName(monthNum);
      } else if (dateMatch[3] && dateMatch[4]) {
        year = parseInt(dateMatch[4]);
        const monthNum = parseInt(dateMatch[3]);
        monthName = this.getMonthName(monthNum);
      }
    }

    if (!monthName) return null;

    const monthNumber = this.getMonthNumber(monthName);
    if (monthNumber === -1) return null;

    const workHoursRef = await this.getByYearMonth(year, monthNumber);
    return workHoursRef?.workHours || null;
  }

  private static getMonthName(monthNumber: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    return months[monthNumber - 1] || '';
  }
}
