// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { el, svg, clear } from '../../src/app/ui';

describe('el', () => {
  it('属性・イベント・子を付けて要素を作る', () => {
    let hit = 0;
    const b = el('button', { class: 'btn', type: 'button', disabled: true, onclick: () => { hit++; } }, 'おす', null, false);
    expect(b.tagName).toBe('BUTTON');
    expect(b.className).toBe('btn');
    expect(b.disabled).toBe(true);
    expect(b.textContent).toBe('おす');
    b.disabled = false; b.click();
    expect(hit).toBe(1);
  });
  it('false の属性は付かない。子に要素も渡せる', () => {
    const d = el('div', { hidden: false }, el('span', {}, 'a'), 'b');
    expect(d.hasAttribute('hidden')).toBe(false);
    expect(d.children).toHaveLength(1);
    expect(d.textContent).toBe('ab');
  });
  it('svg は SVG 要素を返し、clear は子を全部消す', () => {
    const s = svg('<svg viewBox="0 0 24 24"><circle r="4"/></svg>');
    expect(s.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(s.querySelector('circle')).not.toBeNull();
    const d = el('div', {}, 'x', 'y');
    clear(d);
    expect(d.childNodes).toHaveLength(0);
  });
});
