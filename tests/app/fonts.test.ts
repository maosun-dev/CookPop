import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('文字', () => {
  it('日本語のサブセットだけを読み込む', () => {
    const main = readFileSync('src/app/main.ts', 'utf8');
    for (const w of ['500', '700', '900']) expect(main).toContain(`@fontsource/zen-maru-gothic/japanese-${w}.css`);
    expect(main).not.toMatch(/zen-maru-gothic\/(500|700|900)\.css/);
  });
});
