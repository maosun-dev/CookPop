// 共有（YouTube アプリの「共有」→ クックポップ）で届いた文字から、YouTube のリンクを探して知らせる。
import { parseVideoId } from '../core/recipe';

export interface ShareEventLike {
  title?: string;
  texts?: string[];
}

export interface ShareTargetLike {
  addListener(ev: 'shareReceived', fn: (e: ShareEventLike) => void): Promise<unknown> | unknown;
}

// 語の前についたかっこ・引用符
const LEADING = /^[(\[{（［｛「『"'“‘<＜]+/;
// 語の終わりについた句読点・かっこを落とす
const TRAILING = /[)\]}）］｝」』、。，．,.;；!！?？"'”’>＞]+$/;

/** 文字の中から最初に YouTube と読めるリンクを返す。texts を先に、次に title を調べる。無ければ null */
export function findYouTubeUrl(texts: string[], title?: string): string | null {
  const sources = [...texts, ...(title ? [title] : [])];
  for (const text of sources) {
    for (const word of text.split(/[\s　]+/)) {
      const token = word.replace(LEADING, '').replace(TRAILING, '');
      if (token && parseVideoId(token) !== null) return token;
    }
  }
  return null;
}

/** 共有を受け取ったら、リンクがあれば onUrl、無ければ onNone を呼ぶ */
export function listenShares(plugin: ShareTargetLike, onUrl: (url: string) => void, onNone: () => void): void {
  void Promise.resolve(
    plugin.addListener('shareReceived', e => {
      const url = findYouTubeUrl(e.texts ?? [], e.title);
      if (url) onUrl(url);
      else onNone();
    }),
  ).catch(() => {});
}
