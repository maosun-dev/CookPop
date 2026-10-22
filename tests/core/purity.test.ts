import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// core は環境（時計・乱数・通信・保存先）に直接さわらない。さわる部品は呼び出し側から渡す
const CORE_DIR = join(__dirname, '..', '..', 'src', 'core');
const FORBIDDEN = ['Math.random', 'Date.now', 'window.', 'globalThis', 'localStorage', 'fetch('];

describe('core の純粋さ', () => {
  const files = readdirSync(CORE_DIR).filter(f => f.endsWith('.ts'));
  it('core のファイルが見つかる', () => {
    expect(files.length).toBeGreaterThan(0);
  });
  for (const f of files) {
    it(`${f} は環境に直接さわらない`, () => {
      // コメントの中の言及は対象外。ブロックコメントは行番号が狂わないよう改行だけ残して消す
      const src = readFileSync(join(CORE_DIR, f), 'utf-8').replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ''));
      const hits: string[] = [];
      src.split('\n').forEach((line, i) => {
        if (/^\s*declare\s/.test(line)) return; // 型検査用の declare 行は対象外
        const code = line.replace(/(^|\s)\/\/.*$/, '$1'); // 行頭・空白の後ろの // からはコメント（'https://' は消さない）
        for (const w of FORBIDDEN) if (code.includes(w)) hits.push(`${f}:${i + 1} ${w}`);
      });
      expect(hits).toEqual([]);
    });
  }
});
