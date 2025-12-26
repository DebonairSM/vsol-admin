import { eq } from 'drizzle-orm';
import { db, clients } from '../db';
import { CreateClientRequest, UpdateClientRequest } from '@vsol-admin/shared';
import { NotFoundError } from '../middleware/errors';

export class ClientService {
  static async getAll() {
    return db.query.clients.findMany({
      orderBy: (clients, { asc }) => [asc(clients.name)]
    });
  }

  static async getById(id: number) {
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, id)
    });

    if (!client) {
      throw new NotFoundError('Client not found');
    }

    return client;
  }

  static async create(data: CreateClientRequest) {
    const [client] = await db.insert(clients).values({
      name: data.name,
      legalName: data.legalName || null,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      zip: data.zip || null,
      country: data.country || null,
      taxId: data.taxId || null,
      paymentTerms: data.paymentTerms || null,
      paymentNotes: data.paymentNotes || null
    }).returning();

    return client;
  }

  static async update(id: number, data: UpdateClientRequest) {
    const existing = await this.getById(id);

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.legalName !== undefined) updateData.legalName = data.legalName;
    if (data.contactName !== undefined) updateData.contactName = data.contactName;
    if (data.contactPhone !== undefined) updateData.contactPhone = data.contactPhone;
    if (data.contactEmail !== undefined) updateData.contactEmail = data.contactEmail;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zip !== undefined) updateData.zip = data.zip;
    if (data.country !== undefined) updateData.country = data.country;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.paymentNotes !== undefined) updateData.paymentNotes = data.paymentNotes;
    updateData.updatedAt = new Date();

    const [updated] = await db.update(clients)
      .set(updateData)
      .where(eq(clients.id, id))
      .returning();

    return updated;
  }

  static async delete(id: number) {
    const existing = await this.getById(id);
    
    await db.delete(clients).where(eq(clients.id, id));
    return { success: true };
  }
}






