import { eq, and, desc, sql } from 'drizzle-orm';
import { db, clientInvoices, invoiceLineItems, invoiceNumberSequence, payrollCycles, cycleLineItems, clients } from '../db';
import { CreateClientInvoiceRequest, UpdateClientInvoiceRequest, UpdateClientInvoiceStatusRequest, ClientInvoiceStatus } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';
import { InvoiceLineItemService } from './invoice-line-item-service';

export class ClientInvoiceService {
  static async getAll(cycleId?: number, status?: ClientInvoiceStatus) {
    const conditions = [];
    if (cycleId) conditions.push(eq(clientInvoices.cycleId, cycleId));
    if (status) conditions.push(eq(clientInvoices.status, status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    return db.query.clientInvoices.findMany({
      where: whereClause,
      with: {
        client: true,
        cycle: true,
        lineItems: true
      },
      orderBy: [desc(clientInvoices.createdAt)]
    });
  }

  static async getById(id: number) {
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.id, id),
      with: {
        client: true,
        cycle: true,
        lineItems: true
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Parse consultantIds for line items
    const lineItemsWithParsedIds = invoice.lineItems.map(item => ({
      ...item,
      consultantIds: item.consultantIds ? JSON.parse(item.consultantIds) : null
    }));

    return {
      ...invoice,
      lineItems: lineItemsWithParsedIds
    };
  }

  static async getByCycleId(cycleId: number) {
    try {
      const invoice = await db.query.clientInvoices.findFirst({
        where: eq(clientInvoices.cycleId, cycleId),
        with: {
          client: true,
          cycle: true,
          lineItems: true
        }
      });

      if (!invoice) {
        return null;
      }

      // Parse consultantIds for line items
      const lineItemsWithParsedIds = (invoice.lineItems || []).map(item => {
        let consultantIds = null;
        if (item.consultantIds) {
          try {
            consultantIds = JSON.parse(item.consultantIds);
          } catch (error) {
            console.error(`Failed to parse consultantIds for line item ${item.id}:`, error);
            consultantIds = null;
          }
        }
        return {
          ...item,
          consultantIds
        };
      });

      return {
        ...invoice,
        lineItems: lineItemsWithParsedIds
      };
    } catch (error) {
      console.error(`Error fetching invoice for cycle ${cycleId}:`, error);
      throw error;
    }
  }

  static async getNextInvoiceNumber(): Promise<number> {
    // Get or create the sequence row (singleton)
    let sequence = await db.query.invoiceNumberSequence.findFirst();

    if (!sequence) {
      // Create initial sequence
      const [newSequence] = await db.insert(invoiceNumberSequence).values({
        nextNumber: 199
      }).returning();
      sequence = newSequence;
    }

    const invoiceNumber = sequence.nextNumber;

    // Increment for next time
    await db.update(invoiceNumberSequence)
      .set({
        nextNumber: invoiceNumber + 1,
        updatedAt: new Date()
      })
      .where(eq(invoiceNumberSequence.id, sequence.id));

    return invoiceNumber;
  }

  static async createFromCycle(cycleId: number) {
    // Check if invoice already exists for this cycle
    const existing = await this.getByCycleId(cycleId);
    if (existing) {
      throw new ValidationError('Invoice already exists for this cycle');
    }

    // Get cycle with line items and consultants
    const cycle = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, cycleId),
      with: {
        lines: {
          with: {
            consultant: true
          }
        }
      }
    });

    if (!cycle) {
      throw new NotFoundError('Cycle not found');
    }

    // Get default client (Omnigo) - for now, just get the first client
    const client = await db.query.clients.findFirst();
    if (!client) {
      throw new NotFoundError('No client found. Please seed client data.');
    }

    // Get invoice number
    const invoiceNumber = await this.getNextInvoiceNumber();

    // Calculate invoice date (use cycle creation date or current date)
    const invoiceDate = cycle.createdAt || new Date();
    
    // Calculate due date (30 days from invoice date)
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    // Group consultants by role and create line items
    const roleGroups = new Map<string, Array<{ consultant: any; lineItem: any }>>();

    for (const line of cycle.lines) {
      const consultant = line.consultant;
      const role = consultant.role || 'Uncategorized';
      
      if (!roleGroups.has(role)) {
        roleGroups.set(role, []);
      }
      roleGroups.get(role)!.push({ consultant, lineItem: line });
    }

    // Create line items array
    const lineItemsToCreate: Array<{
      serviceName: string;
      description: string;
      quantity: number;
      rate: number;
      amount: number;
      consultantIds: number[];
      sortOrder: number;
    }> = [];

    let sortOrder = 0;

    // Process each role group
    for (const [role, items] of roleGroups.entries()) {
      const consultantIds = items.map(item => item.consultant.id);
      const consultantNames = items.map(item => item.consultant.name).join(', ');
      
      // Calculate rate per consultant (average of their rates)
      // For invoice purposes, we want: (workHours * ratePerHour) per consultant
      // Then sum them up for the line item total
      let lineItemTotal = 0;
      
      for (const { consultant, lineItem } of items) {
        const workHours = lineItem.workHours ?? cycle.globalWorkHours ?? 0;
        const ratePerHour = lineItem.ratePerHour;
        lineItemTotal += workHours * ratePerHour;
      }

      // Rate is the total divided by quantity (per consultant rate)
      const quantity = items.length;
      const rate = quantity > 0 ? lineItemTotal / quantity : 0;

      // Service description - use consultant's serviceDescription if available, otherwise use role
      const firstConsultant = items[0]?.consultant;
      const serviceDescription = firstConsultant?.serviceDescription || role;
      const description = consultantNames 
        ? `${serviceDescription} (${consultantNames}).`
        : serviceDescription;

      lineItemsToCreate.push({
        serviceName: role,
        description,
        quantity,
        rate,
        amount: lineItemTotal,
        consultantIds,
        sortOrder: sortOrder++
      });
    }

