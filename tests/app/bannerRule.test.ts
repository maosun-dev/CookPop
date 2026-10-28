// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { bannerWanted, watchBanner } from '../../src/app/bannerRule';

afterEach(() => { document.body.replaceChildren(); document.body.className = ''; });

// 見張りは1拍あとに判定するので、たまった仕事を流し切る
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0)); };

const focusOn = (html: string): void => {
  document.body.innerHTML = html;
  (document.body.firstElementChild as HTMLElement).focus();
};

describe('バナーを出してよいか', () => {
  it('何もなければ出す', () => {
    expect(bannerWanted(document)).toBe(true);
  });
  it('シートが開いていれば隠す', () => {
    document.body.classList.add('sheet-open');
    expect(bannerWanted(document)).toBe(false);
  });
  it('今のタブで動画の iframe があれば隠す', () => {
    document.body.innerHTML = '<div data-active="true"><div class="player"><iframe></iframe></div></div>';
    expect(bannerWanted(document)).toBe(false);
  });
  it('見えていないタブの動画は数えない', () => {
    document.body.innerHTML = '<div data-active="false"><div class="player"><iframe></iframe></div></div>';
    expect(bannerWanted(document)).toBe(true);
  });
  it('再生できず替わった枠は数えない', () => {
    document.body.innerHTML = '<div data-active="true"><div class="player player-fail"><a href="#">YouTube で開く</a></div></div>';
    expect(bannerWanted(document)).toBe(true);
  });
  it('文字の入力欄だけを数える', () => {
    for (const html of ['<input>', '<input type="url">', '<textarea></textarea>']) {
      focusOn(html);
      expect(bannerWanted(document), html).toBe(false);
    }
    for (const html of ['<input type="checkbox">', '<button>押す</button>']) {
      focusOn(html);
      expect(bannerWanted(document), html).toBe(true);
    }
  });
});

describe('バナーの見張り', () => {
  it('watchBanner は最初に1回、変わったときだけ知らせる', async () => {
    const seen: boolean[] = [];
    const stop = watchBanner(document, (on) => seen.push(on));
    expect(seen).toEqual([true]);
    document.body.classList.add('sheet-open');
    await flush();
    expect(seen).toEqual([true, false]);
    document.body.append(document.createElement('div'));
    await flush();
    expect(seen).toEqual([true, false]);
    document.body.classList.remove('sheet-open');
    await flush();
    expect(seen).toEqual([true, false, true]);
    stop();
  });
  it('動画の iframe が消えたら出す', async () => {
    document.body.innerHTML = '<div data-active="true"><div class="player"></div></div>';
    const seen: boolean[] = [];
    const stop = watchBanner(document, (on) => seen.push(on));
    const frame = document.createElement('iframe');
    document.querySelector('.player')!.append(frame);
    await flush();
    expect(seen.at(-1)).toBe(false);
    frame.remove();
    await flush();
    expect(seen.at(-1)).toBe(true);
    stop();
  });
  it('タブを切り替えると、見えている動画の有無で変わる', async () => {
    document.body.innerHTML = '<div id="a" data-active="true"><div class="player"><iframe></iframe></div></div><div id="b" data-active="false"></div>';
    const seen: boolean[] = [];
    const stop = watchBanner(document, (on) => seen.push(on));
    document.getElementById('a')!.setAttribute('data-active', 'false');
    document.getElementById('b')!.setAttribute('data-active', 'true');
    await flush();
    expect(seen).toEqual([false, true]);
    stop();
  });
  it('入力欄に入ると隠し、出ると出す', async () => {
    document.body.innerHTML = '<input id="i"><button id="b">x</button>';
    const seen: boolean[] = [];
    const stop = watchBanner(document, (on) => seen.push(on));
    (document.getElementById('i') as HTMLElement).focus();
    await flush();
    (document.getElementById('b') as HTMLElement).focus();
    await flush();
    expect(seen).toEqual([true, false, true]);
    stop();
  });
  it('やめたあとは知らせない', async () => {
    const seen: boolean[] = [];
    const stop = watchBanner(document, (on) => seen.push(on));
    stop();
    document.body.classList.add('sheet-open');
    await flush();
    expect(seen).toEqual([true]);
  });
});
