// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { openPlayer, pauseAllPlayers } from '../../src/app/player';

const ORIGIN = 'https://maosun-dev.com';
const WATCH = 'https://www.youtube.com/watch?v=HzLAMA5ck_8';
const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

function mount(videoId = 'HzLAMA5ck_8', deps = {}) {
  const host = document.createElement('div');
  document.body.append(host);
  openPlayer(host, videoId, deps);
  const iframe = host.querySelector('iframe') as HTMLIFrameElement;
  return { host, iframe };
}
function send(iframe: HTMLIFrameElement, data: unknown, origin = ORIGIN) {
  window.dispatchEvent(new MessageEvent('message', { data, origin, source: iframe.contentWindow }));
}

describe('プレーヤー', () => {
  it('iframe の src は動画ページ。YouTube で開く のリンクもある', () => {
    const { host, iframe } = mount();
    expect(iframe.src).toBe('https://maosun-dev.com/cookpop/player.html?v=HzLAMA5ck_8');
    expect(host.textContent).toContain('読み込み中');
    expect(host.querySelector(`a[href="${WATCH}"]`)).not.toBeNull();
    host.remove();
  });
  it('正しい送り元の ready で「読み込み中」が消える。違う送り元の error は無視される', () => {
    const { host, iframe } = mount();
    send(iframe, { source: 'cookpop-player', event: 'error', code: 150 }, 'https://evil.example');
    expect(host.textContent).not.toContain('再生できません');
    send(iframe, { source: 'cookpop-player', event: 'ready' });
    expect(host.textContent).not.toContain('読み込み中');
    expect(host.querySelector('iframe')).not.toBeNull();
    host.remove();
  });
  it('正しい送り元の error で「再生できません」と a.btn に切り替わる', () => {
    const { host, iframe } = mount();
    send(iframe, { source: 'cookpop-player', event: 'error', code: 150 });
    expect(host.textContent).toContain('この動画はアプリの中では再生できません');
    expect(host.querySelector('a.btn')?.getAttribute('href')).toBe(WATCH);
    expect(host.querySelector('iframe')).toBeNull();
    host.remove();
  });
  it('時間切れで切り替わる。ready が来ていれば切り替わらない', async () => {
    const a = mount('HzLAMA5ck_8', { timeoutMs: 20 });
    const b = mount('bbbbbbbbbbb', { timeoutMs: 20 });
    send(b.iframe, { source: 'cookpop-player', event: 'ready' });
    await tick(60);
    expect(a.host.textContent).toContain('再生できません');
    expect(b.host.textContent).not.toContain('再生できません');
    a.host.remove();
    b.host.remove();
  });
  it('pauseAllPlayers で iframe に pause が送られる', () => {
    const { host, iframe } = mount();
    const spy = vi.spyOn(iframe.contentWindow!, 'postMessage');
    pauseAllPlayers();
    expect(spy).toHaveBeenCalledWith({ source: 'cookpop-app', command: 'pause' }, ORIGIN);
    host.remove();
  });
  it('開き直すと前の iframe には送られず、前の聞き耳も効かない', () => {
    const { host, iframe: first } = mount();
    const spy = vi.spyOn(first.contentWindow!, 'postMessage');
    openPlayer(host, 'bbbbbbbbbbb');
    pauseAllPlayers();
    expect(spy).not.toHaveBeenCalled();
    send(first, { source: 'cookpop-player', event: 'error' });
    expect(host.textContent).not.toContain('再生できません');
    expect(host.querySelectorAll('.player')).toHaveLength(1);
    host.remove();
  });
  it('openExternal があれば両方のリンクでそれを呼ぶ', () => {
    const opened: string[] = [];
    const { host, iframe } = mount('HzLAMA5ck_8', { openExternal: (u: string) => { opened.push(u); } });
    (host.querySelector('a.muted') as HTMLElement).click();
    send(iframe, { source: 'cookpop-player', event: 'error' });
    (host.querySelector('a.btn') as HTMLElement).click();
    expect(opened).toEqual([WATCH, WATCH]);
    host.remove();
  });
});
