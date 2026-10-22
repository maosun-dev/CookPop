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
});
