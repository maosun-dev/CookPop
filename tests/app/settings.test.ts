// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createSettingsScreen } from '../../src/app/screens/settings';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const btn = (root: Element, text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;

describe('設定', () => {
  it('見た目の設定が保存され、クリップボードの設定は無い', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => null, version: '0.1.0' });
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '暗い') as HTMLElement).click();
    expect(state.data.settings.theme).toBe('dark');
    expect(scr.el.querySelector('input[type="checkbox"]')).toBeNull();
    expect(scr.el.textContent).not.toContain('クリップボード');
    expect(scr.el.textContent).toContain('v0.1.0');
    expect(scr.el.textContent).toContain('Capacitor（MIT）');
  });
  it('書き出しと読み込み', async () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const saved: { name: string; text: string }[] = [];
    let picked: string | null = null;
    const scr = createSettingsScreen(state, { files: { saveText: async (name, text) => { saved.push({ name, text }); }, pickText: async () => picked }, confirmMode: async () => 'replace', version: '0.1.0' });
    btn(scr.el, '書き出す').click();
    await tick();
    expect(saved[0].name).toBe('cookpop-backup-2026-10-23.json');
    expect(JSON.parse(saved[0].text).recipes).toHaveLength(8);
    picked = JSON.stringify({ version: 1, recipes: [], logs: [], settings: {} });
    btn(scr.el, '読み込む').click();
    await tick();
    expect(state.data.recipes).toHaveLength(0);
    picked = '壊れ';
    btn(scr.el, '読み込む').click();
    await tick();
    expect(document.querySelector('.toast')!.textContent).toContain('読めませんでした');
  });
  it('書き出しに失敗したら「書き出せませんでした」', async () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => { throw new Error('disk'); }, pickText: async () => null }, confirmMode: async () => 'replace', version: '0.1.0' });
    btn(scr.el, '書き出す').click();
    await tick();
    expect(document.querySelector('.toast')!.textContent).toBe('書き出せませんでした');
  });
  it('ファイルを選ぶのに失敗したら「読み込めませんでした」。データは変わらない', async () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => { throw new Error('picker'); } }, confirmMode: async () => 'replace', version: '0.1.0' });
    btn(scr.el, '読み込む').click();
    await tick();
    expect(document.querySelector('.toast')!.textContent).toBe('読み込めませんでした');
    expect(state.data.recipes).toHaveLength(8);
  });
  it('読み込み方を聞くのに失敗しても「読み込めませんでした」', async () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => '{}' }, confirmMode: async () => { throw new Error('dialog'); }, version: '0.1.0' });
    btn(scr.el, '読み込む').click();
    await tick();
    expect(document.querySelector('.toast')!.textContent).toBe('読み込めませんでした');
  });
  it('ファイル選びをやめたら（null）、何も出ない', async () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => 'replace', version: '0.1.0' });
    // 直前のトーストの文言を目印にして、変わらないことを確かめる
    btn(scr.el, '書き出す').click();
    await tick();
    const before = document.querySelector('.toast')!.textContent;
    expect(before).toBe('書き出しました');
    btn(scr.el, '読み込む').click();
    await tick();
    expect(document.querySelector('.toast')!.textContent).toBe(before);
    expect(state.data.recipes).toHaveLength(8);
  });
});

