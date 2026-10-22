// iPhone アプリ（Capacitor）だけで使う部品：共有シート・ファイル選択・クリップボード・外のブラウザ。
// 本物のプラグインは main.ts から渡す。ここでは使う分だけの型を書き、テストでは偽物を渡す。
import type { FileDeps } from './files';

export interface FsLike {
  writeFile(o: { path: string; data: string; directory: string; encoding: string }): Promise<{ uri: string }>;
}
export interface ShareLike {
  share(o: { title: string; files: string[] }): Promise<unknown>;
}
export interface PickerLike {
  pickFiles(o: { types: string[]; limit: number; readData: boolean }): Promise<{ files: { data?: string; name: string; mimeType: string }[] }>;
}
export interface ClipboardLike {
  read(): Promise<{ value: string; type: string }>;
}
// @capacitor/app 8 には openUrl が無い。window.open(_blank) を Capacitor の iOS 側が Safari に渡す
export interface WindowLike {
  open(url: string, target: string): unknown;
}

// Capacitor の enum の中身（Directory.Cache / Encoding.UTF8）。文字列で渡して plugin の型に依存しない
const CACHE_DIR = 'CACHE';
const UTF8 = 'utf8';

/** base64 を UTF-8 の文字列に戻す（日本語が化けないよう TextDecoder を通す） */
function decodeBase64Utf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}

/** 書き出しは一時フォルダに保存して共有シートへ、読み込みはファイル選択。
 *  決まり（FileDeps）：やめたときは null。失敗は投げる（画面が拾って知らせる） */
export function nativeFiles(plugins: { Filesystem: FsLike; Share: ShareLike; FilePicker: PickerLike }): FileDeps {
  const { Filesystem, Share, FilePicker } = plugins;
  return {
    async saveText(name, text) {
      // 書き出しの失敗はそのまま投げる（画面が「書き出せませんでした」を出す）
      const { uri } = await Filesystem.writeFile({ path: name, data: text, directory: CACHE_DIR, encoding: UTF8 });
      // 共有シートを閉じる（キャンセル）と iPhone では例外になるので、ここだけ握る
      try {
        await Share.share({ title: name, files: [uri] });
      } catch {
        /* キャンセルは何もしない */
      }
    },
    async pickText() {
      let files: { data?: string }[];
      try {
        // iOS は MIME 型だけを解釈する
        ({ files } = await FilePicker.pickFiles({ types: ['application/json', 'text/plain'], limit: 1, readData: true }));
      } catch (e) {
        // 選ぶのをやめたときの例外は null。それ以外は投げる
        if (e instanceof Error && e.message.includes('canceled')) return null;
        throw e;
      }
      const data = files[0]?.data;
      // 壊れた base64 などの失敗は投げる
      return data ? decodeBase64Utf8(data) : null;
    },
  };
}

/** クリップボードの文字を読む。文字以外（画像など）や失敗は空文字 */
export function nativeClipboardRead(Clipboard: ClipboardLike): () => Promise<string> {
  return async () => {
    try {
      const r = await Clipboard.read();
      return r.type.startsWith('text/plain') && typeof r.value === 'string' ? r.value : '';
    } catch {
      return '';
    }
  };
}

/** 外のブラウザで開く。失敗は握る */
export function nativeOpenExternal(win: WindowLike): (url: string) => void {
  return url => {
    try {
      win.open(url, '_blank');
    } catch {
      /* 開けなくても何もしない */
    }
  };
}
