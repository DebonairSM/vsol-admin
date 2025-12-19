import { eq, and, gte, lte } from 'drizzle-orm';
import { db, sprintCeremonies } from '../db';
import { SprintCeremony, CreateSprintCeremonyRequest, UpdateSprintCeremonyRequest, RecurrenceRule } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

interface CeremonyOccurrence {
  ceremonyId: number;
  date: Date;
  ceremony: SprintCeremony;
}

export class SprintCeremonyService {
  /**
   * Parse recurrence rule from JSON string
   */
  private static parseRecurrenceRule(ruleString: string | null): RecurrenceRule | null {
    if (!ruleString) return null;
    try {
      const parsed = JSON.parse(ruleString);
      if (parsed.endDate) {
        parsed.endDate = new Date(parsed.endDate);
      }
      return parsed as RecurrenceRule;
    } catch {
      return null;
    }
  }

  /**
   * Generate occurrences for a recurring ceremony
   */
  private static generateOccurrences(
    ceremony: SprintCeremony,
    startDate: Date,
    endDate: Date
  ): CeremonyOccurrence[] {
    if (!ceremony.isRecurring || !ceremony.recurrenceRule) {
      // Single occurrence if not recurring or startDate is in range
      const ceremonyStart = new Date(ceremony.startDate);
      if (ceremonyStart >= startDate && ceremonyStart <= endDate) {
        return [{ ceremonyId: ceremony.id, date: new Date(ceremony.startDate), ceremony }];
      }
      return [];
    }

    // Parse recurrence rule if it's a string (from database)
    const rule = typeof ceremony.recurrenceRule === 'string' 
      ? this.parseRecurrenceRule(ceremony.recurrenceRule)
      : ceremony.recurrenceRule;
    
    if (!rule) {
      return [];
    }
    const occurrences: CeremonyOccurrence[] = [];
    const currentDate = new Date(ceremony.startDate);

    // Calculate end date for recurrence
    const recurrenceEndDate = rule.endDate 
      ? new Date(rule.endDate) 
      : new Date(endDate.getTime() + (365 * 24 * 60 * 60 * 1000)); // 1 year ahead if no end date
    
    const actualEndDate = recurrenceEndDate < endDate ? recurrenceEndDate : endDate;

    switch (rule.frequency) {
      case 'DAILY':
        while (currentDate <= actualEndDate && currentDate >= startDate) {
          if (currentDate >= startDate && currentDate <= endDate) {
            occurrences.push({
              ceremonyId: ceremony.id,
              date: new Date(currentDate),
              ceremony
            });
          }
          currentDate.setDate(currentDate.getDate() + (rule.interval || 1));
        }
        break;

      case 'WEEKLY':
        const daysOfWeek = rule.daysOfWeek && rule.daysOfWeek.length > 0 
          ? rule.daysOfWeek 
          : [currentDate.getDay()]; // Default to the start date's day of week
        let checkDate = new Date(Math.max(currentDate, startDate)); // Start from the later of ceremony start or range start
        while (checkDate <= actualEndDate && checkDate <= endDate) {
          const dayOfWeek = checkDate.getDay();
          if (daysOfWeek.includes(dayOfWeek)) {
            occurrences.push({
              ceremonyId: ceremony.id,
              date: new Date(checkDate),
              ceremony
            });
          }
          checkDate.setDate(checkDate.getDate() + 1);
        }
        break;

      case 'BIWEEKLY':
        let biweeklyDate = new Date(currentDate);
        while (biweeklyDate <= actualEndDate) {
          if (biweeklyDate >= startDate && biweeklyDate <= endDate) {
            occurrences.push({
              ceremonyId: ceremony.id,
              date: new Date(biweeklyDate),
              ceremony
            });
          }
          biweeklyDate.setDate(biweeklyDate.getDate() + 14);
        }
        break;

      case 'MONTHLY':
        let monthlyDate = new Date(currentDate);
        while (monthlyDate <= actualEndDate) {
          if (monthlyDate >= startDate && monthlyDate <= endDate) {
            occurrences.push({
              ceremonyId: ceremony.id,
              date: new Date(monthlyDate),
              ceremony
            });
          }
          // Move to same day next month
          monthlyDate.setMonth(monthlyDate.getMonth() + (rule.interval || 1));
        }
        break;
    }

    return occurrences;
  }

  /**
   * Create a new ceremony
   */
  static async createCeremony(data: CreateSprintCeremonyRequest, userId: number): Promise<SprintCeremony> {
    // Validate recurrence rule if recurring
    if (data.isRecurring && data.recurrenceRule) {
      const rule = data.recurrenceRule;
      if (rule.frequency === 'WEEKLY' && (!rule.daysOfWeek || rule.daysOfWeek.length === 0)) {
        throw new ValidationError('Weekly recurrence requires at least one day of week');
      }
    }

    const insertData: any = {
      title: data.title,
      ceremonyType: data.ceremonyType,
      startDate: new Date(data.startDate),
      isRecurring: data.isRecurring,
      createdBy: userId
    };

    if (data.startTime) insertData.startTime = data.startTime;
    if (data.durationMinutes) insertData.durationMinutes = data.durationMinutes;
    if (data.recurrenceRule) insertData.recurrenceRule = JSON.stringify(data.recurrenceRule);
    if (data.location) insertData.location = data.location;
    if (data.notes) insertData.notes = data.notes;

    const result = await db.insert(sprintCeremonies).values(insertData).returning();
    return result[0] as SprintCeremony;
  }

