// クリップボードに新しい動画のリンクがあれば、登録を提案する。
import { findByVideoId, parseVideoId } from '../core/recipe';
import type { AppData } from '../core/store';
import type { AppState } from './state';

/** 動画のリンクで、まだ登録しておらず、前に聞いたものと違うときだけ videoId を返す */
export function suggestFromClipboard(text: string, data: AppData): string | null {
  const videoId = parseVideoId(text.trim());
  if (!videoId) return null;
  if (findByVideoId(data.recipes, videoId)) return null;
  if (data.settings.lastClipboardVideoId === videoId) return null;
  return videoId;
}

export interface ClipboardWatchDeps {
  read: () => Promise<string>;
  state: AppState;
  /** url は貼られていた文字（前後の空白は除いたもの） */
  onSuggest: (videoId: string, url: string) => void;
  doc?: Document;
}

/** 起動直後・画面が見えるようになったとき・ウィンドウに戻ったときに調べる。戻り値で解除 */
export function watchClipboard(deps: ClipboardWatchDeps): () => void {
  const { read, state, onSuggest } = deps;
  const doc = deps.doc ?? document;
  // 続けて呼ばれても二重に聞かないための印
  let inFlight = false;

  async function check(): Promise<void> {
    if (inFlight || !state.data.settings.clipboardCheck) return;
    inFlight = true;
    try {
      let text: string;
      try {
        text = await read();
      } catch {
        // 読む許可がないなどは気にしない
        return;
      }
      // 読んでいる間に設定が切られていたら何もしない
      if (!state.data.settings.clipboardCheck) return;
      const videoId = suggestFromClipboard(text, state.data);
      if (!videoId) return;
      state.updateSettings({ lastClipboardVideoId: videoId });
      onSuggest(videoId, text.trim());
    } finally {
      inFlight = false;
    }
  }

  const onVisibility = () => {
    if (doc.visibilityState !== 'hidden') void check();
  };
  const onFocus = () => void check();

  doc.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('focus', onFocus);
  void check();

  return () => {
    doc.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('focus', onFocus);
  };
}
