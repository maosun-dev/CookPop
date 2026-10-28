import { describe, it, expect } from 'vitest';
import { followTag } from '../../src/app/filters';

describe('followTag：選んでいたタグの追いかけ', () => {
  it('残っていればそのまま。選んでいなければ null のまま', () => {
    expect(followTag('A', ['A', 'B'], ['A', 'B', 'C'])).toBe('A');
    expect(followTag(null, ['A'], ['B'])).toBeNull();
  });
  it('違う名前がちょうど1つずつ・同じ位置のときだけ、名前の変更と見なす', () => {
    expect(followTag('A', ['A', 'B'], ['C', 'B'])).toBe('C');
    expect(followTag('B', ['A', 'B', 'C'], ['A', 'X', 'C'])).toBe('X');
  });
  it('消されたら「すべて」（null）に戻す。数が同じでも別のタグを選んだままにしない', () => {
    expect(followTag('A', ['A', 'B'], ['B'])).toBeNull();
    // A を消して D を足した（位置が違う）
    expect(followTag('A', ['A', 'B', 'C'], ['B', 'C', 'D'])).toBeNull();
    // 2つ以上が違う
    expect(followTag('A', ['A', 'B', 'C'], ['X', 'Y', 'C'])).toBeNull();
    // 古い一覧に無かったタグ
    expect(followTag('Z', ['A'], ['B'])).toBeNull();
  });
});
