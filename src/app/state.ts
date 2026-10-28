// データの持ち主。変えたら保存して、購読している画面に知らせる。
import { toDateStr } from '../core/date';
import { addLog } from '../core/log';
import { addTag as addTagData, deleteTag as deleteTagData, renameTag as renameTagData, setRecipeTags as setRecipeTagsData } from '../core/tags';
import { findByVideoId, newRecipe, parseVideoId, sanitizeRecipe, type Recipe, type RecipeInput } from '../core/recipe';
import {
  exportBackup as exportBackupData,
  importBackup as importBackupData,
  loadData,
  saveData,
  type AppData,
  type KeyValueStore,
  type Settings,
} from '../core/store';

export type AddResult = { ok: true; recipe: Recipe } | { ok: false; reason: 'invalid' | 'duplicate' };

export interface AppState {
  /** 読み取り専用で使う。変わるたびに新しいオブジェクトになる */
  readonly data: AppData;
  /** 呼ぶたびに now() から作る（日をまたいでも古くならない） */
  today(): string;
  /** 変わったら呼ばれる。戻り値を呼ぶと解除 */
  subscribe(fn: () => void): () => void;
  /** 同じ動画があれば duplicate、リンクや名前がおかしければ invalid */
  addRecipe(input: RecipeInput): AddResult;
  /** 検証に通らなければ false で、何も変えない */
  updateRecipe(id: string, patch: Partial<Pick<Recipe, 'name' | 'cat' | 'channel' | 'memo'>>): boolean;
  /** 料理を消す。作った記録は残す */
  deleteRecipe(id: string): void;
  toggleFav(id: string): void;
  /** 今日作ったと記録する */
  markCooked(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  /** マイタグを足す。失敗のときは何も変えない */
  addTag(name: string): 'ok' | 'empty' | 'long' | 'dup' | 'full';
  /** マイタグの名前を変える（料理のタグも置き換わる）。失敗のときは何も変えない */
  renameTag(from: string, to: string): 'ok' | 'empty' | 'long' | 'dup' | 'missing';
  /** マイタグを消す（料理からも外れる。料理は残る） */
  deleteTag(name: string): void;
  /** 料理のタグを置き換える（マイタグにあるものだけ残る） */
  setRecipeTags(id: string, tags: string[]): void;
  exportBackup(): string;
  /** 読めなければ false で、何も変えない */
  importBackup(raw: string, mode: 'replace' | 'merge'): boolean;
}

export function createState(store: KeyValueStore, now: () => Date, newId: () => string): AppState {
  const today = () => toDateStr(now());
  let data = loadData(store, today());
  const listeners = new Set<() => void>();

  /** 新しい data に差し替えて、保存して、購読者に知らせる */
  function commit(next: AppData): void {
    data = next;
    saveData(store, data);
    // 通知の最中に解除・登録されても困らないよう、写しを回す
    for (const fn of [...listeners]) fn();
  }

  return {
    get data() {
      return data;
    },
    today,
    subscribe(fn) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    addRecipe(input) {
      const videoId = parseVideoId(input.url);
      if (!videoId) return { ok: false, reason: 'invalid' };
      if (findByVideoId(data.recipes, videoId)) return { ok: false, reason: 'duplicate' };
      const tags = input.tags?.filter(t => data.settings.myTags.includes(t));
      const recipe = newRecipe({ ...input, tags }, newId(), today());
      if (!recipe) return { ok: false, reason: 'invalid' };
      commit({ ...data, recipes: [...data.recipes, recipe] });
      return { ok: true, recipe };
    },
    updateRecipe(id, patch) {
      const current = data.recipes.find(r => r.id === id);
      if (!current) return false;
      const updated = sanitizeRecipe({ ...current, ...patch });
      if (!updated) return false;
      commit({ ...data, recipes: data.recipes.map(r => (r.id === id ? updated : r)) });
      return true;
    },
    deleteRecipe(id) {
      if (!data.recipes.some(r => r.id === id)) return;
      commit({ ...data, recipes: data.recipes.filter(r => r.id !== id) });
    },
    toggleFav(id) {
      if (!data.recipes.some(r => r.id === id)) return;
      commit({ ...data, recipes: data.recipes.map(r => (r.id === id ? { ...r, fav: !r.fav } : r)) });
    },
    markCooked(id) {
      if (!data.recipes.some(r => r.id === id)) return;
      commit({ ...data, logs: addLog(data.logs, id, today()) });
    },
    updateSettings(patch) {
      commit({ ...data, settings: { ...data.settings, ...patch } });
    },
    addTag(name) {
      const r = addTagData(data, name);
      if (r.error) return r.error;
      commit(r.data);
      return 'ok';
    },
    renameTag(from, to) {
      const r = renameTagData(data, from, to);
      if (r.error) return r.error;
      // 同じ名前への変更は何も変わらないので、保存も知らせもしない
      if (r.data !== data) commit(r.data);
      return 'ok';
    },
    deleteTag(name) {
      if (!data.settings.myTags.includes(name)) return;
      commit(deleteTagData(data, name));
    },
    setRecipeTags(id, tags) {
      if (!data.recipes.some(r => r.id === id)) return;
      commit(setRecipeTagsData(data, id, tags));
    },
    exportBackup() {
      return exportBackupData(data);
    },
    importBackup(raw, mode) {
      const next = importBackupData(data, raw, mode);
      if (!next) return false;
      commit(next);
      return true;
    },
  };
}
