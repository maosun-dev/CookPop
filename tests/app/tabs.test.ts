// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createTabs, type TabDef } from '../../src/app/tabs';
import { BACK_ICON, ICONS, STAR_ICON } from '../../src/app/icons';
import { el } from '../../src/app/ui';

const defs = (): TabDef[] => (['pick', 'book', 'log'] as const).map(id => ({ id, label: id, icon: ICONS[id], view: el('section', { class: 'screen' }, id) }));

describe('タブ', () => {
  it('3つ並び、最初は きめる。選ぶと表示が切り替わる', () => {
    const t = createTabs(defs());
    const tabs = t.el.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(3);
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
  it('アイコンは3つとも SVG で、絵文字を含まない', () => {
    for (const id of ['pick', 'book', 'log'] as const) {
      expect(ICONS[id].startsWith('<svg')).toBe(true);
      expect(/[\u{1F300}-\u{1FAFF}]/u.test(ICONS[id])).toBe(false);
    }
  });
  it('お鍋のアイコン pot は24×24の線だけの自作 SVG', () => {
    expect(ICONS.pot.startsWith('<svg')).toBe(true);
    expect(ICONS.pot).toContain('viewBox="0 0 24 24"');
    expect(ICONS.pot).toContain('stroke="currentColor"');
    expect(ICONS.pot).toContain('fill="none"');
    expect(/[\u{1F300}-\u{1FAFF}]/u.test(ICONS.pot)).toBe(false);
  });
  it('星と戻るの矢印も自作の SVG で、絵文字や文字の記号を含まない', () => {
    for (const icon of [STAR_ICON, BACK_ICON]) {
      expect(icon.startsWith('<svg')).toBe(true);
      expect(/[\u{1F300}-\u{1FAFF}★☆←]/u.test(icon)).toBe(false);
    }
    expect(STAR_ICON).toContain('fill="currentColor"');
    expect(STAR_ICON).toContain('viewBox="0 0 20 20"');
    expect(BACK_ICON).toContain('viewBox="0 0 24 24"');
    expect(BACK_ICON).toContain('stroke="currentColor"');
    expect(BACK_ICON).toContain('stroke-width="2"');
  });
  it('きめるの「？」の点は茶碗のふちから離れ、しおりは本の右の縁から離れている', () => {
    const dot = ICONS.pick.match(/M12 ([\d.]+)v\.01/);
    const rim = ICONS.pick.match(/M3\.5 ([\d.]+)h17/);
    expect(dot).not.toBeNull();
    expect(rim).not.toBeNull();
    // 線の太さ(2)の半分ずつを引いても、1以上あく
    expect(Number(rim![1]) - 1 - (Number(dot![1]) + 1)).toBeGreaterThanOrEqual(1);
    const ribbon = ICONS.book.match(/M([\d.]+) 3\.5v7l2-1\.6 2 1\.6v-7/);
    expect(ribbon).not.toBeNull();
    // しおりの右端(+4) と 本の右縁(19) のあいだに、線の太さを除いて1以上あく
    expect(19 - 1 - (Number(ribbon![1]) + 4 + 1)).toBeGreaterThanOrEqual(1);
  });
});
