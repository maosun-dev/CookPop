// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createForm } from '../../src/app/screens/form';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const mkState = () => createState(fake(), () => new Date(2026, 9, 23), () => 'new');
const pasteBtn = (root: HTMLElement) => [...root.querySelectorAll('button')].find(b => b.textContent === 'クリップボードから貼る') as HTMLButtonElement;
const input = (root: HTMLElement, name: string) => root.querySelector(`[name="${name}"]`) as HTMLInputElement;

describe('登録フォーム', () => {
  it('リンクを貼ると題とチャンネルが自動で埋まり、登録できる', async () => {
    const state = mkState(); let done = 0;
    const f = createForm(state, { fetchJson: async () => ({ title: '鶏むねの甘辛', author_name: 'ある人', thumbnail_url: 'https://i.ytimg.com/vi/ZZZZZZZZZZZ/hqdefault.jpg' }), onDone: () => { done++; } });
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    await tick();
    expect(input(f.el, 'name').value).toBe('鶏むねの甘辛');
    expect(input(f.el, 'channel').value).toBe('ある人');
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(done).toBe(1);
    const r = state.data.recipes.find(r => r.videoId === 'ZZZZZZZZZZZ')!;
    expect(r.name).toBe('鶏むねの甘辛');
    expect(r.thumb).toBe('https://i.ytimg.com/vi/ZZZZZZZZZZZ/hqdefault.jpg');
  });
  it('通信が失敗しても手入力で登録できる', async () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => { throw new Error('offline'); }, onDone: () => {} });
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    await tick();
    expect(input(f.el, 'name').value).toBe('');
    input(f.el, 'name').value = '手で入れた';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes.some(r => r.name === '手で入れた')).toBe(true);
  });
  it('壊れたリンクと、すでにある動画', () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => {} });
    f.setUrl('https://example.com/x');
    expect(f.el.textContent).toContain('動画リンクを貼ってください');
    f.setUrl('https://youtu.be/HzLAMA5ck_8');
    expect(f.el.textContent).toContain('もう登録してあるよ');
    input(f.el, 'name').value = 'x';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes).toHaveLength(8);
  });
  it('名前が空なら登録しない', () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => { throw new Error('x'); }, onDone: () => {} });
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes).toHaveLength(8);
    expect(f.el.textContent).toContain('名前');
  });
  it('編集はリンク欄なしで、保存で名前が変わる', () => {
    const state = mkState(); const id = state.data.recipes[0].id; let done = 0;
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => { done++; }, prefill: { recipeId: id } });
    expect(f.el.querySelector('[name="url"]')).toBeNull();
    expect(input(f.el, 'name').value).toBe('よだれ水餃子');
    input(f.el, 'name').value = '水餃子（よだれ）';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes[0].name).toBe('水餃子（よだれ）');
    expect(done).toBe(1);
  });
  it('空のままリンク欄から離れても、エラーは出ない。登録ボタンでは案内が出る', () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => {} });
    const url = input(f.el, 'url');
    url.value = 'https://example.com/x';
    url.dispatchEvent(new Event('input'));
    expect(f.el.querySelector('.err')!.textContent).toContain('動画リンクを貼ってください');
    // 消して空にすると、エラーも消える
    url.value = '  ';
    url.dispatchEvent(new Event('input'));
    expect(f.el.querySelector('.err')!.textContent).toBe('');
    url.dispatchEvent(new Event('blur'));
    expect(f.el.querySelector('.err')!.textContent).toBe('');
    f.setUrl('');
    expect(f.el.querySelector('.err')!.textContent).toBe('');
    input(f.el, 'name').value = 'x';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(f.el.querySelector('.err')!.textContent).toContain('動画リンクを貼ってください');
  });

  it('「クリップボードから貼る」で欄に入り、自動入力が走る', async () => {
    const state = mkState(); let reads = 0;
    const f = createForm(state, {
      fetchJson: async () => ({ title: '貼った動画', author_name: 'だれか', thumbnail_url: 'https://i.ytimg.com/vi/ZZZZZZZZZZZ/hqdefault.jpg' }),
      onDone: () => {}, readClipboard: async () => { reads++; return '  https://youtu.be/ZZZZZZZZZZZ \n'; },
    });
    expect(reads).toBe(0);
    pasteBtn(f.el).click();
    await tick();
    expect(reads).toBe(1);
    expect(input(f.el, 'url').value).toBe('https://youtu.be/ZZZZZZZZZZZ');
    expect(input(f.el, 'name').value).toBe('貼った動画');
  });
  it('クリップボードが空・失敗なら欄は空のまま、案内が出る', async () => {
    for (const read of [async () => '  ', async () => { throw new Error('denied'); }]) {
      const f = createForm(mkState(), { fetchJson: async () => ({}), onDone: () => {}, readClipboard: read });
      pasteBtn(f.el).click();
      await tick();
      expect(input(f.el, 'url').value).toBe('');
      expect(document.querySelector('.toast')!.textContent).toBe('クリップボードに YouTube のリンクがありません');
    }
  });
  it('readClipboard が無いとき、編集のときは貼るボタンが無い', () => {
    const state = mkState();
    expect(pasteBtn(createForm(state, { fetchJson: async () => ({}), onDone: () => {} }).el)).toBeUndefined();
    const edit = createForm(state, { fetchJson: async () => ({}), onDone: () => {}, readClipboard: async () => 'x', prefill: { recipeId: state.data.recipes[0].id } });
    expect(pasteBtn(edit.el)).toBeUndefined();
  });
});

