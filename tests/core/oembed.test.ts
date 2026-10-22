import { describe, it, expect } from 'vitest';
import { oembedUrl, parseOembed, fetchMeta } from '../../src/core/oembed';

describe('oEmbed', () => {
  it('URL を組み立てる', () => {
    expect(oembedUrl('HzLAMA5ck_8')).toBe('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DHzLAMA5ck_8&format=json');
  });
  it('返事を読む', () => {
    expect(parseOembed({ title: 'よだれ水餃子', author_name: 'Koh Kentetsu Kitchen', thumbnail_url: 'https://i.ytimg.com/vi/x/hqdefault.jpg' }))
      .toEqual({ title: 'よだれ水餃子', channel: 'Koh Kentetsu Kitchen', thumb: 'https://i.ytimg.com/vi/x/hqdefault.jpg' });
    expect(parseOembed({ title: 't' })).toEqual({ title: 't', channel: '', thumb: '' });
  });
  it('https でないサムネイルは使わない', () => {
    expect(parseOembed({ title: 't', thumbnail_url: 'javascript:x' })).toEqual({ title: 't', channel: '', thumb: '' });
    expect(parseOembed({ title: 't', thumbnail_url: 'http://x/a.jpg' })!.thumb).toBe('');
  });
  it('題が無い・JSON でないときは null', () => {
    expect(parseOembed({ author_name: 'x' })).toBeNull();
    expect(parseOembed({ title: '' })).toBeNull();
    expect(parseOembed('文字')).toBeNull();
    expect(parseOembed(null)).toBeNull();
  });
  it('取ってきて読む。失敗と時間切れは null', async () => {
    const ok = async () => ({ title: 't', author_name: 'c', thumbnail_url: 'https://i.ytimg.com/u.jpg' });
    expect(await fetchMeta('v', ok)).toEqual({ title: 't', channel: 'c', thumb: 'https://i.ytimg.com/u.jpg' });
    expect(await fetchMeta('v', async () => { throw new Error('x'); })).toBeNull();
    expect(await fetchMeta('v', () => new Promise(() => {}), 20)).toBeNull();
  });
  it('渡した URL が oembedUrl と同じ', async () => {
    let seen = '';
    await fetchMeta('abc123', async (u) => { seen = u; return { title: 't' }; });
    expect(seen).toBe(oembedUrl('abc123'));
  });
});
