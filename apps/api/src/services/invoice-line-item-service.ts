import { eq, asc } from 'drizzle-orm';
import { db, invoiceLineItems } from '../db';
import { CreateInvoiceLineItemRequest, UpdateInvoiceLineItemRequest } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

export class InvoiceLineItemService {
  static async getByInvoiceId(invoiceId: number) {
    const items = await db.query.invoiceLineItems.findMany({
      where: eq(invoiceLineItems.invoiceId, invoiceId),
      orderBy: [asc(invoiceLineItems.sortOrder), asc(invoiceLineItems.id)]
    });

    // Parse consultantIds JSON
    return items.map(item => ({
      ...item,
      consultantIds: item.consultantIds ? JSON.parse(item.consultantIds) : null
    }));
  }

  static async create(data: CreateInvoiceLineItemRequest) {
    const [item] = await db.insert(invoiceLineItems).values({
      invoiceId: data.invoiceId,
      serviceName: data.serviceName,
      description: data.description,
      quantity: data.quantity,
      rate: data.rate,
      amount: data.amount,
      consultantIds: data.consultantIds ? JSON.stringify(data.consultantIds) : null,
      sortOrder: data.sortOrder || 0
    }).returning();

    return {
      ...item,
      consultantIds: item.consultantIds ? JSON.parse(item.consultantIds) : null
    };
  }

  static async update(id: number, data: UpdateInvoiceLineItemRequest) {
    const existing = await db.query.invoiceLineItems.findFirst({
      where: eq(invoiceLineItems.id, id)
    });

    if (!existing) {
      throw new NotFoundError('Invoice line item not found');
    }

    const updateData: any = {};
    if (data.serviceName !== undefined) updateData.serviceName = data.serviceName;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.quantity !== undefined) updateData.quantity = data.quantity;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.consultantIds !== undefined) {
      updateData.consultantIds = data.consultantIds ? JSON.stringify(data.consultantIds) : null;
    }
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    updateData.updatedAt = new Date();

    const [updated] = await db.update(invoiceLineItems)
      .set(updateData)
      .where(eq(invoiceLineItems.id, id))
      .returning();

    return {
      ...updated,
      consultantIds: updated.consultantIds ? JSON.parse(updated.consultantIds) : null
    };
  }

  static async delete(id: number) {
    const existing = await db.query.invoiceLineItems.findFirst({
      where: eq(invoiceLineItems.id, id)
    });

    if (!existing) {
      throw new NotFoundError('Invoice line item not found');
    }
    
    await db.delete(invoiceLineItems).where(eq(invoiceLineItems.id, id));
    return { success: true };
  }

  static async recalculateAmount(id: number) {
    const item = await db.query.invoiceLineItems.findFirst({
      where: eq(invoiceLineItems.id, id)
    });

    if (!item) {
      throw new NotFoundError('Invoice line item not found');
    }

    const newAmount = item.quantity * item.rate;
    
    const [updated] = await db.update(invoiceLineItems)
      .set({ amount: newAmount, updatedAt: new Date() })
      .where(eq(invoiceLineItems.id, id))
      .returning();

    return {
      ...updated,
      consultantIds: updated.consultantIds ? JSON.parse(updated.consultantIds) : null
    };
  }
}


