import { describe, it, expect } from 'vitest';
import { CREAM, iconSvg, splashSvg } from '../../tools/icon/icon.mjs';
import { renderRgbPng } from '../../tools/icon/make-assets.mjs';

describe('アイコン', () => {
  it('SVG はクリームの地にポンがいて、透明の指定がない', () => {
    const s = iconSvg();
    expect(CREAM).toBe('#FFF6E5');
    expect(s).toContain('class="pon"');
    // 地の <rect> が全面を覆い、クリームで塗られている
    const ground = s.match(/<rect [^>]*>/)![0];
    expect(ground).toContain('width="1024"');
    expect(ground).toContain('height="1024"');
    expect(ground).toContain('fill="#FFF6E5"');
    expect(s).not.toContain('opacity="0"');
    // 案C：卵黄の体・白い帽子・点の目。体に輪郭線は無い
    expect(s).toContain('fill="#FFD95E"');
    expect(s).toContain('stroke="#E2CFAF"');
    expect(s).not.toContain('#4A2E1C');
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
