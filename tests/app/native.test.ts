// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { isNativeApp, restoreSaves, mirrorStore, prepareSaves, SAVE_KEYS, type PrefsLike } from '../../src/app/native';
import { safeStore } from '../../src/app/storage';
import { BROKEN_KEY, DATA_KEY, initialData, loadData, saveData, type KeyValueStore } from '../../src/core/store';

function fakeStore(init: Record<string, string> = {}): KeyValueStore & { m: Map<string, string> } {
  const m = new Map<string, string>(Object.entries(init));
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}
// Map で作った偽の Preferences
function fakePrefs(init: Record<string, string> = {}): PrefsLike & { m: Map<string, string> } {
  const m = new Map<string, string>(Object.entries(init));
  return {
    m,
    get: async ({ key }) => ({ value: m.get(key) ?? null }),
    set: async ({ key, value }) => { m.set(key, value); },
    keys: async () => ({ keys: [...m.keys()] }),
  };
}
// 何をしても失敗する偽の Preferences
const brokenPrefs: PrefsLike = {
  get: () => Promise.reject(new Error('x')),
  set: () => Promise.reject(new Error('x')),
  keys: () => Promise.reject(new Error('x')),
};
const today = '2026-10-23';
const goodData = (): string => JSON.stringify(initialData(today));

describe('消えにくい保存', () => {
  it('保存の鍵は記録データと退避データの2つ', () => {
    expect([...SAVE_KEYS].sort()).toEqual([DATA_KEY, BROKEN_KEY].sort());
  });
  it('localStorage にない鍵だけ戻す', async () => {
    const ls = fakeStore({ [DATA_KEY]: '{"a":1}' });
    const prefs = fakePrefs({ [DATA_KEY]: '{"a":2}', [BROKEN_KEY]: '{' });
    await restoreSaves(ls, prefs);
    expect(ls.m.get(DATA_KEY)).toBe('{"a":1}');
    expect(ls.m.get(BROKEN_KEY)).toBe('{');
  });
  it('localStorage にある鍵は Preferences へ写す', async () => {
    const ls = fakeStore({ [DATA_KEY]: '{"a":1}' });
    const prefs = fakePrefs();
    await restoreSaves(ls, prefs);
    expect(prefs.m.get(DATA_KEY)).toBe('{"a":1}');
  });
  it('書くたびに両方へ。保存の鍵でないものは Preferences に書かない', async () => {
    const ls = fakeStore();
    const prefs = fakePrefs();
    const st = mirrorStore(ls, prefs);
    saveData(st, initialData(today));
    st.setItem('x', '1');
    await Promise.resolve();
    expect(ls.m.get(DATA_KEY)).toBe(prefs.m.get(DATA_KEY));
    expect(prefs.m.has(DATA_KEY)).toBe(true);
    expect(ls.m.get('x')).toBe('1');
    expect(prefs.m.has('x')).toBe(false);
  });
  it('読むのは localStorage から', () => {
    const ls = fakeStore({ [DATA_KEY]: 'v' });
    expect(mirrorStore(ls, fakePrefs()).getItem(DATA_KEY)).toBe('v');
  });
  it('Preferences が失敗しても止まらない', async () => {
    const ls = fakeStore({ [DATA_KEY]: '{}' });
    await expect(restoreSaves(ls, brokenPrefs)).resolves.toBeUndefined();
    const st = mirrorStore(ls, brokenPrefs);
    expect(() => st.setItem(DATA_KEY, 'v')).not.toThrow();
    expect(ls.m.get(DATA_KEY)).toBe('v');
    await Promise.resolve();
  });
  it('壊れた値が戻っても落ちずに最初の状態で起動し、壊れた分は退避される', async () => {
    const ls = fakeStore();
    await restoreSaves(ls, fakePrefs({ [DATA_KEY]: '{' }));
    expect(loadData(ls, today)).toEqual(initialData(today));
    expect(ls.m.get(BROKEN_KEY)).toBe('{');
  });
  it('Web では何もしない', async () => {
    expect(isNativeApp()).toBe(false);
    await expect(prepareSaves()).resolves.toBeUndefined();
    const st = safeStore();
    st.setItem('cookpop.test', 'ok');
    expect(st.getItem('cookpop.test')).toBe('ok');
    localStorage.removeItem('cookpop.test');
  });
  it('壊れた JSON の手元は、Preferences の正常な値で戻す（上書きしない）', async () => {
    const ls = fakeStore({ [DATA_KEY]: '{' });
    const good = goodData();
    const prefs = fakePrefs({ [DATA_KEY]: good });
    await restoreSaves(ls, prefs);
    expect(ls.m.get(DATA_KEY)).toBe(good);
    expect(prefs.m.get(DATA_KEY)).toBe(good);
  });
  it('手元が壊れていて Preferences も壊れているときは、手元をそのままにする', async () => {
    const ls = fakeStore({ [DATA_KEY]: '{' });
    await restoreSaves(ls, fakePrefs({ [DATA_KEY]: '[' }));
    expect(ls.m.get(DATA_KEY)).toBe('{');
  });
  it('退避データは JSON でなくてもそのまま写す・戻す', async () => {
    const ls = fakeStore({ [BROKEN_KEY]: 'not json' });
    const prefs = fakePrefs();
    await restoreSaves(ls, prefs);
    expect(prefs.m.get(BROKEN_KEY)).toBe('not json');
    const ls2 = fakeStore();
    await restoreSaves(ls2, fakePrefs({ [BROKEN_KEY]: 'not json' }));
    expect(ls2.m.get(BROKEN_KEY)).toBe('not json');
  });
  it('Preferences が固まっても上限の時間で終わる', async () => {
    vi.useFakeTimers();
    try {
      const hang = new Promise<never>(() => {});
      const stuck: PrefsLike = { get: () => hang, set: () => hang, keys: () => hang };
      let done = false;
      const p = restoreSaves(fakeStore(), stuck, 1500).then(() => { done = true; });
      await vi.advanceTimersByTimeAsync(1499);
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(2);
      await p;
      expect(done).toBe(true);
    } finally { vi.useRealTimers(); }
  });
});
