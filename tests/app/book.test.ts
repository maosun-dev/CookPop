// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createBookScreen } from '../../src/app/screens/book';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
function setup(confirmAnswer = true) {
  const state = createState(fake(), () => new Date(2026, 9, 23), () => 'new');
  const opened: string[] = [];
  const scr = createBookScreen(state, { fetchJson: async () => ({}), openPlayer: (_h, v) => { opened.push(v); }, confirm: () => confirmAnswer });
  document.body.append(scr.el);
  return { state, scr, opened };
}
/** 「献立帳に戻る」ボタン（矢印は絵、文字は「献立帳」） */
const backBtn = (root: Element) => root.querySelector('button[aria-label="献立帳に戻る"]') as HTMLButtonElement;
const btn = (root: Element, text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;

describe('献立帳', () => {
  it('8品が並び、ジャンルとお気に入りで絞れる', () => {
    const { scr, state } = setup();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(8);
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '麺') as HTMLElement).click();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(1);
    state.toggleFav(state.data.recipes[0].id);
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'お気に入りだけ') as HTMLElement).click();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(0);
    expect(scr.el.textContent).toContain('この条件の料理はありません');
  });
  it('カードをタップで詳細。作った！・動画・削除', () => {
    const { scr, state, opened } = setup();
    (scr.el.querySelector('.tile-open') as HTMLElement).click();
    const d = scr.el.querySelector('.detail')!;
    expect(d.textContent).toContain('よだれ水餃子');
    btn(d, '作った！').click();
    expect(state.data.logs).toHaveLength(1);
    btn(scr.el.querySelector('.detail')!, '動画を見る').click();
    expect(opened).toEqual(['HzLAMA5ck_8']);
    btn(scr.el.querySelector('.detail')!, '削除する').click();
    expect(state.data.recipes).toHaveLength(7);
    expect(scr.el.querySelector('.detail')).toBeNull();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(7);
  });
  it('詳細から 献立帳へ戻るとき、鳴っている動画を止める', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'new');
    let paused = 0;
    const scr = createBookScreen(state, { fetchJson: async () => ({}), openPlayer: () => {}, confirm: () => true, pauseAll: () => { paused++; } });
    document.body.append(scr.el);
    const before = paused; // 最初の一覧づくりでも呼ばれてよい
    (scr.el.querySelector('.tile-open') as HTMLElement).click();
    expect(paused).toBe(before);
    backBtn(scr.el.querySelector('.detail')!).click();
    expect(paused).toBe(before + 1);
  });
  it('戻るボタンは矢印の絵と「献立帳」の文字でできている', () => {
    const { scr } = setup();
    (scr.el.querySelector('.tile-open') as HTMLElement).click();
    const back = backBtn(scr.el.querySelector('.detail')!);
    expect(back.querySelector('svg')).not.toBeNull();
    expect(back.textContent?.trim()).toBe('献立帳');
    expect(back.textContent).not.toContain('←');
  });
  it('星のボタンは絵（svg）でできていて、押すと aria-pressed が変わる', () => {
    const { scr, state } = setup();
    const star = () => scr.el.querySelector('.tile .fav') as HTMLButtonElement;
    expect(star().querySelector('svg')).not.toBeNull();
    expect(star().textContent).toBe('');
    expect(star().getAttribute('aria-pressed')).toBe('false');
    star().click();
    expect(state.data.recipes.filter(r => r.fav)).toHaveLength(1);
    expect(star().getAttribute('aria-pressed')).toBe('true');
    star().click();
    expect(star().getAttribute('aria-pressed')).toBe('false');
  });
  it('詳細の「お気に入り」ボタンも星の絵と文字で、押すと aria-pressed が変わる', () => {
    const { scr } = setup();
    (scr.el.querySelector('.tile-open') as HTMLElement).click();
    const fav = () => scr.el.querySelector('.detail .fav-btn') as HTMLButtonElement;
    expect(fav().querySelector('svg')).not.toBeNull();
    expect(fav().textContent?.trim()).toBe('お気に入り');
    expect(fav().getAttribute('aria-pressed')).toBe('false');
    fav().click();
    expect(fav().getAttribute('aria-pressed')).toBe('true');
    expect(fav().querySelector('svg')).not.toBeNull(); // 描き直しても絵は残る
    expect(fav().textContent).not.toMatch(/[★☆]/);
  });
  it('削除で いいえ なら消えない', () => {
    const { scr, state } = setup(false);
    (scr.el.querySelector('.tile-open') as HTMLElement).click();
    btn(scr.el.querySelector('.detail')!, '削除する').click();
    expect(state.data.recipes).toHaveLength(8);
  });
  it('＋ 登録する でフォーム、戻るで一覧', () => {
    const { scr } = setup();
    btn(scr.el, '＋ 登録する').click();
    expect(scr.el.querySelector('form')).not.toBeNull();
    backBtn(scr.el).click();
    expect(scr.el.querySelector('form')).toBeNull();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(8);
  });
  it('全部消すと案内', () => {
    const { scr, state } = setup();
    for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
    expect(scr.el.textContent).toContain('まだ何もありません');
    // hidden 属性が付き、画面から消える（style.css の [hidden] が効く）
    expect((scr.el.querySelector('.chips') as HTMLElement).hidden).toBe(true);
  });
});
