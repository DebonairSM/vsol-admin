import { eq, and, desc } from 'drizzle-orm';
import { db, clientInvoices, invoiceLineItems, invoiceNumberSequence, payrollCycles, cycleLineItems, clients } from '../db';
import { CreateClientInvoiceRequest, UpdateClientInvoiceRequest, UpdateClientInvoiceStatusRequest, ClientInvoiceStatus } from '@vsol-admin/shared';
import { NotFoundError, ValidationError } from '../middleware/errors';
import { InvoiceLineItemService } from './invoice-line-item-service';

export class ClientInvoiceService {
  private static readonly CONSULTANT_BONUS_SERVICE_NAME = 'Consultant Bonus';
  private static readonly CONSULTANT_BONUS_DESCRIPTION = "Omnigo contribution to consultants' annual performance bonus.";
  // Default "Consultant Bonus" amount (matches Wave Apps)
  private static readonly DEFAULT_INVOICE_BONUS = 751.96;

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
    const lineItemsWithParsedIds = invoice.lineItems.map(item => {
      let parsedIds = null;
      if (item.consultantIds) {
        try {
          parsedIds = JSON.parse(item.consultantIds);
        } catch (e) {
          // If JSON parsing fails, log but don't fail the request
          console.warn(`Failed to parse consultantIds for line item ${item.id}:`, e);
          parsedIds = null;
        }
      }
      return {
        ...item,
        consultantIds: parsedIds
      };
    });

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
        nextNumber: 198
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

