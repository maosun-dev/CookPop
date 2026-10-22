// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createTabs, type TabDef } from '../../src/app/tabs';
import { ICONS } from '../../src/app/icons';
import { el } from '../../src/app/ui';

const defs = (): TabDef[] => (['pick', 'book', 'log', 'settings'] as const).map(id => ({ id, label: id, icon: ICONS[id], view: el('section', { class: 'screen' }, id) }));

describe('タブ', () => {
  it('4つ並び、最初は きめる。選ぶと表示が切り替わる', () => {
    const t = createTabs(defs());
    const tabs = t.el.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(4);
    expect(t.current()).toBe('pick');
    expect(t.el.querySelectorAll('.screen[data-active="true"]')).toHaveLength(1);
    let seen = '';
    t.onChange(id => { seen = id; });
    (tabs[2] as HTMLElement).click();
    expect(t.current()).toBe('log');
    expect(seen).toBe('log');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    const active = t.el.querySelector('.screen[data-active="true"]')!;
    expect(active.textContent).toBe('log');
  });
  it('アイコンは4つとも SVG で、絵文字を含まない', () => {
    for (const id of ['pick', 'book', 'log', 'settings'] as const) {
      expect(ICONS[id].startsWith('<svg')).toBe(true);
      expect(/[\u{1F300}-\u{1FAFF}]/u.test(ICONS[id])).toBe(false);
    }
  });
});
