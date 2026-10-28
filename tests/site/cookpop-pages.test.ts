import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

// サイト側のリポジトリにあるクックポップのページを検査する（無い環境では飛ばす）
const dir = path.resolve(__dirname, '../../../maosun-dev.github.io/cookpop');
const read = (f: string) => readFileSync(path.join(dir, f), 'utf8');

describe.skipIf(!existsSync(path.join(dir, 'player.html')))('サイトのクックポップのページ', () => {
  it('プライバシーポリシーに、保存先・広告・YouTube の決まりが書いてある', () => {
    const p = read('privacy.html');
    for (const s of ['iPhone の中', 'AdMob', 'YouTube API', 'https://www.youtube.com/t/terms', 'https://policies.google.com/privacy']) expect(p, s).toContain(s);
  });
  it('どちらのページも github.io のアドレスとメールアドレスを書かない', () => {
    for (const f of ['privacy.html', 'index.html']) {
      expect(read(f), f).not.toContain('maosun-dev.github.io');
      expect(read(f), f).not.toContain('@gmail.com');
    }
  });
  it('サポートページからプライバシーポリシーとお問い合わせへ行ける', () => {
    const s = read('index.html');
    expect(s).toContain('href="privacy.html"');
    expect(s).toContain('href="/support.html"');
  });
  it('サイトマップに2ページが載っている', () => {
    const m = readFileSync(path.join(dir, '../sitemap.xml'), 'utf8');
    expect(m).toContain('<loc>https://maosun-dev.com/cookpop/</loc>');
    expect(m).toContain('<loc>https://maosun-dev.com/cookpop/privacy.html</loc>');
  });
});
