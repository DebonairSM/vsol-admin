import { eq } from 'drizzle-orm';
import { db, cycleLineItems } from '../db';
import { UpdateLineItemRequest } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

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
      },
      orderBy: (lineItems, { asc }) => [asc(lineItems.consultant.name)]
    });
  }

  static async update(id: number, data: UpdateLineItemRequest) {
    const existing = await this.getById(id);

    const updateData: any = {
      updatedAt: new Date()
    };
    if (data.invoiceSent !== undefined) updateData.invoiceSent = data.invoiceSent;
    if (data.adjustmentValue !== undefined) updateData.adjustmentValue = data.adjustmentValue;
    if (data.bonusDate !== undefined) {
      updateData.bonusDate = data.bonusDate ? new Date(data.bonusDate) : null;
    }
    if (data.informedDate !== undefined) {
      updateData.informedDate = data.informedDate ? new Date(data.informedDate) : null;
    }
    if (data.bonusPaydate !== undefined) {
      updateData.bonusPaydate = data.bonusPaydate ? new Date(data.bonusPaydate) : null;
    }
    if (data.bonusAdvance !== undefined) updateData.bonusAdvance = data.bonusAdvance;
    if (data.advanceDate !== undefined) {
      updateData.advanceDate = data.advanceDate ? new Date(data.advanceDate) : null;
    }
    if (data.workHours !== undefined) updateData.workHours = data.workHours;
    if (data.comments !== undefined) updateData.comments = data.comments;

    const [lineItem] = await db.update(cycleLineItems)
      .set(updateData)
      .where(eq(cycleLineItems.id, id))
      .returning();

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
