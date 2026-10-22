// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createMascot } from '../../src/app/mascot/pon';

describe('ポンの絵', () => {
  it('本物の絵：目の6種類・帽子・おなか・羽がある', () => {
    const m = createMascot();
    const svg = m.el.querySelector('svg.pon')!;
    expect(svg).not.toBeNull();
    for (const c of ['e-open', 'e-spiral', 'e-smile', 'e-sad', 'e-sleepy', 'e-star']) expect(svg.querySelector('.eyes > .' + c)).not.toBeNull();
    expect(svg.querySelectorAll('.hat')).toHaveLength(2);
    expect(svg.querySelector('.belly')).not.toBeNull();
    expect(svg.querySelectorAll('.wing')).toHaveLength(2);
    expect(svg.querySelector('.zzz')).not.toBeNull();
  });
  it('表情とおなかは data 属性で切り替わる', () => {
    const m = createMascot();
    m.setMood('sleepy'); expect(m.el.dataset.mood).toBe('sleepy');
    m.setBelly(3); expect(m.el.dataset.belly).toBe('3');
  });
  it('CSS：線の色は固定、動きは reduced-motion で止まる、表情ごとの目の規則がある', () => {
    const css = readFileSync('src/app/mascot/pon.css', 'utf8');
    expect(css).toContain('--pon-ink: #4A2E1C');
    expect(css).toMatch(/prefers-reduced-motion: reduce[^}]*\{[^}]*animation: none/);
    for (const mood of ['thinking', 'decided', 'happy', 'full', 'sad', 'sleepy']) expect(css).toContain(`[data-mood="${mood}"]`);
    expect(css).toContain('[data-belly="3"]');
  });
});
