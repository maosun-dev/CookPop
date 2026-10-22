// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createForm } from '../../src/app/screens/form';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const mkState = () => createState(fake(), () => new Date(2026, 9, 23), () => 'new');
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
});
