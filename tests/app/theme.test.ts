// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { applyTheme } from '../../src/app/theme';

describe('テーマ', () => {
  it('auto は属性なし、light/dark は data-theme', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('auto');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
