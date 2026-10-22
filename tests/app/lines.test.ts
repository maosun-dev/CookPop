import { describe, it, expect } from 'vitest';
import { greeting, bellyLevel, fewRecipesLine } from '../../src/app/mascot/lines';

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
