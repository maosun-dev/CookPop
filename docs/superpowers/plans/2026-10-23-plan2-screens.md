# クックポップ 計画2：画面 実装手順書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 計画1の core の上に、4つのタブ（きめる・献立帳・きろく・設定）、登録フォーム、動画プレーヤー、クリップボード検知を、見た目の土台（色・文字・部品）込みで動く状態にする。マスコットは「形と受け口」だけ置き、絵と動きは計画3。

**Architecture:** `src/app/state.ts` がデータの唯一の持ち主（変えたら保存して購読者に知らせる）。画面は `state` を読んで DOM を組み立て、操作は `state` の関数を呼ぶ。DOM は `src/app/ui.ts` の小さな `el()` で作る（枠組みなし）。画面ごとに `create○○Screen(state, deps)` が `{ el }` を返す。ブラウザだけの部品（localStorage・fetch・clipboard・YouTube API）は `deps` で渡し、テストでは偽物にする。

**Tech Stack:** vite 7、TypeScript 5.9、vitest 3（画面は jsdom）、`@fontsource/zen-maru-gothic`

**Spec:** `docs/superpowers/specs/2026-10-23-cookpop-design.md`（3 画面、4 マスコット、5.4 保存、7 中身の分け方、11 確かめ方）

## Global Constraints

- コードのコメント・テスト名・コミットメッセージは日本語。画面の文言も日本語で、ボタンは「何が起きるか」を書く（例：「きめて！」「作った！」「登録する」「保存する」「削除する」）
- `src/core/` は変えない（例外：Task 1 の `Settings` の項目名の変更だけ）
- 画面から YouTube を開くときは `r.url` を使わず、必ず `https://www.youtube.com/watch?v=<videoId>`（`watchUrl`）を使う
- 文字は Zen Maru Gothic（`@fontsource/zen-maru-gothic` の 500/700/900 を `main.ts` で読み込む。Google Fonts へのリンクは使わない）
- 絵文字・既製アイコンは使わない。アイコンは Task 3 で決めた自作 SVG
- 色・角丸・文字サイズは `src/app/style.css` の変数だけで指定する。影は「右下 4px の平らな影（`box-shadow: 4px 4px 0 var(--line)`）」で、ぼかした影は使わない
- `prefers-reduced-motion: reduce` のときは動きを止める
- 画面の端：`main` の上下に `env(safe-area-inset-*)` の余白
- `npm test`・`npm run typecheck`・`npm run build` が通る状態でコミットする
- 自由に決めてよいのは、文言の細かな言い回し、余白の微調整、テストの追加だけ

## Review Focus

- 登録が 0 品（全部削除した）→ きめる画面が「まずは献立帳で登録してね」と案内し、ボタンは押せない（Task 4）
- 通信なしで登録 → 自動入力は失敗して空のまま、手入力で登録できる（Task 6：fetchJson が投げる）
- 動画の埋め込みが禁止の動画／YouTube API が読み込めない → 「YouTube で開く」に切り替わる（Task 5）
- バックアップの読み込みで壊れたファイル → 「読めませんでした」と出て、今のデータは変わらない（Task 9）
- 日付をまたいで開きっぱなし → `today()` は毎回 `new Date()` から作るので翌日の「作った！」は翌日の日付になる（Task 2：today は関数）

---

### Task 1: 見た目の土台と小さな部品（style.css・ui.ts・ids.ts・storage.ts）

**Files:**
- Create: `src/app/style.css`, `src/app/ui.ts`, `src/app/ids.ts`, `src/app/storage.ts`
- Modify: `src/core/store.ts`（`Settings.lastClipboardUrl` → `lastClipboardVideoId`）, `tests/core/store.test.ts`（同じ名前に）, `package.json`（`jsdom` と `@fontsource/zen-maru-gothic` を足す）, `index.html`（`<html>` に `data-theme` を付けられるようにするだけ。中身は変えない）
- Test: `tests/app/ui.test.ts`, `tests/app/ids.test.ts`, `tests/app/storage.test.ts`

**Interfaces:**
- Produces:
  - `el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs, ...children: Child[]): HTMLElementTagNameMap[K]`。`Attrs = Record<string, string | number | boolean | EventListener>`（`class`・`id`・`type` などは属性、`on` で始まる鍵（`onclick`）はイベント、`true/false` は属性の有無）。`Child = Node | string | null | undefined | false`（文字列はテキストノード、null/undefined/false は無視）
  - `svg(markup: string): SVGElement`（SVG の文字列を要素にする。`innerHTML` ではなく `DOMParser` を使う）
  - `clear(node: Element): void`
  - `newId(): string`（`crypto.randomUUID` があればそれ、無ければ `Math.random` と時刻から 16 文字以上）
  - `safeStore(): KeyValueStore`（localStorage を try/catch で包む。触れなければメモリの Map。SuperShogi の `safeStoreRaw` と同じ作り）
  - CSS の変数と部品クラス（下記）

- [ ] **Step 1: 部品を足す**

Run: `npm install --save-dev jsdom@26.1.0 && npm install @fontsource/zen-maru-gothic@5.2.6`
Expected: エラーなし

- [ ] **Step 2: `Settings` の項目名を変える**

`src/core/store.ts` の `lastClipboardUrl` を `lastClipboardVideoId` に（意味：最後にクリップボードで聞いた動画 ID。同じ動画は二度聞かない）。`tests/core/store.test.ts` の同名も変える。

Run: `npm test`
Expected: PASS（62件）

- [ ] **Step 3: 失敗するテストを書く**

`tests/app/ui.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { el, svg, clear } from '../../src/app/ui';

describe('el', () => {
  it('属性・イベント・子を付けて要素を作る', () => {
    let hit = 0;
    const b = el('button', { class: 'btn', type: 'button', disabled: true, onclick: () => { hit++; } }, 'おす', null, false);
    expect(b.tagName).toBe('BUTTON');
    expect(b.className).toBe('btn');
    expect(b.disabled).toBe(true);
    expect(b.textContent).toBe('おす');
    b.disabled = false; b.click();
    expect(hit).toBe(1);
  });
  it('false の属性は付かない。子に要素も渡せる', () => {
    const d = el('div', { hidden: false }, el('span', {}, 'a'), 'b');
    expect(d.hasAttribute('hidden')).toBe(false);
    expect(d.children).toHaveLength(1);
    expect(d.textContent).toBe('ab');
  });
  it('svg は SVG 要素を返し、clear は子を全部消す', () => {
    const s = svg('<svg viewBox="0 0 24 24"><circle r="4"/></svg>');
    expect(s.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(s.querySelector('circle')).not.toBeNull();
    const d = el('div', {}, 'x', 'y');
    clear(d);
    expect(d.childNodes).toHaveLength(0);
  });
});
```

`tests/app/ids.test.ts`：
```ts
import { describe, it, expect } from 'vitest';
import { newId } from '../../src/app/ids';

describe('id', () => {
  it('16文字以上で、100回作ってもかぶらない', () => {
    const s = new Set<string>();
    for (let i = 0; i < 100; i++) s.add(newId());
    expect(s.size).toBe(100);
    for (const id of s) expect(id.length).toBeGreaterThanOrEqual(16);
  });
});
```

