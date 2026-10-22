// 料理の形（Recipe）と、YouTube のリンクの解析。
import { isDateStr } from './date';

export const CATS = ['主菜', '副菜', '汁物', 'ご飯・麺', 'おやつ'] as const;
export type Cat = typeof CATS[number];

export interface Recipe {
  id: string;
  videoId: string;
  url: string;
  name: string;
  cat: Cat;
  channel: string;
  thumb: string;
  memo: string;
  fav: boolean;
  /** 追加した日。'YYYY-MM-DD'（不明なら空文字） */
  addedAt: string;
}

export interface RecipeInput {
  url: string;
  name: string;
  cat: Cat;
  channel?: string;
  thumb?: string;
  memo?: string;
}

// core の型検査は DOM の型を持たないので、使う分だけ URL の形をここで宣言する（実行時は標準の URL）
interface ParsedUrl {
  protocol: string;
  hostname: string;
  pathname: string;
  searchParams: { get(name: string): string | null };
}
declare const URL: new (url: string) => ParsedUrl;

const NAME_MAX = 40;
const MEMO_MAX = 400;
const DEFAULT_CHANNEL = 'Koh Kentetsu Kitchen';

/** 動画 ID として使える形か */
const VIDEO_ID_PATTERN = /^[\w-]{6,}$/;

function validId(s: string | null | undefined): string | null {
  return s != null && VIDEO_ID_PATTERN.test(s) ? s : null;
}

function isHostOf(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

/** YouTube のリンクから動画 ID を取る。https:// が無ければ補って読む。読めなければ null */
export function parseVideoId(url: string): string | null {
  const text = url.trim();
  let u: ParsedUrl;
  try {
    u = new URL(text.includes('://') ? text : 'https://' + text);
  } catch {
    return null;
  }
  // javascript://youtu.be/… のような形を通さない
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  const parts = u.pathname.split('/').filter(Boolean);
  if (host === 'youtu.be') {
    return validId(parts[0]);
  }
  if (isHostOf(host, 'youtube.com') || isHostOf(host, 'youtube-nocookie.com')) {
    const v = u.searchParams.get('v');
    if (v) return validId(v);
    if (parts.length >= 2 && ['shorts', 'embed', 'live'].includes(parts[0])) {
      return validId(parts[1]);
    }
  }
  return null;
}

/** サムネイル画像の URL */
export function thumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** 文字数で切る（サロゲートペアを壊さないよう、1文字ずつ数える） */
function clip(s: string, max: number): string {
  return Array.from(s).slice(0, max).join('');
}

/** リンクと名前から料理を作る。リンクが読めない・名前が空なら null */
export function newRecipe(input: RecipeInput, id: string, today: string): Recipe | null {
  const videoId = parseVideoId(input.url);
  if (!videoId) return null;
  const name = clip(input.name.trim(), NAME_MAX);
  if (!name) return null;
  return {
    id,
    videoId,
    url: input.url.trim(),
    name,
    cat: input.cat,
    channel: input.channel ?? '',
    thumb: input.thumb || thumbUrl(videoId),
    memo: clip((input.memo ?? '').trim(), MEMO_MAX),
    fav: false,
    addedAt: today,
  };
}

function str(x: unknown): string {
  return typeof x === 'string' ? x : '';
}

/** 保存から読んだ値を検証して、正しい形の料理にする。直せないときは null */
export function sanitizeRecipe(x: unknown): Recipe | null {
  if (typeof x !== 'object' || x === null) return null;
  const o = x as Record<string, unknown>;
  const id = str(o.id);
  const videoId = str(o.videoId);
  if (!id || !VIDEO_ID_PATTERN.test(videoId)) return null;
  const name = clip(str(o.name).trim(), NAME_MAX);
  if (!name) return null;
  const url = str(o.url).trim();
  const thumb = str(o.thumb);
  const cat = (CATS as readonly unknown[]).includes(o.cat) ? (o.cat as Cat) : '主菜';
  return {
    id,
    videoId,
    url: parseVideoId(url) === videoId ? url : watchUrl(videoId),
    name,
    cat,
    channel: clip(str(o.channel).trim(), NAME_MAX),
    thumb: thumb.startsWith('https://') ? thumb : thumbUrl(videoId),
    memo: clip(str(o.memo).trim(), MEMO_MAX),
    fav: o.fav === true,
    addedAt: isDateStr(o.addedAt) ? o.addedAt : '',
  };
}

/** 試作の8品（動画 ID・名前・ジャンル） */
const DEFAULT_SOURCE: ReadonlyArray<readonly [string, string, Cat]> = [
  ['HzLAMA5ck_8', 'よだれ水餃子', '主菜'],
  ['m10e2igEArE', 'チキンプルコギ', '主菜'],
  ['kd6n-8uQdWo', '豚プルコギ', '主菜'],
  ['4pi3UGSfvig', '豆腐つくね', '主菜'],
  ['HMWVJFsgfQY', 'ポン酢チキン', '主菜'],
  ['dbv6nPx4e3c', 'オムそば', 'ご飯・麺'],
  ['fsUZY-9V1TI', 'スパムとキムチごはんのお弁当', 'ご飯・麺'],
  ['30kBepMXiVE', 'ベーコンエッグサンド', 'ご飯・麺'],
];

/** 最初に入れておく8品。today は追加した日として入れる */
export function defaultRecipes(today: string): Recipe[] {
  return DEFAULT_SOURCE.map(([videoId, name, cat]) => ({
    id: 'd-' + videoId,
    videoId,
    url: watchUrl(videoId),
    name,
    cat,
    channel: DEFAULT_CHANNEL,
    thumb: thumbUrl(videoId),
    memo: '',
    fav: false,
    addedAt: today,
  }));
}

/** 動画 ID が同じ料理を探す */
export function findByVideoId(recipes: Recipe[], videoId: string): Recipe | undefined {
  return recipes.find(r => r.videoId === videoId);
}
