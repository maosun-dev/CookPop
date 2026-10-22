// YouTube の oEmbed から、動画の題・チャンネル・サムネイルを取る。
// 通信そのものは呼び出し側が渡す fetchJson に任せる（core は fetch を直接使わない）。

// core の型検査は DOM / Node の型を持たないので、使う分だけ時間の部品の形をここで宣言する（実行時は標準のもの）
declare function setTimeout(cb: () => void, ms: number): unknown;
declare function clearTimeout(id: unknown): void;

export interface VideoMeta {
  title: string;
  channel: string;
  thumb: string;
}

/** 動画 ID から oEmbed の問い合わせ先 URL を作る */
export function oembedUrl(videoId: string): string {
  return 'https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + videoId) + '&format=json';
}

/** oEmbed の返事を読む。題が空でない文字列でなければ null。チャンネル・サムネイルは文字列でなければ空文字 */
export function parseOembed(json: unknown): VideoMeta | null {
  if (typeof json !== 'object' || json === null) return null;
  const o = json as Record<string, unknown>;
  if (typeof o.title !== 'string' || o.title === '') return null;
  return {
    title: o.title,
    channel: typeof o.author_name === 'string' ? o.author_name : '',
    thumb: typeof o.thumbnail_url === 'string' ? o.thumbnail_url : '',
  };
}

/** URL を渡すと JSON を返す関数（通信は呼び出し側が用意する） */
export type FetchJson = (url: string) => Promise<unknown>;

/** 動画の情報を取る。通信が失敗・timeoutMs を過ぎる・返事が読めないときは null */
export async function fetchMeta(videoId: string, fetchJson: FetchJson, timeoutMs = 5000): Promise<VideoMeta | null> {
  let timer: unknown;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), timeoutMs);
  });
  try {
    const json = await Promise.race([fetchJson(oembedUrl(videoId)), timeout]);
    return parseOembed(json);
  } catch {
    return null;
  } finally {
    // 成功・失敗・時間切れのどれでもタイマーを止める（残すとプロセスが終わらない）
    clearTimeout(timer);
  }
}
