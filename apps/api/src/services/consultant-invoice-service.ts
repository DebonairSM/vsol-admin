import { eq, and, isNull, desc } from 'drizzle-orm';
import { db, invoices, payrollCycles, consultants } from '../db';
import { fileStorage } from '../lib/file-storage';
import { validateFileContent } from '../middleware/upload';
import { ValidationError, NotFoundError } from '../middleware/errors';
import { Express } from 'express';

export class ConsultantInvoiceService {
  /**
   * Upload invoice file for a consultant's cycle
   */
  static async uploadInvoice(
    consultantId: number,
    cycleId: number,
    userId: number,
    file: Express.Multer.File
  ) {
    // Validate cycle exists and is not archived
    const cycle = await db.query.payrollCycles.findFirst({
      where: eq(payrollCycles.id, cycleId)
    });

    if (!cycle) {
      throw new NotFoundError('Payroll cycle not found');
    }

    if (cycle.archivedAt) {
      throw new ValidationError('Cannot upload invoice for archived cycle');
    }

    // Validate consultant exists
    const consultant = await db.query.consultants.findFirst({
      where: eq(consultants.id, consultantId)
    });

    if (!consultant) {
      throw new NotFoundError('Consultant not found');
    }

    // Check if invoice already exists for this cycle and consultant
    const existingInvoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.cycleId, cycleId),
        eq(invoices.consultantId, consultantId)
      )
    });

    // If this is a new invoice (not an update), check if any invoice has already been uploaded for this cycle
    if (!existingInvoice) {
      const cycleInvoices = await db.query.invoices.findMany({
        where: eq(invoices.cycleId, cycleId)
      });

      const hasUploadedInvoice = cycleInvoices.some(invoice => invoice.filePath !== null);

      if (hasUploadedInvoice) {
        throw new ValidationError('An invoice has already been uploaded for this cycle. Cycles can only be used once for invoice uploads.');
      }
    }

    // Validate file content using magic bytes (prevent MIME spoofing)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    const validation = await validateFileContent(file.buffer, allowedMimeTypes);
    if (!validation.valid) {
      throw new ValidationError(validation.error || 'Invalid file type');
    }

    // Save file
    const saveResult = await fileStorage.saveInvoiceFile(consultantId, cycleId, file);
    if (!saveResult.success) {
      throw new ValidationError(saveResult.error || 'Failed to save file');
    }

    const now = new Date();

    if (existingInvoice) {
      // Update existing invoice (replacement is allowed)
      // Delete old file if exists
      if (existingInvoice.filePath) {
        await fileStorage.deleteFile(existingInvoice.filePath);
      }

      const [updatedInvoice] = await db.update(invoices)
        .set({
          filePath: saveResult.filePath || null,
          fileName: saveResult.fileName || null,
          uploadedBy: userId,
          uploadedAt: now
        })
        .where(eq(invoices.id, existingInvoice.id))
        .returning();

      return updatedInvoice;
    } else {
      // Create new invoice record
      const [newInvoice] = await db.insert(invoices)
        .values({
          cycleId,
          consultantId,
          filePath: saveResult.filePath || null,
          fileName: saveResult.fileName || null,
          uploadedBy: userId,
          uploadedAt: now
        })
        .returning();

      return newInvoice;
    }
  }

  /**
   * Get uploaded invoice for a consultant's cycle
   */
  static async getInvoice(consultantId: number, cycleId: number) {
    const invoice = await db.query.invoices.findFirst({
      where: and(
        eq(invoices.cycleId, cycleId),
        eq(invoices.consultantId, consultantId)
      ),
      with: {
        cycle: true,
        consultant: true
      }
    });

    return invoice;
  }

  /**
   * Get all cycles available for invoice upload (non-archived cycles without uploaded invoices)
   */
  static async getAvailableCycles() {
    const allCycles = await db.query.payrollCycles.findMany({
      where: isNull(payrollCycles.archivedAt),
      orderBy: (cycles, { desc }) => [desc(cycles.createdAt)],
      with: {
        invoices: true
      }
    });

    // Filter out cycles that already have at least one invoice with a filePath uploaded
    const availableCycles = allCycles.filter(cycle => {
      const hasUploadedInvoice = cycle.invoices?.some(invoice => invoice.filePath !== null);
      return !hasUploadedInvoice;
    });

    // Remove invoices from response to match original return format
    return availableCycles.map(({ invoices, ...cycle }) => cycle);
  }

  /**
   * Get all invoices for a consultant
   */
  static async getAllInvoices(consultantId: number) {
    if (!consultantId || isNaN(consultantId)) {
      throw new ValidationError('Invalid consultant ID');
    }

    try {
      const result = await db.query.invoices.findMany({
        where: eq(invoices.consultantId, consultantId),
        with: {
          cycle: true,
          consultant: true
        },
        orderBy: (invoiceTable, { desc }) => [
          // Primary sort by uploadedAt (nulls will be sorted last in SQLite)
          desc(invoiceTable.uploadedAt),
          // Secondary sort by id for consistent ordering when uploadedAt is null
          desc(invoiceTable.id)
        ]
      });

      return result;
    } catch (error) {
      console.error('Error fetching consultant invoices:', {
        consultantId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }

  /**
   * Get invoice file path for download
   */
  static async getInvoiceFilePath(consultantId: number, cycleId: number): Promise<string | null> {
    const invoice = await this.getInvoice(consultantId, cycleId);
    
    if (!invoice || !invoice.filePath) {
      return null;
    }

    const fileInfo = await fileStorage.getFileInfo(invoice.filePath);
    if (!fileInfo.exists) {
      return null;
    }

    return fileStorage.getFullPath(invoice.filePath);
  }
}

