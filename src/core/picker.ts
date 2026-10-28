// ルーレットの選び方。最近作ったものは出にくくする。乱数は rng だけを使う。
import { daysBetween } from './date';
import { lastMade, type CookLog } from './log';
import type { Cat, Recipe } from './recipe';

export interface PickInput {
  recipes: Recipe[];
  logs: CookLog[];
  today: string;
  /** 0 以上 1 未満の乱数 */
  rng: () => number;
  /** 出さない料理の id */
  exclude?: string[];
}

/** 出やすさ。最後に作った日から today までの日数 d で、未作 → 1、d ≤ 1 → 0、d ≤ 7 → 0.5、それ以外 → 1 */
export function weightOf(recipe: Recipe, logs: CookLog[], today: string): number {
  const last = lastMade(logs, recipe.id);
  if (last === null) return 1;
  const d = daysBetween(last, today);
  if (d <= 1) return 0;
  if (d <= 7) return 0.5;
  return 1;
}

/** 重みに応じて1つ選ぶ。候補が空なら null */
export function pickOne(input: PickInput): Recipe | null {
  const { recipes, logs, today, rng, exclude = [] } = input;
  if (recipes.length === 0) return null;

  // 除外で候補が尽きるなら、除外を無視して全部を候補にする
  const kept = recipes.filter(r => !exclude.includes(r.id));
  const candidates = kept.length > 0 ? kept : recipes;

  let weights = candidates.map(r => weightOf(r, logs, today));
  let total = weights.reduce((a, b) => a + b, 0);
  // 全部 0 なら制限をゆるめて全部 1 にする
  if (total === 0) {
    weights = weights.map(() => 1);
    total = weights.length;
  }

  const r = rng() * total;
  let acc = 0;
  for (let i = 0; i < candidates.length; i++) {
    acc += weights[i];
    if (acc > r) return candidates[i];
  }
  // 丸め誤差で選べなかったときは、重みが正の最後の候補
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (weights[i] > 0) return candidates[i];
  }
  return null;
}

/** 重複なしで最大 n 個選ぶ。候補が足りなければある分だけ */
export function pickMany(input: PickInput, n: number): Recipe[] {
  const picked: Recipe[] = [];
  const exclude = [...(input.exclude ?? [])];
  while (picked.length < n) {
    // 除外後に候補が残らないなら止める（pickOne の「除外を無視」で重複させない）
    if (!input.recipes.some(r => !exclude.includes(r.id))) break;
    const one = pickOne({ ...input, exclude });
    if (one === null) break;
    picked.push(one);
    exclude.push(one.id);
  }
  return picked;
}

/** ジャンル・タグ・お気に入りの絞り込み（指定したものを全部満たす料理だけ） */
export function filterRecipes(recipes: Recipe[], f: { cat: Cat | null; tag: string | null; favOnly: boolean }): Recipe[] {
  return recipes.filter(r => (f.cat === null || r.cat === f.cat) && (f.tag === null || r.tags.includes(f.tag)) && (!f.favOnly || r.fav));
}
