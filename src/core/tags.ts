// マイタグの操作。元のデータは変えず、新しいデータを返す。
import type { AppData } from './store';
import { TAG_MAX_LEN, TAG_MAX, TAGS_PER_RECIPE } from './tagRules';

export { TAG_MAX_LEN, TAG_MAX, TAGS_PER_RECIPE };

/** 前後の空白を取って 1〜12 文字ならその名前、そうでなければ null */
export function normalizeTag(name: string): string | null {
  const t = name.trim();
  const len = Array.from(t).length;
  return len >= 1 && len <= TAG_MAX_LEN ? t : null;
}

function withTags(data: AppData, myTags: string[], mapTags: (tags: string[]) => string[]): AppData {
  return {
    ...data,
    recipes: data.recipes.map(r => ({ ...r, tags: mapTags(r.tags) })),
    settings: { ...data.settings, myTags },
  };
}

/** マイタグを末尾に足す */
export function addTag(data: AppData, name: string): { data: AppData; error?: 'empty' | 'long' | 'dup' | 'full' } {
  const t = name.trim();
  if (!t) return { data, error: 'empty' };
  const n = normalizeTag(t);
  if (n === null) return { data, error: 'long' };
  if (data.settings.myTags.includes(n)) return { data, error: 'dup' };
  if (data.settings.myTags.length >= TAG_MAX) return { data, error: 'full' };
  return { data: { ...data, settings: { ...data.settings, myTags: [...data.settings.myTags, n] } } };
}

/** マイタグの名前を変える（料理のタグも置き換え、並び順を保つ） */
export function renameTag(data: AppData, from: string, to: string): { data: AppData; error?: 'empty' | 'long' | 'dup' | 'missing' } {
  const t = to.trim();
  if (!t) return { data, error: 'empty' };
  const n = normalizeTag(t);
  if (n === null) return { data, error: 'long' };
  if (!data.settings.myTags.includes(from)) return { data, error: 'missing' };
  if (n === from) return { data };
  if (data.settings.myTags.includes(n)) return { data, error: 'dup' };
  return {
    data: withTags(data, data.settings.myTags.map(x => (x === from ? n : x)), tags => tags.map(x => (x === from ? n : x))),
  };
}

/** マイタグを消す（料理からも外す。料理は残る） */
export function deleteTag(data: AppData, name: string): AppData {
  return withTags(data, data.settings.myTags.filter(x => x !== name), tags => tags.filter(x => x !== name));
}

/** 料理のタグを置き換える。マイタグにあるものだけ・重複なし・10 個まで */
export function setRecipeTags(data: AppData, id: string, tags: string[]): AppData {
  const clean: string[] = [];
  for (const t of tags) {
    if (data.settings.myTags.includes(t) && !clean.includes(t)) clean.push(t);
    if (clean.length >= TAGS_PER_RECIPE) break;
  }
  return { ...data, recipes: data.recipes.map(r => (r.id === id ? { ...r, tags: clean } : r)) };
}
