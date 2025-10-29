import { eq, and, ne } from 'drizzle-orm';
import { db, cycleLineItems, bonusWorkflows } from '../db';
import { UpdateLineItemRequest } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';
import { BonusWorkflowService } from './bonus-workflow-service';

export class LineItemService {
  static async getById(id: number) {
    const lineItem = await db.query.cycleLineItems.findFirst({
      where: eq(cycleLineItems.id, id),
      with: {
        consultant: true,
        cycle: true
      }
    });

    if (!lineItem) {
      throw new NotFoundError('Line item not found');
    }

    return lineItem;
  }

  static async getByCycle(cycleId: number) {
    return db.query.cycleLineItems.findMany({
      where: eq(cycleLineItems.cycleId, cycleId),
      with: {
        consultant: true
      }
    });
  }

  static async update(id: number, data: UpdateLineItemRequest) {
    const existing = await this.getById(id);

    // Check if trying to set bonus fields for a consultant who is not the bonus recipient
    const isSettingBonusFields = data.bonusDate !== undefined || 
                                  data.informedDate !== undefined || 
                                  data.bonusPaydate !== undefined;
    
    if (isSettingBonusFields) {
      // Check if there's a bonus workflow for this cycle
      const workflow = await db.query.bonusWorkflows.findFirst({
        where: eq(bonusWorkflows.cycleId, existing.cycleId)
      });

      if (workflow && workflow.bonusRecipientConsultantId) {
        // If there's a bonus recipient, only that consultant can have bonus fields
        if (existing.consultantId !== workflow.bonusRecipientConsultantId) {
          throw new ValidationError(
            `Only the selected bonus recipient can have bonus information in this cycle.`
          );
        }
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
    if (data.invoiceSent !== undefined) updateData.invoiceSent = data.invoiceSent;
    if (data.adjustmentValue !== undefined) updateData.adjustmentValue = validateNumber(data.adjustmentValue, 'adjustmentValue');
    if (data.bonusDate !== undefined) {
      updateData.bonusDate = data.bonusDate ? new Date(data.bonusDate) : null;
    }
    if (data.informedDate !== undefined) {
      updateData.informedDate = data.informedDate ? new Date(data.informedDate) : null;
    }
    if (data.bonusPaydate !== undefined) {
      updateData.bonusPaydate = data.bonusPaydate ? new Date(data.bonusPaydate) : null;
    }
    if (data.bonusAdvance !== undefined) updateData.bonusAdvance = validateNumber(data.bonusAdvance, 'bonusAdvance');
    if (data.advanceDate !== undefined) {
      updateData.advanceDate = data.advanceDate ? new Date(data.advanceDate) : null;
    }
    if (data.workHours !== undefined) updateData.workHours = validateNumber(data.workHours, 'workHours');
    if (data.additionalPaidAmount !== undefined) updateData.additionalPaidAmount = validateNumber(data.additionalPaidAmount, 'additionalPaidAmount');
    if (data.additionalPaidDate !== undefined) {
      updateData.additionalPaidDate = data.additionalPaidDate ? new Date(data.additionalPaidDate) : null;
    }
    if (data.comments !== undefined) updateData.comments = data.comments;

    const [lineItem] = await db.update(cycleLineItems)
      .set(updateData)
      .where(eq(cycleLineItems.id, id))
      .returning();

    // If bonus fields were set, try to auto-set workflow recipient if not already set
    if (isSettingBonusFields) {
      const workflow = await db.query.bonusWorkflows.findFirst({
        where: eq(bonusWorkflows.cycleId, existing.cycleId)
      });

      if (workflow && workflow.bonusRecipientConsultantId === null) {
        // Auto-set the recipient to the consultant whose line item was just updated
        await BonusWorkflowService.setRecipientIfNotSet(existing.cycleId, existing.consultantId);
      }
    }

    return this.getById(id);
  }

  static async createForConsultant(cycleId: number, consultantId: number, ratePerHour: number) {
    const [lineItem] = await db.insert(cycleLineItems).values({
      cycleId,
      consultantId,
      ratePerHour
    }).returning();

    return this.getById(lineItem.id);
  }
}
