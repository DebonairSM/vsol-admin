import PDFDocument from 'pdfkit';
import { db, clientInvoices } from '../db';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import { NotFoundError, ValidationError } from '../middleware/errors';

export class PDFService {
  /**
   * Gets the VSol logo as a Buffer for embedding in PDFs
   * Returns null if logo file is not found
   */
  private static async getLogoBuffer(): Promise<Buffer | null> {
    const candidateLogoPaths = [
      // Running from apps/api (dev with tsx watch)
      path.join(process.cwd(), 'src', 'assets', 'vsol-logo-email.png'),
      // Running from repo root
      path.join(process.cwd(), 'apps', 'api', 'src', 'assets', 'vsol-logo-email.png'),
      // Fallback to the web/public original (monorepo dev convenience)
      path.join(process.cwd(), 'apps', 'web', 'public', 'vsol-logo-25-c.png'),
      // Another common cwd case (apps/api) to reach apps/web
      path.join(process.cwd(), '..', 'web', 'public', 'vsol-logo-25-c.png')
    ];

    for (const candidatePath of candidateLogoPaths) {
      try {
        const logoBuffer = await fs.readFile(candidatePath);
        return logoBuffer;
      } catch {
        // Keep trying other paths
      }
    }

    return null;
  }

  /**
   * Formats a date to a readable string
   */
  private static formatDate(date: Date | string | number): string {
    if (date instanceof Date) {
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (typeof date === 'number') {
      return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return String(date);
  }

  /**
   * Formats a number as USD currency
   */
  private static formatCurrency(value: number | null | undefined): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value || 0);
  }

  /**
   * Formats client address into a multi-line string
   */
  private static formatClientAddress(client: any): string[] {
    const addressLines: string[] = [];
    
    if (client.name) {
      addressLines.push(client.name);
    }
    if (client.legalName && client.legalName !== client.name) {
      addressLines.push(client.legalName);
    }
    
    const streetAddress: string[] = [];
    if (client.address) streetAddress.push(client.address);
    if (client.city || client.state || client.zip) {
      const cityStateZip = [client.city, client.state, client.zip].filter(Boolean).join(', ');
      if (cityStateZip) streetAddress.push(cityStateZip);
    }
    if (client.country && client.country !== 'USA' && client.country !== 'US') {
      streetAddress.push(client.country);
    }
    
    if (streetAddress.length > 0) {
      addressLines.push(...streetAddress);
    }
    
    if (client.contactName) {
      addressLines.push(`Attn: ${client.contactName}`);
    }
    
    return addressLines;
  }

  /**
   * Generates a PDF invoice for a client invoice
   * Returns the PDF as a Buffer
   * @throws {NotFoundError} if invoice is not found
   * @throws {ValidationError} if invoice data is invalid
   */
  static async generateInvoicePDF(clientInvoiceId: number): Promise<Buffer> {
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.id, clientInvoiceId),
      with: {
        client: true,
        cycle: true,
        lineItems: true
      }
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    if (!invoice.client) {
      throw new ValidationError('Invoice client information is missing');
    }

    // Sort line items by sortOrder, then by id
    const sortedLineItems = (invoice.lineItems || []).sort((a, b) => {
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return (a.id ?? 0) - (b.id ?? 0);
    });

    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({ 
          margin: 50, 
          size: 'LETTER',
          info: {
            Title: `Invoice #${invoice.invoiceNumber}`,
            Author: 'VSol Software',
            Subject: `Invoice ${invoice.invoiceNumber} - ${invoice.cycle?.monthLabel || ''}`,
            Creator: 'VSol Admin System'
          }
        });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Constants for layout
        const pageWidth = 612; // Letter size width in points
        const pageHeight = 792; // Letter size height in points
        const margin = 50;
        const contentWidth = pageWidth - (margin * 2);
        const leftColumnWidth = 280; // Left column for company info
        const rightColumnX = pageWidth - margin - 200; // Right column for invoice details
        const headerHeight = 120; // Reserved height for header section

        // Header section - two column layout
        let leftY = margin;
        let rightY = margin;
        
