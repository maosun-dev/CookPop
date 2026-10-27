// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMascot } from '../../src/app/mascot/pon';

describe('ポンの絵', () => {
  it('本物の絵：目の6種類・帽子・おなか・羽・考え中の吹き出しがある', () => {
    const m = createMascot();
    const svg = m.el.querySelector('svg.pon')!;
    expect(svg).not.toBeNull();
    for (const c of ['e-open', 'e-up', 'e-smile', 'e-sad', 'e-sleepy', 'e-star']) expect(svg.querySelector('.eyes > .' + c)).not.toBeNull();
    for (const c of ['think', 'chin', 'drop', 'zzz', 'belly', 'hat']) expect(svg.querySelector('.' + c)).not.toBeNull();
    expect(svg.querySelectorAll('.wing')).toHaveLength(2);
  });
  it('線なし：体・おなか・羽・足に stroke が無い（線は帽子・吹き出し・眉・目の線だけ）', () => {
    const svg = createMascot().el.querySelector('svg.pon')!;
    const withStroke = (sel: string): number => svg.querySelectorAll(sel).length && [...svg.querySelectorAll(sel)].filter((n) => n.hasAttribute('stroke') || n.querySelector('[stroke]')).length;
    for (const sel of ['.body', '.body-shade', '.belly', '.wing', '.foot', '.beak', '.cheek']) expect(withStroke(sel), sel).toBe(0);
    for (const n of svg.querySelectorAll('[stroke]')) {
      expect(n.closest('.hat, .think, .zzz, .e-smile, .e-sad, .e-sleepy'), n.outerHTML).not.toBeNull();
    }
  });
  it('表情とおなかは data 属性で切り替わる', () => {
    const m = createMascot();
    m.setMood('sleepy'); expect(m.el.dataset.mood).toBe('sleepy');
    m.setBelly(3); expect(m.el.dataset.belly).toBe('3');
  });
  it('CSS：動きは reduced-motion で止まる、表情ごとの目の規則がある', () => {
    const css = readFileSync('src/app/mascot/pon.css', 'utf8');
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]*\{[^}]*animation: none/);
    for (const mood of ['thinking', 'decided', 'happy', 'full', 'sad', 'sleepy']) expect(css).toContain(`[data-mood="${mood}"]`);
    expect(css).toContain('[data-belly="3"]');
    expect(css.match(/\[data-mood="[a-z]+"\]/g)!.length).toBeGreaterThanOrEqual(7);
    // 揺れの軸は割合で決める（絵の大きさが変わってもおなかの下に残る）
    expect(css).toContain('transform-origin: 50% 92%');
  });
});
