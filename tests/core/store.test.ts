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
    expect(sanitizeSettings({ theme: 'dark', clipboardCheck: false, noAds: true, lastClipboardVideoId: 'u' })).toEqual({ theme: 'dark', clipboardCheck: false, noAds: true, lastClipboardVideoId: 'u' });
    expect(sanitizeSettings({ theme: '虹', clipboardCheck: 'no', noAds: 1, lastClipboardVideoId: 2 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('新しい版のデータは読まない。版が数値でない・無いものは読める', () => {
    expect(parseData(JSON.stringify({ version: 2, recipes: [] }))).toBeNull();
    expect(parseData(JSON.stringify({ version: 'x' }))).not.toBeNull();
    expect(parseData('{}')).not.toBeNull();
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
    expect(got.logs).toEqual([{ date: '2026-10-01', recipeId: 'x' }, { date: today, recipeId: 'x' }]);
    expect(got.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('同じバックアップを2回足しても料理も記録も増えない', () => {
    const cur: AppData = { version: 1, recipes: [rec('x', 'kd6n-8uQdWo')], logs: [], settings: DEFAULT_SETTINGS };
    const once = importBackup(cur, exportBackup(base), 'merge')!;
    const twice = importBackup(once, exportBackup(base), 'merge')!;
    expect(once.recipes).toHaveLength(2);
    expect(once.logs).toEqual([{ date: today, recipeId: 'a' }]);
    expect(twice.recipes).toEqual(once.recipes);
    expect(twice.logs).toEqual(once.logs);
  });
  it('id が同じで動画が違う料理は <id>~2 で足し、記録も付け替える', () => {
    const cur: AppData = { version: 1, recipes: [rec('a', 'kd6n-8uQdWo')], logs: [], settings: DEFAULT_SETTINGS };
    const got = importBackup(cur, exportBackup(base), 'merge')!;
    expect(got.recipes.map(r => r.id)).toEqual(['a', 'a~2']);
    expect(got.recipes[1].videoId).toBe('HzLAMA5ck_8');
    expect(got.logs).toEqual([{ date: today, recipeId: 'a~2' }]);
    // ~2 も使われていれば ~3
    const cur2: AppData = { ...cur, recipes: [rec('a', 'kd6n-8uQdWo'), rec('a~2', 'm10e2igEArE')] };
    expect(importBackup(cur2, exportBackup(base), 'merge')!.recipes.map(r => r.id)).toEqual(['a', 'a~2', 'a~3']);
  });
  it('足しても current の recipes・logs は書き換わらない', () => {
    const cur: AppData = { version: 1, recipes: [rec('x', 'kd6n-8uQdWo')], logs: [{ date: '2026-10-01', recipeId: 'x' }], settings: DEFAULT_SETTINGS };
    const got = importBackup(cur, exportBackup(base), 'merge')!;
    expect(cur.recipes).toHaveLength(1);
    expect(cur.logs).toHaveLength(1);
    expect(got.recipes).not.toBe(cur.recipes);
    expect(got.logs).not.toBe(cur.logs);
  });
  it('取り込みの中に同じ動画が2件あれば先の1件だけ足す', () => {
    const cur: AppData = { version: 1, recipes: [], logs: [], settings: DEFAULT_SETTINGS };
    const other: AppData = { ...base, recipes: [rec('p', 'HzLAMA5ck_8'), rec('q', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'q' }] };
    const got = importBackup(cur, exportBackup(other), 'merge')!;
    expect(got.recipes.map(r => r.id)).toEqual(['p']);
    expect(got.logs).toEqual([{ date: today, recipeId: 'p' }]);
  });
  it('同じ日に同じ料理を今より多く作っていた分だけ足す', () => {
    const cur: AppData = { version: 1, recipes: [rec('a', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'a' }], settings: DEFAULT_SETTINGS };
    const two: AppData = { ...base, logs: [{ date: today, recipeId: 'a' }, { date: today, recipeId: 'a' }] };
    expect(importBackup(cur, exportBackup(two), 'merge')!.logs).toHaveLength(2);
  });
  it('広告を消すはバックアップで書き換わらない（置き換えでも足すでも）', () => {
    const withAds: AppData = { ...base, settings: { ...base.settings, noAds: true, theme: 'dark' } };
    const cur = initialData(today);
    const rep = importBackup(cur, exportBackup(withAds), 'replace')!;
    expect(rep.settings.noAds).toBe(false);
    expect(rep.settings.theme).toBe('dark');
    expect(importBackup(cur, exportBackup(withAds), 'merge')!.settings.noAds).toBe(false);
    const curPaid: AppData = { ...cur, settings: { ...cur.settings, noAds: true } };
    expect(importBackup(curPaid, exportBackup(base), 'replace')!.settings.noAds).toBe(true);
  });
  it('読めないものは null', () => {
    expect(importBackup(base, 'ぐちゃぐちゃ', 'replace')).toBeNull();
    expect(importBackup(base, '[]', 'merge')).toBeNull();
  });
});
