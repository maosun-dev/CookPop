// タブの中身が揃うまでの仮の画面。
import { el } from '../ui';

export function createPlaceholder(title: string): { el: HTMLElement } {
  return { el: el('section', { class: 'screen' }, el('h1', { class: 'screen-title' }, title)) };
}