`tests/app/storage.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { safeStore } from '../../src/app/storage';

describe('safeStore', () => {
  it('localStorage に書いて読める', () => {
    const st = safeStore();
    st.setItem('cookpop.test', '1');
    expect(st.getItem('cookpop.test')).toBe('1');
    expect(localStorage.getItem('cookpop.test')).toBe('1');
    localStorage.removeItem('cookpop.test');
  });
  it('setItem が投げても止まらない', () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new Error('満杯'); };
    try {
      const st = safeStore();
      expect(() => st.setItem('x', '1')).not.toThrow();
    } finally { Storage.prototype.setItem = orig; }
  });
});
```

- [ ] **Step 4: 失敗することを確かめる**

Run: `npm test -- tests/app`
Expected: FAIL（モジュールが無い）

- [ ] **Step 5: `ui.ts`・`ids.ts`・`storage.ts` を書き、`style.css` を置く**

`src/app/style.css` はこの内容で始める（部品は以降のタスクで必要なものだけ足してよいが、変数と `.pop` の考え方は変えない）：
```css
/* クックポップの見た目の土台。色・角丸・文字は全部ここの変数で */
:root {
  --cream: #FFF6E5;      /* 画面の地 */
  --paper: #FFFDF8;      /* カードや入力欄の地 */
  --ink: #4A2E1C;        /* 文字と輪郭（こげ茶） */
  --ink-soft: #8A6A55;   /* 補足の文字 */
  --line: var(--ink);    /* 輪郭と平らな影 */
  --yolk: #FFC43D;       /* 卵黄：いちばん大事なボタン */
  --yolk-deep: #E8A617;
  --apricot: #FF8A5B;    /* あんず：お気に入り・注意 */
  --leaf: #7FC98F;       /* 若葉：作った！・できた */
  --leaf-deep: #4F9E62;
  --r-sm: 10px; --r-md: 16px; --r-lg: 24px; --r-pill: 999px;
  --fs-1: 13px; --fs-2: 15px; --fs-3: 17px; --fs-4: 22px; --fs-5: 28px; --fs-6: 40px;
  --pop-x: 4px; --pop-y: 4px;
  --tabbar-h: 64px;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --cream: #2A1D14; --paper: #3A2A1E; --ink: #FFF1DC; --ink-soft: #C9B4A3;
    --yolk: #FFC43D; --yolk-deep: #E8A617; --apricot: #FF8A5B; --leaf: #7FC98F; --leaf-deep: #4F9E62;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --cream: #2A1D14; --paper: #3A2A1E; --ink: #FFF1DC; --ink-soft: #C9B4A3;
  --yolk: #FFC43D; --yolk-deep: #E8A617; --apricot: #FF8A5B; --leaf: #7FC98F; --leaf-deep: #4F9E62;
  color-scheme: dark;
}
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--cream); color: var(--ink);
  font-family: "Zen Maru Gothic", "Hiragino Maru Gothic ProN", "Hiragino Sans", system-ui, sans-serif;
  font-weight: 500; font-size: var(--fs-2); line-height: 1.6;
  -webkit-font-smoothing: antialiased; -webkit-tap-highlight-color: transparent;
  overscroll-behavior: none;
}
button, input, select, textarea { font: inherit; color: inherit; }
:focus-visible { outline: 3px solid var(--yolk); outline-offset: 2px; }
h1, h2, h3, p { margin: 0; }

/* ステッカー風：2px の輪郭と、右下の平らな影。押すと沈む */
.pop {
  background: var(--paper); border: 2px solid var(--line); border-radius: var(--r-md);
  box-shadow: var(--pop-x) var(--pop-y) 0 var(--line);
}
.pop-press { cursor: pointer; transition: transform .08s, box-shadow .08s; }
.pop-press:active { transform: translate(2px, 2px); box-shadow: 2px 2px 0 var(--line); }
.pop-press:disabled { opacity: .45; cursor: default; transform: none; }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 44px;
  padding: 8px 18px; border-radius: var(--r-pill); font-weight: 700; font-size: var(--fs-3); }
.btn-yolk { background: var(--yolk); }
.btn-leaf { background: var(--leaf); }
.btn-apricot { background: var(--apricot); }
.btn-big { min-height: 64px; padding: 12px 36px; font-size: var(--fs-5); font-weight: 900; }
.btn-quiet { border-color: transparent; box-shadow: none; background: transparent; color: var(--ink-soft); }

.chip { display: inline-flex; align-items: center; min-height: 36px; padding: 4px 14px; border: 2px solid var(--line);
  border-radius: var(--r-pill); background: var(--paper); font-weight: 700; font-size: var(--fs-2); cursor: pointer; }
.chip[aria-pressed="true"] { background: var(--ink); color: var(--cream); }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }

.field { display: grid; gap: 4px; font-weight: 700; font-size: var(--fs-2); }
.field small { font-weight: 500; color: var(--ink-soft); font-size: var(--fs-1); }
.input { width: 100%; min-height: 44px; padding: 8px 12px; border: 2px solid var(--line); border-radius: var(--r-sm);
  background: var(--paper); font-size: 16px; }
textarea.input { min-height: 88px; resize: vertical; }

.screen { display: none; padding: calc(16px + env(safe-area-inset-top, 0px)) 16px calc(var(--tabbar-h) + 24px + env(safe-area-inset-bottom, 0px)); max-width: 560px; margin: 0 auto; }
.screen[data-active="true"] { display: block; }
.screen-title { font-size: var(--fs-4); font-weight: 900; margin-bottom: 12px; }
.muted { color: var(--ink-soft); font-size: var(--fs-1); }
.stack { display: grid; gap: 12px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.tabbar { position: fixed; left: 0; right: 0; bottom: 0; height: calc(var(--tabbar-h) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px); background: var(--paper); border-top: 2px solid var(--line);
  display: grid; grid-template-columns: repeat(4, 1fr); z-index: 10; }
.tab { border: 0; background: transparent; display: grid; justify-items: center; gap: 2px; padding: 8px 0 6px;
  font-size: var(--fs-1); font-weight: 700; color: var(--ink-soft); cursor: pointer; }
.tab svg { width: 26px; height: 26px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.tab[aria-selected="true"] { color: var(--ink); }
.tab[aria-selected="true"] .tab-ico { background: var(--yolk); }
.tab-ico { width: 44px; height: 30px; display: grid; place-items: center; border-radius: var(--r-pill); }

.toast { position: fixed; left: 50%; bottom: calc(var(--tabbar-h) + 16px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
  background: var(--ink); color: var(--cream); padding: 8px 18px; border-radius: var(--r-pill); font-weight: 700;
  opacity: 0; transition: opacity .2s; pointer-events: none; z-index: 20; }
.toast[data-show="true"] { opacity: 1; }

@media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }
```

