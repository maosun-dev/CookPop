import { describe, it, expect } from 'vitest';
import { weightOf, pickOne, pickMany, filterRecipes } from '../../src/core/picker';
import { newRecipe, type Recipe } from '../../src/core/recipe';
import type { CookLog } from '../../src/core/log';

const rec = (id: string): Recipe => newRecipe({ url: 'https://youtu.be/HzLAMA5ck_8', name: id, cat: '主菜' }, id, '2026-10-01')!;
const today = '2026-10-23';
const logs: CookLog[] = [
  { date: '2026-10-23', recipeId: 'kyou' },
  { date: '2026-10-22', recipeId: 'kinou' },
  { date: '2026-10-18', recipeId: 'konshu' },
  { date: '2026-10-16', recipeId: 'nanoka' },
  { date: '2026-10-15', recipeId: 'mukashi' },
];
// 0 を返す乱数は「重みが正の最初の候補」、0.999 は「最後の候補」を選ぶ
const first = () => 0;
const last = () => 0.999;

describe('重み', () => {
  it('今日・昨日は 0、7日以内は 0.5、それより前と未作は 1', () => {
    expect(weightOf(rec('kyou'), logs, today)).toBe(0);
    expect(weightOf(rec('kinou'), logs, today)).toBe(0);
    expect(weightOf(rec('konshu'), logs, today)).toBe(0.5);
    expect(weightOf(rec('nanoka'), logs, today)).toBe(0.5);
    expect(weightOf(rec('mukashi'), logs, today)).toBe(1);
    expect(weightOf(rec('mada'), logs, today)).toBe(1);
  });
});

describe('1つ選ぶ', () => {
  it('重み 0 のものは選ばれない', () => {
    const recipes = [rec('kyou'), rec('kinou'), rec('mada')];
    expect(pickOne({ recipes, logs, today, rng: first })?.id).toBe('mada');
    expect(pickOne({ recipes, logs, today, rng: last })?.id).toBe('mada');
  });
  it('重みの合計が 0 なら制限をゆるめて必ず何か出す', () => {
    const recipes = [rec('kyou'), rec('kinou')];
    expect(pickOne({ recipes, logs, today, rng: first })?.id).toBe('kyou');
    expect(pickOne({ recipes, logs, today, rng: last })?.id).toBe('kinou');
  });
  it('乱数で重み通りに分かれる（1 と 0.5 なら 2/3 の境）', () => {
    const recipes = [rec('mada'), rec('konshu')];
    expect(pickOne({ recipes, logs, today, rng: () => 0.6 })?.id).toBe('mada');
    expect(pickOne({ recipes, logs, today, rng: () => 0.7 })?.id).toBe('konshu');
  });
  it('除外したものは出ない。除外で候補が無くなるなら除外を無視', () => {
    const recipes = [rec('a'), rec('b')];
    expect(pickOne({ recipes, logs: [], today, rng: first, exclude: ['a'] })?.id).toBe('b');
    expect(pickOne({ recipes: [rec('a')], logs: [], today, rng: first, exclude: ['a'] })?.id).toBe('a');
  });
  it('候補が空なら null', () => {
    expect(pickOne({ recipes: [], logs, today, rng: first })).toBeNull();
  });
});

describe('3つ選ぶ', () => {
  it('重複なしで3つ', () => {
    const recipes = [rec('a'), rec('b'), rec('c'), rec('d')];
    const got = pickMany({ recipes, logs: [], today, rng: first }, 3).map(r => r.id);
    expect(got).toEqual(['a', 'b', 'c']);
  });
  it('候補が足りなければある分だけ', () => {
    expect(pickMany({ recipes: [rec('a'), rec('b')], logs: [], today, rng: first }, 3).map(r => r.id)).toEqual(['a', 'b']);
    expect(pickMany({ recipes: [], logs: [], today, rng: first }, 3)).toEqual([]);
  });
  it('元から exclude があればそれも避ける', () => {
    expect(pickMany({ recipes: [rec('a'), rec('b'), rec('c')], logs: [], today, rng: first, exclude: ['a'] }, 3).map(r => r.id)).toEqual(['b', 'c']);
  });
});

describe('絞り込み', () => {
  const a = { ...rec('a'), cat: '主菜' as const, tags: ['時短'], fav: true };
  const b = { ...rec('b'), cat: '主菜' as const, tags: [], fav: false };
  const c = { ...rec('c'), cat: '麺' as const, tags: ['時短'], fav: true };
  const ids = (f: Parameters<typeof filterRecipes>[1]) => filterRecipes([a, b, c], f).map(r => r.id);
  it('指定なしは全部', () => expect(ids({ cat: null, tag: null, favOnly: false })).toEqual(['a', 'b', 'c']));
  it('全部「かつ」', () => {
    expect(ids({ cat: '主菜', tag: null, favOnly: false })).toEqual(['a', 'b']);
    expect(ids({ cat: null, tag: '時短', favOnly: false })).toEqual(['a', 'c']);
    expect(ids({ cat: '主菜', tag: '時短', favOnly: true })).toEqual(['a']);
    expect(ids({ cat: '麺', tag: null, favOnly: true })).toEqual(['c']);
  });
});