        // Try to add logo (await before starting document generation)
        const logoBuffer = await PDFService.getLogoBuffer();
        
        // Left column: Logo in top left corner
        if (logoBuffer) {
          try {
            const logoWidth = 120;
            const logoHeight = 40;
            // Position logo in top left corner
            const logoX = margin;
            doc.image(logoBuffer, logoX, leftY, { 
              width: logoWidth,
              height: logoHeight,
              fit: [logoWidth, logoHeight]
            });
            // Move company info below logo
            leftY += logoHeight + 10;
          } catch (error) {
            // If logo fails to load, continue without it
            console.warn('Failed to load logo in PDF:', error);
          }
        }
        
        // Left column: Company info (no "VSol Software" text)

        // Company contact info (compact)
        doc.fontSize(8).font('Helvetica').fillColor('#666666');
        doc.text('Phone: (407) 409-0874', margin, leftY);
        leftY += 10;
        doc.text('Email: admin@vsol.software', margin, leftY);
        leftY += 10;
        doc.text('Website: www.vsol.software', margin, leftY);
        doc.fillColor('#000000');

        // Right column: Invoice details
        doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000');
        doc.text(`Invoice #${invoice.invoiceNumber}`, rightColumnX, rightY, { width: 200, align: 'right' });
        rightY += 24;
        
        doc.fontSize(9).font('Helvetica').fillColor('#333333');
        
        const invoiceDateText = PDFService.formatDate(invoice.invoiceDate);
        doc.text(`Invoice Date: ${invoiceDateText}`, rightColumnX, rightY, { width: 200, align: 'right' });
        rightY += 14;
        
        const dueDateText = PDFService.formatDate(invoice.dueDate);
        doc.text(`Due Date: ${dueDateText}`, rightColumnX, rightY, { width: 200, align: 'right' });
        doc.fillColor('#000000');

        // Calculate where to start the main content (after header)
        const headerBottom = Math.max(leftY, rightY) + 25;
        let currentY = headerBottom;
        
        // Subtle divider line after header
        doc.moveTo(margin, currentY - 10).lineTo(pageWidth - margin, currentY - 10).stroke('#e5e5e5');
        currentY -= 5;
        
        // Calculate estimated content height to determine if we need to shrink
        const estimatedLineItemsHeight = sortedLineItems.length * 25; // Rough estimate per item
        const estimatedTotalContent = estimatedLineItemsHeight + 200; // Header, Bill To, totals, etc.
        const availablePageSpace = pageHeight - margin - currentY - 50; // Leave 50pt buffer
        
        // Global scale factor for tight spaces
        let globalScale = 1.0;
        if (estimatedTotalContent > availablePageSpace && availablePageSpace > 0) {
          globalScale = Math.min(1.0, availablePageSpace / estimatedTotalContent);
          // Only apply significant scaling if really tight (less than 0.9)
          if (globalScale < 0.9) {
            globalScale = Math.max(0.85, globalScale); // Don't go below 85%
          } else {
            globalScale = 1.0; // Don't scale if we have reasonable space
          }
        }

        // Bill To section - apply scale if needed
        const billToFontSize = globalScale < 0.9 ? 10 : 11;
        const billToSpacing = globalScale < 0.9 ? 11 : 12;
        doc.fontSize(billToFontSize).font('Helvetica-Bold').fillColor('#1a1a1a');
        doc.text('Bill To:', margin, currentY);
        currentY += (globalScale < 0.9 ? 16 : 18);
        
        const addressFontSize = globalScale < 0.9 ? 8.5 : 9;
        doc.fontSize(addressFontSize).font('Helvetica').fillColor('#333333');
        const addressLines = PDFService.formatClientAddress(invoice.client);
        addressLines.forEach(line => {
          doc.text(line, margin, currentY);
          currentY += billToSpacing;
        });
        doc.fillColor('#000000');

        // Add contact email if available
        if (invoice.client.contactEmail) {
          currentY += 2;
          doc.text(invoice.client.contactEmail, margin, currentY);
          currentY += 11;
        }

        // Add contact phone if available
        if (invoice.client.contactPhone) {
          doc.text(invoice.client.contactPhone, margin, currentY);
          currentY += 11;
        }