- [ ] **Step 6: 通ることを確かめる**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add package.json package-lock.json src/app src/core/store.ts tests
git commit -m "見た目の土台（色・文字・ステッカー風の部品）と DOM・id・保存の小さな部品"
```

---

### Task 2: データの持ち主（state.ts）

**Files:**
- Create: `src/app/state.ts`
- Test: `tests/app/state.test.ts`

**Interfaces:**
- Consumes: core の `loadData`・`saveData`・`exportBackup`・`importBackup`・`AppData`・`Settings`・`KeyValueStore`、`newRecipe`・`sanitizeRecipe`・`findByVideoId`・`parseVideoId`・`RecipeInput`・`Recipe`、`addLog`
- Produces:
  ```ts
  export type AddResult = { ok: true; recipe: Recipe } | { ok: false; reason: 'invalid' | 'duplicate' };
  export interface AppState {
    readonly data: AppData;                       // 読み取り専用で使う
    today(): string;                              // 呼ぶたびに now() から作る
    subscribe(fn: () => void): () => void;        // 変わったら呼ばれる。戻り値で解除
    addRecipe(input: RecipeInput): AddResult;     // 同じ videoId があれば duplicate
    updateRecipe(id: string, patch: Partial<Pick<Recipe, 'name' | 'cat' | 'channel' | 'memo'>>): boolean; // sanitizeRecipe で検証、null なら false で変えない
    deleteRecipe(id: string): void;               // 記録は残す
    toggleFav(id: string): void;
    markCooked(id: string): void;                 // today() で addLog
    updateSettings(patch: Partial<Settings>): void;
    exportBackup(): string;
    importBackup(raw: string, mode: 'replace' | 'merge'): boolean; // 読めなければ false で変えない
  }
  export function createState(store: KeyValueStore, now: () => Date, newId: () => string): AppState
  ```
  変更のたびに `saveData` → 購読者へ通知。`data` は変更のたびに新しいオブジェクト（配列も新しく）にし、画面は参照の違いで変化を知れる

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/state.test.ts`：
```ts
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
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app/state.test.ts`
Expected: FAIL

- [ ] **Step 3: `src/app/state.ts` を書く**

`updateRecipe` は「今の料理に patch を重ねたもの」を `sanitizeRecipe` に通し、null なら false。

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app/state.ts tests/app/state.test.ts
git commit -m "データの持ち主（変えたら保存して画面に知らせる）"
```

---

### Task 3: タブ・起動・お知らせ・テーマ（tabs.ts・main.ts・toast.ts・theme.ts・icons.ts）

**Files:**
- Create: `src/app/tabs.ts`, `src/app/toast.ts`, `src/app/theme.ts`, `src/app/icons.ts`, `src/app/screens/placeholder.ts`（タブの中身が揃うまでの仮の画面。Task 4〜9 で置き換える）
- Modify: `src/app/main.ts`（準備中の1行を捨てて起動の流れに）
- Test: `tests/app/tabs.test.ts`, `tests/app/theme.test.ts`, `tests/app/toast.test.ts`

**Interfaces:**
- Produces:
  - `interface TabDef { id: TabId; label: string; icon: string; view: HTMLElement }`、`type TabId = 'pick' | 'book' | 'log' | 'settings'`
  - `createTabs(tabs: TabDef[], initial?: TabId): { el: HTMLElement; select(id: TabId): void; current(): TabId; onChange(fn: (id: TabId) => void): void }`。`el` は `<div class="app">` で、中に各 `view`（`class="screen"`・`data-active`）と `<nav class="tabbar" role="tablist">`。ボタンは `role="tab"`・`aria-selected`・`aria-controls`
  - `ICONS: Record<TabId, string>`（自作 SVG の文字列。24×24、線だけ、`currentColor`。きめる＝ごはん茶碗から「？」の形の湯気、献立帳＝リボンのしおりが付いた本、きろく＝日めくりの紙に小さな丸印、設定＝ふたの付いたお鍋）
  - `toast(msg: string): void`（画面下に1.8秒。連続で呼ばれたら最後だけ）
  - `applyTheme(theme: Theme): void`（`auto` なら `data-theme` を消す、`light`/`dark` なら付ける）
  - `main.ts`：フォントの CSS と `style.css` を import → `safeStore()`・`createState(..., () => new Date(), newId)` → `applyTheme` → 4つの画面（いまは placeholder）で `createTabs` → `#app` に入れる → `state.subscribe` でテーマを追従

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/tabs.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createTabs, type TabDef } from '../../src/app/tabs';
import { ICONS } from '../../src/app/icons';
import { el } from '../../src/app/ui';

const defs = (): TabDef[] => (['pick', 'book', 'log', 'settings'] as const).map(id => ({ id, label: id, icon: ICONS[id], view: el('section', { class: 'screen' }, id) }));

describe('タブ', () => {
  it('4つ並び、最初は きめる。選ぶと表示が切り替わる', () => {
    const t = createTabs(defs());
    const tabs = t.el.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(4);
    expect(t.current()).toBe('pick');
    expect(t.el.querySelectorAll('.screen[data-active="true"]')).toHaveLength(1);
    let seen = '';
    t.onChange(id => { seen = id; });
    (tabs[2] as HTMLElement).click();
    expect(t.current()).toBe('log');
    expect(seen).toBe('log');
    expect(tabs[2].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0].getAttribute('aria-selected')).toBe('false');
    const active = t.el.querySelector('.screen[data-active="true"]')!;
    expect(active.textContent).toBe('log');
  });
  it('アイコンは4つとも SVG で、絵文字を含まない', () => {
    for (const id of ['pick', 'book', 'log', 'settings'] as const) {
      expect(ICONS[id].startsWith('<svg')).toBe(true);
      expect(/[\u{1F300}-\u{1FAFF}]/u.test(ICONS[id])).toBe(false);
    }
  });
});
```

`tests/app/theme.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { applyTheme } from '../../src/app/theme';

