import { describe, it, expect } from 'vitest';
import {
  DATA_KEY, BROKEN_KEY, DEFAULT_SETTINGS, initialData, parseData, loadData, saveData,
  exportBackup, importBackup, sanitizeSettings, type KeyValueStore, type AppData,
} from '../../src/core/store';
import { newRecipe } from '../../src/core/recipe';

function fakeStore(init: Record<string, string> = {}): KeyValueStore & { m: Map<string, string> } {
  const m = new Map(Object.entries(init));
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}
const today = '2026-10-23';
const rec = (id: string, v: string) => newRecipe({ url: 'https://youtu.be/' + v, name: id, cat: '主菜' }, id, today)!;

describe('保存', () => {
  it('何もなければ最初の8品と既定の設定', () => {
    const d = loadData(fakeStore(), today);
    expect(d.version).toBe(1);
    expect(d.recipes).toHaveLength(8);
    expect(d.logs).toEqual([]);
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('保存して読み戻せる', () => {
    const st = fakeStore();
    const d: AppData = { version: 1, recipes: [rec('a', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'a' }], settings: { ...DEFAULT_SETTINGS, theme: 'dark' } };
    saveData(st, d);
    expect(st.m.has(DATA_KEY)).toBe(true);
    expect(loadData(st, today)).toEqual(d);
  });
  it('壊れた JSON は退避して最初の状態に戻る', () => {
    const st = fakeStore({ [DATA_KEY]: '{壊れ' });
    const d = loadData(st, today);
    expect(d.recipes).toHaveLength(8);
    expect(st.m.get(BROKEN_KEY)).toBe('{壊れ');
  });
  it('1件だけ壊れた料理は捨て、ほかは読める', () => {
    const raw = JSON.stringify({ version: 1, recipes: [rec('a', 'HzLAMA5ck_8'), { name: 'idなし' }, rec('b', 'm10e2igEArE')], logs: [], settings: {} });
    const d = parseData(raw)!;
    expect(d.recipes.map(r => r.id)).toEqual(['a', 'b']);
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('設定の検証', () => {
    expect(sanitizeSettings({ theme: 'dark', clipboardCheck: false, noAds: true, lastClipboardUrl: 'u' })).toEqual({ theme: 'dark', clipboardCheck: false, noAds: true, lastClipboardUrl: 'u' });
    expect(sanitizeSettings({ theme: '虹', clipboardCheck: 'no', noAds: 1, lastClipboardUrl: 2 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('配列や文字列は読めない', () => {
    expect(parseData('[]')).toBeNull();
    expect(parseData('"x"')).toBeNull();
    expect(parseData('null')).toBeNull();
  });
});

describe('バックアップ', () => {
  const base: AppData = { version: 1, recipes: [rec('a', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'a' }], settings: { ...DEFAULT_SETTINGS, theme: 'light' } };
  it('書き出して置き換えで読み込むと同じになる', () => {
    const d = initialData(today);
    expect(importBackup(d, exportBackup(base), 'replace')).toEqual(base);
  });
  it('足すときは同じ動画は飛ばし、記録は足す。設定は今のまま', () => {
    const cur: AppData = { version: 1, recipes: [rec('x', 'HzLAMA5ck_8'), rec('y', 'kd6n-8uQdWo')], logs: [{ date: '2026-10-01', recipeId: 'x' }], settings: DEFAULT_SETTINGS };
    const other: AppData = { ...base, recipes: [rec('a', 'HzLAMA5ck_8'), rec('b', 'm10e2igEArE')] };
    const got = importBackup(cur, exportBackup(other), 'merge')!;
    expect(got.recipes.map(r => r.id)).toEqual(['x', 'y', 'b']);
    expect(got.logs).toEqual([{ date: '2026-10-01', recipeId: 'x' }, { date: today, recipeId: 'a' }]);
    expect(got.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('読めないものは null', () => {
    expect(importBackup(base, 'ぐちゃぐちゃ', 'replace')).toBeNull();
    expect(importBackup(base, '[]', 'merge')).toBeNull();
  });
});