    // Add bonus line item if omnigoBonus > 0
    if (cycle.omnigoBonus && cycle.omnigoBonus > 0) {
      lineItemsToCreate.push({
        serviceName: 'Consultant Bonus',
        description: "Omnigo contribution to consultants' annual performance bonus.",
        quantity: 1,
        rate: cycle.omnigoBonus,
        amount: cycle.omnigoBonus,
        consultantIds: [],
        sortOrder: sortOrder++
      });
    }

    // Calculate totals
    const subtotal = lineItemsToCreate.reduce((sum, item) => sum + item.amount, 0);
    const tax = 0; // No tax for now
    const total = subtotal + tax;
    const amountDue = total;

    // Create invoice and line items in transaction
    const result = await db.transaction(async (tx) => {
      // Create invoice
      const [invoice] = await tx.insert(clientInvoices).values({
        invoiceNumber,
        cycleId: cycle.id,
        clientId: client.id,
        invoiceDate,
        dueDate,
        status: 'DRAFT' as ClientInvoiceStatus,
        subtotal,
        tax,
        total,
        amountDue,
        paymentTerms: client.paymentTerms || null
      }).returning();

      // Create line items
      for (const itemData of lineItemsToCreate) {
        await tx.insert(invoiceLineItems).values({
          invoiceId: invoice.id,
          serviceName: itemData.serviceName,
          description: itemData.description,
          quantity: itemData.quantity,
          rate: itemData.rate,
          amount: itemData.amount,
          consultantIds: JSON.stringify(itemData.consultantIds),
          sortOrder: itemData.sortOrder
        });
      }

      return invoice.id;
    });

    return this.getById(result);
  }

  static async create(data: CreateClientInvoiceRequest) {
    const invoiceNumber = await this.getNextInvoiceNumber();

    const [invoice] = await db.insert(clientInvoices).values({
      invoiceNumber,
      cycleId: data.cycleId,
      clientId: data.clientId,
      invoiceDate: new Date(data.invoiceDate),
      dueDate: new Date(data.dueDate),
      status: 'DRAFT' as ClientInvoiceStatus,
      subtotal: 0,
      tax: 0,
      total: 0,
      amountDue: 0,
      notes: data.notes || null,
      paymentTerms: data.paymentTerms || null
    }).returning();

    return this.getById(invoice.id);
  }

  static async update(id: number, data: UpdateClientInvoiceRequest) {
    const existing = await this.getById(id);

    const updateData: any = {};
    if (data.invoiceDate !== undefined) updateData.invoiceDate = new Date(data.invoiceDate);
    if (data.dueDate !== undefined) updateData.dueDate = new Date(data.dueDate);
    if (data.status !== undefined) updateData.status = data.status;
    if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
    if (data.tax !== undefined) updateData.tax = data.tax;
    if (data.total !== undefined) updateData.total = data.total;
    if (data.amountDue !== undefined) updateData.amountDue = data.amountDue;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
    if (data.sentDate !== undefined) updateData.sentDate = data.sentDate ? new Date(data.sentDate) : null;
    if (data.approvedDate !== undefined) updateData.approvedDate = data.approvedDate ? new Date(data.approvedDate) : null;
    if (data.paidDate !== undefined) updateData.paidDate = data.paidDate ? new Date(data.paidDate) : null;
    updateData.updatedAt = new Date();

    // Recalculate totals from line items if not explicitly provided
    if (data.subtotal === undefined || data.total === undefined || data.amountDue === undefined) {
      const lineItems = await InvoiceLineItemService.getByInvoiceId(id);
      const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
      const calculatedTax = existing.tax || 0;
      const calculatedTotal = calculatedSubtotal + calculatedTax;
      
      if (data.subtotal === undefined) updateData.subtotal = calculatedSubtotal;
      if (data.total === undefined) updateData.total = calculatedTotal;
      if (data.amountDue === undefined) updateData.amountDue = calculatedTotal;
    }

    const [updated] = await db.update(clientInvoices)
      .set(updateData)
      .where(eq(clientInvoices.id, id))
      .returning();

    return this.getById(id);
  }

  static async updateStatus(id: number, data: UpdateClientInvoiceStatusRequest) {
    const existing = await this.getById(id);
    
    const updateData: any = {
      status: data.status,
      updatedAt: new Date()
    };

    // Set status-specific dates
    if (data.status === 'SENT' && !existing.sentDate) {
      updateData.sentDate = new Date();
    }
    if (data.status === 'APPROVED' && !existing.approvedDate) {
      updateData.approvedDate = new Date();
    }
    if (data.status === 'PAID' && !existing.paidDate) {
      updateData.paidDate = new Date();
    }

    const [updated] = await db.update(clientInvoices)
      .set(updateData)
      .where(eq(clientInvoices.id, id))
      .returning();

    return this.getById(id);
  }

  static async delete(id: number) {
    const existing = await this.getById(id);
    
    // Delete in transaction (line items will be cascade deleted if foreign key constraint is set)
    await db.transaction(async (tx) => {
      // Delete line items first
      await tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id));
      // Delete invoice
      await tx.delete(clientInvoices).where(eq(clientInvoices.id, id));
    });

    return { success: true };
  }
}

