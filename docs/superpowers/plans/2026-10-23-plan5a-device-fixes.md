# クックポップ 計画5a：実機で見つかった不具合の修正 実装手順書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** TestFlight 0.1.0 (1) を実機で触って見つかった4つの不具合を直す。①画面全体がスクロール・跳ねる ②長押しで文字が選べる ③アプリに戻るたびに勝手にクリップボードを読み「ペーストを許可」が出る（しかも登録欄に入らない） ④YouTube の埋め込みが断られる（`capacitor://` の住所では YouTube が埋め込み元を確かめられない＝エラー153）。

**原因（実機の録画で確認済み）**
- ①：WKWebView はページ全体がスクロールし端で跳ねる。今は各画面がページ全体でスクロールする作り
- ②：`user-select: none` と `-webkit-touch-callout: none` を入れていない
- ③：`watchClipboard` が `focus`/`visibilitychange` のたびに読む。提案はポンの吹き出し（きめる画面だけ）とトーストで、開いている登録欄には入らない。リンクの読み取り（`parseVideoId`）自体は正常（`https://youtu.be/ID?si=…` も読める）
- ④：アプリの中の住所が `capacitor://localhost` で、YouTube の埋め込みが参照元を確かめられず再生を断る

**ユーザーが決めたこと（2026-10-23）**
- maosun-dev.com に動画だけを流すページ `https://maosun-dev.com/cookpop/player.html?v=<動画ID>` を置き、アプリはそれを iframe で表示する
- 勝手にクリップボードを読むのはやめる。登録画面に「クリップボードから貼る」ボタンを置く（押したときだけ読む）。共有シートからの登録は計画5b

**Spec:** `docs/superpowers/specs/2026-10-23-cookpop-design.md`（このあと 3.6・8・9 を書き換える。Task 4）

## Global Constraints

- コードのコメント・テスト名・コミットメッセージは日本語。画面の文言は日本語
- `src/core/` は変えない
- 色・角丸は `style.css` の変数だけ。影は平らな影。`prefers-reduced-motion` では動きを止める
- 画面から YouTube を開くリンクは `watchUrl(videoId)`
- `npm test`・`npm run typecheck`・`npm run sync` が通る状態でコミット。CookPop のリポジトリは main に直接コミットし push してよい（ユーザー了承済み）
- サイト（`C:\Users\USER\Desktop\game\maosun-dev.github.io`）へのコミットと push もユーザー了承済み。サイトの他のファイルは触らない
- 動画ページに個人名・メールアドレス・解析タグ・広告は入れない

## Review Focus

- 動画ページに渡す `v` が壊れている（`<script>` など）→ ページは何も埋め込まず「動画が見つかりません」と出す（Task 2）
- 動画ページが読み込めない（オフライン・サイトが止まっている）→ 10秒で「YouTube で開く」に切り替わる（Task 3）
- 別のサイトから来た `message` → 無視する（送り元が `https://maosun-dev.com` のときだけ受ける。Task 3）
- 中身が画面より長い画面（献立帳・きろく）→ 画面の中だけスクロールでき、下のタブは動かない（Task 1）
- 入力欄・メモ欄 → 長押しで選べ、貼り付けもできる（Task 1）

---

### Task 1: 画面のスクロールと長押し（style.css・tabs.ts・capacitor.config.json）

**Files:**
- Modify: `src/app/style.css`, `capacitor.config.json`, `tests/app/ios.test.ts`, `tests/app/theme.test.ts`（CSS の文字列検査を足す場所）

**Changes:**
- `capacitor.config.json` の `ios` に `"scrollEnabled": false` を足す（WebView 自体のスクロールと跳ねを止める）
- `html, body` を `height: 100%; overflow: hidden; overscroll-behavior: none;`。`body` に `position: fixed; inset: 0;`
- `.app`（タブの入れ物。`tabs.ts` が作る）を `position: fixed; inset: 0;`
- `.screen[data-active="true"]` を `position: absolute; inset: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;`（今の padding はそのまま。中身が短い画面はスクロールしない）
- 文字選択：`body { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }`。`input, textarea { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }`
- 画像の長押し保存も止める：`img { -webkit-user-drag: none; -webkit-touch-callout: none; }`