        // Line items table
        currentY += 20;
        const tableStartY = currentY;
        
        // Table header with subtle background - apply scale if needed
        const tableHeaderFontSize = globalScale < 0.9 ? 8.5 : 9;
        const tableHeaderHeight = globalScale < 0.9 ? 16 : 18;
        const headerY = currentY;
        doc.rect(margin, headerY - 3, contentWidth, tableHeaderHeight).fill('#f8f9fa');
        
        doc.fontSize(tableHeaderFontSize).font('Helvetica-Bold').fillColor('#1a1a1a');
        const headerTextY = headerY + (globalScale < 0.9 ? 3 : 4);
        doc.text('Service', margin + 4, headerTextY, { width: 250 });
        doc.text('Qty', margin + 260, headerTextY, { width: 50, align: 'right' });
        doc.text('Rate', margin + 320, headerTextY, { width: 80, align: 'right' });
        doc.text('Amount', margin + 410, headerTextY, { width: 100, align: 'right' });

        // Draw line under header
        const headerLineY = headerY + (globalScale < 0.9 ? 13 : 15);
        doc.moveTo(margin, headerLineY).lineTo(pageWidth - margin, headerLineY).stroke('#d1d5db');
        currentY = headerY + (globalScale < 0.9 ? 20 : 22);

        // Line items
        doc.font('Helvetica');
        const lineItems = sortedLineItems;
        
        // Calculate space needed for totals section
        const totalsSpaceNeeded = 80; // Space needed for totals section
        
        if (lineItems.length === 0) {
          doc.fontSize(9).fillColor('#666666');
          doc.text('No line items', margin, currentY);
          doc.fillColor('#000000');
          currentY += 18;
        } else {
          lineItems.forEach((item, index) => {
            // Check if we need a new page (leave room for totals)
            const spaceNeeded = 50; // Estimated space for one line item
            if (currentY + spaceNeeded > pageHeight - margin - totalsSpaceNeeded) {
              doc.addPage();
              currentY = margin + 20;
              
              // Redraw header on new page
              doc.rect(margin, currentY - 3, contentWidth, 18).fill('#f8f9fa');
              doc.fontSize(9).font('Helvetica-Bold').fillColor('#1a1a1a');
              doc.text('Service', margin + 4, currentY + 4, { width: 250 });
              doc.text('Qty', margin + 260, currentY + 4, { width: 50, align: 'right' });
              doc.text('Rate', margin + 320, currentY + 4, { width: 80, align: 'right' });
              doc.text('Amount', margin + 410, currentY + 4, { width: 100, align: 'right' });
              doc.moveTo(margin, currentY + 15).lineTo(pageWidth - margin, currentY + 15).stroke('#d1d5db');
              currentY += 22;
              doc.font('Helvetica');
            }

            const qty = item.quantity ?? 0;
            const rate = item.rate ?? 0;
            const amount = item.amount ?? 0;
            const itemStartY = currentY;

            // Service name (with wrapping for long names) - apply scale if needed
            const itemFontSize = globalScale < 0.9 ? 8.5 : 9;
            const descFontSize = globalScale < 0.9 ? 6.5 : 7;
            doc.fontSize(itemFontSize).font('Helvetica-Bold');
            const serviceNameHeight = doc.heightOfString(item.serviceName || 'Service', { width: 250 });
            doc.text(item.serviceName || 'Service', margin, currentY, { width: 250 });
            
            // Description (if available)
            if (item.description) {
              doc.fontSize(descFontSize).font('Helvetica').fillColor('#555555');
              const descY = currentY + serviceNameHeight + 2;
              const descHeight = doc.heightOfString(item.description, { width: 250 });
              doc.text(item.description, margin, descY, { width: 250 });
              doc.fillColor('#000000');
              currentY = Math.max(currentY + serviceNameHeight, descY + descHeight);
            } else {
              currentY += serviceNameHeight;
            }

            // Ensure minimum row height (scaled)
            const minRowHeight = globalScale < 0.9 ? 16 : 18;
            if (currentY - itemStartY < minRowHeight) {
              currentY = itemStartY + minRowHeight;
            }

            // Quantity, Rate, Amount (aligned to top of row)
            doc.fontSize(itemFontSize).font('Helvetica').fillColor('#333333');
            doc.text(String(qty), margin + 260, itemStartY, { width: 50, align: 'right' });
            doc.text(PDFService.formatCurrency(rate), margin + 320, itemStartY, { width: 80, align: 'right' });
            doc.font('Helvetica-Bold').fillColor('#1a1a1a');
            doc.text(PDFService.formatCurrency(amount), margin + 410, itemStartY, { width: 100, align: 'right' });
            doc.font('Helvetica').fillColor('#000000');

            // Draw subtle line under item
            doc.moveTo(margin, currentY + 2).lineTo(pageWidth - margin, currentY + 2).stroke('#f0f0f0');
            currentY += (globalScale < 0.9 ? 6 : 7);
          });
        }

