import { eq, isNull, sum } from 'drizzle-orm';
import { db, payrollCycles, cycleLineItems, consultants } from '../db';
import { CreateCycleRequest, UpdateCycleRequest, CycleSummary } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class CycleService {
  static async getAll() {
    return db.query.payrollCycles.findMany({
      orderBy: (cycles, { desc }) => [desc(cycles.monthLabel)]
    });
  }

  static async getById(id: number) {
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

    return cycle;
  }

  static async create(data: CreateCycleRequest) {
    // Check if monthLabel already exists
    const existing = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.monthLabel, data.monthLabel)
    });

    if (existing) {
      throw new ValidationError('Cycle with this month label already exists');
    }

    // Get all active consultants
    const activeConsultants = await db.query.consultants.findMany({
      where: isNull(consultants.terminationDate)
    });

    if (activeConsultants.length === 0) {
      throw new ValidationError('No active consultants found. Cannot create empty cycle.');
    }

    // Create cycle and line items in transaction
    const result = await db.transaction(async (tx) => {
      // Create the cycle
      const [cycle] = await tx.insert(payrollCycles).values({
        monthLabel: data.monthLabel,
        globalWorkHours: data.globalWorkHours || null,
        omnigoBonus: data.omnigoBonus || null
      }).returning();

      // Create line items for all active consultants
      const lineItemsData = activeConsultants.map(consultant => ({
        cycleId: cycle.id,
        consultantId: consultant.id,
        ratePerHour: consultant.hourlyRate // Snapshot the current rate
      }));

      await tx.insert(cycleLineItems).values(lineItemsData);

      return cycle;
    });

    // Return cycle with populated lines
    return this.getById(result.id);
  }

  static async update(id: number, data: UpdateCycleRequest) {
    const existing = await this.getById(id);

    // Check if monthLabel change conflicts
    if (data.monthLabel && data.monthLabel !== existing.monthLabel) {
      const conflict = await db.query.payrollCycles.findFirst({
        where: eq(payrollCycles.monthLabel, data.monthLabel)
      });

      if (conflict) {
        throw new ValidationError('Cycle with this month label already exists');
      }
    }

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
    if (data.invoiceApprovalDate !== undefined) {
      updateData.invoiceApprovalDate = data.invoiceApprovalDate ? new Date(data.invoiceApprovalDate) : null;
    }
    if (data.hoursLimitChangedOn !== undefined) {
      updateData.hoursLimitChangedOn = data.hoursLimitChangedOn ? new Date(data.hoursLimitChangedOn) : null;
    }
    if (data.additionalPaidOn !== undefined) {
      updateData.additionalPaidOn = data.additionalPaidOn ? new Date(data.additionalPaidOn) : null;
    }
    if (data.globalWorkHours !== undefined) updateData.globalWorkHours = data.globalWorkHours;
    if (data.omnigoBonus !== undefined) updateData.omnigoBonus = data.omnigoBonus;
    if (data.pagamentoPIX !== undefined) updateData.pagamentoPIX = data.pagamentoPIX;
    if (data.pagamentoInter !== undefined) updateData.pagamentoInter = data.pagamentoInter;
    if (data.equipmentsUSD !== undefined) updateData.equipmentsUSD = data.equipmentsUSD;

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
}
