// 下のタブ。3つの画面を切り替える。
import { el, svg } from './ui';

export type TabId = 'pick' | 'book' | 'log';

export interface TabDef {
  id: TabId;
  label: string;
  /** SVG の文字列 */
  icon: string;
  view: HTMLElement;
}

export interface Tabs {
  el: HTMLElement;
  select(id: TabId): void;
  current(): TabId;
  /** 切り替わるたびに呼ばれる。何個でも登録できる */
  onChange(fn: (id: TabId) => void): void;
}

export function createTabs(tabs: TabDef[], initial: TabId = tabs[0].id): Tabs {
  const listeners: Array<(id: TabId) => void> = [];
  let cur: TabId = initial;

  const buttons = new Map<TabId, HTMLElement>();
  const bar = el('nav', { class: 'tabbar', role: 'tablist' });
  for (const t of tabs) {
    t.view.id = `view-${t.id}`;
    t.view.setAttribute('role', 'tabpanel');
    const btn = el(
      'button',
      { class: 'tab', type: 'button', role: 'tab', id: `tab-${t.id}`, 'aria-controls': t.view.id, 'aria-selected': 'false', onclick: () => select(t.id) },
      el('span', { class: 'tab-ico' }, svg(t.icon)),
      t.label,
    );
    buttons.set(t.id, btn);
    bar.append(btn);
  }

  const root = el('div', { class: 'app' }, ...tabs.map(t => t.view), bar);

  function paint(): void {
    for (const t of tabs) {
      const on = t.id === cur;
      t.view.setAttribute('data-active', on ? 'true' : 'false');
      buttons.get(t.id)!.setAttribute('aria-selected', on ? 'true' : 'false');
    }
  }

  function select(id: TabId): void {
    if (id === cur) return;
    cur = id;
    paint();
    for (const fn of [...listeners]) fn(id);
  }

  paint();
  return {
    el: root,
    select,
    current: () => cur,
    onChange(fn) { listeners.push(fn); },
  };
}