  /**
   * Get next invoice number within a transaction
   * This ensures the invoice number is generated atomically with the invoice creation
   * Note: In better-sqlite3, all operations are synchronous
   */
  private static getNextInvoiceNumberInTransaction(tx: any): number {
    // Get or create the sequence row (singleton)
    // Query within transaction using Drizzle's select API
    // Note: tx.query doesn't exist in better-sqlite3 transactions, use tx.select() instead
    const sequences = tx
      .select({
        id: invoiceNumberSequence.id,
        nextNumber: invoiceNumberSequence.nextNumber
      })
      .from(invoiceNumberSequence)
      .limit(1)
      .all() as Array<{ id: number; nextNumber: number }>;
    
    let sequence = sequences.length > 0 ? sequences[0] : null;

    if (!sequence) {
      // Create initial sequence
      // Insert operations in better-sqlite3 are synchronous, but Drizzle queries are lazy.
      // Use .run() and lastInsertRowid to get the inserted row id.
      const insertResult = tx
        .insert(invoiceNumberSequence)
        .values({ nextNumber: 198 })
        .run() as { lastInsertRowid: number | bigint };

      const insertedId = Number(insertResult.lastInsertRowid);
      if (!Number.isFinite(insertedId) || insertedId <= 0) {
        throw new Error('Failed to create invoice number sequence (missing lastInsertRowid)');
      }

      sequence = { id: insertedId, nextNumber: 198 };
    }

    if (!sequence || sequence.nextNumber === undefined) {
      throw new Error('Invoice number sequence is invalid');
    }

    const invoiceNumber = sequence.nextNumber;

    // Increment for next time
    // Update operations in better-sqlite3 are synchronous
    tx
      .update(invoiceNumberSequence)
      .set({
        nextNumber: invoiceNumber + 1,
        updatedAt: new Date()
      })
      .where(eq(invoiceNumberSequence.id, sequence.id))
      .run();

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

    // Calculate invoice date (use cycle creation date or current date)
    const invoiceDate = cycle.createdAt || new Date();
    
    // Calculate due date (30 days from invoice date)
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const roundToCents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

    /**
     * Generate invoice line items based on client billing fields (monthly service fees),
     * not on consultant payouts (hourlyRate/ratePerHour).
     *
     * This matches the real Omnigo invoice format: service name, quantity, unit price, amount.
     */
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

    // Group consultants into invoice line items by (serviceName + unitPrice + baseDescription)
    // This supports cases where the same serviceName/unitPrice appears multiple times with different descriptions.
    type BillingGroupKey = string;
    const billingGroups = new Map<
      BillingGroupKey,
      {
        serviceName: string;
        unitPrice: number;
        baseDescription: string;
        consultantIds: number[];
        consultantNames: string[];
      }
    >();

    const missingBilling: Array<{ id: number; name: string }> = [];

    for (const line of cycle.lines) {
      const consultant = line.consultant;

      const serviceName =
        consultant.clientInvoiceServiceName ||
        consultant.role ||
        'Uncategorized';

      const unitPrice = consultant.clientInvoiceUnitPrice;
      if (unitPrice === null || unitPrice === undefined) {
        missingBilling.push({ id: consultant.id, name: consultant.name });
        continue;
      }

      const baseDescription =
        consultant.clientInvoiceServiceDescription ||
        consultant.serviceDescription ||
        serviceName;

      const key = `${serviceName}||${unitPrice}||${baseDescription}`;
      const existing = billingGroups.get(key);
      if (existing) {
        existing.consultantIds.push(consultant.id);
        existing.consultantNames.push(consultant.name);
      } else {
        billingGroups.set(key, {
          serviceName,
          unitPrice,
          baseDescription,
          consultantIds: [consultant.id],
          consultantNames: [consultant.name]
        });
      }
    }

    if (missingBilling.length > 0) {
      const names = missingBilling.map((c) => `${c.name} (id=${c.id})`).join(', ');
      throw new ValidationError(
        `Missing client invoice unit price for ${missingBilling.length} consultant(s): ${names}. ` +
          `Set Consultant.clientInvoiceUnitPrice (and optionally service name/description) before creating a client invoice from cycle.`
      );
    }

    // Deterministic ordering
    const sortedGroups = Array.from(billingGroups.values()).sort((a, b) => {
      if (a.serviceName !== b.serviceName) return a.serviceName.localeCompare(b.serviceName);
      if (a.unitPrice !== b.unitPrice) return a.unitPrice - b.unitPrice;
      return a.baseDescription.localeCompare(b.baseDescription);
    });

    for (const group of sortedGroups) {
      const quantity = group.consultantIds.length;
      const amount = roundToCents(quantity * group.unitPrice);
      const names = group.consultantNames.join(', ');
      const description = `${group.baseDescription} (${names}).`;

      lineItemsToCreate.push({
        serviceName: group.serviceName,
        description,
        quantity,
        rate: roundToCents(group.unitPrice),
        amount,
        consultantIds: group.consultantIds,
        sortOrder: sortOrder++
      });
    }

    // Add invoice bonus line item (matches Wave Apps "Consultant Bonus")
    // If cycle.invoiceBonus is unset, fall back to the Wave default.
    const invoiceBonus = cycle.invoiceBonus ?? ClientInvoiceService.DEFAULT_INVOICE_BONUS;
    lineItemsToCreate.push({
      serviceName: ClientInvoiceService.CONSULTANT_BONUS_SERVICE_NAME,
      description: ClientInvoiceService.CONSULTANT_BONUS_DESCRIPTION,
      quantity: 1,
      rate: invoiceBonus,
      amount: invoiceBonus,
      consultantIds: [],
      sortOrder: sortOrder++
    });

    // Calculate totals
    const subtotal = roundToCents(lineItemsToCreate.reduce((sum, item) => sum + item.amount, 0));
    const tax = 0; // No tax for now
    const total = roundToCents(subtotal + tax);
    const amountDue = total;

    // Create invoice and line items in transaction
    // Note: better-sqlite3 transactions are synchronous, so the callback must not be async
    const result = db.transaction((tx) => {
      // Get invoice number within transaction for atomicity
      const invoiceNumber = this.getNextInvoiceNumberInTransaction(tx);

      // Create invoice
      // Drizzle query builders are lazy in better-sqlite3; call .run() to execute and get lastInsertRowid.
      let invoiceId: number;
      try {
        const insertResult = tx
          .insert(clientInvoices)
          .values({
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
          })
          .run() as { lastInsertRowid: number | bigint };

        invoiceId = Number(insertResult.lastInsertRowid);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to insert client invoice: ${errorMsg}. Invoice number: ${invoiceNumber}, Cycle ID: ${cycle.id}`
        );
      }

      if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
        throw new Error(`Failed to insert client invoice: invalid lastInsertRowid (${invoiceId}). Invoice number: ${invoiceNumber}`);
      }

      // Create line items
      // Batch insert line items; also requires .run() to execute.
      tx.insert(invoiceLineItems)
        .values(
          lineItemsToCreate.map((itemData) => ({
            invoiceId,
            serviceName: itemData.serviceName,
            description: itemData.description,
            quantity: itemData.quantity,
            rate: itemData.rate,
            amount: itemData.amount,
            consultantIds: JSON.stringify(itemData.consultantIds),
            sortOrder: itemData.sortOrder
          }))
        )
        .run();

      return invoiceId;
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
    // Check if invoice exists first (will throw NotFoundError if not found)
    await this.getById(id);
    
    // Delete in transaction (line items must be deleted first due to foreign key constraint)
    // Note: better-sqlite3 transactions are synchronous, so the callback must not be async
    try {
      db.transaction((tx) => {
        // Delete line items first to avoid foreign key constraint violation
        tx.delete(invoiceLineItems).where(eq(invoiceLineItems.invoiceId, id)).run();
        // Delete invoice
        tx.delete(clientInvoices).where(eq(clientInvoices.id, id)).run();
      });
    } catch (error) {
      // Re-throw NotFoundError as-is, wrap other errors
      if (error instanceof NotFoundError) {
        throw error;
      }
      // Log database errors for debugging
      console.error('Error deleting client invoice:', error);
      
      // Check for SQLite foreign key constraint violations
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('FOREIGN KEY constraint') || errorMessage.includes('foreign key constraint')) {
        throw new ValidationError('Cannot delete invoice: it is still referenced by other records');
      }
      
      // Check for other SQLite constraint violations
      if (errorMessage.includes('constraint') || errorMessage.includes('SQLITE_CONSTRAINT')) {
        throw new ValidationError('Cannot delete invoice due to database constraint');
      }
      
      throw new Error(`Failed to delete invoice: ${errorMessage}`);
    }

    return { success: true };
  }

  /**
   * Sync the "Consultant Bonus" invoice line item from the associated cycle's invoiceBonus.
   * Intended for correcting existing invoices created before invoiceBonus was respected.
   */
  static async syncInvoiceBonusFromCycle(invoiceId: number) {
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.id, invoiceId),
      with: {
        cycle: true,
        lineItems: true
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (!invoice.cycle) {
      throw new ValidationError('Invoice has no associated cycle');
    }

    const targetBonus = invoice.cycle.invoiceBonus ?? ClientInvoiceService.DEFAULT_INVOICE_BONUS;
    const existingBonusItem = (invoice.lineItems || []).find(
      (item) => item.serviceName === ClientInvoiceService.CONSULTANT_BONUS_SERVICE_NAME
    );

    const tax = invoice.tax || 0;

    db.transaction((tx) => {
      // Upsert the bonus line item to match the cycle (or default if unset).
      if (existingBonusItem) {
        tx.update(invoiceLineItems)
          .set({
            description: ClientInvoiceService.CONSULTANT_BONUS_DESCRIPTION,
            quantity: 1,
            rate: targetBonus,
            amount: targetBonus,
            consultantIds: JSON.stringify([]),
            updatedAt: new Date()
          })
          .where(eq(invoiceLineItems.id, existingBonusItem.id))
          .run();
      } else {
        const maxSortOrder = (invoice.lineItems || []).reduce((max, item) => {
          const v = item.sortOrder ?? 0;
          return v > max ? v : max;
        }, 0);

        tx.insert(invoiceLineItems)
          .values({
            invoiceId: invoice.id,
            serviceName: ClientInvoiceService.CONSULTANT_BONUS_SERVICE_NAME,
            description: ClientInvoiceService.CONSULTANT_BONUS_DESCRIPTION,
            quantity: 1,
            rate: targetBonus,
            amount: targetBonus,
            consultantIds: JSON.stringify([]),
            sortOrder: maxSortOrder + 1
          })
          .run();
      }

      // Recalculate totals based on line items currently stored.
      const amounts = tx
        .select({ amount: invoiceLineItems.amount })
        .from(invoiceLineItems)
        .where(eq(invoiceLineItems.invoiceId, invoice.id))
        .all() as Array<{ amount: number | null }>;

      const subtotal = amounts.reduce((sum, row) => sum + (row.amount || 0), 0);
      const total = subtotal + tax;

      tx.update(clientInvoices)
        .set({
          subtotal,
          total,
          amountDue: total,
          updatedAt: new Date()
        })
        .where(eq(clientInvoices.id, invoice.id))
        .run();
    });

    return this.getById(invoiceId);
  }
}

