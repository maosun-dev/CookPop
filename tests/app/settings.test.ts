// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createSettingsScreen } from '../../src/app/screens/settings';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const btn = (root: Element, text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;

describe('設定', () => {
  it('見た目とクリップボードの設定が保存される', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => null, version: '0.1.0' });
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '暗い') as HTMLElement).click();
    expect(state.data.settings.theme).toBe('dark');
    const cb = scr.el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    cb.click();
    expect(state.data.settings.clipboardCheck).toBe(false);
    expect(scr.el.textContent).toContain('v0.1.0');
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
});
