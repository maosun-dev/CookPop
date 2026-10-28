# クックポップ 計画7：ギンガムの見た目・ジャンルとマイタグ・共有から開く 実装手順書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 設計書のとおり、見た目を「案2-2 メモとハンコ」＋6色のふきんに作り直し、タブを3つにして設定をシートに移し、ジャンル7つとマイタグを入れ、共有のカードに「クックポップで開く」を足す。

**Architecture:** データの形の変更（版 2）と絞り込み・マイタグの操作は `src/core/` の純粋な関数で行い、`state.ts` がそれを呼ぶ。見た目は `style.css` の変数を `<html data-cloth>` で差し替える。画面の受け口（`createPickScreen` など）の名前は変えない。

**Tech Stack:** 今と同じ（vite・TypeScript・vitest・Capacitor 8）

**Spec:** `docs/superpowers/specs/2026-10-28-ui-gingham-tags-design.md`（見本：`docs/mockups/ui-gingham.html` の案2-2、`docs/mockups/result-card.html`、ポン `docs/mockups/pon-c.html`）

## Global Constraints

- コメント・テスト名・コミットメッセージは日本語。画面の文言は日本語
- ジャンルは7つ・この順：`主菜`・`副菜`・`汁物`・`ご飯`・`麺`・`パン`・`おやつ`。1品に1つ
- マイタグ：名前は前後の空白を取って 1〜12 文字、同じ名前は不可、全部で 20 個まで、1品に 10 個まで
- ふきんの色の値と色は設計書 2.1 の表のとおり（`yellow`〜`purple`、はじめ `yellow`）
- 輪郭線（濃い色の border）と黒い影は使わない。カード・台紙はまっすぐ。傾けるのはテープ（±3度まで）・メモ（±4度まで）・ハンコ（-6度）・チップ（±1度）だけ
- 保存の形の版は 2。版 1 のデータは消さずに読み替える
- `npm test`・`npm run typecheck`・`npm run sync` が通る状態でコミット。main に直接コミット（push は controller）

## Review Focus

- 版 1 のバックアップを読み込む（置き換え・足す）→ 版 2 に読み替えられ、「ご飯・麺」が振り分けられる（Task 1 のテスト）
- マイタグの名前を変えたあと、その名前で絞り込んでいた画面 → 新しい名前で絞り込みが続く（消したら「すべて」に戻る）（Task 4 のテスト）
- とても長い料理名（40 文字）→ 上の料理名は 3 行で「…」、カードの角のメモと重ならない（Task 4 の目で見る手順と、行数制限の CSS の検査）
- 暗い見た目×6色 → 文字が読める（Task 3 の目で見る手順）
- 共有のカードで「クックポップで開く」を押したが開けなかった → 書いたデータは残り、次にアプリを開いたとき登録画面が開く（Task 5：開く前に書く順番の検査）

---

### Task 1: データの版 2・ジャンル7つ・マイタグ・絞り込み（core）

**Files:**
- Modify: `src/core/recipe.ts`, `src/core/store.ts`, `src/core/picker.ts`
- Create: `src/core/tags.ts`
- Test: `tests/core/recipe.test.ts`, `tests/core/store.test.ts`, `tests/core/picker.test.ts`, `tests/core/tags.test.ts`（新規）

