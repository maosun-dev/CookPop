import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// サイト側のリポジトリにある動画ページを検査する（無い環境では飛ばす）
const p = path.resolve(__dirname, '../../../maosun-dev.github.io/cookpop/player.html');

describe.skipIf(!existsSync(p))('動画だけを流すページ', () => {
  const html = () => readFileSync(p, 'utf8');

  it('検索に載せない noindex がある', () => {
    expect(html()).toMatch(/<meta name="robots" content="noindex">/);
  });
  it('YouTube の iframe_api 以外の外部スクリプトを読まない', () => {
    const srcs = [...html().matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map(m => m[1]);
    expect(srcs.filter(s => !s.includes('youtube.com/iframe_api'))).toEqual([]);
    expect(html()).toContain('https://www.youtube.com/iframe_api');
  });
  it('親との約束の文字列がある', () => {
    for (const s of ['cookpop-player', 'cookpop-app', 'ready', 'error', 'pause']) expect(html()).toContain(s);
  });
  it('動画IDの形を確かめている', () => {
    expect(html()).toContain(String.raw`/^[\w-]{6,20}$/`);
  });
  it('innerHTML を使っていない', () => {
    expect(html()).not.toContain('innerHTML');
  });
});
