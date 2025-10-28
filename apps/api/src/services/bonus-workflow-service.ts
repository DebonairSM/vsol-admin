import { eq } from 'drizzle-orm';
import { db, bonusWorkflows, cycleLineItems, payrollCycles } from '../db';
import { UpdateBonusWorkflowRequest } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class BonusWorkflowService {
  static async getByCycleId(cycleId: number) {
    const workflow = await db.query.bonusWorkflows.findFirst({
      where: eq(bonusWorkflows.cycleId, cycleId),
      with: {
        cycle: true
      }
    });

    return workflow || null;
  }

  static async createForCycle(cycleId: number) {
    // Check if workflow already exists
    const existing = await this.getByCycleId(cycleId);
    if (existing) {
      throw new ValidationError('Bonus workflow already exists for this cycle');
    }

    const [workflow] = await db.insert(bonusWorkflows).values({
      cycleId
    }).returning();

    return this.getById(workflow.id);
  }

  static async getById(id: number) {
    const workflow = await db.query.bonusWorkflows.findFirst({
      where: eq(bonusWorkflows.id, id),
      with: {
        cycle: true
      }
    });

    if (!workflow) {
      throw new NotFoundError('Bonus workflow not found');
    }

    return workflow;
  }

  static async update(cycleId: number, data: UpdateBonusWorkflowRequest) {
    const existing = await this.getByCycleId(cycleId);
    if (!existing) {
      throw new NotFoundError('Bonus workflow not found for this cycle');
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.bonusAnnouncementDate !== undefined) {
      updateData.bonusAnnouncementDate = data.bonusAnnouncementDate ? new Date(data.bonusAnnouncementDate) : null;
    }
    if (data.emailGenerated !== undefined) updateData.emailGenerated = data.emailGenerated;
    if (data.emailContent !== undefined) updateData.emailContent = data.emailContent;
    if (data.paidWithPayroll !== undefined) updateData.paidWithPayroll = data.paidWithPayroll;
    if (data.bonusPaymentDate !== undefined) {
      updateData.bonusPaymentDate = data.bonusPaymentDate ? new Date(data.bonusPaymentDate) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    await db.update(bonusWorkflows)
      .set(updateData)
      .where(eq(bonusWorkflows.cycleId, cycleId));

    return this.getByCycleId(cycleId);
  }

  static async generateEmailContent(cycleId: number) {
    const workflow = await this.getByCycleId(cycleId);
    if (!workflow) {
      throw new NotFoundError('Bonus workflow not found for this cycle');
    }

    const cycle = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, cycleId)
    });

    if (!cycle) {
      throw new NotFoundError('Cycle not found');
    }

    // Get line items with bonus amounts
    const lineItems = await db.query.cycleLineItems.findMany({
      where: eq(cycleLineItems.cycleId, cycleId),
      with: {
        consultant: true
      }
    });

    const consultantsWithBonuses = lineItems
      .filter(item => item.bonusAdvance && item.bonusAdvance > 0)
      .map(item => ({
        name: item.consultant.name,
        bonusAmount: item.bonusAdvance!
      }));

    if (consultantsWithBonuses.length === 0) {
      throw new ValidationError('No consultants have bonus amounts for this cycle');
    }

    const announcementDate = workflow.bonusAnnouncementDate || new Date();
    const formattedDate = announcementDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Generate email template
    let emailContent = `Dear Consultants,\n\n`;
    emailContent += `We are pleased to announce your bonuses for ${cycle.monthLabel}.\n\n`;
    
    consultantsWithBonuses.forEach(({ name, bonusAmount }) => {
      emailContent += `${name}: $${bonusAmount.toFixed(2)}\n`;
    });

    emailContent += `\nThese bonuses will be processed on ${formattedDate}.\n\n`;
    emailContent += `Thank you for your continued dedication and hard work.\n\n`;
    emailContent += `Best regards,\nVSol Admin`;

    return {
      emailContent,
      consultantsCount: consultantsWithBonuses.length,
      totalBonus: consultantsWithBonuses.reduce((sum, c) => sum + c.bonusAmount, 0)
    };
  }
}

