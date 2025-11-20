import { eq, and, isNull } from 'drizzle-orm';
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

    // If workflow exists but no recipient is set, try to auto-detect
    if (workflow && workflow.bonusRecipientConsultantId === null) {
      // Try bonusMonth match first (primary detection)
      let recipientId = await this.findConsultantByBonusMonth(cycleId);
      
      // Fallback to line item detection
      if (!recipientId) {
        recipientId = await this.findConsultantWithBonusFields(cycleId);
      }
      
      // If found, update workflow
      if (recipientId) {
        await db.update(bonusWorkflows)
          .set({
            bonusRecipientConsultantId: recipientId,
            updatedAt: new Date()
          })
          .where(eq(bonusWorkflows.cycleId, cycleId));
        
        // Return updated workflow
        return await db.query.bonusWorkflows.findFirst({
          where: eq(bonusWorkflows.cycleId, cycleId),
          with: {
            cycle: true,
            consultant: true
          }
        });
      }
    }

    return workflow || null;
  }

  static async createForCycle(cycleId: number) {
    // Check if workflow already exists
    const existing = await this.getByCycleId(cycleId);
    if (existing) {
      throw new ValidationError('Bonus workflow already exists for this cycle');
    }

    // Try to auto-detect recipient before creating workflow
    // Primary: match bonusMonth with cycle month
    let recipientId = await this.findConsultantByBonusMonth(cycleId);
    
    // Fallback: find consultant with bonus fields in line items
    if (!recipientId) {
      recipientId = await this.findConsultantWithBonusFields(cycleId);
    }

    const [workflow] = await db.insert(bonusWorkflows).values({
      cycleId,
      bonusRecipientConsultantId: recipientId
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
      
      // Sync to line item's informedDate if bonus recipient is set
      const recipientId = newRecipientId;
      if (recipientId !== null) {
        const recipientLineItem = await db.query.cycleLineItems.findFirst({
          where: and(
            eq(cycleLineItems.cycleId, cycleId),
            eq(cycleLineItems.consultantId, recipientId)
          )
        });
        
        if (recipientLineItem) {
          await db.update(cycleLineItems)
            .set({
              informedDate: updateData.bonusAnnouncementDate,
              updatedAt: new Date()
            })
            .where(eq(cycleLineItems.id, recipientLineItem.id));
        }
      }
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

  /**
   * Find consultant whose line item has bonus fields set
   */
  private static async findConsultantWithBonusFields(cycleId: number): Promise<number | null> {
    const lineItems = await db.query.cycleLineItems.findMany({
      where: eq(cycleLineItems.cycleId, cycleId)
    });
    
    const consultantWithBonus = lineItems.find(item => 
      item.informedDate || item.bonusPaydate
    );
    
    return consultantWithBonus?.consultantId || null;
  }

  /**
   * Extract month number (1-12) from cycle monthLabel
   * Handles formats like "December 2025", "2025-10", "October", etc.
   */
  private static extractMonthFromLabel(monthLabel: string): number | null {
    const monthMap: Record<string, number> = {
      'january': 1, 'february': 2, 'march': 3, 'april': 4,
      'may': 5, 'june': 6, 'july': 7, 'august': 8,
      'september': 9, 'october': 10, 'november': 11, 'december': 12
    };
    
    const label = monthLabel.toLowerCase().trim();
    
    // Try full month name first
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
      if (label.includes(monthName)) {
        return monthNum;
      }
    }
    
    // Try numeric format like "2025-10" or "10/2025"
    const numericMatch = label.match(/(?:^|\D)(\d{1,2})(?:\D|$)/);
    if (numericMatch) {
      const monthNum = parseInt(numericMatch[1]);
      if (monthNum >= 1 && monthNum <= 12) {
        return monthNum;
      }
    }
    
    return null;
  }

  /**
   * Find active consultant whose bonusMonth matches TWO months after cycle month
   * (cycle represents preparation month, bonus is paid two months later)
   * October cycle → consultants work in November → bonus paid in December → match bonusMonth = 12
   */
  private static async findConsultantByBonusMonth(cycleId: number): Promise<number | null> {
    const cycle = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, cycleId)
    });
    
    if (!cycle) {
      return null;
    }
    
    const cycleMonth = this.extractMonthFromLabel(cycle.monthLabel);
    if (!cycleMonth) {
      return null;
    }
    
    // Calculate two months after cycle start (bonus payment month)
    // October cycle → December bonus payment → match bonusMonth = 12
    let bonusMonth = cycleMonth + 2;
    if (bonusMonth > 12) {
      bonusMonth = bonusMonth - 12;
    }
    
    // Find active consultant with matching bonusMonth
    const consultant = await db.query.consultants.findFirst({
      where: and(
        eq(consultants.bonusMonth, bonusMonth),
        isNull(consultants.terminationDate) // Only active consultants
      )
    });
    
    return consultant?.id || null;
  }

  /**
   * Set bonus recipient if not already set (used by line-item-service)
   */
  static async setRecipientIfNotSet(cycleId: number, consultantId: number): Promise<void> {
    const workflow = await this.getByCycleId(cycleId);
    if (!workflow) {
      return; // No workflow exists yet
    }
    
    if (workflow.bonusRecipientConsultantId !== null) {
      return; // Recipient already set, don't override
    }
    
    await db.update(bonusWorkflows)
      .set({
        bonusRecipientConsultantId: consultantId,
        updatedAt: new Date()
      })
      .where(eq(bonusWorkflows.cycleId, cycleId));
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
            informedDate: null,
            bonusPaydate: null,
            updatedAt: new Date()
          })
          .where(eq(cycleLineItems.id, lineItem.id));
      }
    }
  }

  static async generateEmailContent(cycleId: number, overrideConsultantId?: number | null) {
    let workflow = await this.getByCycleId(cycleId);
    if (!workflow) {
      throw new NotFoundError('Bonus workflow not found for this cycle');
    }

    // Use override consultant ID if provided, otherwise use workflow's stored value
    let recipientConsultantId = overrideConsultantId !== undefined 
      ? overrideConsultantId 
      : workflow.bonusRecipientConsultantId;

    // If still no recipient after auto-detection, try one more time before erroring
    if (!recipientConsultantId) {
      // Try bonusMonth match first
      let recipientId = await this.findConsultantByBonusMonth(cycleId);
      
      // Fallback to line item detection
      if (!recipientId) {
        recipientId = await this.findConsultantWithBonusFields(cycleId);
      }
      
      recipientConsultantId = recipientId;
    }

    // Check if recipient consultant is selected
    if (!recipientConsultantId) {
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
      where: eq(consultants.id, recipientConsultantId)
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
    const consultantLineItem = lineItems.find(item => item.consultantId === recipientConsultantId);
    const advanceAmount = consultantLineItem?.bonusAdvance || 0;
    const netBonus = globalBonus - advanceAmount;

    const announcementDate = workflow.bonusAnnouncementDate || new Date();
    const formattedDate = announcementDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Generate email template for the selected consultant
    let emailContent = `Dear ${recipientConsultant.name},\n\n\n\n`;
    emailContent += `We are pleased to announce your bonus for this year.\n\n`;
    
    if (advanceAmount > 0) {
      emailContent += `Your bonus amount is $${globalBonus.toFixed(2)} related to the Omnigo client.\n\n`;
      emailContent += `However, you have already received an advance of $${advanceAmount.toFixed(2)}, `;
      emailContent += `so the net bonus payment will be $${netBonus.toFixed(2)}.\n\n`;
    } else {
      emailContent += `You will receive a bonus of $${globalBonus.toFixed(2)} related to the Omnigo client.\n\n`;
    }

    emailContent += `This bonus will be processed on ${formattedDate}.\n\n`;
    emailContent += `Thank you for your continued dedication and hard work.\n\n`;
    emailContent += `Best regards,\n\n \n\n`;
    emailContent += `VSol Admin\n\n`;
    emailContent += `(407) 409-0874\n\n`;
    emailContent += `admin@vsol.software\n\n`;
    emailContent += `www.vsol.software`;

    // Extract year from cycle monthLabel or use current year
    const year = cycle.monthLabel.match(/\d{4}/) ? cycle.monthLabel.match(/\d{4}/)![0] : new Date().getFullYear();
    const emailSubject = `Your Annual Bonus Announcement - ${year}`;

    return {
      emailSubject,
      emailContent,
      consultantsCount: 1,
      totalBonus: netBonus > 0 ? netBonus : 0
    };
  }
}

