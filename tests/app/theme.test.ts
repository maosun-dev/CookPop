// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
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

  it('style.css に --on-accent があり、差し色のボタンの文字に使われている（暗い見た目でも読める）', () => {
    const css = readFileSync('src/app/style.css', 'utf-8');
    // 明るい見た目と、暗い見た目の2か所（計3か所）で定義されている
    expect(css.match(/--on-accent:\s*#4A2E1C/g)).toHaveLength(3);
    for (const cls of ['.btn-yolk', '.btn-leaf', '.btn-apricot']) {
      const block = css.match(new RegExp(cls.replace('.', String.raw`\.`) + String.raw`\s*\{[^}]*\}`))![0];
      expect(block).toContain('color: var(--on-accent)');
    }
  });
});
