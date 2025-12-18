import { eq, and, desc } from 'drizzle-orm';
import { db, invoices } from '../db';
import { CreateInvoiceRequest, UpdateInvoiceRequest } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

export class InvoiceService {
  static async getAll(cycleId?: number) {
    const whereClause = cycleId ? eq(invoices.cycleId, cycleId) : undefined;
    
    return db.query.invoices.findMany({
      where: whereClause,
      with: {
        consultant: true,
        cycle: true
      },
      orderBy: [desc(invoices.id)]
    });
  }

  static async getById(id: number) {
    const invoice = await db.query.invoices.findFirst({
      where: eq(invoices.id, id),
      with: {
        consultant: true,
        cycle: true
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    return invoice;
  }

  static async create(data: CreateInvoiceRequest) {
    const [invoice] = await db.insert(invoices).values({
      cycleId: data.cycleId,
      consultantId: data.consultantId,
      hours: data.hours || null,
      rate: data.rate || null,
      amount: data.amount || null,
      sent: false,
      approved: false
    }).returning();

    return this.getById(invoice.id);
  }

  static async update(id: number, data: UpdateInvoiceRequest) {
    const existing = await this.getById(id);

    const updateData: any = {};
    if (data.hours !== undefined) updateData.hours = data.hours;
    if (data.rate !== undefined) updateData.rate = data.rate;
    if (data.amount !== undefined) updateData.amount = data.amount;
    if (data.sent !== undefined) updateData.sent = data.sent;
    if (data.approved !== undefined) updateData.approved = data.approved;
    if (data.sentDate !== undefined) {
      updateData.sentDate = data.sentDate ? new Date(data.sentDate) : null;
    }
    if (data.approvedDate !== undefined) {
      updateData.approvedDate = data.approvedDate ? new Date(data.approvedDate) : null;
    }

    const [invoice] = await db.update(invoices)
      .set(updateData)
      .where(eq(invoices.id, id))
      .returning();

    return this.getById(id);
  }

  static async delete(id: number) {
    const existing = await this.getById(id);
    
    await db.delete(invoices).where(eq(invoices.id, id));
    return { success: true };
  }
}
