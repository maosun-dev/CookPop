import { describe, it, expect, vi } from 'vitest';
import { nativeFiles, nativeClipboardRead, nativeOpenExternal } from '../../src/app/nativeDeps';

// 文字列を base64 にする（FilePicker が返す形）
const b64 = (s: string): string => Buffer.from(s, 'utf-8').toString('base64');

function fakePlugins(over: { share?: () => Promise<unknown>; pick?: () => Promise<unknown> } = {}) {
  const writeFile = vi.fn(async (_o: unknown) => ({ uri: 'file:///cache/cookpop-backup.json' }));
  const share = vi.fn(over.share ?? (async () => ({})));
  const pickFiles = vi.fn(over.pick ?? (async () => ({ files: [] })));
  return {
    writeFile,
    share,
    pickFiles,
    plugins: {
      Filesystem: { writeFile },
      Share: { share },
      FilePicker: { pickFiles },
    },
  };
}

describe('iPhone のファイル（nativeFiles）', () => {
  it('saveText は一時フォルダに書き、できた場所を共有シートに渡す', async () => {
    const f = fakePlugins();
    await nativeFiles(f.plugins as never).saveText('cookpop-backup-2026-10-23.json', '{"a":1}');
    expect(f.writeFile).toHaveBeenCalledWith({
      path: 'cookpop-backup-2026-10-23.json',
      data: '{"a":1}',
      directory: 'CACHE',
      encoding: 'utf8',
    });
    expect(f.share).toHaveBeenCalledWith({
      title: 'cookpop-backup-2026-10-23.json',
      files: ['file:///cache/cookpop-backup.json'],
    });
  });

  it('共有のキャンセル（例外）は握って投げない', async () => {
    const f = fakePlugins({ share: async () => { throw new Error('Share canceled'); } });
    await expect(nativeFiles(f.plugins as never).saveText('a.json', '{}')).resolves.toBeUndefined();
  });

  it('書き出し失敗は share を呼ばず、例外を投げる', async () => {
    const f = fakePlugins();
    f.writeFile.mockRejectedValueOnce(new Error('disk'));
    await expect(nativeFiles(f.plugins as never).saveText('a.json', '{}')).rejects.toThrow('disk');
    expect(f.share).not.toHaveBeenCalled();
  });

  it('pickText は選んだファイルの base64 を日本語の文字列に戻す', async () => {
    const text = '{"料理":"カレーライス🍛"}';
    const f = fakePlugins({ pick: async () => ({ files: [{ name: 'b.json', mimeType: 'application/json', data: b64(text) }] }) });
    expect(await nativeFiles(f.plugins as never).pickText()).toBe(text);
    expect(f.pickFiles).toHaveBeenCalledWith({
      types: ['application/json', 'text/plain'],
      limit: 1,
      readData: true,
    });
  });

  it('pickText は何も選ばれなければ null', async () => {
    const f = fakePlugins({ pick: async () => ({ files: [] }) });
    expect(await nativeFiles(f.plugins as never).pickText()).toBeNull();
  });

  it('pickText は中身（data）が無ければ null', async () => {
    const f = fakePlugins({ pick: async () => ({ files: [{ name: 'b.json', mimeType: 'application/json' }] }) });
    expect(await nativeFiles(f.plugins as never).pickText()).toBeNull();
  });

  it('pickText はキャンセルの例外（pickFiles canceled.）なら null', async () => {
    const f = fakePlugins({ pick: async () => { throw new Error('pickFiles canceled.'); } });
    expect(await nativeFiles(f.plugins as never).pickText()).toBeNull();
  });

  it('pickText はキャンセル以外の例外は投げる', async () => {
    const f = fakePlugins({ pick: async () => { throw new Error('boom'); } });
    await expect(nativeFiles(f.plugins as never).pickText()).rejects.toThrow('boom');
  });

  it('pickText は壊れた base64 なら投げる', async () => {
    const f = fakePlugins({ pick: async () => ({ files: [{ name: 'b.json', mimeType: 'application/json', data: '%%%壊れ' }] }) });
    await expect(nativeFiles(f.plugins as never).pickText()).rejects.toThrow();
  });
});

describe('iPhone のクリップボード（nativeClipboardRead）', () => {
  it('text/plain なら中身を返す', async () => {
    const read = nativeClipboardRead({ read: async () => ({ value: 'https://youtu.be/abc', type: 'text/plain' }) });
    expect(await read()).toBe('https://youtu.be/abc');
  });
  it('text/plain; charset=utf-8 のように続きがあっても読める', async () => {
    const read = nativeClipboardRead({ read: async () => ({ value: 'あ', type: 'text/plain; charset=utf-8' }) });
    expect(await read()).toBe('あ');
  });
  it('画像（image/png）は空文字', async () => {
    const read = nativeClipboardRead({ read: async () => ({ value: 'data:image/png;base64,AAAA', type: 'image/png' }) });
    expect(await read()).toBe('');
  });
  it('読むのに失敗したら空文字', async () => {
    const read = nativeClipboardRead({ read: async () => { throw new Error('denied'); } });
    expect(await read()).toBe('');
  });
});

describe('外のブラウザで開く（nativeOpenExternal）', () => {
  it('新しい窓として開く（Capacitor が Safari に渡す）', () => {
    const open = vi.fn();
    nativeOpenExternal({ open })('https://www.youtube.com/watch?v=abc');
    expect(open).toHaveBeenCalledWith('https://www.youtube.com/watch?v=abc', '_blank');
  });
  it('開くのに失敗しても投げない', () => {
    const open = vi.fn(() => { throw new Error('x'); });
    expect(() => nativeOpenExternal({ open })('https://example.com')).not.toThrow();
  });
});
