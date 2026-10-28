// 下からせり上がるシート。設定などを、画面の上に重ねて出す。
import { el } from './ui';

export interface Sheet {
  close(): void;
}

let current: Sheet | null = null;
let seq = 0;

/** シートを開く。すでに開いていれば、そのシートを返す（2重には開かない） */
export function openSheet(content: HTMLElement, title: string): Sheet {
  if (current) return current;
  const returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const titleId = `sheet-title-${++seq}`;
  const closeBtn = el('button', { class: 'btn sheet-close', type: 'button', onclick: () => close() }, '閉じる');
  const panel = el(
    'div',
    { class: 'sheet', tabindex: '-1', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    el('div', { class: 'sheet-head' }, el('h2', { class: 'sheet-title', id: titleId }, title), closeBtn),
    el('div', { class: 'sheet-body' }, content),
  );
  // 暗い幕そのものを押したときだけ閉じる（中を押しても閉じない）
  const backdrop = el('div', { class: 'sheet-backdrop', onclick: (e: Event) => { if (e.target === backdrop) close(); } }, panel);

  const onKey = (e: Event): void => {
    if ((e as KeyboardEvent).key === 'Escape') close();
  };

  let closed = false;
  function close(): void {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey);
    backdrop.remove();
    document.body.classList.remove('sheet-open');
    current = null;
    returnTo?.focus();
  }

  const sheet: Sheet = { close };
  current = sheet;
  document.addEventListener('keydown', onKey);
  document.body.classList.add('sheet-open');
  document.body.append(backdrop);
  panel.focus();
  return sheet;
}
