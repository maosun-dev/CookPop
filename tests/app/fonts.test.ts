import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { stripWoff } from '../../src/app/fonts';

describe('文字', () => {
  it('日本語のサブセットだけを読み込む', () => {
    const main = readFileSync('src/app/main.ts', 'utf8');
    for (const w of ['500', '700', '900']) expect(main).toContain(`@fontsource/zen-maru-gothic/japanese-${w}.css`);
    expect(main).not.toMatch(/zen-maru-gothic\/(500|700|900)\.css/);
  });
});

describe('stripWoff', () => {
  it('woff の項だけを外す', () => {
    expect(stripWoff('src:url(a.woff2) format("woff2"),url(a.woff) format("woff")')).toBe(
      'src:url(a.woff2) format("woff2")',
    );
  });

  it('組み立て後の形（引用符なし・空白あり）にも効く', () => {
    const out = stripWoff(
      "src: url(./x-0-400-normal.woff2) format('woff2'), url(./x-0-400-normal.woff) format('woff');",
    );
    expect(out).toBe("src: url(./x-0-400-normal.woff2) format('woff2');");
  });

  it('woff2 だけの CSS は変わらない', () => {
    const css = 'src: url(a.woff2) format("woff2");';
    expect(stripWoff(css)).toBe(css);
  });

  it('実際の文字 CSS から woff の読み込みが消える', () => {
    const css = readFileSync('node_modules/@fontsource/zen-maru-gothic/japanese-700.css', 'utf8');
    const out = stripWoff(css);
    expect(out).toContain('.woff2)');
    expect(out).not.toMatch(/\.woff\)|\.woff"|\.woff'/);
  });
});
