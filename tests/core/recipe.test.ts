import { describe, it, expect } from 'vitest';
import { CATS, legacyCat, parseVideoId, thumbUrl, newRecipe, sanitizeRecipe, defaultRecipes, findByVideoId } from '../../src/core/recipe';

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
  it('https:// の無いリンクも読める', () => {
    expect(parseVideoId('youtu.be/HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('www.youtube.com/watch?v=HzLAMA5ck_8')).toBe('HzLAMA5ck_8');
    expect(parseVideoId('ただの文字')).toBeNull();
  });
  it('YouTube でない・ID が無い・壊れているときは null', () => {
    expect(parseVideoId('https://example.com/watch?v=HzLAMA5ck_8')).toBeNull();
    expect(parseVideoId('https://evilyoutube.com/watch?v=HzLAMA5ck_8')).toBeNull();
    expect(parseVideoId('javascript://youtu.be/HzLAMA5ck_8')).toBeNull();
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
      channel: '', thumb: 'https://i.ytimg.com/vi/HzLAMA5ck_8/hqdefault.jpg', memo: '', fav: false, tags: [], addedAt: '2026-10-23',
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
    const ok = { id: 'a', videoId: 'HzLAMA5ck_8', url: 'https://youtu.be/HzLAMA5ck_8', name: 'n', cat: '汁物', channel: 'c', thumb: 'https://i.ytimg.com/vi/HzLAMA5ck_8/hqdefault.jpg', memo: 'm', fav: true, tags: [], addedAt: '2026-10-23' };
    expect(sanitizeRecipe(ok)).toEqual(ok);
  });
  it('id・videoId・name が無ければ null', () => {
    expect(sanitizeRecipe({ videoId: 'x', name: 'n' })).toBeNull();
    expect(sanitizeRecipe({ id: 'a', name: 'n' })).toBeNull();
    expect(sanitizeRecipe({ id: 'a', videoId: 'x', name: '' })).toBeNull();
    expect(sanitizeRecipe(null)).toBeNull();
    expect(sanitizeRecipe('文字')).toBeNull();
  });
  it('動画 ID の形がおかしければ捨てる', () => {
    expect(sanitizeRecipe({ id: 'a', videoId: "'><img>", name: 'n' })).toBeNull();
    expect(sanitizeRecipe({ id: 'a', videoId: 'abc', name: 'n' })).toBeNull();
  });
  it('url が動画と合わなければ watch 形式に、thumb が https でなければ thumbUrl に直す', () => {
    const watch = 'https://www.youtube.com/watch?v=HzLAMA5ck_8';
    const base = { id: 'a', videoId: 'HzLAMA5ck_8', name: 'n' };
    expect(sanitizeRecipe({ ...base, url: 'javascript:alert(1)' })!.url).toBe(watch);
    expect(sanitizeRecipe({ ...base, url: 'https://youtu.be/m10e2igEArE' })!.url).toBe(watch);
    expect(sanitizeRecipe({ ...base, thumb: 'http://x' })!.thumb).toBe(thumbUrl('HzLAMA5ck_8'));
    expect(sanitizeRecipe({ ...base, thumb: 'data:image/png;base64,AAAA' })!.thumb).toBe(thumbUrl('HzLAMA5ck_8'));
  });
  it('name は前後の空白を取って 40 文字で切り、空なら捨てる。channel・memo も切る', () => {
    const base = { id: 'a', videoId: 'HzLAMA5ck_8' };
    expect(sanitizeRecipe({ ...base, name: '   ' })).toBeNull();
    expect(sanitizeRecipe({ ...base, name: 'あ'.repeat(50) })!.name).toBe('あ'.repeat(40));
    expect(sanitizeRecipe({ ...base, name: ' n ', channel: ' c ', memo: ' m ' })).toMatchObject({ name: 'n', channel: 'c', memo: 'm' });
    expect(sanitizeRecipe({ ...base, name: 'n', channel: 'い'.repeat(50), memo: 'う'.repeat(500) })).toMatchObject({ channel: 'い'.repeat(40), memo: 'う'.repeat(400) });
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
  it('8品あり、id は d-<videoId>、ジャンルは7つの中', () => {
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

describe('旧ジャンルの振り分けとタグ', () => {
  const base = { id: 'a', videoId: 'HzLAMA5ck_8', name: 'n' };
  it('legacyCat', () => {
    expect(legacyCat('きつねうどん')).toBe('麺');
    expect(legacyCat('親子丼')).toBe('ご飯');
  });
  it('ご飯・麺は料理名で振り分ける', () => {
    expect(sanitizeRecipe({ ...base, cat: 'ご飯・麺', name: '焼きそば' })!.cat).toBe('麺');
    expect(sanitizeRecipe({ ...base, cat: 'ご飯・麺', name: 'チャーハン' })!.cat).toBe('ご飯');
  });
  it('最初の8品の3品は決まったジャンルへ', () => {
    const fix = (v: string, name: string) => sanitizeRecipe({ id: 'd-' + v, videoId: v, name, cat: 'ご飯・麺' })!.cat;
    expect(fix('dbv6nPx4e3c', 'オムそば')).toBe('麺');
    expect(fix('fsUZY-9V1TI', 'お弁当')).toBe('ご飯');
    expect(fix('30kBepMXiVE', 'ベーコンエッグサンド')).toBe('パン');
  });
  it('tags の検証', () => {
    expect(sanitizeRecipe({ ...base, tags: [' 時短 ', '時短', 3] })!.tags).toEqual(['時短']);
    expect(sanitizeRecipe({ ...base, tags: Array.from({ length: 11 }, (_, i) => 't' + i) })!.tags).toHaveLength(10);
    expect(sanitizeRecipe(base)!.tags).toEqual([]);
  });
});
