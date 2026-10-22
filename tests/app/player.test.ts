// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { openPlayer, loadYouTubeApi, type YTLike } from '../../src/app/player';

function fakeYT(fail: boolean): YTLike {
  return { Player: class { constructor(_h: HTMLElement, o: { events?: { onReady?: () => void; onError?: (e: { data: number }) => void } }) {
    queueMicrotask(() => fail ? o.events?.onError?.({ data: 150 }) : o.events?.onReady?.());
  } destroy() {} } };
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('プレーヤー', () => {
  it('API が読めて再生できるときは枠が残り、YouTube で開く のリンクもある', async () => {
    const host = document.createElement('div');
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => fakeYT(false) });
    expect(host.textContent).toContain('読み込み中');
    await tick();
    expect(host.querySelector('.player')).not.toBeNull();
    expect(host.textContent).not.toContain('再生できません');
    const a = host.querySelector('a[href="https://www.youtube.com/watch?v=HzLAMA5ck_8"]');
    expect(a).not.toBeNull();
  });
  it('埋め込み禁止（onError）なら YouTube で開く に切り替わる', async () => {
    const host = document.createElement('div');
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => fakeYT(true) });
    await tick();
    expect(host.textContent).toContain('再生できません');
    expect(host.querySelectorAll('a[href="https://www.youtube.com/watch?v=HzLAMA5ck_8"]').length).toBeGreaterThanOrEqual(1);
  });
  it('API が読めないときも同じ。openExternal があれば click でそれを呼ぶ', async () => {
    const host = document.createElement('div');
    const opened: string[] = [];
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => { throw new Error('offline'); }, openExternal: u => { opened.push(u); } });
    await tick();
    (host.querySelector('a.btn') as HTMLElement).click();
    expect(opened).toEqual(['https://www.youtube.com/watch?v=HzLAMA5ck_8']);
  });
  it('枠の下の小さなリンクも openExternal で開く', async () => {
    const host = document.createElement('div');
    const opened: string[] = [];
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => fakeYT(false), openExternal: u => { opened.push(u); } });
    await tick();
    (host.querySelector('a.muted') as HTMLElement).click();
    expect(opened).toEqual(['https://www.youtube.com/watch?v=HzLAMA5ck_8']);
  });
  it('同じ場所で開き直したら、前のプレーヤーを destroy する', async () => {
    const host = document.createElement('div');
    let destroyed = 0;
    const yt: YTLike = { Player: class { constructor(_h: HTMLElement, o: { events?: { onReady?: () => void } }) {
      queueMicrotask(() => o.events?.onReady?.());
    } destroy() { destroyed++; } } };
    openPlayer(host, 'aaaaaaaaaaa', { loadApi: async () => yt });
    await tick();
    openPlayer(host, 'bbbbbbbbbbb', { loadApi: async () => yt });
    expect(destroyed).toBe(1);
    await tick();
    expect(host.querySelectorAll('.player')).toHaveLength(1);
  });
  it('読み込み待ちの途中で開き直しても、古いほうは何も描かない', async () => {
    const host = document.createElement('div');
    let release: (y: YTLike) => void = () => {};
    const slow = new Promise<YTLike>(r => { release = r; });
    openPlayer(host, 'aaaaaaaaaaa', { loadApi: () => slow });
    openPlayer(host, 'bbbbbbbbbbb', { loadApi: async () => { throw new Error('offline'); } });
    await tick();
    release(fakeYT(false));
    await tick();
    expect(host.textContent).toContain('再生できません');
    expect(host.querySelectorAll('.player')).toHaveLength(1);
  });
});

describe('YouTube API の読み込み', () => {
  afterEach(() => { delete (window as unknown as { YT?: unknown }).YT; });

  it('すでに window.YT.Player があればすぐ返し、script は足さない', async () => {
    const yt = fakeYT(false);
    (window as unknown as { YT: YTLike }).YT = yt;
    const doc = document.implementation.createHTMLDocument('t');
    expect(await loadYouTubeApi(doc)).toBe(yt);
    expect(doc.querySelectorAll('script')).toHaveLength(0);
  });
  it('script を1回だけ足し、onYouTubeIframeAPIReady で YT を返す。2回目は同じ Promise', async () => {
    delete (window as unknown as { YT?: unknown }).YT;
    const doc = document.implementation.createHTMLDocument('t');
    const p1 = loadYouTubeApi(doc);
    const p2 = loadYouTubeApi(doc);
    expect(p2).toBe(p1);
    expect(doc.querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')).toHaveLength(1);
    const yt = fakeYT(false);
    (window as unknown as { YT: YTLike }).YT = yt;
    (window as unknown as { onYouTubeIframeAPIReady: () => void }).onYouTubeIframeAPIReady();
    expect(await p1).toBe(yt);
  });
});
