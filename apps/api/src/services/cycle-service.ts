import { eq, isNull, sum, desc } from 'drizzle-orm';
import { db, payrollCycles, cycleLineItems, consultants } from '../db';
import { WorkHoursService } from './work-hours-service';
import { CreateCycleRequest, UpdateCycleRequest, CycleSummary, PaymentCalculationResult, ConsultantPaymentDetail } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class CycleService {
  static async getAll() {
    return db.query.payrollCycles.findMany({
      where: isNull(payrollCycles.archivedAt),
      orderBy: [desc(payrollCycles.createdAt)]
    });
  }

  static async getById(id: number, includeArchived: boolean = true) {
    const cycle = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, id),
      with: {
        lines: {
          with: {
            consultant: true
          }
        },
        invoices: {
          with: {
            consultant: true
          }
        },
        payments: {
          with: {
            consultant: true
          }
        }
      }
    });

    if (!cycle) {
      throw new NotFoundError('Payroll cycle not found');
    }
    
    if (!includeArchived && cycle.archivedAt) {
      throw new NotFoundError('Payroll cycle not found');
    }

    // Filter out terminated consultants from line items
    const activeLines = cycle.lines.filter(line => !line.consultant.terminationDate);

    // Add computed subtotals to line items
    const linesWithSubtotals = activeLines.map(line => ({
      ...line,
      subtotal: this.calculateLineItemSubtotal(line, cycle.globalWorkHours || 0)
    }));

    return { ...cycle, lines: linesWithSubtotals };
  }

  static async create(data: CreateCycleRequest) {
    // Check if monthLabel already exists for non-archived cycles only
    // Archived cycles can have their month labels reused
    const existing = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.monthLabel, data.monthLabel)
    });

    if (existing && !existing.archivedAt) {
      throw new ValidationError(
        `Cycle with month label "${data.monthLabel}" already exists. ` +
        `Please use a different month label or archive the existing cycle first.`
      );
    }

    // Get all active consultants
    const activeConsultants = await db.query.consultants.findMany({
      where: isNull(consultants.terminationDate)
    });

    if (activeConsultants.length === 0) {
      throw new ValidationError('No active consultants found. Cannot create empty cycle.');
    }

    // Find the most recent non-archived cycle to calculate remaining Payoneer balance
    const previousCycle = await db.query.payrollCycles.findFirst({
      where: isNull(payrollCycles.archivedAt),
      orderBy: [desc(payrollCycles.createdAt)]
    });

    // Calculate remaining balance from previous cycle (carryover - applied)
    // This becomes the new cycle's carryover
    const newCarryover = previousCycle
      ? (previousCycle.payoneerBalanceCarryover || 0) - (previousCycle.payoneerBalanceApplied || 0)
      : null;

    // Create cycle and line items in transaction
    const result = db.transaction((tx) => {
      // Create the cycle
      const cycle = tx.insert(payrollCycles).values({
        monthLabel: data.monthLabel,
        globalWorkHours: data.globalWorkHours || null,
        omnigoBonus: data.omnigoBonus || null,
        invoiceBonus: data.invoiceBonus || null,
        payoneerBalanceCarryover: newCarryover !== null ? newCarryover : null,
        payoneerBalanceApplied: null
      }).returning().get();

      if (!cycle) {
        throw new ValidationError('Failed to create payroll cycle');
      }

      // Create line items for all active consultants
      const lineItemsData = activeConsultants.map(consultant => ({
        cycleId: cycle.id,
        consultantId: consultant.id,
        ratePerHour: consultant.hourlyRate, // Snapshot the current rate
        bonusAdvance: consultant.yearlyBonus || null // Pre-fill yearly bonus if set
      }));

      tx.insert(cycleLineItems).values(lineItemsData);

      return cycle;
    });

    // Return cycle with populated lines
    return this.getById(result.id);
  }

  static async update(id: number, data: UpdateCycleRequest) {
    const existing = await this.getById(id);

    // Check if monthLabel change conflicts with non-archived cycles
    if (data.monthLabel && data.monthLabel !== existing.monthLabel) {
      const conflict = await db.query.payrollCycles.findFirst({
        where: eq(payrollCycles.monthLabel, data.monthLabel)
      });

      if (conflict && !conflict.archivedAt) {
        throw new ValidationError(
          `Cycle with month label "${data.monthLabel}" already exists. ` +
          `Please use a different month label or archive the existing cycle first.`
        );
      }
    }

    // Helper function to validate numeric values
    const validateNumber = (value: number | null | undefined, fieldName: string): number | null => {
      if (value === undefined || value === null) return null;
      if (!isFinite(value)) {
        throw new ValidationError(`${fieldName} must be a finite number (not NaN or Infinity)`);
      }
      return value;
    };

    const updateData: any = {
      updatedAt: new Date()
    };
    if (data.monthLabel !== undefined) updateData.monthLabel = data.monthLabel;
    if (data.payoneerAccountFundedDate !== undefined) {
      updateData.payoneerAccountFundedDate = data.payoneerAccountFundedDate ? new Date(data.payoneerAccountFundedDate) : null;
    }
    if (data.payoneerFundingDate !== undefined) {
      updateData.payoneerFundingDate = data.payoneerFundingDate ? new Date(data.payoneerFundingDate) : null;
    }
    if (data.calculatedPaymentDate !== undefined) {
      updateData.calculatedPaymentDate = data.calculatedPaymentDate ? new Date(data.calculatedPaymentDate) : null;
    }
    if (data.paymentArrivalExpectedDate !== undefined) {
      updateData.paymentArrivalExpectedDate = data.paymentArrivalExpectedDate ? new Date(data.paymentArrivalExpectedDate) : null;
    }
    if (data.paymentArrivalDate !== undefined) {
      updateData.paymentArrivalDate = data.paymentArrivalDate ? new Date(data.paymentArrivalDate) : null;
    }
    if (data.sendReceiptDate !== undefined) {
      updateData.sendReceiptDate = data.sendReceiptDate ? new Date(data.sendReceiptDate) : null;
    }
    if (data.sendInvoiceDate !== undefined) {
      updateData.sendInvoiceDate = data.sendInvoiceDate ? new Date(data.sendInvoiceDate) : null;
    }
    if (data.clientInvoicePaymentDate !== undefined) {
      updateData.clientInvoicePaymentDate = data.clientInvoicePaymentDate ? new Date(data.clientInvoicePaymentDate) : null;
    }
    if (data.clientPaymentScheduledDate !== undefined) {
      updateData.clientPaymentScheduledDate = data.clientPaymentScheduledDate ? new Date(data.clientPaymentScheduledDate) : null;
    }
    if (data.invoiceApprovalDate !== undefined) {
      updateData.invoiceApprovalDate = data.invoiceApprovalDate ? new Date(data.invoiceApprovalDate) : null;
    }
    if (data.consultantsPaidDate !== undefined) {
      updateData.consultantsPaidDate = data.consultantsPaidDate ? new Date(data.consultantsPaidDate) : null;
    }
    if (data.timeDoctorMarkedPaidDate !== undefined) {
      updateData.timeDoctorMarkedPaidDate = data.timeDoctorMarkedPaidDate ? new Date(data.timeDoctorMarkedPaidDate) : null;
    }
    if (data.hoursLimitChangedOn !== undefined) {
      updateData.hoursLimitChangedOn = data.hoursLimitChangedOn ? new Date(data.hoursLimitChangedOn) : null;
    }
    if (data.additionalPaidOn !== undefined) {
      updateData.additionalPaidOn = data.additionalPaidOn ? new Date(data.additionalPaidOn) : null;
    }
    if (data.globalWorkHours !== undefined) updateData.globalWorkHours = validateNumber(data.globalWorkHours, 'globalWorkHours');
    if (data.omnigoBonus !== undefined) updateData.omnigoBonus = validateNumber(data.omnigoBonus, 'omnigoBonus');
    if (data.invoiceBonus !== undefined) updateData.invoiceBonus = validateNumber(data.invoiceBonus, 'invoiceBonus');
    if (data.pagamentoPIX !== undefined) updateData.pagamentoPIX = validateNumber(data.pagamentoPIX, 'pagamentoPIX');
    if (data.pagamentoInter !== undefined) updateData.pagamentoInter = validateNumber(data.pagamentoInter, 'pagamentoInter');
    if (data.equipmentsUSD !== undefined) updateData.equipmentsUSD = validateNumber(data.equipmentsUSD, 'equipmentsUSD');
    if (data.payoneerBalanceCarryover !== undefined) updateData.payoneerBalanceCarryover = validateNumber(data.payoneerBalanceCarryover, 'payoneerBalanceCarryover');
    if (data.payoneerBalanceApplied !== undefined) updateData.payoneerBalanceApplied = validateNumber(data.payoneerBalanceApplied, 'payoneerBalanceApplied');
    if (data.receiptAmount !== undefined) updateData.receiptAmount = validateNumber(data.receiptAmount, 'receiptAmount');

    await db.update(payrollCycles)
      .set(updateData)
      .where(eq(payrollCycles.id, id));

    return this.getById(id);
  }

  static async getSummary(id: number): Promise<CycleSummary> {
    const cycle = await this.getById(id);
    
    // Filter out terminated consultants (already filtered in getById, but ensure we use active lines)
    // cycle.lines from getById() already excludes terminated consultants
    
    // Calculate total hourly value (sum of all consultant rates)
    // NOTE: This uses snapshotted ratePerHour values from line items, not current Consultant.hourlyRate
    // This preserves historical accuracy - rates are captured when the cycle is created
    const totalHourlyValue = cycle.lines.reduce((sum, line) => {
      const rate = line.ratePerHour || 0;
      return sum + rate;
    }, 0);
    
    // Build breakdown for diagnostics (shows which consultants and rates are included)
    const hourlyValueBreakdown = cycle.lines.map(line => ({
      consultantId: line.consultantId,
      consultantName: line.consultant.name,
      snapshottedRate: line.ratePerHour || 0,
      currentRate: line.consultant.hourlyRate // For comparison with current rate
    }));
    
    // Calculate USD total using Excel formula: =B22*B26-(B23+B24)+B25+B27
    // B22 = totalHourlyValue, B26 = globalWorkHours, B23 = pagamentoPIX, B24 = pagamentoInter
    // B25 = omnigoBonus, B27 = equipmentsUSD
    const globalWorkHours = cycle.globalWorkHours || 0;
    const baseAmount = totalHourlyValue * globalWorkHours;
    const paymentSubtractions = (cycle.pagamentoPIX || 0) + (cycle.pagamentoInter || 0);
    const bonuses = (cycle.omnigoBonus || 0) + (cycle.equipmentsUSD || 0);
    const usdTotal = baseAmount - paymentSubtractions + bonuses;

    // Detect anomalies
    const anomalies: string[] = [];
    
    cycle.lines.forEach(line => {
      if (line.ratePerHour === 0) {
        anomalies.push(`${line.consultant.name} has zero hourly rate`);
      }
      if (line.bonusAdvance && !line.advanceDate) {
        anomalies.push(`${line.consultant.name} has bonus advance without advance date`);
      }
      if (line.bonusAdvance && !line.bonusPaydate) {
        anomalies.push(`${line.consultant.name} has bonus advance without paydate`);
      }
    });

    if (!cycle.globalWorkHours) {
      anomalies.push('Global work hours not set');
    }

    return {
      cycle,
      totalHourlyValue,
      usdTotal,
      lineCount: cycle.lines.length,
      anomalies,
      hourlyValueBreakdown
    };
  }

  static calculateLineItemSubtotal(lineItem: any, globalWorkHours: number): number {
    const workHours = lineItem.workHours || globalWorkHours;
    const rateAmount = workHours * lineItem.ratePerHour;
    const adjustment = lineItem.adjustmentValue || 0;
    const advance = lineItem.bonusAdvance || 0;
    return rateAmount + adjustment - advance;
  }

  static async calculatePayment(id: number, noBonus: boolean = false): Promise<PaymentCalculationResult> {
    const cycle = await this.getById(id);

    const parsedMonth = this.parseMonthLabel(cycle.monthLabel);
    if (!parsedMonth) {
      throw new ValidationError('Invalid month label format. Expected "Month YYYY".');
    }

    const { year: nextYear, month: nextMonth } = this.getNextMonth(parsedMonth.year, parsedMonth.month);
    const nextMonthWorkHoursRef = await WorkHoursService.getByYearMonth(nextYear, nextMonth);

    let paymentWorkHours: number;
    let usingCalculatedFallback = false;

    if (!nextMonthWorkHoursRef || !nextMonthWorkHoursRef.workHours || nextMonthWorkHoursRef.workHours <= 0) {
      // Calculate work hours on the fly for the next month (matches UI calculation logic)
      // This ensures we use the correct hours (e.g., 184 for December 2025) even if not in DB yet
      paymentWorkHours = this.calculateWorkHoursForMonth(nextYear, nextMonth);
      usingCalculatedFallback = true;
    } else {
      paymentWorkHours = nextMonthWorkHoursRef.workHours;
    }

    const paymentMonthLabel = `${this.getMonthName(nextMonth)} ${nextYear}`;

    // Calculate individual consultant payment details
    const consultantPayments: ConsultantPaymentDetail[] = cycle.lines.map(line => {
      const workHours = paymentWorkHours;
      const baseAmount = workHours * line.ratePerHour;
      const adjustmentValue = line.adjustmentValue || 0;
      const bonusAdvance = line.bonusAdvance || 0;
      const subtotal = baseAmount + adjustmentValue - bonusAdvance;

      return {
        consultantId: line.consultant.id,
        consultantName: line.consultant.name,
        payoneerID: line.consultant.payoneerID,
        ratePerHour: line.ratePerHour,
        workHours,
        baseAmount,
        adjustmentValue,
        bonusAdvance,
        subtotal
      };
    });

    // Calculate totals
    const totalConsultantPayments = consultantPayments.reduce((sum, payment) => sum + payment.subtotal, 0);
    // If noBonus is true, set omnigoBonus to 0 for this calculation
    const omnigoBonus = noBonus ? 0 : (cycle.omnigoBonus || 0);
    const equipmentsUSD = cycle.equipmentsUSD || 0;
    const payoneerBalanceApplied = cycle.payoneerBalanceApplied || 0;
    const totalWellsFargoTransfer = totalConsultantPayments + omnigoBonus + equipmentsUSD - payoneerBalanceApplied;

    // Get cycle summary for additional info (for totalHourlyValue and anomalies)
    const summary = await this.getSummary(id);
    
    // Calculate USD total using payment month's work hours (not cycle's globalWorkHours)
    // Formula: =B22*B26-(B23+B24)+B25+B27 where B26 is paymentMonthWorkHours
    const totalHourlyValue = summary.totalHourlyValue;
    const baseAmount = totalHourlyValue * paymentWorkHours;
    const paymentSubtractions = (cycle.pagamentoPIX || 0) + (cycle.pagamentoInter || 0);
    const bonuses = omnigoBonus + equipmentsUSD;
    const usdTotalForPayment = baseAmount - paymentSubtractions + bonuses;

    // Update cycle with calculated payment date
    await this.update(id, {
      calculatedPaymentDate: new Date().toISOString()
    });

    const result = {
      cycleId: cycle.id,
      monthLabel: cycle.monthLabel,
      calculatedAt: new Date(),
      consultantPayments,
      totalConsultantPayments,
      omnigoBonus,
      equipmentsUSD,
      totalWellsFargoTransfer,
      totalHourlyValue: summary.totalHourlyValue,
      globalWorkHours: cycle.globalWorkHours || 0,
      paymentMonthWorkHours: paymentWorkHours,
      paymentMonthLabel,
      usdTotal: usdTotalForPayment, // Use payment month's work hours, not cycle's globalWorkHours
      anomalies: summary.anomalies
    };

    return result;
  }

  private static parseMonthLabel(monthLabel: string): { year: number; month: number } | null {
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

  private static getNextMonth(year: number, month: number): { year: number; month: number } {
    let nextMonth = month + 1;
    let nextYear = year;

    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    return { year: nextYear, month: nextMonth };
  }

  private static getMonthName(monthNumber: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return months[monthNumber - 1] || '';
  }

  /**
   * Calculate work hours for a given month (weekdays * 8 hours)
   * This matches the client-side calculation logic
   */
  private static calculateWorkHoursForMonth(year: number, monthNumber: number): number {
    // monthNumber is 1-12, Date month is 0-11
    const monthIndex = monthNumber - 1;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    let weekdays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, monthIndex, day).getDay();
      // 0 = Sunday, 6 = Saturday, so weekdays are 1-5 (Monday-Friday)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        weekdays++;
      }
    }

    return weekdays * 8;
  }

  static async archive(id: number) {
    const existing = await this.getById(id);
    
    if (existing.archivedAt) {
      throw new ValidationError('Cycle is already archived');
    }

    await db.update(payrollCycles)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(payrollCycles.id, id));

    return this.getById(id);
  }
}
