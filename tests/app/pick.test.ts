// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
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
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('はじめまして'); // 初回は挨拶より はじめまして が先
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

  it('回している最中に料理が消えても、消えた料理では止まらない', () => {
    const { scr, state } = setup();
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();
    try {
      (scr.el.querySelector('#roll') as HTMLButtonElement).click();
      expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
      state.deleteRecipe(state.data.recipes[0].id); // rng=0 なら最初に決まるはずだった料理
      vi.runAllTimers();
      const name = scr.el.querySelector('.dish')!.textContent;
      expect(name).not.toBe('よだれ水餃子');
      expect(scr.el.querySelector('.result .card-title')!.textContent).toBe(name);
      expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
  it('回している最中に料理が全部消えたら、何も決まらずに止まる', () => {
    const { scr, state } = setup();
    window.matchMedia = (() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    vi.useFakeTimers();
    try {
      (scr.el.querySelector('#roll') as HTMLButtonElement).click();
      for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
      vi.runAllTimers();
      expect(scr.el.querySelector('.result')).toBeNull();
      expect(scr.el.querySelector('.dish')!.textContent).toBe('？');
      expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
  it('3枚から選ぶ途中で料理が消えたら、そのカードだけ除かれる', () => {
    const { scr, state } = setup();
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '3つから選ぶ') as HTMLElement).click();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const names = [...scr.el.querySelectorAll('.choice')].map(c => c.textContent);
    expect(names).toHaveLength(3);
    state.deleteRecipe(state.data.recipes.find(r => r.name === names[1])!.id);
    expect([...scr.el.querySelectorAll('.choice')].map(c => c.textContent)).toEqual([names[0], names[2]]);
  });
  it('3つから選ぶで、候補が3つ以下なら直前の料理を除外せず3枚（全部）出す', () => {
    const { scr, state } = setup();
    for (const r of state.data.recipes.slice(3)) state.deleteRecipe(r.id);
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '3つから選ぶ') as HTMLElement).click();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    (scr.el.querySelector('.choice') as HTMLElement).click();
    expect(scr.el.querySelector('.result')).not.toBeNull();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    expect(scr.el.querySelectorAll('.choice')).toHaveLength(3);
  });
  it('作った！で記録が増えても、結果カードのプレーヤー枠とボタンは作り直されない', () => {
    const { scr } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const buttons = [...scr.el.querySelectorAll('.result button')] as HTMLButtonElement[];
    buttons.find(b => b.textContent === '動画を見る')!.click();
    const player = scr.el.querySelector('.result .player') as HTMLElement;
    player.append(document.createElement('iframe')); // 枠に印を付ける
    const card = scr.el.querySelector('.result')!;
    const cookedBtn = buttons.find(b => b.textContent === '作った！')!;
    cookedBtn.focus();
    cookedBtn.click();
    expect(scr.el.querySelector('.result .count')!.textContent).toContain('作った回数 1回');
    expect(scr.el.querySelector('.result')).toBe(card);
    expect(scr.el.querySelector('.result .player')).toBe(player);
    expect(player.querySelector('iframe')).not.toBeNull();
    expect(cookedBtn.isConnected).toBe(true);
    expect(document.activeElement).toBe(cookedBtn);
  });
  it('ジャンルのチップは作り直されず、押した状態だけ変わる', () => {
    const { scr } = setup();
    const chip = [...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '主菜') as HTMLElement;
    chip.click();
    expect([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '主菜')).toBe(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'すべて')!.getAttribute('aria-pressed')).toBe('false');
  });
  it('並びは ボタン → チップ列 → 3枚 → 結果カード。結果カードはチップ列より後ろ', () => {
    const { scr } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const chips = scr.el.querySelector('.filters')!;
    const result = scr.el.querySelector('.result')!;
    const choices = scr.el.querySelector('.choices')!;
    expect(chips.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(chips.compareDocumentPosition(choices) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(choices.compareDocumentPosition(result) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scr.el.querySelector('#roll')!.compareDocumentPosition(chips) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('決まったら結果カードが見える所まで動かす', () => {
    const { scr } = setup();
    const calls: unknown[] = [];
    const orig = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = function (arg?: boolean | ScrollIntoViewOptions) { calls.push(arg); };
    try {
      (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    } finally {
      Element.prototype.scrollIntoView = orig;
    }
    // setup は動きを減らす設定なので auto
    expect(calls).toEqual([{ block: 'nearest', behavior: 'auto' }]);
  });
  it('3枚出したあとで名前を変えて選ぶと、新しい名前で決まる', () => {
    const { scr, state } = setup();
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '3つから選ぶ') as HTMLElement).click();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const target = state.data.recipes.find(r => r.name === scr.el.querySelectorAll('.choice')[1].textContent)!;
    state.updateRecipe(target.id, { name: '新しい名前' });
    // カードの文字も新しくなる
    expect([...scr.el.querySelectorAll('.choice')].map(c => c.textContent)).toContain('新しい名前');
    ([...scr.el.querySelectorAll('.choice')].find(c => c.textContent === '新しい名前') as HTMLElement).click();
    expect(scr.el.querySelector('.dish')!.textContent).toBe('新しい名前');
    expect(scr.el.querySelector('.result .card-title')!.textContent).toBe('新しい名前');
  });
  it('初めてなら はじめまして の案内と 献立帳へ のボタン', () => {
    const { mascot, state } = setup();
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('はじめまして');
    state.addRecipe({ url: 'https://youtu.be/ZZZZZZZZZZZ', name: 'x', cat: '主菜' });
    expect(mascot.el.querySelector('.bubble')!.textContent).not.toContain('はじめまして');
  });
  it('深夜はポンが眠い', () => {
    // setup の now を 23 時にした版
    Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
    const state = createState(fake(), () => new Date(2026, 9, 23, 23), () => 'x');
    const mascot = createMascot();
    createPickScreen(state, { rng: () => 0, mascot, openPlayer: () => {}, now: () => new Date(2026, 9, 23, 23) });
    expect(mascot.el.dataset.mood).toBe('sleepy');
  });
  it('料理名の枠は止まったときだけ読み上げる', () => {
    const { scr } = setup();
    const dish = scr.el.querySelector('.dish')!;
    expect(dish.getAttribute('aria-live')).toBe('polite');
  });
});
