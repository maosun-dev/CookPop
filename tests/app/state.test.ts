import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { DATA_KEY, parseData, type KeyValueStore } from '../../src/core/store';

function fakeStore(): KeyValueStore & { m: Map<string, string> } {
  const m = new Map<string, string>();
  return { m, getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}
let n = 0;
const mk = () => createState(fakeStore(), () => new Date(2026, 9, 23, 12), () => 'id' + (++n));
const url = 'https://youtu.be/ZZZZZZZZZZZ';

describe('state', () => {
  it('最初は8品。登録すると増えて保存され、購読者が呼ばれる', () => {
    const st = fakeStore();
    const s = createState(st, () => new Date(2026, 9, 23), () => 'new1');
    let calls = 0; s.subscribe(() => { calls++; });
    expect(s.data.recipes).toHaveLength(8);
    const r = s.addRecipe({ url, name: 'テスト', cat: '主菜' });
    expect(r.ok && r.recipe.id).toBe('new1');
    expect(s.data.recipes).toHaveLength(9);
    expect(calls).toBe(1);
    expect(parseData(st.m.get(DATA_KEY)!)!.recipes).toHaveLength(9);
  });
  it('同じ動画は duplicate、壊れたリンクは invalid', () => {
    const s = mk();
    expect(s.addRecipe({ url: 'https://youtu.be/HzLAMA5ck_8', name: 'x', cat: '主菜' })).toEqual({ ok: false, reason: 'duplicate' });
    expect(s.addRecipe({ url: 'https://example.com', name: 'x', cat: '主菜' })).toEqual({ ok: false, reason: 'invalid' });
  });
  it('編集・お気に入り・削除。削除しても記録は残る', () => {
    const s = mk();
    const id = s.data.recipes[0].id;
    expect(s.updateRecipe(id, { name: '  新しい名前 ', memo: 'm' })).toBe(true);
    expect(s.data.recipes[0].name).toBe('新しい名前');
    expect(s.updateRecipe(id, { name: '   ' })).toBe(false);
    expect(s.data.recipes[0].name).toBe('新しい名前');
    s.toggleFav(id);
    expect(s.data.recipes[0].fav).toBe(true);
    s.markCooked(id);
    expect(s.data.logs).toEqual([{ date: '2026-10-23', recipeId: id }]);
    s.deleteRecipe(id);
    expect(s.data.recipes).toHaveLength(7);
    expect(s.data.logs).toHaveLength(1);
  });
  it('today は呼ぶたびに now から作る', () => {
    let d = new Date(2026, 9, 23, 23, 59);
    const s = createState(fakeStore(), () => d, () => 'x');
    expect(s.today()).toBe('2026-10-23');
    d = new Date(2026, 9, 24, 0, 1);
    expect(s.today()).toBe('2026-10-24');
  });
  it('data は変更のたびに別のオブジェクト', () => {
    const s = mk();
    const before = s.data;
    s.updateSettings({ theme: 'dark' });
    expect(s.data).not.toBe(before);
    expect(s.data.settings.theme).toBe('dark');
    expect(s.data.recipes).toBe(before.recipes);
  });
  it('バックアップの往復。壊れたものは false で変わらない', () => {
    const a = mk(); a.addRecipe({ url, name: 'テスト', cat: '副菜' });
    const b = mk();
    expect(b.importBackup(a.exportBackup(), 'replace')).toBe(true);
    expect(b.data.recipes).toHaveLength(9);
    expect(b.importBackup('ぐちゃ', 'merge')).toBe(false);
    expect(b.data.recipes).toHaveLength(9);
  });
  it('購読の解除', () => {
    const s = mk(); let c = 0;
    const off = s.subscribe(() => { c++; });
    s.updateSettings({ theme: 'light' }); off(); s.updateSettings({ theme: 'auto' });
    expect(c).toBe(1);
  });

  describe('マイタグとふきんの色', () => {
    function counted() {
      const st = fakeStore();
      const s = createState(st, () => new Date(2026, 9, 23, 12), () => 'id' + (++n));
      let calls = 0; s.subscribe(() => { calls++; });
      let saves = 0; const orig = st.setItem; st.setItem = (k, v) => { saves++; orig(k, v); };
      return { s, st, calls: () => calls, saves: () => saves };
    }
    it('足すのが成功すると保存と知らせが1回ずつ。失敗は0回', () => {
      const c = counted();
      expect(c.s.addTag(' 作り置き ')).toBe('ok');
      expect(c.s.data.settings.myTags).toEqual(['作り置き']);
      expect([c.calls(), c.saves()]).toEqual([1, 1]);
      expect(c.s.addTag('作り置き')).toBe('dup');
      expect(c.s.addTag('   ')).toBe('empty');
      expect(c.s.addTag('あ'.repeat(13))).toBe('long');
      expect([c.calls(), c.saves()]).toEqual([1, 1]);
      for (let i = 0; i < 19; i++) c.s.addTag('t' + i);
      expect(c.s.addTag('あふれ')).toBe('full');
      expect(c.calls()).toBe(20);
    });
    it('料理にタグをつけ、名前の変更が料理に反映され、消すと外れる', () => {
      const c = counted();
      const id = c.s.data.recipes[0].id;
      c.s.addTag('A'); c.s.addTag('B');
      const base = c.calls();
      c.s.setRecipeTags(id, ['B', 'A', 'ない']);
      expect(c.s.data.recipes[0].tags).toEqual(['B', 'A']);
      expect(c.calls()).toBe(base + 1);
      c.s.setRecipeTags('なし', ['A']);
      expect(c.calls()).toBe(base + 1);
      expect(c.s.renameTag('A', 'C')).toBe('ok');
      expect(c.s.data.settings.myTags).toEqual(['C', 'B']);
      expect(c.s.data.recipes[0].tags).toEqual(['B', 'C']);
      expect(c.calls()).toBe(base + 2);
      expect(c.s.renameTag('C', 'B')).toBe('dup');
      expect(c.s.renameTag('Z', 'Y')).toBe('missing');
      expect(c.s.renameTag('C', ' ')).toBe('empty');
      expect(c.s.renameTag('C', 'あ'.repeat(13))).toBe('long');
      expect(c.calls()).toBe(base + 2);
      c.s.deleteTag('B');
      expect(c.s.data.settings.myTags).toEqual(['C']);
      expect(c.s.data.recipes[0].tags).toEqual(['C']);
      expect(c.calls()).toBe(base + 3);
      c.s.deleteTag('なし');
      expect(c.calls()).toBe(base + 3);
      expect(c.s.data.recipes).toHaveLength(8);
    });
    it('名前の変更・消す・料理のタグの置き換えは、成功なら保存と知らせが1回ずつ。失敗や変化なしは0回', () => {
      const c = counted();
      const id = c.s.data.recipes[0].id;
      c.s.addTag('A'); c.s.addTag('B');
      const [calls0, saves0] = [c.calls(), c.saves()];
      expect(c.s.renameTag('A', 'C')).toBe('ok');
      expect([c.calls() - calls0, c.saves() - saves0]).toEqual([1, 1]);
      c.s.setRecipeTags(id, ['C']);
      expect([c.calls() - calls0, c.saves() - saves0]).toEqual([2, 2]);
      c.s.deleteTag('C');
      expect([c.calls() - calls0, c.saves() - saves0]).toEqual([3, 3]);
      // 失敗・存在しないもの
      c.s.renameTag('Z', 'Y'); c.s.renameTag('B', 'B2'.repeat(7)); c.s.renameTag('B', ' ');
      c.s.deleteTag('なし'); c.s.setRecipeTags('なし', ['B']);
      expect([c.calls() - calls0, c.saves() - saves0]).toEqual([3, 3]);
    });
    it('同じ名前への renameTag は ok だが、保存も知らせもしない', () => {
      const c = counted();
      c.s.addTag('A');
      const [calls0, saves0] = [c.calls(), c.saves()];
      expect(c.s.renameTag('A', ' A ')).toBe('ok');
      expect([c.calls() - calls0, c.saves() - saves0]).toEqual([0, 0]);
    });
    it('ふきんの色を変えられ、登録時のタグはマイタグのものだけ', () => {
      const c = counted();
      c.s.updateSettings({ cloth: 'blue' });
      expect(c.s.data.settings.cloth).toBe('blue');
      c.s.addTag('朝');
      const r = c.s.addRecipe({ url, name: 'テスト', cat: '主菜', tags: ['朝', '未登録'] });
      expect(r.ok && r.recipe.tags).toEqual(['朝']);
    });
  });
});