describe('登録フォーム：マイタグ', () => {
  const tagChip = (root: HTMLElement, text: string) =>
    [...root.querySelectorAll('[aria-label="マイタグ"] .chip')].find(c => c.textContent === text) as HTMLButtonElement;
  const btnOf = (root: HTMLElement, text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;
  const make = () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => { throw new Error('x'); }, onDone: () => {} });
    document.body.append(f.el);
    return { state, f };
  };
  const create = (f: { el: HTMLElement }, name: string) => {
    if (!f.el.querySelector('input[name="newTag"]')) btnOf(f.el, '＋ タグを作る').click();
    const box = f.el.querySelector('input[name="newTag"]') as HTMLInputElement;
    box.value = name;
    btnOf(f.el, '作る').click();
  };
  it('ジャンルは7つのチップ', () => {
    const { f } = make();
    expect(f.el.querySelectorAll('[aria-label="ジャンル"] .chip')).toHaveLength(7);
  });
  it('タグを作るとその料理に付き、保存でタグも渡る', () => {
    const { state, f } = make();
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    input(f.el, 'name').value = 'テスト丼';
    create(f, ' お弁当 ');
    expect(state.data.settings.myTags).toEqual(['お弁当']);
    expect(tagChip(f.el, 'お弁当').getAttribute('aria-pressed')).toBe('true');
    expect(f.el.querySelector('input[name="newTag"]')).toBeNull(); // 作ったら欄は閉じる
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes.find(r => r.videoId === 'ZZZZZZZZZZZ')!.tags).toEqual(['お弁当']);
  });
  it('作ったタグのチップは押して付け外しできる', () => {
    const state = mkState();
    state.addTag('作り置き');
    const f = createForm(state, { fetchJson: async () => { throw new Error('x'); }, onDone: () => {} });
    document.body.append(f.el);
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    input(f.el, 'name').value = 'テスト丼';
    const chip = tagChip(f.el, '作り置き');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    chip.click();
    expect(tagChip(f.el, '作り置き').getAttribute('aria-pressed')).toBe('true');
    tagChip(f.el, '作り置き').click();
    expect(tagChip(f.el, '作り置き').getAttribute('aria-pressed')).toBe('false');
  });
  it('エラーの言葉：12文字まで・20個まで', () => {
    const { state, f } = make();
    create(f, 'あ'.repeat(13));
    expect(f.el.textContent).toContain('12文字までにしてね');
    expect(state.data.settings.myTags).toHaveLength(0);
    create(f, 'ほげ');
    for (let i = 0; i < 19; i++) state.addTag('t' + i); // ほげ + 19 = 20
    create(f, 'もう一つ');
    expect(f.el.textContent).toContain('20個までだよ');
  });
  it('すでにある名前を入れたら、エラーにせずそのタグを付ける', () => {
    const { state, f } = make();
    state.addTag('お弁当');
    tagChip(f.el, 'お弁当');
    expect(tagChip(f.el, 'お弁当').getAttribute('aria-pressed')).toBe('false');
    create(f, ' お弁当 ');
    expect(state.data.settings.myTags).toEqual(['お弁当']);
    expect(tagChip(f.el, 'お弁当').getAttribute('aria-pressed')).toBe('true');
    expect(f.el.textContent).not.toContain('もうあるよ');
    expect(f.el.querySelector('input[name="newTag"]')).toBeNull();
    // 付いているものをもう一度入れても、外れず・エラーにもならない
    create(f, 'お弁当');
    expect(tagChip(f.el, 'お弁当').getAttribute('aria-pressed')).toBe('true');
    expect(f.el.textContent).not.toContain('もうあるよ');
  });
  it('10個付いているときに新しく作ると、タグは作るが付けられないと知らせる', () => {
    const { state, f } = make();
    for (let i = 0; i < 10; i++) { state.addTag('t' + i); tagChip(f.el, 't' + i).click(); }
    expect(tagChip(f.el, 't9').getAttribute('aria-pressed')).toBe('true');
    create(f, '十一');
    expect(state.data.settings.myTags).toContain('十一');
    expect(tagChip(f.el, '十一').getAttribute('aria-pressed')).toBe('false');
    expect(f.el.querySelector('[role="alert"]:not(:empty)')?.textContent ?? f.el.textContent).toContain('1品に付けられるのは10個までだよ');
    // すでにある（付いていない）名前を入れた場合も、付けられないと知らせる
    tagChip(f.el, 't0').click(); // 外すと知らせは消える
    expect(f.el.textContent).not.toContain('10個までだよ');
    tagChip(f.el, '十一').click(); // これで10個
    create(f, 't0');
    expect(tagChip(f.el, 't0').getAttribute('aria-pressed')).toBe('false');
    expect(f.el.textContent).toContain('1品に付けられるのは10個までだよ');
  });
  it('開いている間にマイタグが変わったら、チップを描き直し、選んだタグも追いかける', () => {
    const state = mkState();
    state.addTag('A'); state.addTag('B'); state.addTag('C');
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => {} });
    document.body.append(f.el);
    tagChip(f.el, 'A').click();
    tagChip(f.el, 'B').click();
    state.addTag('D');
    expect(tagChip(f.el, 'D')).toBeDefined();
    state.renameTag('A', 'A2');
    expect(tagChip(f.el, 'A')).toBeUndefined();
    expect(tagChip(f.el, 'A2').getAttribute('aria-pressed')).toBe('true');
    state.deleteTag('B');
    expect(tagChip(f.el, 'B')).toBeUndefined();
    // 消えたタグは選びから外れる：登録しても付かない
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    input(f.el, 'name').value = 'テスト丼';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes.find(r => r.videoId === 'ZZZZZZZZZZZ')!.tags).toEqual(['A2']);
  });
  it('destroy すると購読を外し、あとの変更で描き直さない', () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => {} });
    document.body.append(f.el);
    f.destroy();
    state.addTag('あと');
    expect(tagChip(f.el, 'あと')).toBeUndefined();
  });
  it('編集でタグを外して保存できる', () => {
    const state = mkState();
    state.addTag('お弁当');
    state.addTag('作り置き');
    const id = state.data.recipes[0].id;
    state.setRecipeTags(id, ['お弁当', '作り置き']);
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => {}, prefill: { recipeId: id } });
    document.body.append(f.el);
    expect(tagChip(f.el, 'お弁当').getAttribute('aria-pressed')).toBe('true');
    tagChip(f.el, 'お弁当').click();
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes[0].tags).toEqual(['作り置き']);
  });
  it('小さな欄で Enter を押しても、フォームは保存されずタグが作られる', () => {
    const { state, f } = make();
    btnOf(f.el, '＋ タグを作る').click();
    const box = f.el.querySelector('input[name="newTag"]') as HTMLInputElement;
    box.value = 'ごちそう';
    box.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(state.data.settings.myTags).toEqual(['ごちそう']);
    expect(state.data.recipes).toHaveLength(8);
  });
});

