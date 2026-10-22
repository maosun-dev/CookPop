// 作った記録。元の配列は変えず、新しい配列を返す。
import { monthOf } from './date';
import type { Recipe } from './recipe';

export interface CookLog {
  date: string; // 'YYYY-MM-DD'
  recipeId: string;
}

const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

/** 末尾に1件足した新しい配列を返す */
export function addLog(logs: CookLog[], recipeId: string, date: string): CookLog[] {
  return [...logs, { date, recipeId }];
}

/** その料理を作った回数 */
export function countOf(logs: CookLog[], recipeId: string): number {
  return logs.filter(l => l.recipeId === recipeId).length;
}

/** その料理をいちばん最近作った日。作っていなければ null */
export function lastMade(logs: CookLog[], recipeId: string): string | null {
  let last: string | null = null;
  for (const l of logs) {
    if (l.recipeId === recipeId && (last === null || l.date > last)) last = l.date;
  }
  return last;
}

/** その日の記録（元の順のまま） */
export function logsOn(logs: CookLog[], date: string): CookLog[] {
  return logs.filter(l => l.date === date);
}

/** その月に作った回数 */
export function monthCount(logs: CookLog[], month: string): number {
  return logs.filter(l => monthOf(l.date) === month).length;
}

/** その月に作った日の一覧（重複なし・昇順） */
export function daysMadeIn(logs: CookLog[], month: string): string[] {
  const days = new Set<string>();
  for (const l of logs) {
    if (monthOf(l.date) === month) days.add(l.date);
  }
  return [...days].sort();
}

/** 回数の多い順。同じなら元の順。元の配列は変えない */
export function sortByOften(recipes: Recipe[], logs: CookLog[]): Recipe[] {
  const counts = new Map<string, number>();
  for (const l of logs) counts.set(l.recipeId, (counts.get(l.recipeId) ?? 0) + 1);
  return recipes
    .map((r, i) => ({ r, i, n: counts.get(r.id) ?? 0 }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map(x => x.r);
}

/** まだ作っていないものが先、次に最後に作った日が古い順。同じなら元の順。元の配列は変えない */
export function sortByStale(recipes: Recipe[], logs: CookLog[]): Recipe[] {
  const lasts = new Map<string, string>();
  for (const l of logs) {
    const cur = lasts.get(l.recipeId);
    if (cur === undefined || l.date > cur) lasts.set(l.recipeId, l.date);
  }
  return recipes
    .map((r, i) => ({ r, i, last: lasts.get(r.id) ?? null }))
    .sort((a, b) => {
      if (a.last === b.last) return a.i - b.i;
      if (a.last === null) return -1;
      if (b.last === null) return 1;
      return a.last < b.last ? -1 : 1;
    })
    .map(x => x.r);
}

/** 保存から読んだ値を検証する。配列でなければ空。形の正しい記録だけを新しいオブジェクトで返す */
export function sanitizeLogs(x: unknown): CookLog[] {
  if (!Array.isArray(x)) return [];
  const result: CookLog[] = [];
  for (const item of x) {
    if (typeof item !== 'object' || item === null) continue;
    const { date, recipeId } = item as Record<string, unknown>;
    if (typeof date !== 'string' || !DATE_SHAPE.test(date)) continue;
    if (typeof recipeId !== 'string' || recipeId === '') continue;
    result.push({ date, recipeId });
  }
  return result;
}
