// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { openSheet } from '../../src/app/sheet';
import { el } from '../../src/app/ui';

afterEach(() => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); document.body.replaceChildren(); document.body.className = ''; });

describe('シート', () => {
  it('role=dialog・aria-modal・見出し・閉じるボタンがあり、中身が入る', () => {
    const h = openSheet(el('p', { id: 'inner' }, '中身'), '設定');
    const dlg = document.querySelector('[role="dialog"]')!;
    expect(dlg.getAttribute('aria-modal')).toBe('true');
    expect(dlg.querySelector('h2')!.textContent).toBe('設定');
    expect(dlg.getAttribute('aria-labelledby')).toBe(dlg.querySelector('h2')!.id);
    expect(dlg.querySelector('#inner')).not.toBeNull();
    expect([...dlg.querySelectorAll('button')].some(b => b.textContent === '閉じる')).toBe(true);
    h.close();
  });
  it('閉じるボタンで閉じる', () => {
    openSheet(el('p', {}, 'x'), '設定');
    ([...document.querySelectorAll('button')].find(b => b.textContent === '閉じる') as HTMLElement).click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('外側（暗い幕）を押すと閉じる。中を押しても閉じない', () => {
    openSheet(el('p', { id: 'inner' }, 'x'), '設定');
    (document.querySelector('#inner') as HTMLElement).click();
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    (document.querySelector('.sheet-backdrop') as HTMLElement).click();
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('Escape で閉じる', () => {
    openSheet(el('p', {}, 'x'), '設定');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });
  it('開いている間は後ろのスクロールを止め、閉じたら戻す。close() は何度呼んでもよい', () => {
    const h = openSheet(el('p', {}, 'x'), '設定');
    expect(document.body.classList.contains('sheet-open')).toBe(true);
    h.close();
    h.close();
    expect(document.body.classList.contains('sheet-open')).toBe(false);
  });
  it('2重には開かない', () => {
    openSheet(el('p', {}, 'a'), '設定');
    openSheet(el('p', {}, 'b'), '設定');
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
  });
  it('閉じたあと、開く前に触っていたものへ戻る', () => {
    const b = el('button', {}, '元');
    document.body.append(b);
    b.focus();
    const h = openSheet(el('p', {}, 'x'), '設定');
    expect(document.activeElement).not.toBe(b);
    h.close();
    expect(document.activeElement).toBe(b);
  });
});
