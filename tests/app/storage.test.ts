// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { safeStore } from '../../src/app/storage';

describe('safeStore', () => {
  it('localStorage に書いて読める', () => {
    const st = safeStore();
    st.setItem('cookpop.test', '1');
    expect(st.getItem('cookpop.test')).toBe('1');
    expect(localStorage.getItem('cookpop.test')).toBe('1');
    localStorage.removeItem('cookpop.test');
  });
  it('setItem が投げても止まらない', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('満杯'); };
    try {
      const st = safeStore();
      expect(() => st.setItem('x', '1')).not.toThrow();
    } finally { Storage.prototype.setItem = orig; }
  });
});
