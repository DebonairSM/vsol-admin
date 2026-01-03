import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CycleService } from './cycle-service';
import { WorkHoursService } from './work-hours-service';

describe('CycleService.calculatePayment (month label semantics)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the cycle monthLabel month/year for work-hours lookup (no month shift)', async () => {
    const cycleId = 123;

    vi.spyOn(CycleService as any, 'getById').mockResolvedValue({
      id: cycleId,
      monthLabel: 'December 2025',
      globalWorkHours: 160,
      omnigoBonus: 0,
      equipmentsUSD: 0,
      pagamentoPIX: 0,
      pagamentoInter: 0,
      payoneerBalanceApplied: 0,
      lines: [
        {
          id: 1,
          consultantId: 10,
          ratePerHour: 50,
          adjustmentValue: null,
          bonusAdvance: null,
          consultant: { id: 10, name: 'Test Consultant', payoneerID: 'P1', hourlyRate: 50 }
        }
      ]
    });

    vi.spyOn(CycleService as any, 'getSummary').mockResolvedValue({
      cycle: { id: cycleId, monthLabel: 'December 2025' },
      totalHourlyValue: 50,
      usdTotal: 0,
      lineCount: 1,
      anomalies: []
    });

    vi.spyOn(CycleService as any, 'update').mockResolvedValue({ id: cycleId });

    const getByYearMonthSpy = vi
      .spyOn(WorkHoursService, 'getByYearMonth')
      .mockResolvedValue({ workHours: 184 } as any);

    const result = await CycleService.calculatePayment(cycleId, false);

    expect(getByYearMonthSpy).toHaveBeenCalledWith(2025, 12);
    expect(result.paymentMonthLabel).toBe('December 2025');
    expect(result.paymentMonthWorkHours).toBe(184);
  });
});

