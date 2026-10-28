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
  const bookOpened = { count: 0 };
  const scr = createPickScreen(state, {
    rng: () => 0, mascot, openPlayer: (_h, v) => { opened.push(v); }, now: () => new Date(2026, 9, 23, 19),
    openBook: () => { bookOpened.count++; },
  });
  document.body.append(scr.el);
  return { state, mascot, scr, opened, bookOpened };
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
  it('結果カードに「動画を見る」ボタンは無く、メモも写真も押すと openPlayer が呼ばれる', () => {
    const { scr, opened } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    expect([...scr.el.querySelectorAll('.result button')].some(b => b.textContent === '動画を見る')).toBe(false);
    const memo = scr.el.querySelector('.result .play-memo') as HTMLElement;
    expect(memo.textContent).toContain('動画を流す');
    memo.click();
    expect(opened).toEqual(['HzLAMA5ck_8']);
    // 写真の場所（入れ物）が渡る。写真には何も重ねない
    const photo = scr.el.querySelector('.result .media') as HTMLElement;
    expect(photo.querySelector('.play-memo')).toBeNull();
  });
  it('動画に変わったら角の「動画を流す」メモを隠す。YouTube で開くの置き場はボタンの下', () => {
    const links: HTMLElement[] = [];
    Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
    const state = createState(fake(), () => new Date(2026, 9, 23, 19), () => 'x');
    const scr = createPickScreen(state, { rng: () => 0, mascot: createMascot(), openPlayer: (_h, _v, l) => { if (l) links.push(l); }, now: () => new Date(2026, 9, 23, 19) });
    document.body.append(scr.el);
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const memo = scr.el.querySelector('.result .play-memo') as HTMLElement;
    expect(memo.hidden).toBe(false);
    memo.click();
    expect(memo.hidden).toBe(true);
    expect(links).toHaveLength(1);
    const row = scr.el.querySelector('.result .row') as HTMLElement;
    expect(row.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scr.el.querySelector('.result')!.contains(links[0])).toBe(true);
    // 新しい結果カードのメモは出ている
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    expect((scr.el.querySelector('.result .play-memo') as HTMLElement).hidden).toBe(false);
  });
  it('料理が0品なら、ジャンルの段を隠す', () => {
    const { scr, state } = setup();
    const cat = scr.el.querySelector('[aria-label="ジャンル"]') as HTMLElement;
    expect(cat.hidden).toBe(false);
    for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
    expect(cat.hidden).toBe(true);
    state.addRecipe({ url: 'https://youtu.be/AAAAAAAAAAA', name: 'あ', cat: '主菜', channel: '', thumb: '', memo: '' });
    expect(cat.hidden).toBe(false);
  });
  it('写真を押しても openPlayer が呼ばれる。入れ物はカードの中', () => {
    const hosts: HTMLElement[] = [];
    Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
    const state = createState(fake(), () => new Date(2026, 9, 23, 19), () => 'x');
    const scr = createPickScreen(state, { rng: () => 0, mascot: createMascot(), openPlayer: (h) => { hosts.push(h); }, now: () => new Date(2026, 9, 23, 19) });
    document.body.append(scr.el);
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    (scr.el.querySelector('.result .media') as HTMLElement).click();
    expect(hosts).toHaveLength(1);
    expect(scr.el.querySelector('.result')!.contains(hosts[0])).toBe(true);
    expect(hosts[0].contains(scr.el.querySelector('.result .media'))).toBe(true);
  });
  it('「きめて！」は丸いハンコ', () => {
    const { scr } = setup();
    const roll = scr.el.querySelector('#roll')!;
    expect(roll.classList.contains('stamp')).toBe(true);
    expect(roll.classList.contains('btn-big')).toBe(false);
  });
  it('料理名の長さで大きさのクラスが変わる（8文字まで大・15文字まで中・それより長いと小）', () => {
    const { scr, state } = setup();
    const dish = scr.el.querySelector('.dish') as HTMLElement;
    const run = (name: string) => {
      for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
      state.addRecipe({ url: 'https://youtu.be/AAAAAAAAAAA', name, cat: '主菜', channel: '', thumb: '', memo: '' });
      (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    };
    run('あ'.repeat(8));
    expect(dish.classList.contains('m') || dish.classList.contains('s')).toBe(false);
    run('あ'.repeat(9));
    expect(dish.classList.contains('m')).toBe(true);
    run('あ'.repeat(15));
    expect(dish.classList.contains('m')).toBe(true);
    run('あ'.repeat(16));
    expect(dish.classList.contains('s')).toBe(true);
    expect(dish.classList.contains('m')).toBe(false);
    expect(dish.textContent).toBe('あ'.repeat(16));
    // カードの中の名前にも大きさのクラスは付かない（3行までは CSS で）
    expect(scr.el.querySelector('.result .card-title')!.textContent).toBe('あ'.repeat(16));
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
    (scr.el.querySelector('.result .play-memo') as HTMLElement).click();
    const player = scr.el.querySelector('.result .media-host') as HTMLElement;
    player.append(document.createElement('iframe')); // 枠に印を付ける
    const card = scr.el.querySelector('.result')!;
    const cookedBtn = buttons.find(b => b.textContent === '作った！')!;
    cookedBtn.focus();
    cookedBtn.click();
    expect(scr.el.querySelector('.result .count')!.textContent).toContain('作った回数 1回');
    expect(scr.el.querySelector('.result')).toBe(card);
    expect(scr.el.querySelector('.result .media-host')).toBe(player);
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
    const { mascot, state, bookOpened } = setup();
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('はじめまして');
    const toBook = [...mascot.el.querySelectorAll('.bubble button')].find(b => b.textContent === '献立帳へ') as HTMLButtonElement;
    expect(toBook).toBeDefined();
    toBook.click();
    expect(bookOpened.count).toBe(1);
    state.addRecipe({ url: 'https://youtu.be/ZZZZZZZZZZZ', name: 'x', cat: '主菜' });
    expect(mascot.el.querySelector('.bubble')!.textContent).not.toContain('はじめまして');
  });
  it('はじめましては、その起動で きめて！ を押したあとは戻らない', () => {
    const { mascot, scr, state } = setup();
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('はじめまして');
    (scr.el.querySelector('#roll') as HTMLButtonElement).click(); // 作った！は押さない
    // 設定の変更（購読の描き直し）でも、料理の数が変わっても、はじめましてには戻らない
    state.updateSettings({ theme: 'dark' });
    expect(mascot.el.querySelector('.bubble')!.textContent).not.toContain('はじめまして');
    state.deleteRecipe(state.data.recipes[state.data.recipes.length - 1].id);
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

describe('きめる画面：2段の絞り込み', () => {
  const chipOf = (root: Element, group: string, text: string) =>
    [...root.querySelectorAll(`[aria-label="${group}"] .chip`)].find(c => c.textContent === text) as HTMLElement;
  function withTags() {
    const s = setup();
    s.state.addTag('お弁当');
    s.state.addTag('作り置き');
    const [a, b, c] = s.state.data.recipes;
    s.state.setRecipeTags(a.id, ['お弁当']);
    s.state.setRecipeTags(b.id, ['お弁当', '作り置き']);
    s.state.setRecipeTags(s.state.data.recipes[6].id, ['お弁当']); // ご飯
    void c;
    return s;
  }
  it('マイタグが 0 個ならタグの段は隠れる。作ると出る', () => {
    const { scr, state } = setup();
    expect((scr.el.querySelector('[aria-label="マイタグ"]') as HTMLElement).hidden).toBe(true);
    expect(scr.el.querySelector('[aria-label="ジャンル"]')).not.toBeNull();
    state.addTag('お弁当');
    const row = scr.el.querySelector('[aria-label="マイタグ"]') as HTMLElement;
    expect(row.hidden).toBe(false);
    expect([...row.querySelectorAll('.chip')].map(c => c.textContent)).toEqual(['すべて', 'お弁当']);
  });
  it('ジャンルとタグは「かつ」で絞る', () => {
    const { scr, state } = withTags();
    chipOf(scr.el, 'マイタグ', 'お弁当').click();
    expect(chipOf(scr.el, 'マイタグ', 'お弁当').getAttribute('aria-pressed')).toBe('true');
    const seen = new Set<string>();
    const rollAll = () => { (scr.el.querySelector('#roll') as HTMLButtonElement).click(); seen.add(scr.el.querySelector('.card-title')!.textContent!); };
    rollAll();
    // お弁当が付いた3品のどれか
    const tagged = state.data.recipes.filter(r => r.tags.includes('お弁当')).map(r => r.name);
    expect(tagged).toContain([...seen][0]);
    chipOf(scr.el, 'ジャンル', 'ご飯').click();
    rollAll();
    expect(scr.el.querySelector('.card-title')!.textContent).toBe('スパムとキムチごはんのお弁当');
    chipOf(scr.el, 'ジャンル', '麺').click(); // 麺×お弁当は 0 品
    expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
  });
  it('選んだタグの名前を変えても選んだまま。消すと「すべて」に戻る', () => {
    const { scr, state } = withTags();
    chipOf(scr.el, 'マイタグ', '作り置き').click();
    state.renameTag('作り置き', '常備菜');
    expect(chipOf(scr.el, 'マイタグ', '常備菜').getAttribute('aria-pressed')).toBe('true');
    expect(chipOf(scr.el, 'マイタグ', 'すべて').getAttribute('aria-pressed')).toBe('false');
    state.deleteTag('常備菜');
    expect(chipOf(scr.el, 'マイタグ', 'すべて').getAttribute('aria-pressed')).toBe('true');
    expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(false);
  });
  it('選んでいない別のタグが消えても、選びは変わらない', () => {
    const { scr, state } = withTags();
    chipOf(scr.el, 'マイタグ', 'お弁当').click();
    state.deleteTag('作り置き');
    expect(chipOf(scr.el, 'マイタグ', 'お弁当').getAttribute('aria-pressed')).toBe('true');
  });
});
