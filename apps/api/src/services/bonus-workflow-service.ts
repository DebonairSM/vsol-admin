import { eq } from 'drizzle-orm';
import { db, bonusWorkflows, cycleLineItems, payrollCycles, consultants } from '../db';
import { UpdateBonusWorkflowRequest } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class BonusWorkflowService {
  static async getByCycleId(cycleId: number) {
    const workflow = await db.query.bonusWorkflows.findFirst({
      where: eq(bonusWorkflows.cycleId, cycleId),
      with: {
        cycle: true,
        consultant: true
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
        cycle: true,
        consultant: true
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

    // Check if bonus recipient is changing
    const newRecipientId = data.bonusRecipientConsultantId !== undefined 
      ? data.bonusRecipientConsultantId 
      : existing.bonusRecipientConsultantId;

    if (data.bonusRecipientConsultantId !== undefined) {
      updateData.bonusRecipientConsultantId = data.bonusRecipientConsultantId;
      
      // If recipient is changing, clear bonus fields from all other consultants
      if (existing.bonusRecipientConsultantId !== null && 
          data.bonusRecipientConsultantId !== existing.bonusRecipientConsultantId) {
        await this.clearBonusFieldsFromOtherConsultants(cycleId, data.bonusRecipientConsultantId);
      }
    }
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

  private static async clearBonusFieldsFromOtherConsultants(cycleId: number, allowedConsultantId: number) {
    // Get all line items for this cycle
    const lineItems = await db.query.cycleLineItems.findMany({
      where: eq(cycleLineItems.cycleId, cycleId)
    });

    // Update all line items that are not the allowed consultant
    for (const lineItem of lineItems) {
      if (lineItem.consultantId !== allowedConsultantId) {
        await db.update(cycleLineItems)
          .set({
            bonusDate: null,
            informedDate: null,
            bonusPaydate: null,
            updatedAt: new Date()
          })
          .where(eq(cycleLineItems.id, lineItem.id));
      }
    }
  }

  static async generateEmailContent(cycleId: number) {
    const workflow = await this.getByCycleId(cycleId);
    if (!workflow) {
      throw new NotFoundError('Bonus workflow not found for this cycle');
    }

    // Check if recipient consultant is selected
    if (!workflow.bonusRecipientConsultantId) {
      throw new ValidationError('Please select which consultant will receive the bonus before generating the email.');
    }

    const cycle = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, cycleId)
    });

    if (!cycle) {
      throw new NotFoundError('Cycle not found');
    }

    // Get the recipient consultant
    const recipientConsultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, workflow.bonusRecipientConsultantId!)
    });

    if (!recipientConsultant) {
      throw new NotFoundError('Bonus recipient consultant not found');
    }

    // Check if cycle has omnigoBonus
    const globalBonus = cycle.omnigoBonus || 0;
    
    if (globalBonus <= 0) {
      throw new ValidationError('No Omnigo bonus amount configured for this cycle. Please set the Omnigo Bonus amount.');
    }

    // Get line items to check for advances
    const lineItems = await db.query.cycleLineItems.findMany({
      where: eq(cycleLineItems.cycleId, cycleId)
    });

    // Find the consultant's line item to check for advances
    const consultantLineItem = lineItems.find(item => item.consultantId === workflow.bonusRecipientConsultantId);
    const advanceAmount = consultantLineItem?.bonusAdvance || 0;
    const netBonus = globalBonus - advanceAmount;

    const announcementDate = workflow.bonusAnnouncementDate || new Date();
    const formattedDate = announcementDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Generate email template for the selected consultant
    let emailContent = `Dear ${recipientConsultant.name},\n\n`;
    emailContent += `We are pleased to announce your bonus for ${cycle.monthLabel}.\n\n`;
    
    if (advanceAmount > 0) {
      emailContent += `Your bonus amount is $${globalBonus.toFixed(2)} from the Omnigo client.\n\n`;
      emailContent += `However, you have already received an advance of $${advanceAmount.toFixed(2)}, `;
      emailContent += `so the net bonus payment will be $${netBonus.toFixed(2)}.\n\n`;
    } else {
      emailContent += `You will receive a bonus of $${globalBonus.toFixed(2)} from the Omnigo client.\n\n`;
    }

    emailContent += `This bonus will be processed on ${formattedDate}.\n\n`;
    emailContent += `Thank you for your continued dedication and hard work.\n\n`;
    emailContent += `Best regards,\nVSol Admin`;

    return {
      emailContent,
      consultantsCount: 1,
      totalBonus: netBonus > 0 ? netBonus : 0
    };
  }
}

