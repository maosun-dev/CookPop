// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { openPlayer, pauseAllPlayers, loadYouTubeApi, type YTLike } from '../../src/app/player';

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
  it('pauseAllPlayers で開いている全部が止まる。destroy 済みは呼ばれない', async () => {
    const paused: string[] = [];
    const yt: YTLike = { Player: class {
      id: string;
      constructor(_h: HTMLElement, o: { videoId: string; events?: { onReady?: () => void } }) { this.id = o.videoId; queueMicrotask(() => o.events?.onReady?.()); }
      destroy() {}
      pauseVideo() { paused.push(this.id); }
    } };
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    const hostC = document.createElement('div');
    document.body.append(hostA, hostB, hostC);
    openPlayer(hostA, 'aaaaaaaaaaa', { loadApi: async () => yt });
    openPlayer(hostB, 'bbbbbbbbbbb', { loadApi: async () => yt });
    openPlayer(hostC, 'ccccccccccc', { loadApi: async () => yt });
    await tick();
    // C は同じ場所で開き直す＝前の ccc は destroy される
    openPlayer(hostC, 'ddddddddddd', { loadApi: async () => yt });
    await tick();
    pauseAllPlayers();
    expect(paused.sort()).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb', 'ddddddddddd']);
    // pauseVideo が無い・投げるプレーヤーがいても止まらない
    const bad: YTLike = { Player: class { constructor() {} destroy() {} pauseVideo() { throw new Error('not ready'); } } };
    const hostD = document.createElement('div');
    document.body.append(hostD);
    openPlayer(hostD, 'eeeeeeeeeee', { loadApi: async () => bad });
    await tick();
    expect(() => pauseAllPlayers()).not.toThrow();
    hostA.remove(); hostB.remove(); hostC.remove(); hostD.remove();
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