**Interfaces:**
- `CATS = ['主菜','副菜','汁物','ご飯','麺','パン','おやつ'] as const`
- `Recipe` に `tags: string[]` を足す。`RecipeInput` に `tags?: string[]`
- `NOODLE_WORDS = ['麺','そば','うどん','ラーメン','らーめん','パスタ','スパゲ','そうめん','焼きそば','やきそば']`、`legacyCat(name: string): '麺' | 'ご飯'`
- `sanitizeRecipe(x)`：`cat` が `ご飯・麺` なら `legacyCat(name)`。id が `d-` で始まる最初の8品は、`dbv6nPx4e3c`（オムそば）→`麺`、`fsUZY-9V1TI`（お弁当）→`ご飯`、`30kBepMXiVE`（ベーコンエッグサンド）→`パン`。`tags` は文字列だけ・trim・重複なし・10 個まで（`myTags` に無いものを捨てるのは store 側）
- `defaultRecipes(today)` の3品も上のジャンルにする
- `tags.ts`：`TAG_MAX_LEN = 12`、`TAG_MAX = 20`、`TAGS_PER_RECIPE = 10`、`normalizeTag(name: string): string | null`（trim、1〜12 文字でなければ null）、`addTag(data: AppData, name: string): { data: AppData; error?: 'empty' | 'long' | 'dup' | 'full' }`、`renameTag(data, from: string, to: string): { data; error?: 'empty'|'long'|'dup'|'missing' }`（料理の tags も置き換え、並び順を保つ）、`deleteTag(data, name): AppData`（料理からも外す）、`setRecipeTags(data, id: string, tags: string[]): AppData`（`myTags` にあるものだけ、10 個まで）
- `store.ts`：`DATA_VERSION = 2`。`Cloth = 'yellow'|'red'|'green'|'blue'|'pink'|'purple'`、`CLOTHS: readonly Cloth[]`（この順）。`Settings` に `cloth: Cloth`（既定 `yellow`）・`myTags: string[]`（既定 `[]`）。`parseData` は `myTags` を normalize・重複なし・20 個まで、料理の `tags` から `myTags` に無いものを捨てる。`version` が 2 より大きければ null（今までどおり）
- `importBackup` の merge：`myTags` は今のものに無い名前を後ろへ足す（20 個を超えた分は捨て、その名前は足した料理からも外す）。replace は今までどおり（`noAds` は今のまま）
- `picker.ts`：`filterRecipes(recipes: Recipe[], f: { cat: Cat | null; tag: string | null; favOnly: boolean }): Recipe[]`（全部「かつ」）

- [ ] **Step 1: 失敗するテストを書く**（主なもの）
  - recipe：`legacyCat('きつねうどん')==='麺'`、`legacyCat('親子丼')==='ご飯'`、`sanitizeRecipe({...,cat:'ご飯・麺',name:'焼きそば'}).cat==='麺'`、id `d-30kBepMXiVE` で `cat:'ご飯・麺'` → `パン`、tags の検証（`[' 時短 ', '時短', 3]` → `['時短']`、11 個 → 10 個）
  - store：版 1 の JSON（`version:1`、`cat:'ご飯・麺'` の料理、`settings` に cloth・myTags なし）→ `version 2`・`cloth 'yellow'`・`myTags []`・料理の tags `[]`・振り分け済み。`myTags:['時短']` で料理の tags `['時短','謎']` → `['時短']`。merge で myTags が足される／21 個目は捨てられ料理からも外れる。`initialData` の8品のジャンル（オムそば麺・お弁当ご飯・サンドパン）
  - tags：add（empty・long 13 文字・dup・full 21 個目）、rename（料理の tags も変わる・並び順・dup・missing）、delete（料理から外れる・料理は残る）、setRecipeTags（myTags に無いものを捨てる・10 個まで）
  - picker：`filterRecipes` で cat×tag×favOnly の「かつ」
- [ ] **Step 2: 失敗を確かめる** `npm test -- tests/core` → FAIL
- [ ] **Step 3: 書く**（core の純粋さの決まりは今までどおり）
- [ ] **Step 4: 通す** `npm test && npm run typecheck` → PASS（画面側の型エラーは、`r.cat` の比較などを最小限直して通す。画面の作り直しは Task 3・4）
- [ ] **Step 5: コミット** `データの版2：ジャンル7つ・マイタグ・絞り込み`

---

### Task 2: state の操作を足す（state.ts）

**Files:** Modify: `src/app/state.ts`、Test: `tests/app/state.test.ts`

**Interfaces:**
- Consumes: Task 1 の `addTag`・`renameTag`・`deleteTag`・`setRecipeTags`・`Cloth`
- Produces（`AppState` に足す）：`addTag(name: string): 'ok' | 'empty' | 'long' | 'dup' | 'full'`、`renameTag(from: string, to: string): 'ok' | 'empty' | 'long' | 'dup' | 'missing'`、`deleteTag(name: string): void`、`setRecipeTags(id: string, tags: string[]): void`、`updateSettings` で `cloth` も変えられる。`addRecipe` の入力に `tags?`
- 失敗のときは保存も知らせもしない（今までの決まり）

- [ ] テスト（各操作の成功で保存・知らせが1回、失敗で0回、名前の変更が料理に反映）→ 失敗を確かめる → 書く → `npm test && npm run typecheck` → コミット `マイタグとふきんの色の操作を state に足す`

---

### Task 3: 見た目の土台・6色・タブ3つ・設定のシート

