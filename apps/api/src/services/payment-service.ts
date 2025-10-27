import { eq } from 'drizzle-orm';
import { db, payments } from '../db';
import { CreatePaymentRequest } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

export class PaymentService {
  static async getAll(cycleId?: number) {
    const whereClause = cycleId ? eq(payments.cycleId, cycleId) : undefined;
    
    return db.query.payments.findMany({
      where: whereClause,
      with: {
        consultant: true,
        cycle: true
      },
      orderBy: (payments, { desc }) => [desc(payments.date)]
    });
  }

  static async getById(id: number) {
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, id),
      with: {
        consultant: true,
        cycle: true
      }
    });

    if (!payment) {
      throw new NotFoundError('Payment not found');
    }

    return payment;
  }

  static async create(data: CreatePaymentRequest) {
    const [payment] = await db.insert(payments).values({
      cycleId: data.cycleId,
      consultantId: data.consultantId || null,
      kind: data.kind,
      amount: data.amount,
      date: new Date(data.date)
    }).returning();

    return this.getById(payment.id);
  }

  static async delete(id: number) {
    const existing = await this.getById(id);
    
    await db.delete(payments).where(eq(payments.id, id));
    return { success: true };
  }
}
