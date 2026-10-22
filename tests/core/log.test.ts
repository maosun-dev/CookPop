import { describe, it, expect } from 'vitest';
import { addLog, countOf, lastMade, logsOn, monthCount, daysMadeIn, sortByOften, sortByStale, sanitizeLogs, type CookLog } from '../../src/core/log';
import { newRecipe, type Recipe } from '../../src/core/recipe';

const rec = (id: string): Recipe => newRecipe({ url: 'https://youtu.be/HzLAMA5ck_8', name: id, cat: '主菜' }, id, '2026-10-01')!;
const logs: CookLog[] = [
  { date: '2026-10-01', recipeId: 'a' },
  { date: '2026-10-05', recipeId: 'b' },
  { date: '2026-10-05', recipeId: 'a' },
  { date: '2026-09-30', recipeId: 'a' },
  { date: '2026-10-20', recipeId: 'deleted' },
];

describe('作った記録', () => {
  it('足すと新しい配列が返り、元は変わらない', () => {
    const next = addLog(logs, 'c', '2026-10-23');
    expect(next).toHaveLength(6);
    expect(next[5]).toEqual({ date: '2026-10-23', recipeId: 'c' });
    expect(logs).toHaveLength(5);
  });
  it('回数と最後に作った日', () => {
    expect(countOf(logs, 'a')).toBe(3);
    expect(countOf(logs, 'nai')).toBe(0);
    expect(lastMade(logs, 'a')).toBe('2026-10-05');
    expect(lastMade(logs, 'nai')).toBeNull();
  });
  it('日と月で集める（削除した料理の記録が混ざっていても落ちない）', () => {
    expect(logsOn(logs, '2026-10-05').map(l => l.recipeId)).toEqual(['b', 'a']);
    expect(monthCount(logs, '2026-10')).toBe(4);
    expect(daysMadeIn(logs, '2026-10')).toEqual(['2026-10-01', '2026-10-05', '2026-10-20']);
    expect(daysMadeIn(logs, '2026-08')).toEqual([]);
  });
  it('よく作る順・しばらく作ってない順', () => {
    const rs = [rec('x'), rec('b'), rec('a')];
    expect(sortByOften(rs, logs).map(r => r.id)).toEqual(['a', 'b', 'x']);
    expect(sortByStale(rs, logs).map(r => r.id)).toEqual(['x', 'b', 'a']);
    expect(rs.map(r => r.id)).toEqual(['x', 'b', 'a']);
  });
  it('しばらく作ってない順は、最後の日が古いほうが先', () => {
    const rs = [rec('a'), rec('b')];
    const l: CookLog[] = [{ date: '2026-10-10', recipeId: 'a' }, { date: '2026-10-02', recipeId: 'b' }];
    expect(sortByStale(rs, l).map(r => r.id)).toEqual(['b', 'a']);
  });
  it('保存から読むときの検証', () => {
    expect(sanitizeLogs(undefined)).toEqual([]);
    expect(sanitizeLogs([{ date: '2026-10-01', recipeId: 'a' }, { date: '昨日', recipeId: 'a' }, { date: '2026-10-01' }, 'x'])).toEqual([{ date: '2026-10-01', recipeId: 'a' }]);
  });
});