**Tests:**
- `ios.test.ts`：`capacitor.config.json` の `ios.scrollEnabled` が `false`
- `theme.test.ts`（style.css の文字列検査）：`user-select: none` と `-webkit-touch-callout: none` が body に、`user-select: text` が input/textarea に、`.screen[data-active="true"]` に `overflow-y: auto` がある

- [ ] テストを書いて失敗を確かめる → 直す → `npm test && npm run typecheck && npm run sync` → `npm run dev` で 375×812 の画面を見て、きめる画面が動かず、献立帳は中だけスクロールし、タブが固定されていることを確かめる → コミット `画面全体が跳ねないようにし、長押しで文字が選べないようにする`

---

### Task 2: 動画だけを流すページ（サイト側：maosun-dev.github.io/cookpop/player.html）

**Files:**
- Create: `C:\Users\USER\Desktop\game\maosun-dev.github.io\cookpop\player.html`（このリポジトリにテストの仕組みは無い。CookPop 側に `tests/site/player-page.test.ts` を置き、`../maosun-dev.github.io/cookpop/player.html` を読んで検査する。ファイルが無い環境ではテストを飛ばす `it.skipIf`）

**Page contract:**
- `<!doctype html>`、`<html lang="ja">`、`<meta name="robots" content="noindex">`、`<meta name="viewport" content="width=device-width, initial-scale=1">`、`<title>クックポップの動画</title>`。背景は黒、余白なし、`html,body{height:100%;margin:0}`
- `location.search` の `v` を `/^[\w-]{6,20}$/` で確かめる。合わなければ本文に「動画が見つかりません」（`textContent`）と出し、親に `{ source: 'cookpop-player', event: 'error', code: 'bad-id' }` を送って終わり
- 合えば YouTube IFrame API（`https://www.youtube.com/iframe_api`）で全面に `YT.Player`：`videoId`、`host: 'https://www.youtube-nocookie.com'`、`playerVars: { playsinline: 1, rel: 0, origin: location.origin }`、`width/height: '100%'`
- `onReady` → 親へ `{ source: 'cookpop-player', event: 'ready' }`。`onError(e)` → `{ source: 'cookpop-player', event: 'error', code: e.data }`。API の読み込み失敗（`script.onerror`）→ `{ ..., event: 'error', code: 'api' }`
- 親からの `message` で `{ source: 'cookpop-app', command: 'pause' }` を受けたら `player.pauseVideo()`。送り先は `parent.postMessage(msg, '*')`（送る中身は動画の状態だけ）
- 外部のスクリプトは YouTube の API だけ。解析・広告・個人名なし。ページ内のスクリプトはインライン 1 つ
- コメントは日本語

**Tests（tests/site/player-page.test.ts）:** noindex がある／`iframe_api` 以外の外部 `<script src` が無い／`cookpop-player` と `ready`・`error`・`pause` の文字列がある／`/^[\w-]{6,20}$/` の検査がある／`innerHTML` を使っていない

- [ ] テストを書いて失敗を確かめる → ページを書く → テスト通過 → ブラウザで `file:///…/player.html?v=HzLAMA5ck_8` と `?v=<script>` を開いて見た目を確かめる → サイトのリポジトリでコミット `クックポップのアプリから使う動画ページを置く`（push は Task 3 の後でまとめて controller が行う） → CookPop 側のテストもコミット

---

### Task 3: アプリのプレーヤーをサイトのページ経由にする（player.ts）

**Files:**
- Modify: `src/app/player.ts`, `tests/app/player.test.ts`, `src/app/main.ts`（必要なら）

**Changes:**
- `PLAYER_PAGE = 'https://maosun-dev.com/cookpop/player.html'`、`PLAYER_ORIGIN = 'https://maosun-dev.com'`
- `openPlayer(host, videoId, deps?)` の受け口は変えない（`deps.openExternal` も今のまま）。中身を「YouTube API を直接読む」から「iframe で `PLAYER_PAGE?v=<encodeURIComponent(videoId)>` を開く」に替える。iframe は `allow="autoplay; encrypted-media; picture-in-picture; fullscreen"`、`allowfullscreen`、`referrerpolicy="strict-origin-when-cross-origin"`、`title="動画"`
- `window` の `message` を聞き、`event.origin === PLAYER_ORIGIN` かつ `event.source === その iframe の contentWindow` かつ `data.source === 'cookpop-player'` のときだけ扱う：`ready` → 「読み込み中…」を消す。`error` → 今の `showFallback()`（「この動画はアプリの中では再生できません」＋「YouTube で開く」）
- 10 秒たっても `ready` が来なければ `showFallback()`（`deps.timeoutMs` で差し替え可。既定 10000）
- 同じ host を開き直したら、前の iframe の聞き耳とタイマーを外す（今の WeakMap の仕組みを使う）
- `pauseAllPlayers()`：生きている iframe 全部に `postMessage({ source: 'cookpop-app', command: 'pause' }, PLAYER_ORIGIN)`
- `loadYouTubeApi` と `YTLike` は使わなくなるので消す（テストも差し替え）
- 枠の下の小さな「YouTube で開く」は残す

