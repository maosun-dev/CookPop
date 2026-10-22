import { describe, it, expect } from 'vitest';
import { iconSvg, splashSvg } from '../../tools/icon/icon.mjs';
import { renderRgbPng } from '../../tools/icon/make-assets.mjs';

describe('アイコン', () => {
  it('SVG はクリームの地にポンがいて、透明の指定がない', () => {
    const s = iconSvg();
    expect(s).toContain('#FFF6E5');
    expect(s).toContain('class="pon"');
    expect(s).not.toMatch(/fill="none"\s*\/>\s*$/);
    expect(splashSvg()).toContain('width="2732"');
  });
  it('PNG は RGB（色の種類 2）で、大きさが合う', () => {
    const png = renderRgbPng(iconSvg(), 64);
    expect(png.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(png.readUInt32BE(16)).toBe(64);
    expect(png.readUInt32BE(20)).toBe(64);
    expect(png[25]).toBe(2);
  });
});
