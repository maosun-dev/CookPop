// きろく：今月のおなか、月ごとのカレンダー、よく作る順／しばらく作ってない順の一覧。
import { el, clear, svg } from '../ui';
import { PON_FACE } from '../thumb';
import { calendarCells, monthLabel, shiftMonth } from '../calendar';
import { mdLabel } from '../format';
import { createMascot, type Mascot } from '../mascot/pon';
import { bellyLevel } from '../mascot/lines';
import type { AppState } from '../state';
import { monthOf, toDateStr } from '../../core/date';
import { countOf, daysMadeIn, lastMade, logsOn, monthCount, sortByOften, sortByStale } from '../../core/log';

export interface LogDeps {
  /** きめる画面で使っている共有のポン。ここでは使わない（別の1体を作る） */
  mascot: Mascot;
  now: () => Date;
  /** 料理を献立帳で開く */
  showRecipe: (id: string) => void;
}

type Order = 'often' | 'stale';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function createLogScreen(state: AppState, deps: LogDeps): { el: HTMLElement } {
  const pon = createMascot(); // 画面の上の小さなポン
  let month = monthOf(toDateStr(deps.now()));
  let selected: string | null = null;
  let order: Order = 'often';

  const root = el('section', { class: 'screen log' });

  // ===== 上：小さなポンと今月の回数 =====
  const countText = el('h1', { class: 'log-count' });
  const head = el('div', { class: 'log-head' }, pon.el, countText);

  // ===== 月の切り替え（ボタンは1度だけ作る） =====
  const label = el('h2', { class: 'month-label' });
  const nav = el(
    'div',
    { class: 'month-nav' },
    el('button', { class: 'icon month-btn pop pop-press', type: 'button', 'aria-label': '前の月', onclick: () => move(-1) }, '‹'),
    label,
    el('button', { class: 'icon month-btn pop pop-press', type: 'button', 'aria-label': '次の月', onclick: () => move(1) }, '›'),
  );

  const calendar = el('div', { class: 'calendar pop', role: 'group', 'aria-label': 'カレンダー' });

  // ===== 選んだ日に作ったもの =====
  const dayTitle = el('h2', { class: 'section-title' });
  const dayList = el('ul', { class: 'daylist' });
  const dayBox = el('div', { class: 'daybox stack' }, dayTitle, dayList);

  // ===== 下：並び替えの一覧 =====
  const orderChips: Array<{ order: Order; node: HTMLElement }> = (
    [['often', 'よく作る順'], ['stale', 'しばらく作ってない順']] as const
  ).map(([o, text]) => ({
    order: o,
    node: el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => { order = o; render(); } }, text),
  }));
  const ranking = el('ol', { class: 'ranking' });
  const rankEmpty = el('p', { class: 'empty-note' });

  root.append(
    el(
      'div',
      { class: 'stack' },
      head,
      nav,
      calendar,
      dayBox,
      el(
        'div',
        { class: 'stack' },
        el('h2', { class: 'section-title' }, '作った回数'),
        el('div', { class: 'chips', role: 'group', 'aria-label': '並び替え' }, ...orderChips.map(c => c.node)),
        ranking,
        rankEmpty,
      ),
    ),
  );

  function move(delta: number): void {
    month = shiftMonth(month, delta);
    selected = null; // 別の月に移ったら、日の選びは外す
    render();
  }

  function select(date: string): void {
    selected = date;
    render();
    // 描き直しで押したマスが入れ替わるので、同じ日にフォーカスを戻す
    calendar.querySelector<HTMLElement>(`.day[data-date="${date}"]`)?.focus();
  }

  function paintCalendar(today: string): void {
    const made = new Set(daysMadeIn(state.data.logs, month));
    // 描き直しの前に、フォーカスのあった日を覚えておく
    const active = document.activeElement;
    const focused = active instanceof HTMLElement && calendar.contains(active) ? active.getAttribute('data-date') : null;
    clear(calendar);
    for (const w of WEEKDAYS) calendar.append(el('span', { class: 'dow', 'aria-hidden': 'true' }, w));
    for (const cell of calendarCells(month)) {
      const date = cell.date;
      if (date === null) {
        calendar.append(el('button', { class: 'day', type: 'button', disabled: true, 'aria-hidden': 'true', tabindex: -1 }));
        continue;
      }
      const isMade = made.has(date);
      calendar.append(
        el(
          'button',
          {
            class: 'day',
            type: 'button',
            'data-date': date,
            'data-made': isMade ? 'true' : 'false',
            'data-today': date === today ? 'true' : 'false',
            'aria-pressed': date === selected ? 'true' : 'false',
            'aria-label': `${mdLabel(date)}${isMade ? '　作った' : ''}`,
            onclick: () => select(date),
          },
          el('span', { class: 'day-num' }, String(Number(date.slice(8)))),
          isMade && el('span', { class: 'mark', 'aria-hidden': 'true' }, svg(PON_FACE)), // 作った日の印は小さなポンの顔
        ),
      );
    }
    if (focused) calendar.querySelector<HTMLElement>(`.day[data-date="${focused}"]`)?.focus();
  }

  function paintDayList(): void {
    dayBox.hidden = selected === null;
    clear(dayList);
    if (selected === null) return;
    dayTitle.textContent = `${mdLabel(selected)}に作ったもの`;
    const entries = logsOn(state.data.logs, selected);
    if (entries.length === 0) {
      dayList.append(el('li', { class: 'daylist-empty' }, 'この日はまだ作っていません'));
      return;
    }
    for (const l of entries) {
      const recipe = state.data.recipes.find(r => r.id === l.recipeId);
      dayList.append(
        recipe
          ? el('li', {}, el('button', { class: 'daylist-item pop pop-press', type: 'button', onclick: () => deps.showRecipe(recipe.id) }, recipe.name))
          : el('li', { class: 'daylist-gone' }, '（削除した料理）'),
      );
    }
  }

  function paintRanking(): void {
    const { recipes, logs } = state.data;
    for (const c of orderChips) c.node.setAttribute('aria-pressed', c.order === order ? 'true' : 'false');
    const sorted = order === 'often' ? sortByOften(recipes, logs) : sortByStale(recipes, logs);
    clear(ranking);
    for (const r of sorted) {
      const n = countOf(logs, r.id);
      const last = lastMade(logs, r.id);
      ranking.append(
        el(
          'li',
          { class: 'rank-item' },
          el('span', { class: 'rank-name' }, r.name),
          el('span', { class: 'rank-meta' }, `${n}回`, last ? `　最後 ${mdLabel(last)}` : '　まだ作っていない'),
        ),
      );
    }
    ranking.hidden = sorted.length === 0;
    rankEmpty.textContent = sorted.length === 0 ? 'まだ料理がありません。献立帳で登録しましょう' : '';
  }

  function render(): void {
    const now = deps.now();
    const n = monthCount(state.data.logs, monthOf(toDateStr(now)));
    const level = bellyLevel(n);
    pon.setBelly(level);
    pon.setMood(level >= 3 ? 'full' : 'normal');
    countText.textContent = `今月は ${n}回 作ったよ`;
    label.textContent = monthLabel(month);
    paintCalendar(toDateStr(now));
    paintDayList();
    paintRanking();
  }

  state.subscribe(render);
  render();
  return { el: root };
}
