// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { suggestFromClipboard, watchClipboard } from '../../src/app/clipboardCheck';
import { createState } from '../../src/app/state';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));

describe('クリップボード', () => {
  it('新しい動画のリンクだけ提案する', () => {
    const s = createState(fake(), () => new Date(), () => 'x');
    expect(suggestFromClipboard('https://youtu.be/ZZZZZZZZZZZ', s.data)).toBe('ZZZZZZZZZZZ');
    expect(suggestFromClipboard('https://youtu.be/HzLAMA5ck_8', s.data)).toBeNull();
    expect(suggestFromClipboard('ただの文字', s.data)).toBeNull();
    s.updateSettings({ lastClipboardVideoId: 'ZZZZZZZZZZZ' });
    expect(suggestFromClipboard('https://youtu.be/ZZZZZZZZZZZ', s.data)).toBeNull();
  });
  it('見えるようになったときに読んで提案。同じものは二度聞かない。設定オフなら読まない', async () => {
    const s = createState(fake(), () => new Date(), () => 'x');
    let reads = 0; const got: string[] = [];
    const off = watchClipboard({ read: async () => { reads++; return 'https://youtu.be/ZZZZZZZZZZZ'; }, state: s, onSuggest: v => { got.push(v); } });
    await tick();
    expect(got).toEqual(['ZZZZZZZZZZZ']);
    document.dispatchEvent(new Event('visibilitychange'));
    await tick();
    expect(got).toEqual(['ZZZZZZZZZZZ']);
    expect(reads).toBe(2);
    s.updateSettings({ clipboardCheck: false });
    window.dispatchEvent(new Event('focus'));
    await tick();
    expect(reads).toBe(2);
    off();
  });
});
