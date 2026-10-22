import { describe, it, expect } from 'vitest';
import { toDateStr, daysBetween, monthOf } from '../../src/core/date';

describe('日付', () => {
  it('ローカル時刻の YYYY-MM-DD にする（1桁の月日は 0 を付ける）', () => {
    expect(toDateStr(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateStr(new Date(2026, 9, 23, 0, 1))).toBe('2026-10-23');
  });
  it('日数の差（to − from）', () => {
    expect(daysBetween('2026-10-20', '2026-10-23')).toBe(3);
    expect(daysBetween('2026-10-23', '2026-10-23')).toBe(0);
    expect(daysBetween('2026-10-23', '2026-10-20')).toBe(-3);
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1);
  });
  it('月を取り出す', () => {
    expect(monthOf('2026-10-23')).toBe('2026-10');
  });
});