describe('設定：ふきんの色とマイタグ', () => {
  const mk = (confirmFn?: (m: string) => boolean) => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => null, version: '0.1.0', confirm: confirmFn });
    return { state, scr };
  };
  it('ふきんの色は6つの丸いボタンで、押すと settings.cloth が変わり aria-pressed が動く', () => {
    const { state, scr } = mk();
    const btns = [...scr.el.querySelectorAll<HTMLElement>('.cloth-btn')];
    expect(btns.map(b => b.getAttribute('aria-label'))).toEqual(['たまご', 'トマト', '抹茶', 'ソーダ', 'いちご', 'ぶどう']);
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
    btns[2].click();
    expect(state.data.settings.cloth).toBe('green');
    expect(btns[2].getAttribute('aria-pressed')).toBe('true');
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
  });
  it('シートの中身の順番：ふきんの色／見た目／マイタグ／バックアップ／このアプリについて', () => {
    const { scr } = mk();
    const titles = [...scr.el.querySelectorAll('.section-title')].map(h => h.textContent);
    expect(titles).toEqual(['ふきんの色', '見た目', 'マイタグの整理', 'バックアップ', 'このアプリについて']);
  });
  it('開き直すとき reset() で、名前変更の入力欄が一覧の表示に戻る', () => {
    const { state, scr } = mk();
    state.addTag('あ');
    btn(scr.el, '名前を変える').click();
    expect(scr.el.querySelector('.tag-row input')).not.toBeNull();
    scr.reset();
    expect(scr.el.querySelector('.tag-row input')).toBeNull();
    expect(btn(scr.el, '名前を変える')).toBeDefined();
  });
  it('マイタグが無いときは、無いと書く', () => {
    const { scr } = mk();
    expect(scr.el.querySelector('.tag-manage')!.textContent).toContain('まだありません');
  });
  it('マイタグの名前を変える：料理のタグも新しい名前になる', () => {
    const { state, scr } = mk();
    state.addTag('お弁当');
    state.setRecipeTags(state.data.recipes[0].id, ['お弁当']);
    btn(scr.el, '名前を変える').click();
    const input = scr.el.querySelector<HTMLInputElement>('.tag-row input')!;
    input.value = '平日弁当';
    btn(scr.el, '決める').click();
    expect(state.data.settings.myTags).toEqual(['平日弁当']);
    expect(state.data.recipes[0].tags).toEqual(['平日弁当']);
    expect(scr.el.querySelector('.tag-manage')!.textContent).toContain('平日弁当');
  });
  it('名前が長すぎる・同じ名前のときは変えずにお知らせ', () => {
    const { state, scr } = mk();
    state.addTag('あ');
    state.addTag('い');
    btn(scr.el, '名前を変える').click();
    const input = scr.el.querySelector<HTMLInputElement>('.tag-row input')!;
    input.value = 'い';
    btn(scr.el, '決める').click();
    expect(state.data.settings.myTags).toEqual(['あ', 'い']);
    expect(document.querySelector('.toast')!.textContent).toContain('もう');
  });
  it('マイタグを消す：確認して、料理からも外れる。やめれば残る', () => {
    let ok = false;
    const { state, scr } = mk(() => ok);
    state.addTag('お弁当');
    state.setRecipeTags(state.data.recipes[0].id, ['お弁当']);
    btn(scr.el, '消す').click();
    expect(state.data.settings.myTags).toEqual(['お弁当']);
    ok = true;
    btn(scr.el, '消す').click();
    expect(state.data.settings.myTags).toEqual([]);
    expect(state.data.recipes[0].tags).toEqual([]);
  });
  it('このアプリについてに、プライバシーポリシーと YouTube 利用規約のリンクがある', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => null, version: '1.0.0' });
    const links = [...scr.el.querySelectorAll('a')].map(a => [a.textContent, a.getAttribute('href')]);
    expect(links).toContainEqual(['プライバシーポリシー', 'https://maosun-dev.com/cookpop/privacy.html']);
    expect(links).toContainEqual(['YouTube 利用規約', 'https://www.youtube.com/t/terms']);
    expect(scr.el.textContent).toContain('AdMob');
  });
  it('openExternal があればそれで開く', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const opened: string[] = [];
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => null, version: '1.0.0', openExternal: url => opened.push(url) });
    const a = [...scr.el.querySelectorAll('a')].find(x => x.textContent === 'プライバシーポリシー')!;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    a.dispatchEvent(ev);
    expect(opened).toEqual(['https://maosun-dev.com/cookpop/privacy.html']);
    expect(ev.defaultPrevented).toBe(true);
  });
});
