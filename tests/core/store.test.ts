import { describe, it, expect } from 'vitest';
import {
  DATA_KEY, BROKEN_KEY, DEFAULT_SETTINGS, initialData, parseData, loadData, saveData,
  exportBackup, importBackup, sanitizeSettings, type KeyValueStore, type AppData,
} from '../../src/core/store';
import { newRecipe, type Recipe } from '../../src/core/recipe';

function fakeStore(init: Record<string, string> = {}): KeyValueStore & { m: Map<string, string> } {
  const m = new Map(Object.entries(init));
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}
const today = '2026-10-23';
const rec = (id: string, v: string) => newRecipe({ url: 'https://youtu.be/' + v, name: id, cat: '主菜' }, id, today)!;

describe('保存', () => {
  it('何もなければ最初の8品と既定の設定', () => {
    const d = loadData(fakeStore(), today);
    expect(d.version).toBe(2);
    expect(d.recipes).toHaveLength(8);
    expect(d.logs).toEqual([]);
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('保存して読み戻せる', () => {
    const st = fakeStore();
    const d: AppData = { version: 2, recipes: [rec('a', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'a' }], settings: { ...DEFAULT_SETTINGS, theme: 'dark' } };
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
    const raw = JSON.stringify({ version: 2, recipes: [rec('a', 'HzLAMA5ck_8'), { name: 'idなし' }, rec('b', 'm10e2igEArE')], logs: [], settings: {} });
    const d = parseData(raw)!;
    expect(d.recipes.map(r => r.id)).toEqual(['a', 'b']);
    expect(d.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('設定の検証', () => {
    expect(sanitizeSettings({ theme: 'dark', clipboardCheck: false, noAds: true, lastClipboardVideoId: 'u' })).toEqual({ cloth: 'yellow', myTags: [], theme: 'dark', clipboardCheck: false, noAds: true, lastClipboardVideoId: 'u' });
    expect(sanitizeSettings({ theme: '虹', clipboardCheck: 'no', noAds: 1, lastClipboardVideoId: 2 })).toEqual(DEFAULT_SETTINGS);
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
  it('新しい版のデータは読まない。版が数値でない・無いものは読める', () => {
    expect(parseData(JSON.stringify({ version: 3, recipes: [] }))).toBeNull();
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
  const base: AppData = { version: 2, recipes: [rec('a', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'a' }], settings: { ...DEFAULT_SETTINGS, theme: 'light' } };
  it('書き出して置き換えで読み込むと同じになる', () => {
    const d = initialData(today);
    expect(importBackup(d, exportBackup(base), 'replace')).toEqual(base);
  });
  it('足すときは同じ動画は飛ばし、記録は足す。設定は今のまま', () => {
    const cur: AppData = { version: 2, recipes: [rec('x', 'HzLAMA5ck_8'), rec('y', 'kd6n-8uQdWo')], logs: [{ date: '2026-10-01', recipeId: 'x' }], settings: DEFAULT_SETTINGS };
    const other: AppData = { ...base, recipes: [rec('a', 'HzLAMA5ck_8'), rec('b', 'm10e2igEArE')] };
    const got = importBackup(cur, exportBackup(other), 'merge')!;
    expect(got.recipes.map(r => r.id)).toEqual(['x', 'y', 'b']);
    expect(got.logs).toEqual([{ date: '2026-10-01', recipeId: 'x' }, { date: today, recipeId: 'x' }]);
    expect(got.settings).toEqual(DEFAULT_SETTINGS);
  });
  it('同じバックアップを2回足しても料理も記録も増えない', () => {
    const cur: AppData = { version: 2, recipes: [rec('x', 'kd6n-8uQdWo')], logs: [], settings: DEFAULT_SETTINGS };
    const once = importBackup(cur, exportBackup(base), 'merge')!;
    const twice = importBackup(once, exportBackup(base), 'merge')!;
    expect(once.recipes).toHaveLength(2);
    expect(once.logs).toEqual([{ date: today, recipeId: 'a' }]);
    expect(twice.recipes).toEqual(once.recipes);
    expect(twice.logs).toEqual(once.logs);
  });
  it('id が同じで動画が違う料理は <id>~2 で足し、記録も付け替える', () => {
    const cur: AppData = { version: 2, recipes: [rec('a', 'kd6n-8uQdWo')], logs: [], settings: DEFAULT_SETTINGS };
    const got = importBackup(cur, exportBackup(base), 'merge')!;
    expect(got.recipes.map(r => r.id)).toEqual(['a', 'a~2']);
    expect(got.recipes[1].videoId).toBe('HzLAMA5ck_8');
    expect(got.logs).toEqual([{ date: today, recipeId: 'a~2' }]);
    // ~2 も使われていれば ~3
    const cur2: AppData = { ...cur, recipes: [rec('a', 'kd6n-8uQdWo'), rec('a~2', 'm10e2igEArE')] };
    expect(importBackup(cur2, exportBackup(base), 'merge')!.recipes.map(r => r.id)).toEqual(['a', 'a~2', 'a~3']);
  });
  it('足しても current の recipes・logs は書き換わらない', () => {
    const cur: AppData = { version: 2, recipes: [rec('x', 'kd6n-8uQdWo')], logs: [{ date: '2026-10-01', recipeId: 'x' }], settings: DEFAULT_SETTINGS };
    const got = importBackup(cur, exportBackup(base), 'merge')!;
    expect(cur.recipes).toHaveLength(1);
    expect(cur.logs).toHaveLength(1);
    expect(got.recipes).not.toBe(cur.recipes);
    expect(got.logs).not.toBe(cur.logs);
  });
  it('取り込みの中に同じ動画が2件あれば先の1件だけ足す', () => {
    const cur: AppData = { version: 2, recipes: [], logs: [], settings: DEFAULT_SETTINGS };
    const other: AppData = { ...base, recipes: [rec('p', 'HzLAMA5ck_8'), rec('q', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'q' }] };
    const got = importBackup(cur, exportBackup(other), 'merge')!;
    expect(got.recipes.map(r => r.id)).toEqual(['p']);
    expect(got.logs).toEqual([{ date: today, recipeId: 'p' }]);
  });
  it('同じ日に同じ料理を今より多く作っていた分だけ足す', () => {
    const cur: AppData = { version: 2, recipes: [rec('a', 'HzLAMA5ck_8')], logs: [{ date: today, recipeId: 'a' }], settings: DEFAULT_SETTINGS };
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

describe('版2への読み替えとマイタグ', () => {
  it('版1のデータは版2になり、ご飯・麺は振り分けられる', () => {
    const old = { id: 'a', videoId: 'HzLAMA5ck_8', name: 'きつねうどん', cat: 'ご飯・麺' };
    const raw = JSON.stringify({ version: 2, recipes: [old, { ...old, id: 'b', videoId: 'm10e2igEArE', name: '親子丼' }], logs: [], settings: { theme: 'dark' } });
    const d = parseData(raw)!;
    expect(d.version).toBe(2);
    expect(d.settings.cloth).toBe('yellow');
    expect(d.settings.myTags).toEqual([]);
    expect(d.settings.theme).toBe('dark');
    expect(d.recipes.map(r => r.cat)).toEqual(['麺', 'ご飯']);
    expect(d.recipes.every(r => r.tags.length === 0)).toBe(true);
  });
  it('myTags に無いタグは料理から外す。myTags は整える', () => {
    const r = { id: 'a', videoId: 'HzLAMA5ck_8', name: 'n', tags: ['時短', '謎'] };
    const d = parseData(JSON.stringify({ version: 2, recipes: [r], settings: { myTags: [' 時短 ', '時短', '', 3, 'あ'.repeat(13)] } }))!;
    expect(d.settings.myTags).toEqual(['時短']);
    expect(d.recipes[0].tags).toEqual(['時短']);
  });
  it('myTags は20個まで', () => {
    const tags = Array.from({ length: 25 }, (_, i) => 't' + i);
    expect(parseData(JSON.stringify({ version: 2, settings: { myTags: tags } }))!.settings.myTags).toHaveLength(20);
  });
  it('ふきんの色の検証', () => {
    expect(sanitizeSettings({ cloth: 'blue' }).cloth).toBe('blue');
    expect(sanitizeSettings({ cloth: 'orange' }).cloth).toBe('yellow');
  });
  it('最初の8品のジャンル', () => {
    const rs = initialData(today).recipes;
    const cat = (v: string) => rs.find(r => r.videoId === v)!.cat;
    expect(cat('dbv6nPx4e3c')).toBe('麺');
    expect(cat('fsUZY-9V1TI')).toBe('ご飯');
    expect(cat('30kBepMXiVE')).toBe('パン');
  });
  const tagged = (id: string, v: string, tags: string[]): Recipe => ({ ...rec(id, v), tags });
  it('足すときマイタグが後ろに足される', () => {
    const cur: AppData = { version: 2, recipes: [rec('x', 'kd6n-8uQdWo')], logs: [], settings: { ...DEFAULT_SETTINGS, myTags: ['時短'] } };
    const other: AppData = { version: 2, recipes: [tagged('b', 'm10e2igEArE', ['辛い', '時短'])], logs: [], settings: { ...DEFAULT_SETTINGS, myTags: ['辛い', '時短'] } };
    const got = importBackup(cur, exportBackup(other), 'merge')!;
    expect(got.settings.myTags).toEqual(['時短', '辛い']);
    expect(got.recipes[1].tags).toEqual(['辛い', '時短']);
  });
  it('足すとき21個目のマイタグは捨てられ、足した料理からも外れる', () => {
    const mine = Array.from({ length: 20 }, (_, i) => 'm' + i);
    const cur: AppData = { version: 2, recipes: [], logs: [], settings: { ...DEFAULT_SETTINGS, myTags: mine } };
    const other: AppData = { version: 2, recipes: [tagged('b', 'm10e2igEArE', ['新', 'm0'])], logs: [], settings: { ...DEFAULT_SETTINGS, myTags: ['新', 'm0'] } };
    const got = importBackup(cur, exportBackup(other), 'merge')!;
    expect(got.settings.myTags).toEqual(mine);
    expect(got.recipes[0].tags).toEqual(['m0']);
  });
  it('置き換えはマイタグも取り込む', () => {
    const other: AppData = { version: 2, recipes: [], logs: [], settings: { ...DEFAULT_SETTINGS, myTags: ['a'] } };
    expect(importBackup(initialData(today), exportBackup(other), 'replace')!.settings.myTags).toEqual(['a']);
  });
});
