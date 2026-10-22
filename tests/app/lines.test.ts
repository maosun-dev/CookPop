import { describe, it, expect } from 'vitest';
import { greeting, bellyLevel, fewRecipesLine, isFirstVisit, welcomeLine, moodForHour } from '../../src/app/mascot/lines';
import { initialData } from '../../src/core/store';

describe('ポンのセリフ', () => {
  it('時間帯で挨拶が変わる', () => {
    expect(greeting(7)).toContain('おはよう');
    expect(greeting(12)).toContain('お昼');
    expect(greeting(19)).toContain('晩ごはん');
    expect(greeting(23)).toContain('遅い');
    expect(greeting(3)).toContain('遅い');
  });
  it('おなかの段階', () => {
    expect([0, 1, 4, 5, 9, 10, 30].map(bellyLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it('登録が少ないときだけ一言', () => {
    expect(fewRecipesLine(3)).toContain('3品');
    expect(fewRecipesLine(5)).toBeNull();
  });
});

describe('はじめましてと眠い時間', () => {
  it('記録なし・最初の8品のままなら初めて', () => {
    const d = initialData('2026-10-23');
    expect(isFirstVisit(d)).toBe(true);
    expect(isFirstVisit({ ...d, logs: [{ date: '2026-10-23', recipeId: d.recipes[0].id }] })).toBe(false);
    expect(isFirstVisit({ ...d, recipes: [...d.recipes, { ...d.recipes[0], id: 'u1', videoId: 'ZZZZZZZZZZZ' }] })).toBe(false);
    expect(welcomeLine()).toContain('はじめまして');
  });
  it('23〜4時は眠い', () => {
    expect([22, 23, 0, 4, 5].map(moodForHour)).toEqual(['normal', 'sleepy', 'sleepy', 'sleepy', 'normal']);
  });
});
