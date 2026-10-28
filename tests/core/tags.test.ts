import { describe, it, expect } from 'vitest';
import { normalizeTag, addTag, renameTag, deleteTag, setRecipeTags } from '../../src/core/tags';
import { initialData, type AppData } from '../../src/core/store';

const base = (): AppData => {
  const d = initialData('2026-10-28');
  return {
    ...d,
    recipes: d.recipes.map((r, i) => (i === 0 ? { ...r, tags: ['時短', '辛い'] } : r)),
    settings: { ...d.settings, myTags: ['時短', '辛い', '作り置き'] },
  };
};

describe('normalizeTag', () => {
  it('前後の空白を取り、1〜12 文字だけ通す', () => {
    expect(normalizeTag(' 時短 ')).toBe('時短');
    expect(normalizeTag('  ')).toBeNull();
    expect(normalizeTag('あ'.repeat(12))).toBe('あ'.repeat(12));
    expect(normalizeTag('あ'.repeat(13))).toBeNull();
  });
});

describe('addTag', () => {
  it('末尾に足す', () => expect(addTag(base(), ' 新 ').data.settings.myTags).toEqual(['時短', '辛い', '作り置き', '新']));
  it('エラー', () => {
    expect(addTag(base(), '  ').error).toBe('empty');
    expect(addTag(base(), 'あ'.repeat(13)).error).toBe('long');
    expect(addTag(base(), '時短').error).toBe('dup');
    let d = base();
    for (let i = 0; d.settings.myTags.length < 20; i++) d = addTag(d, 'x' + i).data;
    expect(addTag(d, '21個目').error).toBe('full');
    expect(addTag(d, '21個目').data).toBe(d);
  });
});

describe('renameTag', () => {
  it('料理のタグも置き換わり、並び順は保たれる', () => {
    const r = renameTag(base(), '辛い', 'ピリ辛');
    expect(r.error).toBeUndefined();
    expect(r.data.settings.myTags).toEqual(['時短', 'ピリ辛', '作り置き']);
    expect(r.data.recipes[0].tags).toEqual(['時短', 'ピリ辛']);
  });
  it('エラー', () => {
    expect(renameTag(base(), '辛い', '').error).toBe('empty');
    expect(renameTag(base(), '辛い', 'あ'.repeat(13)).error).toBe('long');
    expect(renameTag(base(), '辛い', '時短').error).toBe('dup');
    expect(renameTag(base(), '無い', 'x').error).toBe('missing');
  });
});

describe('deleteTag', () => {
  it('料理から外れ、料理は残る', () => {
    const d = deleteTag(base(), '時短');
    expect(d.settings.myTags).toEqual(['辛い', '作り置き']);
    expect(d.recipes).toHaveLength(8);
    expect(d.recipes[0].tags).toEqual(['辛い']);
  });
});

describe('setRecipeTags', () => {
  it('myTags に無いものは捨てる', () => {
    expect(setRecipeTags(base(), base().recipes[1].id, ['作り置き', '謎', '作り置き']).recipes[1].tags).toEqual(['作り置き']);
  });
  it('10 個まで', () => {
    let d = base();
    for (let i = 0; d.settings.myTags.length < 15; i++) d = addTag(d, 'x' + i).data;
    expect(setRecipeTags(d, d.recipes[1].id, d.settings.myTags).recipes[1].tags).toHaveLength(10);
  });
});
