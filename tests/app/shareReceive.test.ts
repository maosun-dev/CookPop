import { describe, it, expect, vi } from 'vitest';
import { findYouTubeUrl, listenShares, type ShareEventLike } from '../../src/app/shareReceive';

describe('findYouTubeUrl', () => {
  it('youtu.be の si 付きリンクを返す', () => {
    expect(findYouTubeUrl(['https://youtu.be/dQw4w9WgXcQ?si=abc'])).toBe('https://youtu.be/dQw4w9WgXcQ?si=abc');
  });
  it('題と混ざった文字からリンクだけ取り出す', () => {
    expect(findYouTubeUrl(['絶品オムライス https://youtu.be/dQw4w9WgXcQ'])).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(findYouTubeUrl(['題　https://youtu.be/dQw4w9WgXcQ\n続き'])).toBe('https://youtu.be/dQw4w9WgXcQ');
  });
  it('後ろの句読点・かっこを落とす', () => {
    expect(findYouTubeUrl(['(https://youtu.be/dQw4w9WgXcQ)。'])).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(findYouTubeUrl(['「https://youtu.be/dQw4w9WgXcQ」'])).toBe('https://youtu.be/dQw4w9WgXcQ');
  });
  it('shorts のリンクも読める', () => {
    expect(findYouTubeUrl(['https://www.youtube.com/shorts/dQw4w9WgXcQ'])).toBe('https://www.youtube.com/shorts/dQw4w9WgXcQ');
  });
  it('リンクが無ければ null', () => {
    expect(findYouTubeUrl(['ただの文字 https://example.com/a'])).toBeNull();
    expect(findYouTubeUrl([])).toBeNull();
  });
  it('title だけにリンクがあっても拾う。texts が先', () => {
    expect(findYouTubeUrl([], '見て https://youtu.be/dQw4w9WgXcQ')).toBe('https://youtu.be/dQw4w9WgXcQ');
    expect(findYouTubeUrl(['https://youtu.be/aaaaaaaaaaa'], 'https://youtu.be/bbbbbbbbbbb')).toBe('https://youtu.be/aaaaaaaaaaa');
  });
});

describe('listenShares', () => {
  function fake() {
    let fn: (e: ShareEventLike) => void = () => {};
    return { plugin: { addListener: vi.fn((_ev: 'shareReceived', f: (e: ShareEventLike) => void) => { fn = f; return Promise.resolve({}); }) }, send: (e: ShareEventLike) => fn(e) };
  }
  it('リンクがあれば onUrl', () => {
    const f = fake(); const onUrl = vi.fn(); const onNone = vi.fn();
    listenShares(f.plugin, onUrl, onNone);
    f.send({ texts: ['x https://youtu.be/dQw4w9WgXcQ'] });
    expect(onUrl).toHaveBeenCalledWith('https://youtu.be/dQw4w9WgXcQ');
    expect(onNone).not.toHaveBeenCalled();
  });
  it('リンクが無ければ onNone', () => {
    const f = fake(); const onUrl = vi.fn(); const onNone = vi.fn();
    listenShares(f.plugin, onUrl, onNone);
    f.send({ texts: ['https://example.com'] });
    f.send({});
    expect(onUrl).not.toHaveBeenCalled();
    expect(onNone).toHaveBeenCalledTimes(2);
  });
});
