// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createMascot } from '../../src/app/mascot/pon';
import { createPickScreen } from '../../src/app/screens/pick';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
function setup() {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  const state = createState(fake(), () => new Date(2026, 9, 23, 19), () => 'x');
  const mascot = createMascot();
  const opened: string[] = [];
  const scr = createPickScreen(state, { rng: () => 0, mascot, openPlayer: (_h, v) => { opened.push(v); }, now: () => new Date(2026, 9, 23, 19) });
  document.body.append(scr.el);
  return { state, mascot, scr, opened };
}

describe('きめる画面', () => {
  it('挨拶が出て、きめて！で料理が決まり結果カードが出る（動きなし）', () => {
    const { scr, mascot } = setup();
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('晩ごはん');
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const dish = scr.el.querySelector('.dish')!;
    expect(dish.textContent).toBe('よだれ水餃子');
    expect(scr.el.querySelector('.result')).not.toBeNull();
    expect(mascot.el.dataset.mood).toBe('decided');
  });
  it('作った！で記録が増えてポンが喜ぶ。別のにして で別の料理', () => {
    const { scr, state, mascot } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const buttons = [...scr.el.querySelectorAll('.result button')] as HTMLButtonElement[];
    buttons.find(b => b.textContent === '作った！')!.click();
    expect(state.data.logs).toHaveLength(1);
    expect(mascot.el.dataset.mood).toBe('happy');
    buttons.find(b => b.textContent === '別のにして')!.click();
    expect(scr.el.querySelector('.dish')!.textContent).not.toBe('よだれ水餃子');
  });
  it('ジャンルで絞る。0件ならボタンが押せない', () => {
    const { scr } = setup();
    const chip = [...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'おやつ') as HTMLElement;
    chip.click();
    expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
    expect(scr.el.textContent).toContain('まだ登録がありません');
  });
  it('3つから選ぶ', () => {
    const { scr } = setup();
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '3つから選ぶ') as HTMLElement).click();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const cards = scr.el.querySelectorAll('.choice');
    expect(cards).toHaveLength(3);
    (cards[1] as HTMLElement).click();
    expect(scr.el.querySelector('.result')).not.toBeNull();
    expect(scr.el.querySelector('.dish')!.textContent).toBe(cards[1].textContent);
  });
  it('動画を見る で openPlayer が呼ばれる', () => {
    const { scr, opened } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    ([...scr.el.querySelectorAll('.result button')].find(b => b.textContent === '動画を見る') as HTMLElement).click();
    expect(opened).toEqual(['HzLAMA5ck_8']);
  });
  it('登録が0品なら案内が出る', () => {
    const { scr, state, mascot } = setup();
    for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('献立帳で登録');
    expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
  });
});