**Files:**
- Modify: `src/app/style.css`（作り直し）、`src/app/theme.ts`、`src/app/tabs.ts`、`src/app/icons.ts`、`src/app/main.ts`、`src/app/screens/settings.ts`（シートの中身に）
- Create: `src/app/sheet.ts`
- Test: `tests/app/theme.test.ts`、`tests/app/tabs.test.ts`、`tests/app/settings.test.ts`、`tests/app/sheet.test.ts`（新規）

**Interfaces:**
- `applyTheme(theme: Theme, cloth: Cloth): void`（`<html data-theme>` は今までどおり、`data-cloth` を必ず付ける）
- CSS 変数：`--cloth`・`--accent`・`--accent-deep`（設計書 2.1 の表）、`--paper:#FFFFFF`、`--base:#FFF8EC`、ギンガムの柄は `body` の背景（`--cloth` を不透明度 .20、暗い見た目は .10）。暗い見た目の色は設計書 2.3
- 部品のクラスは今の名前を残して見た目だけ替える：`.pop` は輪郭線と黒い影をやめ「白い台紙＋うすい影 `0 2px 5px rgba(74,46,28,.12)`」に、`.btn-yolk` などの主なボタンは `--accent` に白い字＋下に `--accent-deep` 3px、ほかのボタンは白い台紙。`.chip` は白・角 3px・`nth-child` で ±1度、選んだものは `--accent` に白い字。テープは `.tape`（`::before` で付けられるクラス、ギンガムの色 .75、幅 56px 高さ 16px、±3度）
- `TabId = 'pick' | 'book' | 'log'`。タブの帯は白、選んだタブの文字とアイコンは `--accent`、アイコンの後ろにうすい `--accent` の角丸（不透明度 .15）
- `ICONS` に `pot`（ふた付きのお鍋、24×24、線だけ、自作）を足す
- `sheet.ts`：`openSheet(content: HTMLElement, title: string): { close(): void }`（下からせり上がる、`role="dialog"`・`aria-modal="true"`・見出し・「閉じる」ボタン、外側を押すと閉じる、Escape で閉じる、開いている間 `.screen` のスクロールを止める、reduced-motion では動かない）
- `createSettingsScreen(state, deps)` は名前を変えずに、シートの中身（`{ el }`）を返すものにする。中身：ふきんの色（6色の丸いギンガムの見本ボタン、`aria-pressed`、名前は「たまご・トマト・抹茶・ソーダ・いちご・ぶどう」）／見た目（端末に合わせる・明るい・暗い）／マイタグの整理（各タグに「名前を変える」「消す」、消すときは確認）／バックアップ／このアプリについて
- `main.ts`：設定のタブを外し、献立帳の右上のボタン（Task 4 の `deps.openSettings`）から `openSheet(settings.el, '設定')`。`applyTheme(state.data.settings.theme, state.data.settings.cloth)` を起動時と購読で

- [ ] テスト：`applyTheme` が `data-cloth` を付ける、style.css に6色の `[data-cloth="…"]` があり各 `--accent` の値が表どおり、`.pop` に `border` の濃い色や `4px 4px 0` が無い、タブが3つ、シートの開閉（閉じるボタン・外側・Escape）と `aria-modal`、設定の色ボタンで `settings.cloth` が変わる、マイタグの名前変更・削除
- [ ] 失敗を確かめる → 書く → `npm test && npm run typecheck && npm run build`
- [ ] 目で見る：`npm run dev`、375×812 で6色×明るい・暗いを切り替えて、きめる・献立帳・きろく・設定のシートを見る（スクリーンショットを report に）。終わったらタブとサーバーを閉じる
- [ ] コミット `見た目をギンガムのふきん（6色）に作り直し、タブを3つにして設定をシートに移す`

---

### Task 4: 画面（きめる・献立帳・登録）

**Files:** Modify: `src/app/screens/pick.ts`、`book.ts`、`form.ts`、`log.ts`（見た目の調整だけ）、`src/app/style.css`（画面の部品）、Test: `tests/app/pick.test.ts`、`book.test.ts`、`form.test.ts`

