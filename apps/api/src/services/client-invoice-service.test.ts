import { afterEach, describe, expect, it, vi } from 'vitest';

import { db } from '../db';
import { ClientInvoiceService } from './client-invoice-service';
import { ValidationError } from '../middleware/errors';

describe('ClientInvoiceService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('delete', () => {
    it('executes deletes inside the transaction (calls .run() for both line items and invoice)', async () => {
      const id = 123;

      vi.spyOn(ClientInvoiceService, 'getById').mockResolvedValue({ id } as any);

      const runMock = vi.fn();
      const whereMock = vi.fn().mockReturnValue({ run: runMock });
      const tx = {
        delete: vi.fn().mockReturnValue({ where: whereMock }),
      };

      vi.spyOn(db as any, 'transaction').mockImplementation((cb: any) => cb(tx as any));

      await expect(ClientInvoiceService.delete(id)).resolves.toEqual({ success: true });

      expect(tx.delete).toHaveBeenCalledTimes(2);
      expect(whereMock).toHaveBeenCalledTimes(2);
      expect(runMock).toHaveBeenCalledTimes(2);
    });
  });

  describe('createFromCycle', () => {
    it('throws when a consultant is missing clientInvoiceUnitPrice', async () => {
      vi.spyOn(ClientInvoiceService, 'getByCycleId').mockResolvedValue(null as any);
      vi.spyOn(db.query.clients, 'findFirst').mockResolvedValue({ id: 1 } as any);
      vi.spyOn(db.query.payrollCycles, 'findFirst').mockResolvedValue({
        id: 10,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        invoiceBonus: null,
        lines: [
          {
            consultant: {
              id: 1,
              name: 'Alice',
              clientInvoiceServiceName: 'Senior Software Developer I',
              clientInvoiceUnitPrice: null,
              clientInvoiceServiceDescription: 'Senior Software Developer monthly service fee'
            }
          }
        ]
      } as any);

      await expect(ClientInvoiceService.createFromCycle(10)).rejects.toBeInstanceOf(ValidationError);
    });

    it('groups consultants into invoice line items by (serviceName + unitPrice + description) and computes totals', async () => {
      vi.spyOn(ClientInvoiceService, 'getByCycleId').mockResolvedValue(null as any);
      vi.spyOn(ClientInvoiceService, 'getById').mockResolvedValue({ id: 999 } as any);

      vi.spyOn(db.query.clients, 'findFirst').mockResolvedValue({ id: 1, paymentTerms: null } as any);
      vi.spyOn(db.query.payrollCycles, 'findFirst').mockResolvedValue({
        id: 10,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        invoiceBonus: null,
        lines: [
          {
            consultant: {
              id: 1,
              name: 'Fabiano Louback',
              clientInvoiceServiceName: 'Senior Software Developer I',
              clientInvoiceUnitPrice: 5410.77,
              clientInvoiceServiceDescription: 'Senior Software Developer monthly service fee'
            }
          },
          {
            consultant: {
              id: 2,
              name: 'Lucas Martins',
              clientInvoiceServiceName: 'Senior Software Developer I',
              clientInvoiceUnitPrice: 5410.77,
              clientInvoiceServiceDescription: 'Senior Software Developer monthly service fee'
            }
          },
          {
            consultant: {
              id: 3,
              name: 'Tiago',
              clientInvoiceServiceName: 'Senior Software Developer I',
              clientInvoiceUnitPrice: 5410.77,
              clientInvoiceServiceDescription: '5+ years of ASP.NET or 6+ years in other desired technologies'
            }
          }
        ]
      } as any);

      const insertedInvoiceValues: any[] = [];
      const insertedLineItemsValues: any[] = [];

      // Avoid dealing with invoice sequence internals in this unit test.
      vi.spyOn(ClientInvoiceService as any, 'getNextInvoiceNumberInTransaction').mockReturnValue(999);

      vi.spyOn(db as any, 'transaction').mockImplementation((cb: any) => {
        const tx = {
          insert: (table: any) => ({
            values: (values: any) => ({
              run: () => {
                if (Array.isArray(values)) {
                  insertedLineItemsValues.push(...values);
                } else {
                  insertedInvoiceValues.push(values);
                }
                return { lastInsertRowid: 999 };
              }
            })
          })
        };

        return cb(tx as any);
      });

      await expect(ClientInvoiceService.createFromCycle(10)).resolves.toEqual({ id: 999 });

      expect(insertedInvoiceValues).toHaveLength(1);
      expect(insertedInvoiceValues[0].subtotal).toBeCloseTo(16984.27, 2);
      expect(insertedInvoiceValues[0].total).toBeCloseTo(16984.27, 2);
      expect(insertedInvoiceValues[0].amountDue).toBeCloseTo(16984.27, 2);

      // 2 grouped items + default bonus
      expect(insertedLineItemsValues).toHaveLength(3);

      const grouped = insertedLineItemsValues.filter((v) => v.serviceName === 'Senior Software Developer I');
      expect(grouped).toHaveLength(2);

      const qtys = grouped.map((v) => v.quantity).sort((a, b) => a - b);
      expect(qtys).toEqual([1, 2]);

      // Ensure rate is unit price (not consultant payout amount)
      grouped.forEach((v) => expect(v.rate).toBeCloseTo(5410.77, 2));
    });
  });
});


