import { describe, expect, it } from 'vitest';
import { getCurrentRange, getCompareRange, filterByDateRange } from '../Market';

const localDateString = (value) => {
  const d = new Date(value);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

describe('Market date range helpers', () => {
  it('builds a valid custom range when start and end dates are provided', () => {
    const range = getCurrentRange({
      selectedDate: '',
      timePeriod: 'custom',
      customStartDate: '2026-04-01',
      customEndDate: '2026-04-10'
    });

    expect(range).not.toBeNull();
    expect(localDateString(range.start)).toBe('2026-04-01');
    expect(localDateString(range.end)).toBe('2026-04-10');
  });

  it('returns null for invalid custom range where start is after end', () => {
    const range = getCurrentRange({
      selectedDate: '',
      timePeriod: 'custom',
      customStartDate: '2026-04-15',
      customEndDate: '2026-04-10'
    });

    expect(range).toBeNull();
  });

  it('filters compare dataset to immediately preceding window', () => {
    const currentRange = getCurrentRange({
      selectedDate: '',
      timePeriod: 'custom',
      customStartDate: '2026-04-11',
      customEndDate: '2026-04-20'
    });

    const compareRange = getCompareRange({ comparePeriod: '7days', currentRange });
    const dataset = [
      { date: '2026-04-01T08:00:00.000Z', price: 10 },
      { date: '2026-04-08T08:00:00.000Z', price: 12 },
      { date: '2026-04-10T08:00:00.000Z', price: 14 },
      { date: '2026-04-12T08:00:00.000Z', price: 18 }
    ];

    const filtered = filterByDateRange(dataset, compareRange);
    expect(filtered).toHaveLength(2);
    expect(filtered.map((item) => item.price)).toEqual([12, 14]);
  });
});
