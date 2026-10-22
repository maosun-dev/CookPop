import { describe, it, expect } from 'vitest';
import { newId } from '../../src/app/ids';

describe('id', () => {
  it('16文字以上で、100回作ってもかぶらない', () => {
    const s = new Set<string>();
    for (let i = 0; i < 100; i++) s.add(newId());
    expect(s.size).toBe(100);
    for (const id of s) expect(id.length).toBeGreaterThanOrEqual(16);
  });
});
