// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { thumbImg } from '../../src/app/thumb';

describe('サムネイル', () => {
  it('読めないときは代わりの絵に置き換わる', () => {
    const wrap = document.createElement('div');
    const img = thumbImg('https://example.invalid/x.jpg', '料理');
    wrap.append(img);
    expect(img.tagName).toBe('IMG');
    img.dispatchEvent(new Event('error'));
    expect(wrap.querySelector('img')).toBeNull();
    expect(wrap.querySelector('.thumb-fallback svg')).not.toBeNull();
  });
  const withSize = (w: number, h: number) => {
    const wrap = document.createElement('div');
    const img = thumbImg('https://example.invalid/x.jpg', '料理');
    wrap.append(img);
    Object.defineProperty(img, 'naturalWidth', { value: w });
    Object.defineProperty(img, 'naturalHeight', { value: h });
    img.dispatchEvent(new Event('load'));
    return wrap;
  };
  it('YouTube が返す 120×90 の灰色の画像（動画が無いとき）は代わりの絵に置き換わる', () => {
    const wrap = withSize(120, 90);
    expect(wrap.querySelector('img')).toBeNull();
    expect(wrap.querySelector('.thumb-fallback svg')).not.toBeNull();
  });
  it('ふつうの大きさ（480×360）の画像はそのまま残る', () => {
    const wrap = withSize(480, 360);
    expect(wrap.querySelector('img')).not.toBeNull();
    expect(wrap.querySelector('.thumb-fallback')).toBeNull();
  });
});
