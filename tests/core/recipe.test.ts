import { describe, it, expect } from 'vitest';
import { CATS, parseVideoId, thumbUrl, newRecipe, sanitizeRecipe, defaultRecipes, findByVideoId } from '../../src/core/recipe';

describe('リンクの解析', () => {
  it('youtube.com / youtu.be / shorts / live / embed / m. / nocookie から ID を取る', () => {
    expect(parseVideoId('https://www.youtube.com/watch?v=HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://youtu.be/HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://youtu.be/HzLAMA5ck_8?si=abc')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://www.youtube.com/shorts/HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://www.youtube.com/live/HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://www.youtube.com/embed/HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://m.youtube.com/watch?v=HzLAMA5ck_8&t=30s&list=PL1')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('https://www.youtube-nocookie.com/embed/HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('  https://youtu.be/HzLAMA5ck_8  ')).toBe('HzLAMA5ck_8');
  });
  it('YouTube でない・ID が無い・壊れているときは null', () => {
    expect(parseVideoId('https://example.com/watch?v=HzLAMA5ck_8')).toBeNull();
    expect(parseVideoId('https://www.youtube.com/')).toBeNull();
    expect(parseVideoId('https://www.youtube.com/watch?v=')).toBeNull();
    expect(parseVideoId('ただの文字')).toBeNull();
    expect(parseVideoId('')).toBeNull();
  });
  it('サムネイルの URL', () => {
    expect(thumbUrl('HzLAMA5ck_8')).toBe('https://i.ytimg.com/vi/HzLAMA5ck_8/hqdefault.jpg');
  });
});

describe('料理を作る', () => {
  it('リンクと名前から作る。足りない項目は埋まる', () => {
    const r = newRecipe({ url: 'https://youtu.be/HzLAMA5ck_8', name: '  よだれ水餃子 ', cat: '主菜' }, 'r1', '2026-10-23');
    expect(r).toEqual({
      id: 'r1', videoId: 'HzLAMA5ck_8', url: 'https://youtu.be/HzLAMA5ck_8', name: 'よだれ水餃子', cat: '主菜',
      channel: '', thumb: 'https://i.ytimg.com/vi/HzLAMA5ck_8/hqdefault.jpg', memo: '', fav: false, addedAt: '2026-10-23',
    });
  });
  it('名前は 40 文字、メモは 400 文字で切る', () => {
    const r = newRecipe({ url: 'https://youtu.be/HzLAMA5ck_8', name: 'あ'.repeat(50), cat: '副菜', memo: 'い'.repeat(500) }, 'r1', '2026-10-23')!;
    expect(r.name).toBe('あ'.repeat(40));
    expect(r.memo).toBe('い'.repeat(400));
  });
  it('リンクが読めない・名前が空なら null', () => {
    expect(newRecipe({ url: 'https://example.com', name: 'x', cat: '主菜' }, 'r1', '2026-10-23')).toBeNull();
    expect(newRecipe({ url: 'https://youtu.be/HzLAMA5ck_8', name: '   ', cat: '主菜' }, 'r1', '2026-10-23')).toBeNull();
  });
});

describe('保存から読むときの検証', () => {
  it('正しいものはそのまま', () => {
    const ok = { id: 'a', videoId: 'HzLAMA5ck_8', url: 'u', name: 'n', cat: '汁物', channel: 'c', thumb: 't', memo: 'm', fav: true, addedAt: '2026-10-23' };
    expect(sanitizeRecipe(ok)).toEqual(ok);
  });
  it('id・videoId・name が無ければ null', () => {
    expect(sanitizeRecipe({ videoId: 'x', name: 'n' })).toBeNull();
    expect(sanitizeRecipe({ id: 'a', name: 'n' })).toBeNull();
    expect(sanitizeRecipe({ id: 'a', videoId: 'x', name: '' })).toBeNull();
    expect(sanitizeRecipe(null)).toBeNull();
    expect(sanitizeRecipe('文字')).toBeNull();
  });
  it('おかしな項目は既定に直す', () => {
    const r = sanitizeRecipe({ id: 'a', videoId: 'HzLAMA5ck_8', name: 'n', cat: '謎', fav: 'yes', addedAt: '昨日', memo: 3 })!;
    expect(r.cat).toBe('主菜');
    expect(r.fav).toBe(false);
    expect(r.addedAt).toBe('');
    expect(r.memo).toBe('');
    expect(r.channel).toBe('');
    expect(r.thumb).toBe('https://i.ytimg.com/vi/HzLAMA5ck_8/hqdefault.jpg');
    expect(r.url).toBe('https://www.youtube.com/watch?v=HzLAMA5ck_8');
  });
});

describe('最初の8品', () => {
  it('8品あり、id は d-<videoId>、ジャンルは5つの中', () => {
    const rs = defaultRecipes('2026-10-23');
    expect(rs).toHaveLength(8);
    for (const r of rs) {
      expect(r.id).toBe('d-' + r.videoId);
      expect(CATS).toContain(r.cat);
      expect(r.channel).toBe('Koh Kentetsu Kitchen');
      expect(r.addedAt).toBe('2026-10-23');
    }
    expect(rs.map(r => r.name)).toContain('よだれ水餃子');
    expect(findByVideoId(rs, 'dbv6nPx4e3c')?.name).toBe('オムそば');
    expect(findByVideoId(rs, 'nai')).toBeUndefined();
  });
});