describe('テーマ', () => {
  it('auto は属性なし、light/dark は data-theme', () => {
    applyTheme('dark');
    expect(document.documentElement.dataset.theme).toBe('dark');
    applyTheme('auto');
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    applyTheme('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });
});
```

`tests/app/toast.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { toast } from '../../src/app/toast';

describe('お知らせ', () => {
  it('出て、1.8秒で消える。連続なら最後の文言', () => {
    vi.useFakeTimers();
    toast('ひとつ'); toast('ふたつ');
    const t = document.querySelector('.toast')!;
    expect(t.textContent).toBe('ふたつ');
    expect(t.getAttribute('data-show')).toBe('true');
    vi.advanceTimersByTime(1800);
    expect(t.getAttribute('data-show')).toBe('false');
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app`
Expected: FAIL

- [ ] **Step 3: 書く**

`placeholder.ts` は `createPlaceholder(title: string): { el: HTMLElement }`（`screen` クラスの section に `screen-title` だけ）。

- [ ] **Step 4: 通ることと、組み立てが通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS。`dist/` ができる

- [ ] **Step 5: 目で見る**

Run: `npm run dev` を起動し、ブラウザで開いて、タブが4つ出て切り替わること、クリーム色の地と Zen Maru Gothic で表示されることを確かめる（スクリーンショットを report に書く）。見終えたら止める。

- [ ] **Step 6: コミット**

```bash
git add src/app tests/app
git commit -m "4つのタブと起動の流れ、お知らせ、テーマの切り替え"
```

---

### Task 4: マスコットの受け口と「きめる」画面（mascot/pon.ts・mascot/lines.ts・screens/pick.ts）

**Files:**
- Create: `src/app/mascot/pon.ts`, `src/app/mascot/lines.ts`, `src/app/screens/pick.ts`
- Modify: `src/app/main.ts`（placeholder を pick に差し替え）, `src/app/style.css`（画面の部品を足す）
- Test: `tests/app/lines.test.ts`, `tests/app/pick.test.ts`

**Interfaces:**
- Consumes: `AppState`、`pickOne`・`pickMany`、`countOf`・`lastMade`、`watchUrl`（core/recipe にあるものを使う。無ければ `'https://www.youtube.com/watch?v=' + videoId`）
- Produces:
  - `type Mood = 'normal' | 'thinking' | 'decided' | 'happy' | 'full' | 'sad' | 'sleepy'`
  - `interface Mascot { el: HTMLElement; setMood(m: Mood): void; setBelly(n: 0 | 1 | 2 | 3): void; say(text: string, action?: { label: string; onClick: () => void }): void; hush(): void }`
  - `createMascot(): Mascot`。計画2では**仮の絵**：`<svg viewBox="0 0 120 120">` に丸い体（卵黄色）・白いおなか・目2つ・小さなくちばし・コック帽（白い台形＋丸）を線で描く。`el` は `<div class="mascot" data-mood data-belly>` で、中に svg と `<div class="bubble pop" role="status">`（吹き出し。`say` で文言とボタンを入れ、`hush` で空に）。表情の違いは `data-mood` 属性の切り替えだけ（絵の変化は計画3）
  - `greeting(hour: number): string`（5〜9 朝「おはよう！朝ごはん、なににする？」、10〜14「こんにちは！お昼はなににする？」、15〜22「今日の晩ごはん、なににする？」、23〜4 「もう遅いね…軽いのにする？」）
  - `bellyLevel(monthCount: number): 0 | 1 | 2 | 3`（0 → 0、1〜4 → 1、5〜9 → 2、10以上 → 3）
  - `fewRecipesLine(count: number): string | null`（5 未満なら「まだ${count}品しか知らないよ。献立帳で足してね」、それ以外 null）
  - `createPickScreen(state: AppState, deps: { rng: () => number; mascot: Mascot; openPlayer: (host: HTMLElement, videoId: string) => void; now: () => Date }): { el: HTMLElement }`

画面の動き：
- 上：`mascot.el`（吹き出しに `greeting(now().getHours())`。登録が5品未満なら `fewRecipesLine`、0品なら「まずは献立帳で登録してね」）
- 真ん中：料理名の枠 `<div class="dish" aria-live="polite">`、その下に `<button class="btn btn-yolk btn-big pop pop-press" id="roll">きめて！</button>`
- 下：チップ列（すべて・主菜・副菜・汁物・ご飯・麺・おやつ、`aria-pressed`）、「お気に入りだけ」チップ、「3つから選ぶ」チップ
- 候補 = `state.data.recipes` を絞ったもの。0件ならボタン `disabled` と「このジャンルはまだ登録がありません」
- 押す：`mascot.setMood('thinking')`、料理名が 16 回パラパラ変わる（50ms から 1.15 倍ずつ遅く。reduced-motion なら即）、最後に `pickOne({ recipes, logs, today: state.today(), rng, exclude: [前回の id] })` の結果で止まり `mascot.setMood('decided')`、吹き出し「これ！」
- 結果カード `<article class="card pop result">`：サムネイル（`<img>`、`loading="lazy"`、alt は料理名）、料理名（900）、チャンネル名とジャンル、メモ、`作った回数 n回（最後：M月D日）` か `まだ作っていません`、ボタン行「作った！」（`btn-leaf`）「別のにして」「動画を見る」。「動画を見る」で `deps.openPlayer(カード内の枠, videoId)`（Task 5 までは枠に「YouTube で開く」のリンク `watchUrl` だけ出す）
- 「作った！」：`state.markCooked(id)`、`mascot.setMood('happy')`、吹き出し「おいしくできた？」、`toast('記録しました')`
- 「別のにして」：exclude に今の id を足してもう一度（候補が1つなら何もしない）
- 「3つから選ぶ」オン：`pickMany(..., 3)` で3枚の小さなカード（サムネイルと名前）。タップで1枚に決まり結果カードへ
- `state.subscribe` で候補とチップの状態を描き直す（結果カードは消さない。削除された料理なら消す）

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/lines.test.ts`：
```ts
import { describe, it, expect } from 'vitest';
import { greeting, bellyLevel, fewRecipesLine } from '../../src/app/mascot/lines';

describe('ポンのセリフ', () => {
  it('時間帯で挨拶が変わる', () => {
    expect(greeting(7)).toContain('おはよう');
    expect(greeting(12)).toContain('お昼');
    expect(greeting(19)).toContain('晩ごはん');
    expect(greeting(23)).toContain('遅い');
    expect(greeting(3)).toContain('遅い');
  });
  it('おなかの段階', () => {
    expect([0, 1, 4, 5, 9, 10, 30].map(bellyLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it('登録が少ないときだけ一言', () => {
    expect(fewRecipesLine(3)).toContain('3品');
    expect(fewRecipesLine(5)).toBeNull();
  });
});
```

`tests/app/pick.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { createState } from '../../src/app/state';
import { createMascot } from '../../src/app/mascot/pon';
import { createPickScreen } from '../../src/app/screens/pick';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
function setup() {
  Object.defineProperty(window, 'matchMedia', { writable: true, value: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }) });
  const state = createState(fake(), () => new Date(2026, 9, 23, 19), () => 'x');
  const mascot = createMascot();
  const opened: string[] = [];
  const scr = createPickScreen(state, { rng: () => 0, mascot, openPlayer: (_h, v) => { opened.push(v); }, now: () => new Date(2026, 9, 23, 19) });
  document.body.append(scr.el);
  return { state, mascot, scr, opened };
}

describe('きめる画面', () => {
  it('挨拶が出て、きめて！で料理が決まり結果カードが出る（動きなし）', () => {
    const { scr, mascot } = setup();
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('晩ごはん');
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const dish = scr.el.querySelector('.dish')!;
    expect(dish.textContent).toBe('よだれ水餃子');
    expect(scr.el.querySelector('.result')).not.toBeNull();
    expect(mascot.el.dataset.mood).toBe('decided');
  });
  it('作った！で記録が増えてポンが喜ぶ。別のにして で別の料理', () => {
    const { scr, state, mascot } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const buttons = [...scr.el.querySelectorAll('.result button')] as HTMLButtonElement[];
    buttons.find(b => b.textContent === '作った！')!.click();
    expect(state.data.logs).toHaveLength(1);
    expect(mascot.el.dataset.mood).toBe('happy');
    buttons.find(b => b.textContent === '別のにして')!.click();
    expect(scr.el.querySelector('.dish')!.textContent).not.toBe('よだれ水餃子');
  });
  it('ジャンルで絞る。0件ならボタンが押せない', () => {
    const { scr } = setup();
    const chip = [...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'おやつ') as HTMLElement;
    chip.click();
    expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
    expect(scr.el.textContent).toContain('まだ登録がありません');
  });
  it('3つから選ぶ', () => {
    const { scr } = setup();
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '3つから選ぶ') as HTMLElement).click();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    const cards = scr.el.querySelectorAll('.choice');
    expect(cards).toHaveLength(3);
    (cards[1] as HTMLElement).click();
    expect(scr.el.querySelector('.result')).not.toBeNull();
    expect(scr.el.querySelector('.dish')!.textContent).toBe(cards[1].textContent);
  });
  it('動画を見る で openPlayer が呼ばれる', () => {
    const { scr, opened } = setup();
    (scr.el.querySelector('#roll') as HTMLButtonElement).click();
    ([...scr.el.querySelectorAll('.result button')].find(b => b.textContent === '動画を見る') as HTMLElement).click();
    expect(opened).toEqual(['HzLAMA5ck_8']);
  });
  it('登録が0品なら案内が出る', () => {
    const { scr, state, mascot } = setup();
    for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
    expect(mascot.el.querySelector('.bubble')!.textContent).toContain('献立帳で登録');
    expect((scr.el.querySelector('#roll') as HTMLButtonElement).disabled).toBe(true);
  });
});
```
（`rng: () => 0` と `matchMedia` が reduced-motion を返す設定で、結果が決まる）

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app`
Expected: FAIL

- [ ] **Step 3: 書く**

`style.css` に足す部品：`.mascot`（中央寄せ、svg は 140px）、`.bubble`（吹き出し。`pop` に加えて下向きの三角の尻尾を `::after` で）、`.dish`（`font-size: var(--fs-6)`、900、中央、`min-height: 2.4em`、長い名前は `word-break`）、`.card`（`pop` の上に `border-radius: var(--r-lg)`、画像は上辺いっぱい `aspect-ratio: 16/9; object-fit: cover`）、`.result`（下からせり上がる `transform` の transition、reduced-motion では無し）、`.choice`（3枚のカード。横並びで `flex: 1`、サムネイルと名前）。影はすべて平らな影。

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: 目で見る**

`npm run dev` で、きめて！を押してパラパラ→決定→結果カードの流れ、チップ、3つから選ぶを確かめる。止める。

- [ ] **Step 6: コミット**

```bash
git add src/app tests/app
git commit -m "きめる画面：ポンの受け口・ルーレット・結果カード・3つから選ぶ"
```

---

### Task 5: 動画プレーヤー（player.ts）

**Files:**
- Create: `src/app/player.ts`
- Modify: `src/app/main.ts`（`openPlayer` に本物を渡す）, `src/app/style.css`
- Test: `tests/app/player.test.ts`

**Interfaces:**
- Produces:
  - `interface YTLike { Player: new (host: HTMLElement, opts: { videoId: string; host?: string; playerVars?: Record<string, string | number>; events?: { onReady?: () => void; onError?: (e: { data: number }) => void } }) => { destroy(): void } }`
  - `loadYouTubeApi(doc: Document = document, timeoutMs = 8000): Promise<YTLike>`（`<script src="https://www.youtube.com/iframe_api">` を1回だけ足し、`window.onYouTubeIframeAPIReady` で `window.YT` を返す。時間切れ・読み込み失敗は reject。2回目以降は同じ Promise）
  - `openPlayer(host: HTMLElement, videoId: string, deps?: { loadApi?: () => Promise<YTLike>; openExternal?: (url: string) => void }): void`
    - host を空にし、`<div class="player pop">` に 16:9 の枠を作り、「読み込み中…」を出す
    - `loadApi()` → `new YT.Player(枠, { videoId, host: 'https://www.youtube-nocookie.com', playerVars: { playsinline: 1, rel: 0, modestbranding: 1 }, events })`
    - `onError`（どの番号でも）・loadApi の失敗 → 枠を「この動画はアプリの中では再生できません」と `<a class="btn pop pop-press" href=watchUrl target="_blank" rel="noopener">YouTube で開く</a>` に置き換える（`openExternal` が渡されていれば click でそれを呼ぶ。計画4で iPhone の外部ブラウザに差し替えるため）
    - 枠の下に常に小さく「YouTube で開く」のリンクも置く
  - 画面側（pick・book の詳細）は `openPlayer` を `deps` で受けるだけ

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/player.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { openPlayer, type YTLike } from '../../src/app/player';

function fakeYT(fail: boolean): YTLike {
  return { Player: class { constructor(_h: HTMLElement, o: { events?: { onReady?: () => void; onError?: (e: { data: number }) => void } }) {
    queueMicrotask(() => fail ? o.events?.onError?.({ data: 150 }) : o.events?.onReady?.());
  } destroy() {} } };
}
const tick = () => new Promise(r => setTimeout(r, 0));

describe('プレーヤー', () => {
  it('API が読めて再生できるときは枠が残り、YouTube で開く のリンクもある', async () => {
    const host = document.createElement('div');
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => fakeYT(false) });
    expect(host.textContent).toContain('読み込み中');
    await tick();
    expect(host.querySelector('.player')).not.toBeNull();
    expect(host.textContent).not.toContain('再生できません');
    const a = host.querySelector('a[href="https://www.youtube.com/watch?v=HzLAMA5ck_8"]');
    expect(a).not.toBeNull();
  });
  it('埋め込み禁止（onError）なら YouTube で開く に切り替わる', async () => {
    const host = document.createElement('div');
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => fakeYT(true) });
    await tick();
    expect(host.textContent).toContain('再生できません');
    expect(host.querySelectorAll('a[href="https://www.youtube.com/watch?v=HzLAMA5ck_8"]').length).toBeGreaterThanOrEqual(1);
  });
  it('API が読めないときも同じ。openExternal があれば click でそれを呼ぶ', async () => {
    const host = document.createElement('div');
    const opened: string[] = [];
    openPlayer(host, 'HzLAMA5ck_8', { loadApi: async () => { throw new Error('offline'); }, openExternal: u => { opened.push(u); } });
    await tick();
    (host.querySelector('a.btn') as HTMLElement).click();
    expect(opened).toEqual(['https://www.youtube.com/watch?v=HzLAMA5ck_8']);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app/player.test.ts`
Expected: FAIL

- [ ] **Step 3: 書く**

`.player` は `aspect-ratio: 16/9; overflow: hidden; border-radius: var(--r-md)`、中の iframe は `width/height 100%`。

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: 目で見る**

`npm run dev` で結果カードの「動画を見る」から実際に再生されることを確かめる（ネットあり）。止める。

- [ ] **Step 6: コミット**

```bash
git add src/app tests/app
git commit -m "動画プレーヤー（公式の埋め込み。再生できなければ YouTube で開く）"
```

---

### Task 6: 登録・編集フォーム（screens/form.ts）

**Files:**
- Create: `src/app/screens/form.ts`
- Modify: `src/app/style.css`
- Test: `tests/app/form.test.ts`

**Interfaces:**
- Consumes: `AppState`、`parseVideoId`・`findByVideoId`・`CATS`、`fetchMeta`・`FetchJson`
- Produces:
  - `createForm(state: AppState, deps: { fetchJson: FetchJson; onDone: () => void; prefill?: { url?: string; recipeId?: string } }): { el: HTMLElement; setUrl(url: string): void }`
  - 新規（`recipeId` なし）：項目は「YouTube のリンク」（`type="url"`、`inputmode="url"`）、「料理の名前」、「ジャンル」（チップ列、`aria-pressed`、既定は主菜）、「チャンネル名（なくてもOK）」、「メモ」、送信「登録する」（`btn-yolk`）
  - リンク欄の `input`・`paste`・`blur` と `setUrl` で：`parseVideoId` → 読めなければエラー行「YouTube の動画リンクを貼ってください」。同じ videoId がすでにあれば「もう登録してあるよ：<名前>」と出して送信を止める。それ以外は `fetchMeta(videoId, fetchJson)` を呼び、返ってきたら 名前（空のときだけ）・チャンネル名（空のときだけ）・サムネイル（内部に保持）を埋める。途中の表示「題を取ってくる…」。失敗は黙って手入力
  - 送信：`state.addRecipe({ url, name, cat, channel, thumb, memo })` → ok なら `toast('「名前」を登録しました')`・`onDone()`；invalid なら上のエラー行；duplicate なら上の案内
  - 編集（`recipeId` あり）：リンク欄は出さず（動画は変えない）、名前・ジャンル・チャンネル・メモを埋めて、送信「保存する」→ `state.updateRecipe` → `toast('保存しました')`・`onDone()`
  - 連打防止：fetchMeta 中は `data-busy="true"`。同じ videoId で2回は取らない

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/form.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createForm } from '../../src/app/screens/form';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const mkState = () => createState(fake(), () => new Date(2026, 9, 23), () => 'new');
const input = (root: HTMLElement, name: string) => root.querySelector(`[name="${name}"]`) as HTMLInputElement;

describe('登録フォーム', () => {
  it('リンクを貼ると題とチャンネルが自動で埋まり、登録できる', async () => {
    const state = mkState(); let done = 0;
    const f = createForm(state, { fetchJson: async () => ({ title: '鶏むねの甘辛', author_name: 'ある人', thumbnail_url: 'https://i.ytimg.com/vi/ZZZZZZZZZZZ/hqdefault.jpg' }), onDone: () => { done++; } });
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    await tick();
    expect(input(f.el, 'name').value).toBe('鶏むねの甘辛');
    expect(input(f.el, 'channel').value).toBe('ある人');
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(done).toBe(1);
    const r = state.data.recipes.find(r => r.videoId === 'ZZZZZZZZZZZ')!;
    expect(r.name).toBe('鶏むねの甘辛');
    expect(r.thumb).toBe('https://i.ytimg.com/vi/ZZZZZZZZZZZ/hqdefault.jpg');
  });
  it('通信が失敗しても手入力で登録できる', async () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => { throw new Error('offline'); }, onDone: () => {} });
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    await tick();
    expect(input(f.el, 'name').value).toBe('');
    input(f.el, 'name').value = '手で入れた';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes.some(r => r.name === '手で入れた')).toBe(true);
  });
  it('壊れたリンクと、すでにある動画', () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => {} });
    f.setUrl('https://example.com/x');
    expect(f.el.textContent).toContain('動画リンクを貼ってください');
    f.setUrl('https://youtu.be/HzLAMA5ck_8');
    expect(f.el.textContent).toContain('もう登録してあるよ');
    input(f.el, 'name').value = 'x';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes).toHaveLength(8);
  });
  it('名前が空なら登録しない', () => {
    const state = mkState();
    const f = createForm(state, { fetchJson: async () => { throw new Error('x'); }, onDone: () => {} });
    f.setUrl('https://youtu.be/ZZZZZZZZZZZ');
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes).toHaveLength(8);
    expect(f.el.textContent).toContain('名前');
  });
  it('編集はリンク欄なしで、保存で名前が変わる', () => {
    const state = mkState(); const id = state.data.recipes[0].id; let done = 0;
    const f = createForm(state, { fetchJson: async () => ({}), onDone: () => { done++; }, prefill: { recipeId: id } });
    expect(f.el.querySelector('[name="url"]')).toBeNull();
    expect(input(f.el, 'name').value).toBe('よだれ水餃子');
    input(f.el, 'name').value = '水餃子（よだれ）';
    (f.el.querySelector('form') as HTMLFormElement).requestSubmit();
    expect(state.data.recipes[0].name).toBe('水餃子（よだれ）');
    expect(done).toBe(1);
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app/form.test.ts`
Expected: FAIL

- [ ] **Step 3: 書く**

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app tests/app
git commit -m "登録・編集フォーム（リンクを貼ると題とチャンネルが埋まる）"
```

---

### Task 7: 献立帳（screens/book.ts）

**Files:**
- Create: `src/app/screens/book.ts`
- Modify: `src/app/main.ts`（placeholder を book に。`fetchJson` は `fetch(url).then(r => r.json())`）, `src/app/style.css`
- Test: `tests/app/book.test.ts`

**Interfaces:**
- Consumes: `AppState`、`createForm`、`countOf`・`lastMade`、`openPlayer`
- Produces: `createBookScreen(state: AppState, deps: { fetchJson: FetchJson; openPlayer: (host: HTMLElement, videoId: string) => void; confirm: (msg: string) => boolean }): { el: HTMLElement; openForm(prefillUrl?: string): void; showRecipe(id: string): void }`
  - 一覧：見出し「献立帳 <small>n品</small>」と右上の「＋ 登録する」ボタン（`btn-yolk`）。チップ列（すべて・各ジャンル、お気に入りだけ）。2列のグリッド `<ul class="grid">` に `<li class="card pop tile">`（サムネイル、名前、ジャンルの小さな札、右上に ★（お気に入りは `apricot`、`aria-pressed`、`aria-label="お気に入り"`、タップで `toggleFav`。カードのタップと区別する）
  - 0件：「まだ何もありません。＋ 登録する で好きな料理動画を足しましょう」。絞って0件：「この条件の料理はありません」
  - 詳細（`showRecipe`）：一覧の代わりに `<article class="detail">`：「← 献立帳」ボタン、サムネイルと「動画を見る」（押したら `openPlayer`）、名前、チャンネル名・ジャンル、メモ、作った回数と最後の日、ボタン行「作った！」「★お気に入り」「編集する」「削除する」。削除は `confirm('「名前」を削除しますか？作った記録は残ります')` で true のときだけ
  - フォーム（`openForm`）：一覧の代わりに `createForm`（`onDone` で一覧に戻る）。「← 献立帳」で戻る
  - `state.subscribe` で一覧・詳細を描き直す（詳細の料理が消えていたら一覧へ）

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/book.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createBookScreen } from '../../src/app/screens/book';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
function setup(confirmAnswer = true) {
  const state = createState(fake(), () => new Date(2026, 9, 23), () => 'new');
  const opened: string[] = [];
  const scr = createBookScreen(state, { fetchJson: async () => ({}), openPlayer: (_h, v) => { opened.push(v); }, confirm: () => confirmAnswer });
  document.body.append(scr.el);
  return { state, scr, opened };
}
const btn = (root: Element, text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;

describe('献立帳', () => {
  it('8品が並び、ジャンルとお気に入りで絞れる', () => {
    const { scr, state } = setup();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(8);
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'ご飯・麺') as HTMLElement).click();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(3);
    state.toggleFav(state.data.recipes[0].id);
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'お気に入りだけ') as HTMLElement).click();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(0);
    expect(scr.el.textContent).toContain('この条件の料理はありません');
  });
  it('カードをタップで詳細。作った！・動画・削除', () => {
    const { scr, state, opened } = setup();
    (scr.el.querySelector('.tile') as HTMLElement).click();
    const d = scr.el.querySelector('.detail')!;
    expect(d.textContent).toContain('よだれ水餃子');
    btn(d, '作った！').click();
    expect(state.data.logs).toHaveLength(1);
    btn(scr.el.querySelector('.detail')!, '動画を見る').click();
    expect(opened).toEqual(['HzLAMA5ck_8']);
    btn(scr.el.querySelector('.detail')!, '削除する').click();
    expect(state.data.recipes).toHaveLength(7);
    expect(scr.el.querySelector('.detail')).toBeNull();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(7);
  });
  it('削除で いいえ なら消えない', () => {
    const { scr, state } = setup(false);
    (scr.el.querySelector('.tile') as HTMLElement).click();
    btn(scr.el.querySelector('.detail')!, '削除する').click();
    expect(state.data.recipes).toHaveLength(8);
  });
  it('＋ 登録する でフォーム、戻るで一覧', () => {
    const { scr } = setup();
    btn(scr.el, '＋ 登録する').click();
    expect(scr.el.querySelector('form')).not.toBeNull();
    btn(scr.el, '← 献立帳').click();
    expect(scr.el.querySelector('form')).toBeNull();
    expect(scr.el.querySelectorAll('.tile')).toHaveLength(8);
  });
  it('全部消すと案内', () => {
    const { scr, state } = setup();
    for (const r of [...state.data.recipes]) state.deleteRecipe(r.id);
    expect(scr.el.textContent).toContain('まだ何もありません');
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app/book.test.ts`
Expected: FAIL

- [ ] **Step 3: 書く**

`.grid`（2列、gap 12px、`list-style: none; padding: 0`）、`.tile`（画像 16:9、名前は2行で省略、札は小さなピル `.tag`）、`.detail`。

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: 目で見る**

`npm run dev` で一覧・詳細・登録・編集・削除を確かめる。止める。

- [ ] **Step 6: コミット**

```bash
git add src/app tests/app
git commit -m "献立帳：一覧・絞り込み・詳細・登録と編集・削除"
```

---

### Task 8: きろく（screens/log.ts）

**Files:**
- Create: `src/app/screens/log.ts`, `src/app/calendar.ts`
- Modify: `src/app/main.ts`, `src/app/style.css`
- Test: `tests/app/calendar.test.ts`, `tests/app/log.test.ts`

**Interfaces:**
- Consumes: `AppState`、`monthCount`・`daysMadeIn`・`logsOn`・`sortByOften`・`sortByStale`・`countOf`・`lastMade`、`bellyLevel`、`Mascot`
- Produces:
  - `calendarCells(month: string): { date: string | null }[]`（`YYYY-MM` の月の、日曜始まりの 6×7=42 マス。月外は null）、`shiftMonth(month: string, delta: number): string`、`monthLabel(month: string): string`（`2026年10月`）
  - `createLogScreen(state: AppState, deps: { mascot: Mascot; now: () => Date; showRecipe: (id: string) => void }): { el: HTMLElement }`
  - 上：小さなポン（`deps.mascot` とは別に `createMascot()` をもう1体作って `setBelly(bellyLevel(monthCount(今月)))`、`setMood(level >= 3 ? 'full' : 'normal')`）と「今月は n回 作ったよ」
  - 月の切り替え「‹」「›」と `monthLabel`。7列のグリッド。作った日は `.day[data-made="true"]`（小さな丸印 `.mark`）。今日は `.day[data-today="true"]`。日をタップで下に「M月D日に作ったもの」の一覧（名前。削除済みは「（削除した料理）」）。タップで `showRecipe(id)`
  - 下：「よく作る順」「しばらく作ってない順」の切り替えチップと一覧（名前・回数・最後の日）

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/calendar.test.ts`：
```ts
import { describe, it, expect } from 'vitest';
import { calendarCells, shiftMonth, monthLabel } from '../../src/app/calendar';

describe('カレンダー', () => {
  it('2026年10月は木曜始まりで、42マス', () => {
    const c = calendarCells('2026-10');
    expect(c).toHaveLength(42);
    expect(c.slice(0, 5).map(x => x.date)).toEqual([null, null, null, null, '2026-10-01']);
    expect(c[4 + 30].date).toBe('2026-10-31');
    expect(c[35].date).toBeNull();
  });
  it('月の前後と表示', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(monthLabel('2026-10')).toBe('2026年10月');
  });
});
```

`tests/app/log.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createMascot } from '../../src/app/mascot/pon';
import { createLogScreen } from '../../src/app/screens/log';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };

describe('きろく', () => {
  it('作った日に印が付き、タップでその日の料理。今月の回数とおなか', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const shown: string[] = [];
    const scr = createLogScreen(state, { mascot: createMascot(), now: () => new Date(2026, 9, 23), showRecipe: id => { shown.push(id); } });
    document.body.append(scr.el);
    const id = state.data.recipes[0].id;
    state.markCooked(id);
    expect(scr.el.textContent).toContain('2026年10月');
    const made = scr.el.querySelectorAll('.day[data-made="true"]');
    expect(made).toHaveLength(1);
    expect(scr.el.textContent).toContain('今月は 1回');
    (made[0] as HTMLElement).click();
    expect(scr.el.textContent).toContain('10月23日');
    const item = [...scr.el.querySelectorAll('.daylist button')][0] as HTMLElement;
    expect(item.textContent).toContain('よだれ水餃子');
    item.click();
    expect(shown).toEqual([id]);
    expect(scr.el.querySelector('.mascot')!.getAttribute('data-belly')).toBe('1');
  });
  it('月を動かせる。並び替えの一覧', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createLogScreen(state, { mascot: createMascot(), now: () => new Date(2026, 9, 23), showRecipe: () => {} });
    document.body.append(scr.el);
    ([...scr.el.querySelectorAll('button')].find(b => b.getAttribute('aria-label') === '前の月') as HTMLElement).click();
    expect(scr.el.textContent).toContain('2026年9月');
    state.markCooked(state.data.recipes[2].id);
    const stale = [...scr.el.querySelectorAll('.chip')].find(c => c.textContent === 'しばらく作ってない順') as HTMLElement;
    stale.click();
    const names = [...scr.el.querySelectorAll('.ranking li')].map(li => li.textContent ?? '');
    expect(names[names.length - 1]).toContain('豚プルコギ');
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app`
Expected: FAIL

- [ ] **Step 3: 書く**

`.calendar`（7列グリッド）、`.day`（44px 四方、中央寄せ、`data-today` は輪郭、`data-made` は下に `.mark`（卵黄色の小さな丸。計画3で小さなポンの顔に替える））、`.ranking`。

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app tests/app
git commit -m "きろく：カレンダーと並び替え、今月のおなか"
```

---

### Task 9: 設定（screens/settings.ts）

**Files:**
- Create: `src/app/screens/settings.ts`, `src/app/files.ts`
- Modify: `src/app/main.ts`, `src/app/style.css`
- Test: `tests/app/settings.test.ts`

**Interfaces:**
- Produces:
  - `files.ts`：`interface FileDeps { saveText(name: string, text: string): Promise<void>; pickText(): Promise<string | null> }`、`webFiles(): FileDeps`（保存は Blob と `<a download>`、読み込みは `<input type="file" accept=".json,application/json">` を作ってクリックし、選ばれたら `text()`。キャンセルは null）
  - `createSettingsScreen(state: AppState, deps: { files: FileDeps; confirmMode: () => Promise<'replace' | 'merge' | null>; version: string }): { el: HTMLElement }`
  - 項目：
    - 「見た目」：チップ3つ（端末に合わせる／明るい／暗い）→ `updateSettings({ theme })`
    - 「クリップボードの YouTube リンクを見つけたら聞く」：チェックボックス → `clipboardCheck`
    - 「バックアップ」：「書き出す」→ `files.saveText('cookpop-backup-YYYY-MM-DD.json', state.exportBackup())` → `toast('書き出しました')`。「読み込む」→ `files.pickText()` → null なら何もしない → `confirmMode()`（置き換える／足す／やめる）→ `state.importBackup(raw, mode)` → true なら `toast('読み込みました')`、false なら `toast('読めませんでした。クックポップのバックアップを選んでね')`
    - 「このアプリについて」：`クックポップ v<version>`、「動画は YouTube の公式プレーヤーで再生します。再生できない動画は「YouTube で開く」から開いてください」、「文字：Zen Maru Gothic（SIL Open Font License）」
  - `main.ts`：`version` は `package.json` の version（vite で `import.meta.env` ではなく `define` で埋める：`vite.config.ts` に `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`、`src/vite-env.d.ts` に `declare const __APP_VERSION__: string`）。`confirmMode` は計画2では `window.confirm` 2段（「今のデータを置き換えますか？（キャンセルで“足す”）」→ 足すなら「足しますか？」）でよい

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/settings.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { createState } from '../../src/app/state';
import { createSettingsScreen } from '../../src/app/screens/settings';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));
const btn = (root: Element, text: string) => [...root.querySelectorAll('button')].find(b => b.textContent?.trim() === text) as HTMLButtonElement;

describe('設定', () => {
  it('見た目とクリップボードの設定が保存される', () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const scr = createSettingsScreen(state, { files: { saveText: async () => {}, pickText: async () => null }, confirmMode: async () => null, version: '0.1.0' });
    ([...scr.el.querySelectorAll('.chip')].find(c => c.textContent === '暗い') as HTMLElement).click();
    expect(state.data.settings.theme).toBe('dark');
    const cb = scr.el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    cb.click();
    expect(state.data.settings.clipboardCheck).toBe(false);
    expect(scr.el.textContent).toContain('v0.1.0');
  });
  it('書き出しと読み込み', async () => {
    const state = createState(fake(), () => new Date(2026, 9, 23), () => 'x');
    const saved: { name: string; text: string }[] = [];
    let picked: string | null = null;
    const scr = createSettingsScreen(state, { files: { saveText: async (name, text) => { saved.push({ name, text }); }, pickText: async () => picked }, confirmMode: async () => 'replace', version: '0.1.0' });
    btn(scr.el, '書き出す').click();
    await tick();
    expect(saved[0].name).toBe('cookpop-backup-2026-10-23.json');
    expect(JSON.parse(saved[0].text).recipes).toHaveLength(8);
    picked = JSON.stringify({ version: 1, recipes: [], logs: [], settings: {} });
    btn(scr.el, '読み込む').click();
    await tick();
    expect(state.data.recipes).toHaveLength(0);
    picked = '壊れ';
    btn(scr.el, '読み込む').click();
    await tick();
    expect(document.querySelector('.toast')!.textContent).toContain('読めませんでした');
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app/settings.test.ts`
Expected: FAIL

- [ ] **Step 3: 書く**

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: コミット**

```bash
git add src/app src/vite-env.d.ts vite.config.ts tests/app
git commit -m "設定：見た目・クリップボード・バックアップ・アプリについて"
```

---

### Task 10: クリップボード検知と配線の仕上げ（clipboardCheck.ts・main.ts）

**Files:**
- Create: `src/app/clipboardCheck.ts`
- Modify: `src/app/main.ts`
- Test: `tests/app/clipboardCheck.test.ts`

**Interfaces:**
- Produces:
  - `suggestFromClipboard(text: string, data: AppData): string | null`（`parseVideoId` できて、`findByVideoId` に無く、`settings.lastClipboardVideoId` と違うときだけ videoId）
  - `watchClipboard(deps: { read: () => Promise<string>; state: AppState; onSuggest: (videoId: string, url: string) => void; doc?: Document }): () => void`（`visibilitychange`（`doc.visibilityState !== 'hidden'` のとき）と `focus` で、`settings.clipboardCheck` が true なら `read()`（失敗は無視）→ `suggestFromClipboard` → あれば `updateSettings({ lastClipboardVideoId })` して `onSuggest`。起動直後にも1回。戻り値で解除）
  - `main.ts`：`read` は `navigator.clipboard?.readText` があればそれ、無ければ `async () => ''`。`onSuggest` は `mascot.say('クリップボードに動画のリンクがあるよ。登録する？', { label: '登録する', onClick: () => { tabs.select('book'); book.openForm(url); mascot.hush(); } })`
  - `main.ts` の配線を全部そろえる：pick（`openPlayer` 本物、`rng: Math.random`）、book、log（`showRecipe` は `tabs.select('book'); book.showRecipe(id)`）、settings（`webFiles()`、`confirmMode` は confirm 2段）。`state.subscribe` でテーマ追従

- [ ] **Step 1: 失敗するテストを書く**

`tests/app/clipboardCheck.test.ts`：
```ts
// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { suggestFromClipboard, watchClipboard } from '../../src/app/clipboardCheck';
import { createState } from '../../src/app/state';
import type { KeyValueStore } from '../../src/core/store';

const fake = (): KeyValueStore => { const m = new Map<string, string>(); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const tick = () => new Promise(r => setTimeout(r, 0));

describe('クリップボード', () => {
  it('新しい動画のリンクだけ提案する', () => {
    const s = createState(fake(), () => new Date(), () => 'x');
    expect(suggestFromClipboard('https://youtu.be/ZZZZZZZZZZZ', s.data)).toBe('ZZZZZZZZZZZ');
    expect(suggestFromClipboard('https://youtu.be/HzLAMA5ck_8', s.data)).toBeNull();
    expect(suggestFromClipboard('ただの文字', s.data)).toBeNull();
    s.updateSettings({ lastClipboardVideoId: 'ZZZZZZZZZZZ' });
    expect(suggestFromClipboard('https://youtu.be/ZZZZZZZZZZZ', s.data)).toBeNull();
  });
  it('見えるようになったときに読んで提案。同じものは二度聞かない。設定オフなら読まない', async () => {
    const s = createState(fake(), () => new Date(), () => 'x');
    let reads = 0; const got: string[] = [];
    const off = watchClipboard({ read: async () => { reads++; return 'https://youtu.be/ZZZZZZZZZZZ'; }, state: s, onSuggest: v => { got.push(v); } });
    await tick();
    expect(got).toEqual(['ZZZZZZZZZZZ']);
    document.dispatchEvent(new Event('visibilitychange'));
    await tick();
    expect(got).toEqual(['ZZZZZZZZZZZ']);
    expect(reads).toBe(2);
    s.updateSettings({ clipboardCheck: false });
    window.dispatchEvent(new Event('focus'));
    await tick();
    expect(reads).toBe(2);
    off();
  });
});
```

- [ ] **Step 2: 失敗することを確かめる**

Run: `npm test -- tests/app/clipboardCheck.test.ts`
Expected: FAIL

- [ ] **Step 3: 書く**

- [ ] **Step 4: 通ることを確かめる**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: 目で見る**

`npm run dev` で、4つのタブを一通り触り、登録→きめる→作った！→きろくに印、設定でバックアップの書き出し・読み込み、暗い見た目を確かめる。止める。

- [ ] **Step 6: コミット**

```bash
git add src/app tests/app
git commit -m "クリップボードの動画リンクを見つけたら聞く。画面の配線をそろえる"
```
