// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { applyTheme } from '../../src/app/theme';

const css = () => readFileSync('src/app/style.css', 'utf-8');
/** セレクタ（先頭が行頭）で始まるブロックの中身を返す */
const block = (sel: string): string | null => {
  const m = css().match(new RegExp('(?:^|\\n)' + sel.replace(/[.[\]"=()]/g, c => '\\' + c) + '\\s*\\{([^}]*)\\}'));
  return m ? m[1] : null;
};

describe('テーマ', () => {
  it('auto は属性なし、light/dark は data-theme', () => {
    applyTheme('dark', 'yellow');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('auto', 'yellow');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    applyTheme('light', 'yellow');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('applyTheme は data-cloth を必ず付ける', () => {
    applyTheme('auto', 'green');
    expect(document.documentElement.dataset.cloth).toBe('green');
    applyTheme('dark', 'purple');
    expect(document.documentElement.dataset.cloth).toBe('purple');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('style.css に6色の [data-cloth] があり、色・ハンコの色・かげが設計書の表どおり', () => {
    const table: Record<string, [string, string, string]> = {
      yellow: ['#FFC43D', '#E8573A', '#B83C24'],
      red: ['#E8573A', '#E8573A', '#B83C24'],
      green: ['#7DB86A', '#4F9E62', '#357A45'],
      blue: ['#6CB8E0', '#3E8FC4', '#2B6A94'],
      pink: ['#FF9DB5', '#E8698A', '#B84A66'],
      purple: ['#B39DDB', '#8C6CC4', '#674C99'],
    };
    for (const [name, [cloth, accent, deep]] of Object.entries(table)) {
      const m = css().match(new RegExp('\\[data-cloth="' + name + '"\\][^{]*\\{([^}]*)\\}'));
      expect(m, name).not.toBeNull();
      expect(m![1]).toContain(`--cloth: ${cloth};`);
      expect(m![1]).toContain(`--accent: ${accent};`);
      expect(m![1]).toContain(`--accent-deep: ${deep};`);
    }
    expect(css()).toMatch(/--paper:\s*#FFFFFF/);
    expect(css()).toMatch(/--base:\s*#FFF8EC/);
  });

  it('style.css：.pop は輪郭線も黒い影も無く、白い台紙とうすい影', () => {
    const pop = block('.pop')!;
    expect(pop).not.toMatch(/border:\s*\d+px\s+solid/);
    expect(pop).toContain('box-shadow: var(--shadow)'); // 暗い見た目では --shadow が替わる
    expect(css()).toContain('--shadow: 0 2px 5px rgba(74, 46, 28, .12)');
    expect(css()).not.toContain('4px 4px 0');
    expect(css()).not.toMatch(/(?:text-shadow|drop-shadow)/);
    expect(css()).not.toMatch(/radial-gradient|conic-gradient/);
  });

  it('style.css：ギンガムは body の背景で、暗い見た目は不透明度 .10', () => {
    const body = block('body')!;
    expect(body).toContain('linear-gradient');
    expect(body).toContain('background-size: 28px 28px');
    expect(css()).toMatch(/--gingham-a:\s*\.20/);
    expect(css()).toMatch(/--gingham-a:\s*\.10/);
    expect(css()).toMatch(/--base:\s*#2A1D14/);
  });

  it('style.css：カード・台紙はまっすぐで、テープは56×16・3度', () => {
    for (const sel of ['.pop', '.card', '.bubble', '.tile', '.screen-title']) {
      const b = block(sel);
      if (b) expect(b, sel).not.toContain('rotate');
    }
    const tape = css().match(/\.tape::before[^{]*\{([^}]*)\}/)![1];
    expect(tape).toContain('width: 56px');
    expect(tape).toContain('height: 16px');
    expect(tape).toContain('rotate(3deg)');
    // チップは ±1度
    expect(css()).toMatch(/\.chip:nth-child\(odd\)\s*\{[^}]*rotate\(-1deg\)/);
    expect(css()).toMatch(/\.chip:nth-child\(even\)\s*\{[^}]*rotate\(1deg\)/);
  });

  it('style.css：画面全体は動かず、画面の中だけスクロールし、長押しで文字が選べない（入力欄は除く）', () => {
    const body = css().match(/(?:^|\n)body\s*\{[^}]*\}/)![0];
    expect(body).toContain('user-select: none');
    expect(body).toContain('-webkit-touch-callout: none');
    expect(body).toContain('position: fixed');
    const input = css().match(/input,\s*textarea\s*\{[^}]*\}/)![0];
    expect(input).toContain('user-select: text');
    const active = css().match(/\n\.screen\[data-active="true"\]\s*\{[^}]*\}/)![0];
    expect(active).toContain('overflow-y: auto');
    expect(active).toContain('position: absolute');
    expect(css()).toMatch(/\.app\s*\{[^}]*position: fixed/);
  });
});
