import { describe, it, expect } from 'vitest';
import { calendarCells, shiftMonth, monthLabel } from '../../src/app/calendar';

describe('カレンダー', () => {
  it('2026年10月は木曜始まりで、42マス', () => {
    const c = calendarCells('2026-10');
    expect(c).toHaveLength(42);
    expect(c.slice(0, 5).map(x => x.date)).toEqual([null, null, null, null, '2026-10-01']);
    expect(c[4 + 30].date).toBe('2026-10-31');
    expect(c[35].date).toBeNull();
  });
  it('月の前後と表示', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthLabel('2026-10')).toBe('2026年10月');
  });
});