**Tests（player.test.ts を書き換え）:**
- iframe の src が `https://maosun-dev.com/cookpop/player.html?v=HzLAMA5ck_8`
- 正しい送り元からの `ready` で「読み込み中」が消える。違う送り元（`https://evil.example`）からの `error` は無視される
- 正しい送り元からの `error` で「再生できません」と `a.btn` に切り替わる
- 時間切れ（`timeoutMs: 20`）で切り替わる
- `pauseAllPlayers()` で iframe の `contentWindow.postMessage` が `{source:'cookpop-app',command:'pause'}` と `https://maosun-dev.com` で呼ばれる（jsdom の iframe の contentWindow を `vi.spyOn`）
- `openExternal` があれば両方のリンクでそれを呼ぶ（今のテストを残す）

- [ ] テストを書いて失敗を確かめる → 書く → `npm test && npm run typecheck && npm run sync` → コミット `動画は maosun-dev.com の動画ページ経由で流す（capacitor:// では YouTube が埋め込みを断るため）`

---

### Task 4: クリップボードは押したときだけ読む（clipboardCheck・form・settings）

**Files:**
- Delete: `src/app/clipboardCheck.ts`, `src/app/clipboardWire.ts`, `tests/app/clipboardCheck.test.ts`, `tests/app/clipboardWire.test.ts`
- Modify: `src/app/main.ts`（`watchClipboard` の配線を外す）, `src/app/screens/form.ts`（「クリップボードから貼る」ボタン）, `src/app/screens/book.ts`（`createForm` に `readClipboard` を渡す）, `src/app/screens/settings.ts`（クリップボードの設定の行を消す）, `tests/app/form.test.ts`, `tests/app/settings.test.ts`, `docs/testflight-checklist.md`（クリップボードの項目を「貼るボタン」に書き換え）, `docs/superpowers/specs/2026-10-23-cookpop-design.md`（3.5 の設定・3.6 の割り込みを「押したときだけ読む」「共有シートは計画5b」に直す）
- `src/core/store.ts` の `Settings.clipboardCheck`・`lastClipboardVideoId` は**残す**（core は変えない。使わなくなるだけ。コメントで「計画5a から未使用」と書くのは core 変更になるので書かない）

**Changes:**
- `createForm(state, deps)` の `deps` に `readClipboard?: () => Promise<string>` を足す。新規登録のときだけ、リンク欄の下に `<button type="button" class="btn pop pop-press">クリップボードから貼る</button>`。押すと `readClipboard()` → 前後の空白を取って `setUrl(text)`。空や失敗なら `toast('クリップボードに YouTube のリンクがありません')`。`readClipboard` が無ければボタンを出さない
- `book.ts`：`createBookScreen` の `deps` に `readClipboard?` を足して `createForm` に渡す
- `main.ts`：アプリでは `nativeClipboardRead(Clipboard)`、Web では `navigator.clipboard?.readText`（無ければ渡さない）を `book` に渡す。`watchClipboard`・`suggestHandler` の配線を消す
- 設定画面のクリップボードのチェックボックスを消す

**Tests:**
- form：ボタンを押すと `readClipboard` の文字が欄に入り、自動入力（`fetchJson`）が走る。空なら欄は空のまま。`readClipboard` が無ければボタンが無い。編集のときはボタンが無い
- settings：チェックボックスが無い

- [ ] テストを書いて失敗を確かめる → 書く → `npm test && npm run typecheck && npm run sync` → コミット `クリップボードは「クリップボードから貼る」を押したときだけ読む`
