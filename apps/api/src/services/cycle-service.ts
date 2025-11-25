import { eq, isNull, sum } from 'drizzle-orm';
import { db, payrollCycles, cycleLineItems, consultants } from '../db';
import { CreateCycleRequest, UpdateCycleRequest, CycleSummary, PaymentCalculationResult, ConsultantPaymentDetail } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class CycleService {
  static async getAll() {
    return db.query.payrollCycles.findMany({
      where: isNull(payrollCycles.archivedAt),
      orderBy: (cycles, { desc }) => [desc(cycles.monthLabel)]
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

    // Add computed subtotals to line items
    const linesWithSubtotals = cycle.lines.map(line => ({
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

    // Create cycle and line items in transaction
    const result = db.transaction((tx) => {
      // Create the cycle
      const [cycle] = tx.insert(payrollCycles).values({
        monthLabel: data.monthLabel,
        globalWorkHours: data.globalWorkHours || null,
        omnigoBonus: data.omnigoBonus || null
      }).returning();

      // Create line items for all active consultants
      const lineItemsData = activeConsultants.map(consultant => ({
        cycleId: cycle.id,
        consultantId: consultant.id,
        ratePerHour: consultant.hourlyRate, // Snapshot the current rate
        bonusAdvance: consultant.yearlyBonus || null // Pre-fill yearly bonus if set
      }));

      tx.insert(cycleLineItems).values(lineItemsData);

      return cycle;
    })();

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
    if (data.calculatedPaymentDate !== undefined) {
      updateData.calculatedPaymentDate = data.calculatedPaymentDate ? new Date(data.calculatedPaymentDate) : null;
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
    if (data.pagamentoPIX !== undefined) updateData.pagamentoPIX = validateNumber(data.pagamentoPIX, 'pagamentoPIX');
    if (data.pagamentoInter !== undefined) updateData.pagamentoInter = validateNumber(data.pagamentoInter, 'pagamentoInter');
    if (data.equipmentsUSD !== undefined) updateData.equipmentsUSD = validateNumber(data.equipmentsUSD, 'equipmentsUSD');

    await db.update(payrollCycles)
      .set(updateData)
      .where(eq(payrollCycles.id, id));

    return this.getById(id);
  }

  static async getSummary(id: number): Promise<CycleSummary> {
    const cycle = await this.getById(id);
    
    // Calculate total hourly value (sum of all consultant rates)
    const totalHourlyValue = cycle.lines.reduce((sum, line) => sum + line.ratePerHour, 0);
    
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
      anomalies
    };
  }

  static calculateLineItemSubtotal(lineItem: any, globalWorkHours: number): number {
    const workHours = lineItem.workHours || globalWorkHours;
    const rateAmount = workHours * lineItem.ratePerHour;
    const adjustment = lineItem.adjustmentValue || 0;
    const advance = lineItem.bonusAdvance || 0;
    return rateAmount + adjustment - advance;
  }

  static async calculatePayment(id: number): Promise<PaymentCalculationResult> {
    const cycle = await this.getById(id);
    const globalWorkHours = cycle.globalWorkHours || 0;

    if (globalWorkHours === 0) {
      throw new ValidationError('Global work hours must be set before calculating payments');
    }

    // Calculate individual consultant payment details
    const consultantPayments: ConsultantPaymentDetail[] = cycle.lines.map(line => {
      const workHours = line.workHours || globalWorkHours;
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
    const omnigoBonus = cycle.omnigoBonus || 0;
    const equipmentsUSD = cycle.equipmentsUSD || 0;
    const totalWellsFargoTransfer = totalConsultantPayments + omnigoBonus + equipmentsUSD;

    // Get cycle summary for additional info
    const summary = await this.getSummary(id);

    // Update cycle with calculated payment date
    await this.update(id, {
      calculatedPaymentDate: new Date().toISOString()
    });

    return {
      cycleId: cycle.id,
      monthLabel: cycle.monthLabel,
      calculatedAt: new Date(),
      consultantPayments,
      totalConsultantPayments,
      omnigoBonus,
      equipmentsUSD,
      totalWellsFargoTransfer,
      totalHourlyValue: summary.totalHourlyValue,
      globalWorkHours,
      usdTotal: summary.usdTotal,
      anomalies: summary.anomalies
    };
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
