import { describe, it, expect } from 'vitest';
import { addMonthsToYearMonth, formatMonthLabel, getYearMonthFromDate, parseMonthLabel } from '@vsol-admin/shared';

describe('month-label utils (@vsol-admin/shared)', () => {
  it('parses "Month YYYY" into {year, month}', () => {
    expect(parseMonthLabel('January 2025')).toEqual({ year: 2025, month: 1 });
    expect(parseMonthLabel('December 2025')).toEqual({ year: 2025, month: 12 });
  });

  it('returns null for invalid labels', () => {
    expect(parseMonthLabel('2025-12')).toBeNull();
    expect(parseMonthLabel('Dec 2025')).toBeNull();
    expect(parseMonthLabel('')).toBeNull();
  });

  it('formats {year, month} into "Month YYYY"', () => {
    expect(formatMonthLabel(2025, 1)).toBe('January 2025');
    expect(formatMonthLabel(2025, 12)).toBe('December 2025');
  });

  it('adds months with year rollover', () => {
    expect(addMonthsToYearMonth(2025, 12, 1)).toEqual({ year: 2026, month: 1 });
    expect(addMonthsToYearMonth(2025, 1, -1)).toEqual({ year: 2024, month: 12 });
    expect(addMonthsToYearMonth(2025, 10, 2)).toEqual({ year: 2025, month: 12 });
  });

  it('extracts year/month from Date using local time', () => {
    const d = new Date(2025, 11, 15, 12, 0, 0); // Dec 15, 2025 (local)
    expect(getYearMonthFromDate(d)).toEqual({ year: 2025, month: 12 });
  });
});

