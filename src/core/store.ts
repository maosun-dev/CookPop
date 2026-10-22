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

/** 文字列から保存データを読む。JSON でない・オブジェクトでないときは null（今は版1だけなので読み替えはしない） */
export function parseData(raw: string): AppData | null {
  let x: unknown;
  try {
    x = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return null;
  const o = x as Record<string, unknown>;
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
 * バックアップを読み込む。読めなければ null。
 * replace は読めたものをそのまま返す。
 * merge は current に、同じ動画がまだ無い料理だけを足し、記録は全部末尾に足す（設定は current のまま）。
 */
export function importBackup(current: AppData, raw: string, mode: 'replace' | 'merge'): AppData | null {
  const imported = parseData(raw);
  if (!imported) return null;
  if (mode === 'replace') return imported;
  const recipes = [...current.recipes];
  for (const r of imported.recipes) {
    if (!findByVideoId(recipes, r.videoId)) recipes.push(r);
  }
  return {
    version: DATA_VERSION,
    recipes,
    logs: [...current.logs, ...imported.logs],
    settings: current.settings,
  };
}
