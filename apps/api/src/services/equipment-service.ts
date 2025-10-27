import { eq } from 'drizzle-orm';
import { db, consultantEquipment, consultants } from '../db';
import { CreateEquipmentRequest, UpdateEquipmentRequest } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class EquipmentService {
  static async getAllWithConsultants() {
    return db.query.consultantEquipment.findMany({
      with: {
        consultant: true
      },
      orderBy: (equipment, { desc }) => [desc(equipment.createdAt)]
    });
  }

  static async getByConsultantId(consultantId: number) {
    // Verify consultant exists
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    return db.query.consultantEquipment.findMany({
      where: eq(consultantEquipment.consultantId, consultantId),
      orderBy: (equipment, { desc }) => [desc(equipment.createdAt)]
    });
  }

  static async getById(id: number) {
    const equipment = await db.query.consultantEquipment.findFirst({
      where: eq(consultantEquipment.id, id),
      with: {
        consultant: true
      }
    });

    if (!equipment) {
      throw new NotFoundError('Equipment not found');
    }

    return equipment;
  }

  static async create(data: CreateEquipmentRequest) {
    // Verify consultant exists
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, data.consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    const [equipment] = await db.insert(consultantEquipment).values({
      consultantId: data.consultantId,
      deviceName: data.deviceName,
      model: data.model || null,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
      serialNumber: data.serialNumber || null,
      returnRequired: data.returnRequired ?? true,
      notes: data.notes || null
    }).returning();

    return equipment;
  }

  static async update(id: number, data: UpdateEquipmentRequest) {
    const existing = await this.getById(id);

    const updateData: any = {
      updatedAt: new Date()
    };

    if (data.deviceName !== undefined) updateData.deviceName = data.deviceName;
    if (data.model !== undefined) updateData.model = data.model;
    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    }
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber;
    if (data.returnRequired !== undefined) updateData.returnRequired = data.returnRequired;
    if (data.returnedDate !== undefined) {
      updateData.returnedDate = data.returnedDate ? new Date(data.returnedDate) : null;
    }
    if (data.notes !== undefined) updateData.notes = data.notes;

    const [equipment] = await db.update(consultantEquipment)
      .set(updateData)
      .where(eq(consultantEquipment.id, id))
      .returning();

    return equipment;
  }

  static async delete(id: number) {
    const existing = await this.getById(id);

    await db.delete(consultantEquipment).where(eq(consultantEquipment.id, id));
    return { success: true };
  }

  static async markAsReturned(id: number, returnedDate?: Date) {
    const equipment = await this.getById(id);

    if (!equipment.returnRequired) {
      throw new ValidationError('Equipment return is not required');
    }

    if (equipment.returnedDate) {
      throw new ValidationError('Equipment already marked as returned');
    }

    const [updatedEquipment] = await db.update(consultantEquipment)
      .set({
        returnedDate: returnedDate || new Date(),
        updatedAt: new Date()
      })
      .where(eq(consultantEquipment.id, id))
      .returning();

    return updatedEquipment;
  }

  static async getPendingReturns(consultantId?: number) {
    const where = consultantId 
      ? eq(consultantEquipment.consultantId, consultantId)
      : undefined;

    const equipment = await db.query.consultantEquipment.findMany({
      where,
      with: {
        consultant: true
      }
    });

    // Filter for equipment that needs to be returned but hasn't been
    return equipment.filter(item => 
      item.returnRequired && !item.returnedDate
    );
  }

  static async getReturnStatus(consultantId: number) {
    const allEquipment = await this.getByConsultantId(consultantId);
    const pendingReturns = allEquipment.filter(item => 
      item.returnRequired && !item.returnedDate
    );

    return {
      total: allEquipment.length,
      requireReturn: allEquipment.filter(item => item.returnRequired).length,
      returned: allEquipment.filter(item => item.returnedDate).length,
      pending: pendingReturns.length,
      pendingItems: pendingReturns,
      allReturned: pendingReturns.length === 0
    };
  }
}

