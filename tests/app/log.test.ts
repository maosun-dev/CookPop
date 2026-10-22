// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createMascot } from '../../src/app/mascot/pon';
import { createLogScreen } from '../../src/app/screens/log';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };

describe('きろく', () => {
  it('作った日に印が付き、タップでその日の料理。今月の回数とおなか', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const shown: string[] = [];
    const scr = createLogScreen(state, { mascot: createMascot(), now: () => new Date(2026, 9, 23), showRecipe: id => { shown.push(id); } });
    document.body.append(scr.el);
    const id = state.data.recipes[0].id;
    state.markCooked(id);
    expect(scr.el.textContent).toContain('2026年10月');
    const made = scr.el.querySelectorAll('.day[data-made="true"]');
    expect(made).toHaveLength(1);
    expect(scr.el.textContent).toContain('今月は 1回');
    (made[0] as HTMLElement).click();
    expect(scr.el.textContent).toContain('10月23日');
    const item = [...scr.el.querySelectorAll('.daylist button')][0] as HTMLElement;
    expect(item.textContent).toContain('よだれ水餃子');
    item.click();
    expect(shown).toEqual([id]);
    expect(scr.el.querySelector('.mascot')!.getAttribute('data-belly')).toBe('1');
  });
  it('月を動かせる。並び替えの一覧', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createLogScreen(state, { mascot: createMascot(), now: () => new Date(2026, 9, 23), showRecipe: () => {} });
    document.body.append(scr.el);
    ([...scr.el.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '前の月') as HTMLElement).click();
    expect(scr.el.textContent).toContain('2026年9月');
    state.markCooked(state.data.recipes[2].id);
    const stale = [...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'しばらく作ってない順') as HTMLElement;
    stale.click();
    const names = [...scr.el.querySelectorAll('.ranking li')].map(li => li.textContent ?? '');
    expect(names[names.length - 1]).toContain('豚プルコギ');
  });
});