        // Totals section - align with table columns and position lower
        // Table columns: Service (margin), Qty (margin+260), Rate (margin+320), Amount (margin+410)
        // We'll align totals to the right side, matching the Amount column
        
        // Calculate available space and determine if we need to shrink
        const availableSpace = pageHeight - margin - currentY;
        const baseTotalsHeight = 50; // Base space needed for totals (Subtotal, Tax, Total only)
        const spaceBeforeTotals = globalScale < 0.9 ? 20 : 30;
        
        // Auto-shrink if we're running out of space
        let totalsHeight = baseTotalsHeight;
        let fontSize = globalScale < 0.9 ? 8.5 : 9;
        let totalsSpacing = globalScale < 0.9 ? 10 : 12;
        let totalFontSize = globalScale < 0.9 ? 10 : 11;
        
        if (availableSpace < baseTotalsHeight + spaceBeforeTotals + 30) {
          // Calculate how much we need to shrink
          const neededSpace = baseTotalsHeight + spaceBeforeTotals + 20;
          const scaleFactor = Math.min(1.0, (availableSpace - 20) / neededSpace);
          
          if (scaleFactor < 0.8) {
            // Significant shrinking needed
            fontSize = 8;
            totalsSpacing = 9;
            totalsHeight = 42;
            totalFontSize = 9;
          } else if (scaleFactor < 0.9) {
            // Moderate shrinking
            fontSize = 8.5;
            totalsSpacing = 10;
            totalsHeight = 46;
            totalFontSize = 10;
          }
        }
        
        // Position totals lower on the page if there's space
        let totalsStartY = currentY + spaceBeforeTotals;
        
        // If we're too close to bottom, ensure we have room
        if (totalsStartY + totalsHeight > pageHeight - margin - 20) {
          // If we can't fit on current page, move to next
          if (currentY + spaceBeforeTotals + totalsHeight > pageHeight - margin) {
            doc.addPage();
            totalsStartY = margin + 40; // Start lower on new page
            // Reset scale on new page
            fontSize = 9;
            totalsSpacing = 12;
            totalsHeight = baseTotalsHeight;
            totalFontSize = 11;
          } else {
            // We can fit, just position it optimally
            totalsStartY = pageHeight - margin - totalsHeight - 20;
          }
        }
        
        // Align totals with table columns
        // Labels start at Rate column position, values at Amount column
        const totalsLabelX = margin + 320; // Align with Rate column start
        const totalsValueX = margin + 410; // Align with Amount column (same as table)
        const totalsValueWidth = 100; // Same width as Amount column
        
        // Draw line above totals (from Rate column to end) - slightly thicker
        doc.moveTo(totalsLabelX, totalsStartY - 5).lineTo(pageWidth - margin, totalsStartY - 5).lineWidth(1.5).stroke('#d1d5db');
        doc.lineWidth(1); // Reset line width

        doc.fontSize(fontSize).font('Helvetica').fillColor('#333333');
        doc.text('Subtotal:', totalsLabelX, totalsStartY + 2, { width: 90, align: 'right' });
        doc.text(PDFService.formatCurrency(invoice.subtotal), totalsValueX, totalsStartY + 2, { width: totalsValueWidth, align: 'right' });

