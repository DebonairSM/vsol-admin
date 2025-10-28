import { eq } from 'drizzle-orm';
import { db } from '../db';
import { consultants } from '../db/schema';
import { Consultant } from '@vsol-admin/shared';

interface TimeDoctorPayrollSettings {
  payeeId: string;
  name: string;
  paymentMethod: string;
  payrollPeriod: string;
  rateType: string;
  currency: string;
  ratePerHour: number;
  hourlyLimit: number;
  maxRatePerPeriod: number;
}

interface TimeDoctorApiResponse {
  success: boolean;
  data?: TimeDoctorPayrollSettings[];
  error?: string;
}

class TimeDoctorService {
  private apiKey: string;
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.apiKey = process.env.TIME_DOCTOR_API_KEY || '';
    this.baseUrl = process.env.TIME_DOCTOR_BASE_URL || 'https://api2.timedoctor.com';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };
  }

  /**
   * Fetch payroll settings from Time Doctor API
   */
  async fetchPayrollSettings(): Promise<TimeDoctorApiResponse> {
    try {
      if (!this.apiKey) {
        return { success: false, error: 'Time Doctor API key not configured' };
      }

      const response = await fetch(`${this.baseUrl}/v1.1/payroll/settings`, {
        method: 'GET',
        headers: this.defaultHeaders,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { 
          success: false, 
          error: `Time Doctor API error: ${response.status} - ${errorText}` 
        };
      }

      const data = await response.json();
      return { success: true, data: data.payroll_settings || [] };
    } catch (error) {
      console.error('Time Doctor API fetch error:', error);
      return { 
        success: false, 
        error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Map Time Doctor payroll data to VSol Admin consultant fields
   */
  private mapTimeDoctorToConsultant(tdData: TimeDoctorPayrollSettings): Partial<Consultant> {
    return {
      timeDoctorPayeeId: tdData.payeeId,
      hourlyRate: tdData.ratePerHour,
      hourlyLimit: tdData.hourlyLimit,
      rateType: tdData.rateType || 'Per Hour',
      currency: tdData.currency || 'USD',
      timeDoctorSyncEnabled: true,
      lastTimeDoctorSync: new Date(),
    };
  }

  /**
   * Sync a single consultant with Time Doctor data
   */
  async syncConsultantById(consultantId: number): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current consultant data
      const consultant = await db.query.consultants.findFirst({
        where: eq(consultants.id, consultantId),
      });

      if (!consultant) {
        return { success: false, error: 'Consultant not found' };
      }

      // Fetch Time Doctor data
      const tdResponse = await this.fetchPayrollSettings();
      if (!tdResponse.success || !tdResponse.data) {
        return { success: false, error: tdResponse.error };
      }

      // Find matching Time Doctor entry by name or existing payee ID
      const tdEntry = tdResponse.data.find(td => 
        td.name === consultant.name || 
        (consultant.timeDoctorPayeeId && td.payeeId === consultant.timeDoctorPayeeId)
      );

      if (!tdEntry) {
        return { 
          success: false, 
          error: `No Time Doctor payroll entry found for consultant: ${consultant.name}` 
        };
      }

      // Map and update consultant
      const updates = this.mapTimeDoctorToConsultant(tdEntry);
      await db.update(consultants)
        .set({
          ...updates,
          updatedAt: new Date(),
        })
        .where(eq(consultants.id, consultantId));

      return { success: true };
    } catch (error) {
      console.error('Consultant sync error:', error);
      return { 
        success: false, 
        error: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Sync all consultants with Time Doctor data
   */
  async syncAllConsultants(): Promise<{ 
    success: boolean; 
    synced: number; 
    errors: string[]; 
    totalConsultants: number; 
  }> {
    try {
      // Get all active consultants that have sync enabled
      const allConsultants = await db.query.consultants.findMany({
        where: eq(consultants.timeDoctorSyncEnabled, true),
      });

      if (allConsultants.length === 0) {
        return { success: true, synced: 0, errors: [], totalConsultants: 0 };
      }

      // Fetch Time Doctor data once
      const tdResponse = await this.fetchPayrollSettings();
      if (!tdResponse.success || !tdResponse.data) {
        return { 
          success: false, 
          synced: 0, 
          errors: [tdResponse.error || 'Failed to fetch Time Doctor data'], 
          totalConsultants: allConsultants.length 
        };
      }

      const errors: string[] = [];
      let syncedCount = 0;

      // Process each consultant
      for (const consultant of allConsultants) {
        // Skip terminated consultants
        if (consultant.terminationDate) {
          continue;
        }

        try {
          // Find matching Time Doctor entry
          const tdEntry = tdResponse.data.find(td => 
            td.name === consultant.name || 
            (consultant.timeDoctorPayeeId && td.payeeId === consultant.timeDoctorPayeeId)
          );

          if (!tdEntry) {
            errors.push(`No Time Doctor entry found for: ${consultant.name}`);
            continue;
          }

          // Update consultant with Time Doctor data
          const updates = this.mapTimeDoctorToConsultant(tdEntry);
          await db.update(consultants)
            .set({
              ...updates,
              updatedAt: new Date(),
            })
            .where(eq(consultants.id, consultant.id));

          syncedCount++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push(`${consultant.name}: ${errorMessage}`);
        }
      }

      return {
        success: true,
        synced: syncedCount,
        errors,
        totalConsultants: allConsultants.length,
      };
    } catch (error) {
      console.error('Bulk sync error:', error);
      return {
        success: false,
        synced: 0,
        errors: [error instanceof Error ? error.message : 'Unknown bulk sync error'],
        totalConsultants: 0,
      };
    }
  }

  /**
   * Get sync status for all consultants
   */
  async getSyncStatus(): Promise<{
    success: boolean;
    status?: {
      totalConsultants: number;
      syncEnabledConsultants: number;
      lastSyncTimes: Record<number, Date | null>;
      apiConnected: boolean;
    };
    error?: string;
  }> {
    try {
      // Test API connection
      const apiTest = await this.fetchPayrollSettings();
      const apiConnected = apiTest.success;

      // Get consultant sync data
      const allConsultants = await db.query.consultants.findMany({
        columns: {
          id: true,
          name: true,
          timeDoctorSyncEnabled: true,
          lastTimeDoctorSync: true,
          terminationDate: true,
        },
      });

      const activeConsultants = allConsultants.filter(c => !c.terminationDate);
      const syncEnabledConsultants = activeConsultants.filter(c => c.timeDoctorSyncEnabled);

      const lastSyncTimes: Record<number, Date | null> = {};
      activeConsultants.forEach(consultant => {
        lastSyncTimes[consultant.id] = consultant.lastTimeDoctorSync;
      });

      return {
        success: true,
        status: {
          totalConsultants: activeConsultants.length,
          syncEnabledConsultants: syncEnabledConsultants.length,
          lastSyncTimes,
          apiConnected,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status',
      };
    }
  }

  /**
   * Toggle Time Doctor sync for a consultant
   */
  async toggleConsultantSync(consultantId: number, enabled: boolean): Promise<{ success: boolean; error?: string }> {
    try {
      await db.update(consultants)
        .set({
          timeDoctorSyncEnabled: enabled,
          updatedAt: new Date(),
        })
        .where(eq(consultants.id, consultantId));

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to toggle sync setting',
      };
    }
  }
}

export const timeDoctorService = new TimeDoctorService();



