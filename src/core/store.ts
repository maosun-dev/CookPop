// 保存の形・読み込み・バックアップ。保存先は KeyValueStore の向こう側（ブラウザの localStorage など）。
import { defaultRecipes, findByVideoId, sanitizeRecipe, type Recipe } from './recipe';
import { sanitizeLogs, type CookLog } from './log';

/** 保存先の最小の形（localStorage がそのまま当てはまる） */
export interface KeyValueStore {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

export const DATA_KEY = 'cookpop.data';
/** 読めなかった保存データの退避先 */
export const BROKEN_KEY = 'cookpop.data.broken';
export const DATA_VERSION = 1;

export type Theme = 'auto' | 'light' | 'dark';
const THEMES: readonly unknown[] = ['auto', 'light', 'dark'];

export interface Settings {
  theme: Theme;
  clipboardCheck: boolean;
  noAds: boolean;
  lastClipboardUrl: string;
}

export const DEFAULT_SETTINGS: Settings = { theme: 'auto', clipboardCheck: true, noAds: false, lastClipboardUrl: '' };

export interface AppData {
  version: 1;
  recipes: Recipe[];
  logs: CookLog[];
  settings: Settings;
}

/** 最初の状態（最初の8品・記録なし・既定の設定） */
export function initialData(today: string): AppData {
  return { version: DATA_VERSION, recipes: defaultRecipes(today), logs: [], settings: { ...DEFAULT_SETTINGS } };
}

/** 保存から読んだ設定を項目ごとに検証する。おかしい項目は既定に戻す */
export function sanitizeSettings(x: unknown): Settings {
  const o: Record<string, unknown> = typeof x === 'object' && x !== null ? (x as Record<string, unknown>) : {};
  return {
    theme: THEMES.includes(o.theme) ? (o.theme as Theme) : DEFAULT_SETTINGS.theme,
    clipboardCheck: typeof o.clipboardCheck === 'boolean' ? o.clipboardCheck : DEFAULT_SETTINGS.clipboardCheck,
    noAds: typeof o.noAds === 'boolean' ? o.noAds : DEFAULT_SETTINGS.noAds,
    lastClipboardUrl: typeof o.lastClipboardUrl === 'string' ? o.lastClipboardUrl : '',
  };
}

/** 文字列から保存データを読む。JSON でない・オブジェクトでない・新しい版のときは null（今は版1だけなので読み替えはしない） */
export function parseData(raw: string): AppData | null {
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
  // 新しい版のアプリで作ったデータは、読み違えないよう読まない
  if (typeof o.version === 'number' && o.version > DATA_VERSION) return null;
  const recipes: Recipe[] = [];
  if (Array.isArray(o.recipes)) {
    for (const item of o.recipes) {
      const r = sanitizeRecipe(item);
      if (r) recipes.push(r);
    }
  }
  return {
    version: DATA_VERSION,
    recipes,
    logs: sanitizeLogs(o.logs),
    settings: sanitizeSettings(o.settings),
  };
}

/** 保存から読む。無ければ最初の状態。読めなければ元の文字列を退避して最初の状態 */
export function loadData(st: KeyValueStore, today: string): AppData {
  const raw = st.getItem(DATA_KEY);
  if (raw === null || raw === '') return initialData(today);
  const data = parseData(raw);
  if (data) return data;
  st.setItem(BROKEN_KEY, raw);
  return initialData(today);
}

export function saveData(st: KeyValueStore, data: AppData): void {
  st.setItem(DATA_KEY, JSON.stringify(data));
}

/** バックアップ用の文字列（人が読める字下げ付き） */
export function exportBackup(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

/**
 * バックアップを読み込む。読めなければ null。「広告を消す」は購入の印なので、どちらの方式でも今のまま。
 * replace は、読めたものに置き換える（ほかの設定は取り込んだもの）。
 * merge は current に、同じ動画がまだ無い料理だけを足す（id がぶつかれば <id>~2… に付け直す）。
 * 取り込む記録は付け替えた料理 id に直し、同じ日・同じ料理で今より多い分だけを足す。設定は current のまま。
 * current は書き換えない。
 */
export function importBackup(current: AppData, raw: string, mode: 'replace' | 'merge'): AppData | null {
  const imported = parseData(raw);
  if (!imported) return null;
  const noAds = current.settings.noAds;
  if (mode === 'replace') return { ...imported, settings: { ...imported.settings, noAds } };

  const recipes = [...current.recipes];
  const idMap = new Map<string, string>(); // 取り込む側の id → 今の id
  for (const r of imported.recipes) {
    const same = findByVideoId(recipes, r.videoId);
    if (same) {
      if (!idMap.has(r.id)) idMap.set(r.id, same.id);
      continue;
    }
    let id = r.id;
    for (let n = 2; recipes.some(x => x.id === id); n++) id = `${r.id}~${n}`;
    recipes.push(id === r.id ? r : { ...r, id });
    if (!idMap.has(r.id)) idMap.set(r.id, id);
  }

  const keyOf = (l: CookLog) => `${l.date}\u0000${l.recipeId}`;
  const have = new Map<string, number>(); // 今ある記録の (日付, 料理) ごとの件数
  for (const l of current.logs) have.set(keyOf(l), (have.get(keyOf(l)) ?? 0) + 1);
  const seen = new Map<string, number>(); // 取り込みのうち、ここまでに数えた件数
  const logs = [...current.logs];
  for (const l of imported.logs) {
    const fixed: CookLog = { date: l.date, recipeId: idMap.get(l.recipeId) ?? l.recipeId };
    const k = keyOf(fixed);
    const count = (seen.get(k) ?? 0) + 1;
    seen.set(k, count);
    if (count > (have.get(k) ?? 0)) logs.push(fixed);
  }
  return { version: DATA_VERSION, recipes, logs, settings: current.settings };
}
