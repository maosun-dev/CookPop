// きめる・献立帳の2段の絞り込み（上：ジャンル、下：マイタグ）。チップは1度だけ作り、押した状態だけ更新する。
import { el, clear } from './ui';
import type { AppState } from './state';
import { CATS, type Cat } from '../core/recipe';

/**
 * 選んでいたタグが変わったあとの選び直し。
 * 名前を変えたとき（数も並びも同じ）は新しい名前、消されたときは null（すべて）。
 */
export function followTag(selected: string | null, prev: string[], next: string[]): string | null {
  if (selected === null || next.includes(selected)) return selected;
  const i = prev.indexOf(selected);
  return i >= 0 && next.length === prev.length ? next[i] : null;
}

export interface Filters {
  /** ジャンルの段 */
  catRow: HTMLElement;
  /** マイタグの段（マイタグが 0 個のあいだは hidden） */
  tagRow: HTMLElement;
  cat(): Cat | null;
  tag(): string | null;
  /** データが変わったあとに呼ぶ。選んだタグを追いかけ、タグの段を作り直し、押した状態をそろえる */
  sync(): void;
}

/** onChange は、利用者がチップを押して選びが変わったときに呼ぶ */
export function createFilters(state: AppState, onChange: () => void): Filters {
  let cat: Cat | null = null;
  let tag: string | null = null;
  let known = [...state.data.settings.myTags];

  const makeChip = (label: string, onClick: () => void): HTMLElement =>
    el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: onClick }, label);

  const catChips: Array<{ cat: Cat | null; node: HTMLElement }> = [
    { cat: null, node: makeChip('すべて', () => { cat = null; paint(); onChange(); }) },
    ...CATS.map(c => ({ cat: c as Cat | null, node: makeChip(c, () => { cat = c; paint(); onChange(); }) })),
  ];
  const catRow = el('div', { class: 'chips', role: 'group', 'aria-label': 'ジャンル' }, ...catChips.map(c => c.node));
  const tagRow = el('div', { class: 'chips', role: 'group', 'aria-label': 'マイタグ' });

  let tagChips: Array<{ tag: string | null; node: HTMLElement }> = [];
  let tagSignature = '';
  function buildTags(): void {
    const tags = state.data.settings.myTags;
    const sig = JSON.stringify(tags);
    if (sig === tagSignature) return; // 変わっていなければ作り直さない（フォーカスを保つ）
    tagSignature = sig;
    clear(tagRow);
    tagChips = [
      { tag: null, node: makeChip('すべて', () => { tag = null; paint(); onChange(); }) },
      ...tags.map(t => ({ tag: t as string | null, node: makeChip(t, () => { tag = t; paint(); onChange(); }) })),
    ];
    for (const c of tagChips) tagRow.append(c.node);
    tagRow.hidden = tags.length === 0;
  }

  function paint(): void {
    for (const c of catChips) c.node.setAttribute('aria-pressed', cat === c.cat ? 'true' : 'false');
    for (const c of tagChips) c.node.setAttribute('aria-pressed', tag === c.tag ? 'true' : 'false');
  }

  function sync(): void {
    const now = state.data.settings.myTags;
    tag = followTag(tag, known, now);
    known = [...now];
    buildTags();
    tagRow.hidden = now.length === 0;
    paint();
  }
  sync();

  return { catRow, tagRow, cat: () => cat, tag: () => tag, sync };
}