        doc.text('Tax:', totalsLabelX, totalsStartY + 2 + totalsSpacing, { width: 90, align: 'right' });
        doc.text(PDFService.formatCurrency(invoice.tax), totalsValueX, totalsStartY + 2 + totalsSpacing, { width: totalsValueWidth, align: 'right' });

        // Divider before total
        const dividerY = totalsStartY + 2 + (totalsSpacing * 2);
        doc.moveTo(totalsLabelX, dividerY).lineTo(pageWidth - margin, dividerY).stroke('#e5e5e5');

        doc.fontSize(totalFontSize).font('Helvetica-Bold').fillColor('#2563eb');
        doc.text('Total:', totalsLabelX, dividerY + 4, { width: 90, align: 'right' });
        doc.text(PDFService.formatCurrency(invoice.total), totalsValueX, dividerY + 4, { width: totalsValueWidth, align: 'right' });
        doc.fillColor('#000000');
        
        // Update currentY to after totals
        currentY = totalsStartY + totalsHeight;

        // Notes section (if any) - only if there's space
        if (invoice.notes) {
          let notesY = totalsStartY + 65;
          if (notesY + 40 > pageHeight - margin) {
            // Only add new page if notes are substantial
            const notesHeight = doc.heightOfString(invoice.notes, { width: contentWidth });
            if (notesHeight > 30) {
              doc.addPage();
              notesY = margin + 20;
            }
          }
          
          if (notesY < pageHeight - margin - 40) {
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Notes:', margin, notesY);
            notesY += 12;
            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text(invoice.notes, margin, notesY, { width: contentWidth });
            doc.fillColor('#000000');
          }
        }

        // Payment terms (if any) - only if there's space
        if (invoice.paymentTerms) {
          let termsY = totalsStartY + (invoice.notes ? 85 : 65);
          if (termsY + 40 > pageHeight - margin) {
            const termsHeight = doc.heightOfString(invoice.paymentTerms, { width: contentWidth });
            if (termsHeight > 30) {
              doc.addPage();
              termsY = margin + 20;
            }
          }
          
          if (termsY < pageHeight - margin - 40) {
            doc.fontSize(9).font('Helvetica-Bold');
            doc.text('Payment Terms:', margin, termsY);
            termsY += 12;
            doc.fontSize(8).font('Helvetica').fillColor('#555555');
            doc.text(invoice.paymentTerms, margin, termsY, { width: contentWidth });
            doc.fillColor('#000000');
          }
        }

        // Footer - only if there's space on current page
        const footerY = pageHeight - margin - 20;
        if (currentY < footerY - 15) {
          // Subtle divider before footer
          doc.moveTo(margin, footerY - 8).lineTo(pageWidth - margin, footerY - 8).stroke('#e5e5e5');
          doc.fontSize(8).font('Helvetica').fillColor('#888888');
          doc.text('Visual Solutions Software Consultants LLC', margin, footerY - 12, { align: 'center', width: contentWidth });
          doc.text('Thank you for your business!', margin, footerY, { align: 'center', width: contentWidth });
          doc.fillColor('#000000');
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generates a PDF invoice and saves it to disk
   * Returns the file path
   * @throws {NotFoundError} if invoice is not found
   * @throws {ValidationError} if invoice data is invalid
   */
  static async generateAndSaveInvoicePDF(clientInvoiceId: number, outputDir?: string): Promise<string> {
    const pdfBuffer = await this.generateInvoicePDF(clientInvoiceId);
    
    const invoice = await db.query.clientInvoices.findFirst({
      where: eq(clientInvoices.id, clientInvoiceId),
    });

    if (!invoice) {
      throw new NotFoundError('Invoice not found');
    }

    // Determine output directory
    const baseDir = outputDir || path.join(process.cwd(), 'uploads', 'invoices');
    await fs.mkdir(baseDir, { recursive: true });

    // Generate filename
    const fileName = `invoice-${invoice.invoiceNumber}.pdf`;
    const filePath = path.join(baseDir, fileName);

    // Save PDF
    await fs.writeFile(filePath, pdfBuffer);

    return filePath;
  }
}
