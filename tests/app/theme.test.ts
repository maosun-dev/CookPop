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
  it('style.css：画面全体は動かず、画面の中だけスクロールし、長押しで文字が選べない（入力欄は除く）', () => {
    const css = readFileSync('src/app/style.css', 'utf-8');
    const body = css.match(/(?:^|\n)body\s*\{[^}]*\}/)![0];
    expect(body).toContain('user-select: none');
    expect(body).toContain('-webkit-touch-callout: none');
    expect(body).toContain('position: fixed');
    const input = css.match(/input,\s*textarea\s*\{[^}]*\}/)![0];
    expect(input).toContain('user-select: text');
    const active = css.match(/\.screen\[data-active="true"\]\s*\{[^}]*\}/)![0];
    expect(active).toContain('overflow-y: auto');
    expect(active).toContain('position: absolute');
    expect(css).toMatch(/\.app\s*\{[^}]*position: fixed/);
  });
});
