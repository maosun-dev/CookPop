import { describe, it, expect } from 'vitest';
import { suggestHandler } from '../../src/app/clipboardWire';
import type { TabId } from '../../src/app/tabs';

function setup(current: TabId) {
  const calls: string[] = [];
  let action: { label: string; onClick: () => void } | undefined;
  let said = '';
  const handler = suggestHandler({
    mascot: { say: (t, a) => { said = t; action = a; calls.push('say'); }, hush: () => { calls.push('hush'); } },
    tabs: { current: () => current, select: id => { calls.push(`select:${id}`); } },
    book: { openForm: url => { calls.push(`openForm:${url}`); } },
    toast: msg => { calls.push(`toast:${msg}`); },
  });
  return { calls, handler, get action() { return action; }, get said() { return said; } };
}

describe('クリップボードの提案', () => {
  it('きめる以外のタブにいるときは、ポンの吹き出しに加えてトーストも出す', () => {
    const t = setup('log');
    t.handler('HzLAMA5ck_8', 'https://youtu.be/HzLAMA5ck_8');
    expect(t.said).toContain('クリップボードに動画のリンクがあるよ');
    expect(t.calls).toContain('toast:クリップボードに動画のリンクがあるよ。「きめる」でポンに聞いてね');
  });
  it('きめるタブにいるときはトーストを出さない（吹き出しだけ）', () => {
    const t = setup('pick');
    t.handler('HzLAMA5ck_8', 'https://youtu.be/HzLAMA5ck_8');
    expect(t.calls).toEqual(['say']);
  });
  it('「登録する」を押すと献立帳のフォームが開き、吹き出しが消える', () => {
    const t = setup('pick');
    t.handler('HzLAMA5ck_8', 'https://youtu.be/HzLAMA5ck_8');
    expect(t.action!.label).toBe('登録する');
    t.action!.onClick();
    expect(t.calls).toEqual(['say', 'select:book', 'openForm:https://youtu.be/HzLAMA5ck_8', 'hush']);
  });
});