  /**
   * Update a ceremony
   */
  static async updateCeremony(id: number, data: UpdateSprintCeremonyRequest, userId: number): Promise<SprintCeremony> {
    const ceremony = await db.query.sprintCeremonies.findFirst({
      where: eq(sprintCeremonies.id, id)
    });

    if (!ceremony) {
      throw new NotFoundError('Ceremony not found');
    }

    // Validate recurrence rule if recurring
    if ((data.isRecurring ?? ceremony.isRecurring) && data.recurrenceRule) {
      const rule = data.recurrenceRule;
      if (rule.frequency === 'WEEKLY' && (!rule.daysOfWeek || rule.daysOfWeek.length === 0)) {
        throw new ValidationError('Weekly recurrence requires at least one day of week');
      }
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.ceremonyType !== undefined) updateData.ceremonyType = data.ceremonyType;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.durationMinutes !== undefined) updateData.durationMinutes = data.durationMinutes;
    if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
    if (data.recurrenceRule !== undefined) {
      updateData.recurrenceRule = data.recurrenceRule ? JSON.stringify(data.recurrenceRule) : null;
    }
    if (data.location !== undefined) updateData.location = data.location;
    if (data.notes !== undefined) updateData.notes = data.notes;
    updateData.updatedAt = new Date();

    await db.update(sprintCeremonies)
      .set(updateData)
      .where(eq(sprintCeremonies.id, id));

    const updated = await db.query.sprintCeremonies.findFirst({
      where: eq(sprintCeremonies.id, id)
    });

    return updated as SprintCeremony;
  }

  /**
   * Delete a ceremony
   */
  static async deleteCeremony(id: number): Promise<void> {
    const ceremony = await db.query.sprintCeremonies.findFirst({
      where: eq(sprintCeremonies.id, id)
    });

    if (!ceremony) {
      throw new NotFoundError('Ceremony not found');
    }

    await db.delete(sprintCeremonies).where(eq(sprintCeremonies.id, id));
  }

  /**
   * Get ceremonies for a date range
   */
  static async getCeremoniesForDateRange(startDate: Date, endDate: Date): Promise<SprintCeremony[]> {
    // Get all ceremonies that could potentially overlap with the date range
    // (either start date is in range, or it's recurring and could generate occurrences in range)
    const allCeremonies = await db.query.sprintCeremonies.findMany({
      orderBy: (sprintCeremonies, { asc }) => [asc(sprintCeremonies.startDate)]
    });

    // Filter ceremonies that are relevant for this date range
    const relevantCeremonies = allCeremonies.filter(ceremony => {
      const ceremonyStart = new Date(ceremony.startDate);
      
      // Include if start date is in range
      if (ceremonyStart >= startDate && ceremonyStart <= endDate) {
        return true;
      }

      // Include if recurring and could generate occurrences in range
      if (ceremony.isRecurring) {
        const rule = this.parseRecurrenceRule(ceremony.recurrenceRule as string);
        if (rule) {
          const recurrenceEnd = rule.endDate ? new Date(rule.endDate) : new Date(endDate.getTime() + (365 * 24 * 60 * 60 * 1000));
          // Check if ceremony could generate occurrences in the range
          if (ceremonyStart <= endDate && recurrenceEnd >= startDate) {
            return true;
          }
        }
      }

      return false;
    });

    // Parse recurrence rules for ceremonies
    return relevantCeremonies.map(ceremony => ({
      ...ceremony,
      recurrenceRule: ceremony.recurrenceRule 
        ? this.parseRecurrenceRule(ceremony.recurrenceRule as string)
        : null
    })) as SprintCeremony[];
  }

  /**
   * Expand recurring ceremonies into individual occurrences for calendar display
   */
  static async expandRecurringOccurrences(startDate: Date, endDate: Date): Promise<CeremonyOccurrence[]> {
    const ceremonies = await this.getCeremoniesForDateRange(startDate, endDate);
    const occurrences: CeremonyOccurrence[] = [];

    for (const ceremony of ceremonies) {
      const ceremonyOccurrences = this.generateOccurrences(ceremony, startDate, endDate);
      occurrences.push(...ceremonyOccurrences);
    }

    // Sort by date
    occurrences.sort((a, b) => a.date.getTime() - b.date.getTime());

    return occurrences;
  }

  /**
   * Get single ceremony by ID
   */
  static async getCeremonyById(id: number): Promise<SprintCeremony> {
    const ceremony = await db.query.sprintCeremonies.findFirst({
      where: eq(sprintCeremonies.id, id)
    });

    if (!ceremony) {
      throw new NotFoundError('Ceremony not found');
    }

    return {
      ...ceremony,
      recurrenceRule: this.parseRecurrenceRule(ceremony.recurrenceRule as string)
    } as SprintCeremony;
  }
}