**Interfaces:**
- Consumes: `filterRecipes`、`AppState.addTag`・`setRecipeTags`、`ICONS.pot`
- 絞り込み：きめる・献立帳とも、ジャンルの段（すべて＋7つ）とマイタグの段（すべて＋`myTags`。0 個なら段ごと出さない）。選んだタグが名前を変えられたら新しい名前を選んだままにし、消されたら「すべて」に戻す（購読で直す）
- きめる：吹き出しはテープ付きのメモ（まっすぐ）、料理名は `--accent` の文字、「きめて！」は直径 140px の丸いハンコ（-6度、二重の白い縁、下に `--accent-deep`）
- 結果カード（設計書 2.4、見本 `result-card.html` の案2）：「動画を見る」ボタンを消す。カードの上の余白 26px、右上の角に `<button class="play-memo">`（ハンコの色の丸い再生マーク＋「動画を流す」、4度、`top:-24px; right:-10px`）。写真（`.media`）を押してもメモを押しても `deps.openPlayer(写真の入れ物, videoId)`。料理名は 8 文字まで `--fs-6`、15 文字まで 24px、それより長いと 20px、3 行まで（`-webkit-line-clamp:3`）。カードの中の名前も 3 行まで
- 献立帳：見出しを白いメモ（テープ付き）に、右に `<button aria-label="設定">`（`ICONS.pot`）で `deps.openSettings?.()`。料理はテープ付きのレシピカード（まっすぐ）、ジャンルの札に加えてマイタグの札（小さく、3 つまで表示して残りは「+2」）
- 登録・編集：ジャンルは7つのチップ。その下に「マイタグ」：作ったタグのチップ（押して付け外し、`aria-pressed`）と「＋ タグを作る」（押すと小さな入力欄と「作る」。作ったタグはその料理に付く。エラーは「12文字までにしてね」「もうあるよ」「20個までだよ」）。保存で `tags` も渡す

- [ ] テスト：2 段の絞り込み（ジャンル×タグの「かつ」、タグ 0 個で段が無い、名前変更で選択が続く、削除で「すべて」に戻る）、結果カードに「動画を見る」ボタンが無く、`.play-memo` と写真の両方で `openPlayer` が呼ばれる、料理名の長さで大きさのクラスが変わる、献立帳の設定ボタンで `openSettings`、登録でタグを作って付けて保存される、編集でタグを外せる
- [ ] 失敗を確かめる → 書く → `npm test && npm run typecheck && npm run build`
- [ ] 目で見る：375×812 と 320×568 で、料理名 7・14・40 文字のときに結果カードのメモが料理名にも写真にも重ならないこと、献立帳・登録画面を見る。終わったら閉じる
- [ ] コミット `きめる・献立帳・登録をメモとハンコの見た目にし、2段の絞り込みとマイタグを入れる`

---

### Task 5: 共有のカードに「クックポップで開く」

**Files:** Modify: `ios/App/App/Info.plist`（`CFBundleURLTypes` に `cookpop`）、`ios/App/ShareExtension/ShareViewController.swift`、`tests/app/ios.test.ts`、`docs/testflight-checklist.md`

**Interfaces:**
- Info.plist：`CFBundleURLTypes` = [{ `CFBundleURLName` = `com.maosundev.cookpop`, `CFBundleURLSchemes` = [`cookpop`] }]
- Swift：カードに主なボタン「クックポップで開く」（今の「OK」の上）。押すと、①App Group への書き込みが済んでいることを確かめ（書き込みは今どおり読み取りの直後）、②`cookpop://share` を開く（受け口から `next` をたどって `UIApplication` を見つけ、`open(_:options:completionHandler:)` を `perform` で呼ぶ）、③`completeRequest`。2.5 秒の自動で閉じる処理は、リンクがあったときは止める（押すまで待つ）。リンクが無いときは今どおり
- チェック表：13 番を「共有→『クックポップで開く』→アプリが開いて登録画面が埋まる」に。ふきんの色・マイタグの項目を足す

- [ ] テスト（ios.test）：Info.plist に `cookpop`、Swift に `クックポップで開く`・`cookpop://share`・`open(_:options:completionHandler:)` を呼ぶ文字列、書き込み（`share-target-data`）が開く処理より前にあること（文字列の位置で比べる）
- [ ] 失敗を確かめる → 書く → `npm test && npm run sync`
- [ ] コミット `共有のカードに「クックポップで開く」を足す`

---

### Task 6（controller）: 全体の点検・目で見る・TestFlight

- 最終点検（上位のモデル）→ 直す → 6色×明るい暗いを目で見る → push → ワークフロー → 成功を `gh run view` で確かめる → メモリを更新
