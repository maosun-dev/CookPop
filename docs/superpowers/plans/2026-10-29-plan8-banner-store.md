# 計画8：バナー広告と初めての提出（1.0.0） 手順書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** タブのすぐ上にバナー広告を出し、サイト・ストアの準備をそろえて、クックポップ 1.0.0 を App Store の審査に出す。

**Architecture:** 広告の係 `src/app/ads.ts` は SuperShogi の同名ファイルを移植する（偽プラグインでテストできる `createAds`、順に出し入れをそろえる `settle`）。「今バナーを出してよいか」は新しい `src/app/bannerRule.ts` が画面（DOM）の様子だけから決め、変わったときだけ `setBannerWanted` に渡す。サイトのページは別リポジトリ `../maosun-dev.github.io/cookpop/` に置く。

**Tech Stack:** TypeScript・Vite・vitest（jsdom）・Capacitor 8・`@capacitor-community/admob` 8.1.0

**Spec:** `docs/superpowers/specs/2026-10-29-banner-store-design.md`

## Global Constraints

- コメント・コミットメッセージ・画面の文字は日本語。コミットの最後に `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- 部品の版は固定で書く（`^` を付けない）：`"@capacitor-community/admob": "8.1.0"`
- AdMob アプリ番号 `ca-app-pub-7017663942238206~7979412343`、バナー番号 `ca-app-pub-7017663942238206/4663691703`、テスト用バナー `ca-app-pub-3940256099942544/2435281174`
- URL は必ず `https://maosun-dev.com/...` で書く（`maosun-dev.github.io` と書かない）
- 版は 1.0.0
- 個人のメールアドレス・本名を、サイト・ストア・コミットに書かない
- 見た目に関わる作業（タスク5・8）は、手を付ける前に `frontend-design:frontend-design` を読む。AI っぽい見た目（グラデーション・光・影付きの縁取り文字・丸バッジ）にしない。カードは傾けない、輪郭線なし
- 各タスクの終わりに `npm test` と `npm run typecheck` が通ること
- 提出・公開・送信はユーザーに確認してから

## Review Focus

1. **結果カードで動画を流した直後**：バナーが消える。もう一度「きめて！」で動画のない結果に替わったら、また出る → タスク2のテスト「動画の iframe が消えたら出す」
2. **動画のある献立帳の詳細を開いたまま、別のタブへ移る**：見えていない画面の動画ではバナーを隠さない → タスク2のテスト「見えていないタブの動画は数えない」
3. **シートを開いて閉じる、をすばやく繰り返す**：最後の状態（閉じた＝出す）にそろう → タスク1のテスト「途中で頼みが変わっても最後の頼みにそろう」（SuperShogi から移植）
4. **広告が読み込めない（機内モード・制限中）**：高さ0のままで、画面の下に白い隙間が残らない → タスク1のテスト「showBanner が失敗したら高さ0」
5. **チェックボックスやボタンにフォーカスがあるとき**：キーボードは出ないのでバナーは隠さない → タスク2のテスト「文字の入力欄だけを数える」

---

### Task 1: 広告の係（ads.ts）を移植する

**Files:**
- Modify: `package.json`（dependencies に `"@capacitor-community/admob": "8.1.0"`）
- Create: `src/app/ads.ts`
- Test: `tests/app/ads.test.ts`

**Interfaces:**
- Produces: `initAds(): void`、`setBannerWanted(on: boolean): void`、`createAds(deps): Ads`、型 `AdsPlugin`・`Ads`、定数 `BANNER_MARGIN = 64`

- [ ] **Step 1:** `npm install @capacitor-community/admob@8.1.0 --save-exact`
- [ ] **Step 2: テストを書く。** `../SuperShogi/tests/app/ads.test.ts` を写し、次を変える
  - `bannerOn` の2つのテストを消す（クックポップには画面名の判定がない）
  - `REAL_BANNER` を `ca-app-pub-7017663942238206/4663691703` にする
  - showBanner に渡す値のテストで `margin` が `64` であることを確かめる：`expect(f.opts[0]).toMatchObject({ adId: REAL_BANNER, position: 'BOTTOM_CENTER', margin: 64, isTesting: false })`
  - 残すテスト（名前はそのまま）：init の順番、追跡の確認は最大5回、同意が REQUIRED のときだけフォーム、initialize が失敗したら以後何もしない、2回目以降は resume で出す、showBanner が失敗したら高さ0、途中で頼みが変わっても最後の頼みにそろう、高さの知らせを setHeight へ
- [ ] **Step 3:** `npx vitest run tests/app/ads.test.ts` → `src/app/ads` が無くて FAIL
- [ ] **Step 4: `src/app/ads.ts` を作る。** `../SuperShogi/src/app/ads.ts` を写し、次を変える
  - 冒頭のコメントをクックポップ向けに（「どの画面で出すかは bannerRule.ts が決める」「バナーはタブのすぐ上に出る。iOS の部品は margin を下の安全域からの距離として扱うので、タブの高さ 64 を渡す」）
  - `bannerOn` と `ScreenName` の import を消す
  - `REAL_BANNER_ID` をクックポップの番号に
  - `export const BANNER_MARGIN = 64;`（style.css の `--tabbar-h` と同じ値）を `showBanner` の `margin` に使う。`AdsPlugin.showBanner` の型の `margin: 0` を `margin: number` に
  - `isNativeApp` は `./native` から（同名・同じ意味）
  - 開発中の仮の帯（`previewAds`）も本物と同じ場所に：`bottom` を `calc(env(safe-area-inset-bottom) + 64px)` に
- [ ] **Step 5:** `npx vitest run tests/app/ads.test.ts` → PASS、`npm run typecheck` → 通る
- [ ] **Step 6: コミット** `広告の係を SuperShogi から移す（タブの上に出すバナー）`

### Task 2: バナーを出してよいかの決まり（bannerRule.ts）

**Files:**
- Create: `src/app/bannerRule.ts`
- Test: `tests/app/bannerRule.test.ts`

**Interfaces:**
- Produces:
  - `bannerWanted(doc: Document): boolean` — 次のどれかなら false、どれでもなければ true
    - `doc.body` に class `sheet-open` がある（sheet.ts が付ける）
    - `[data-active="true"] .player iframe` がある（今のタブで動画の枠が生きている。再生できず `player-fail` に替わった枠には iframe が無いので数えない）
    - `doc.activeElement` が `textarea`、または `input` で type が `checkbox`・`radio`・`button`・`submit`・`range`・`color`・`file` 以外
  - `watchBanner(doc: Document, set: (on: boolean) => void): () => void` — すぐに1回 `set(bannerWanted(doc))` を呼び、以後は body 以下の変化（MutationObserver：`childList`・`subtree`・`attributes`、`attributeFilter: ['class', 'data-active']`）と `focusin`・`focusout` のたびに判定し、**値が変わったときだけ** `set` を呼ぶ。戻り値は見張りをやめる関数。`focusout` の直後は activeElement がまだ body でないことがあるので、判定は `queueMicrotask` で1拍あとにする

- [ ] **Step 1: テストを書く**（jsdom。各テストで `document.body.innerHTML` を作り直す）
  - `何もなければ出す`：`bannerWanted(document)` が true
  - `シートが開いていれば隠す`：body に `sheet-open` → false
  - `今のタブで動画の iframe があれば隠す`：`<div data-active="true"><div class="player"><iframe></iframe></div></div>` → false
  - `見えていないタブの動画は数えない`：同じ形で `data-active="false"` → true
  - `再生できず替わった枠は数えない`：`<div data-active="true"><div class="player player-fail"><a></a></div></div>` → true
  - `文字の入力欄だけを数える`：`input`（type なし）・`input type="url"`・`textarea` にフォーカス → false。`input type="checkbox"`・`button` にフォーカス → true
  - `watchBanner は最初に1回、変わったときだけ知らせる`：記録用の配列に積み、最初 `[true]`。body に `sheet-open` を付けて await 数拍 → `[true, false]`。関係ない div を足す → 増えない。外す → `[true, false, true]`
  - `動画の iframe が消えたら出す`：iframe を足す → false、iframe を消す → true
  - `やめたあとは知らせない`：戻り値を呼んだあと sheet-open を付けても増えない
- [ ] **Step 2:** `npx vitest run tests/app/bannerRule.test.ts` → FAIL
- [ ] **Step 3:** `src/app/bannerRule.ts` に上の2つの関数を書く
- [ ] **Step 4:** `npx vitest run tests/app/bannerRule.test.ts` → PASS
- [ ] **Step 5: コミット** `バナーを隠すとき（動画・シート・入力中）を決める係を足す`

### Task 3: 起動につなぎ、画面の余白と iPhone の設定を入れる

**Files:**
- Modify: `src/app/main.ts`（boot の最後）
- Modify: `src/app/style.css`（`.screen` の下の余白 119行目、`.toast` の bottom 142行目、`:root` に `--ad-h: 0px`）
- Modify: `ios/App/App/Info.plist`
- Modify: `tests/app/ios.test.ts`
- Test: `tests/app/ui.test.ts` または style.css を読む既存のテストの近くに1件

**Interfaces:**
- Consumes: `initAds`・`setBannerWanted`（Task 1）、`watchBanner`（Task 2）

- [ ] **Step 1: テストを書く**
  - ios.test.ts に `Info.plist：AdMob の番号・追跡の説明・広告ネットワーク`：`GADApplicationIdentifier` が `ca-app-pub-7017663942238206~7979412343`、`NSUserTrackingUsageDescription` の文字が `許可すると、あなたの興味に合った広告が表示されやすくなります。許可しなくても、アプリはすべて使えます。`、`SKAdNetworkItems` に `cstr6suwn9.skadnetwork` を含む
  - style.css を読んで、`.screen` の padding-bottom と `.toast` の bottom の式に `var(--ad-h` が入っていることを確かめるテスト（`tests/app/ui.test.ts` に足す）
- [ ] **Step 2:** 2件が FAIL することを確かめる
- [ ] **Step 3: Info.plist** に3つの鍵を足す。`SKAdNetworkItems` の配列は `../SuperShogi/ios/App/App/Info.plist` の同じ鍵の中身をそのまま写す
- [ ] **Step 4: style.css**：`:root` に `--ad-h: 0px;`。`.screen` の下の余白を `calc(var(--tabbar-h) + var(--ad-h) + 24px + env(safe-area-inset-bottom, 0px))`、`.toast` の bottom を `calc(var(--tabbar-h) + var(--ad-h) + 16px + env(safe-area-inset-bottom, 0px))` に
- [ ] **Step 5: main.ts**：boot の最後（`state.subscribe(...)` のあと）に `initAds(); watchBanner(document, setBannerWanted);`。コメント「バナー広告：動画・シート・入力中のときは隠す（bannerRule.ts）」
- [ ] **Step 6:** `npm test` → 全部 PASS、`npm run sync` → 通る（admob の部品が iOS 側に入る）
- [ ] **Step 7: 仮のバナーで見る**：`npm run dev` を preview_start で開き、`?adpreview` を付けると、タブのすぐ上に灰色の帯が出る。料理カードが帯に隠れないこと、動画を流す・設定を開く・入力欄を押すと消え、戻すと出ることを確かめ、サーバーとタブを閉じる
- [ ] **Step 8: コミット** `バナーを起動につなぎ、画面の余白と iPhone の広告の設定を入れる`

### Task 4: 版 1.0.0 と「このアプリについて」のリンク

**Files:**
- Modify: `package.json`（`"version": "1.0.0"`）
- Modify: `ios/App/App.xcodeproj/project.pbxproj`（`MARKETING_VERSION = 0.1.0;` の2か所）
- Modify: `tools/ios/add-share-extension.rb:41`（`'0.1.0'` → `'1.0.0'`）
- Modify: `tests/app/ios.test.ts`（版のテスト）
- Modify: `src/app/screens/settings.ts`（「このアプリについて」）、`src/app/main.ts`（openExternal を渡す）
- Test: `tests/app/settings.test.ts`

**Interfaces:**
- Consumes: main.ts の `openExternal`（iPhone では `nativeOpenExternal(window)`、Web では undefined）
- Produces: settings の deps に `openExternal?: (url: string) => void` を足す

- [ ] **Step 1: テストを書く**
  - ios.test.ts の版のテストを `MARKETING_VERSION = 1\.0\.0;` に、`add-share-extension.rb` が `'1.0.0'` を含むことも確かめる
  - settings.test.ts に `このアプリについてに、プライバシーポリシーと YouTube 利用規約のリンクがある`：`a` の href が `https://maosun-dev.com/cookpop/privacy.html` と `https://www.youtube.com/t/terms`、文字が「プライバシーポリシー」「YouTube 利用規約」
  - `openExternal があればそれで開く`：deps に偽の openExternal を渡してリンクを押すと、その URL で呼ばれる
- [ ] **Step 2:** FAIL を確かめる
- [ ] **Step 3: 版を書き換える**（3ファイル）
- [ ] **Step 4: settings.ts**：「動画は YouTube の公式プレーヤーで…」の段落の下に、2つのリンクを横に並べた行を足す（`target: '_blank'`、`rel: 'noopener'`、openExternal があれば preventDefault して openExternal(url)。player.ts の `onOpen` と同じ作り）。部品の行に `AdMob（Google Mobile Ads SDK）` を足す。main.ts の `createSettingsScreen` に `openExternal` を渡す
- [ ] **Step 5:** `npm test`・`npm run typecheck` → 通る
- [ ] **Step 6: コミット** `版を 1.0.0 にし、このアプリについてにプライバシーポリシーと YouTube 利用規約のリンクを足す`

### Task 5: サイトにプライバシーポリシーとサポートのページを置く

**Files（別リポジトリ `C:/Users/USER/Desktop/game/maosun-dev.github.io`）:**
- Create: `cookpop/privacy.html`、`cookpop/index.html`
- Modify: `sitemap.xml`（2ページを足す）、`index.html`（アプリ一覧にクックポップがあれば、リンク先を `cookpop/` に。無ければ他のアプリと同じ形で1つ足す）
- Test（クックポップ側）: `tests/site/cookpop-pages.test.ts`

- [ ] **Step 1:** `frontend-design:frontend-design` を読む。`../maosun-dev.github.io/tenrakuhai/privacy.html` と `../maosun-dev.github.io/support.html` を読み、書き方と共通部分（ヘッダー・フッター・style.css）をつかむ
- [ ] **Step 2: テストを書く**（`player-page.test.ts` と同じく、サイトのリポジトリが無ければ飛ばす）
  - privacy.html に `AdMob`・`YouTube API`・`https://www.youtube.com/t/terms`・`https://policies.google.com/privacy`・`iPhone の中` を含む
  - 両ページに `https://maosun-dev.github.io` を含まない、`@gmail.com` を含まない
  - index.html が privacy.html へリンクしている
- [ ] **Step 3:** FAIL を確かめる
- [ ] **Step 4: privacy.html を書く**。中身は設計書「2. ストアに出す準備 → サイト」の4項目＋「追跡の許可はいつでも iPhone の設定で変えられる」「問い合わせ先はサポートページ」「制定日 2026-10-29」。見た目はクックポップのギンガム（たまご色）に寄せ、サイトの共通 style.css に重ねる
- [ ] **Step 5: index.html を書く**。アプリの紹介1段落、使い方（ルーレットで決める・YouTube の共有ボタンから登録・作ったら記録）、よくある質問（動画が再生できない→「YouTube で開く」／データの引っ越し→設定のバックアップ／広告について）、お問い合わせは既存の `support.html` の窓口へリンク、プライバシーポリシーへのリンク
- [ ] **Step 6:** `npx vitest run tests/site` → PASS。ブラウザ（preview_start の url でファイルを開く）で2ページの見た目を確かめ、スマホ幅でも崩れないことを見る。タブを閉じる
- [ ] **Step 7: コミット**（2つのリポジトリそれぞれ）。サイトは `クックポップのプライバシーポリシーとサポートページを置く`、クックポップは `サイトのクックポップのページを確かめるテストを足す`
- [ ] **Step 8: サイトの push はユーザーに確認してから**（公開になるため）。push 後、`https://maosun-dev.com/cookpop/privacy.html` が開けることを確かめる

### Task 6: ストアの文字と App Store Connect の答えの下書き

**Files:**
- Create: `docs/store/listing.md`

- [ ] **Step 1: 下書きを書く**（文字数の上限を守る）
  - 名前（30字）：クックポップ
  - サブタイトル（30字）、プロモーション用テキスト（170字）、説明文（4000字以内。ルーレット・YouTube の共有から登録・ジャンルとマイタグで絞り込み・記録カレンダー・ふきんの6色・データは iPhone の中だけ）、キーワード（100字、カンマ区切り、名前と重ねない）
  - カテゴリ：フード＆ドリンク（副：ライフスタイル）、価格：無料
  - サポート URL：https://maosun-dev.com/cookpop/ 、マーケティング URL：同じ、プライバシーポリシー URL：https://maosun-dev.com/cookpop/privacy.html
  - 著作権表示：`2026 maosun-dev`
  - アプリのプライバシーの答え：「データを収集する：はい」。種類は AdMob の分＝「識別子：デバイス ID」「使用状況データ：製品の操作・広告データ」「診断：クラッシュデータ・パフォーマンスデータ」「位置情報：おおよその場所」、用途はいずれも「サードパーティ広告」（クラッシュ・パフォーマンスは「アプリの機能」も）、「ユーザーに紐づけ：いいえ」、「トラッキング：デバイス ID と広告データは はい」。前例として ワンタップ収支・転落牌の App Store Connect の答えと食い違いがないかを見比べる
  - 年齢の区分のアンケートの答え（すべて「なし」。「制限のないウェブアクセス」は「いいえ」＝ YouTube の決まった動画を埋め込むだけで自由に見て回れないため）
  - 審査メモ：ログイン不要。使い方（下の「献立帳」→「＋」で YouTube のリンクを貼る、または YouTube アプリの共有→クックポップ。「きめる」で「きめて！」）。動画は YouTube の公式の埋め込みプレーヤーで、maosun-dev.com の自分のページ経由で表示していること
- [ ] **Step 2: コミット** `ストアの文字と App Store Connect の答えの下書きを足す`
- [ ] **Step 3: ユーザーに読んでもらい、直す**（直したらコミット）

### Task 7: TestFlight で実機の確認

**Files:**
- Modify: `docs/testflight-checklist.md`（18〜20を足す）

- [ ] **Step 1: チェック表に足す**
  - 18 バナーの場所：どのタブでも、バナーがタブのすぐ上にぴったり乗る。料理カードやボタンがバナーに隠れない（いちばん下までスクロールして見る）
  - 19 バナーが隠れるとき：動画を流すと消え、別の結果に替えると戻る。設定を開くと消え、閉じると戻る。文字を入力中は消える
  - 20 初めて開いたとき：「追跡を許可しますか」が出る（どちらを選んでも使える）
  - 注意書き：自分の端末では、出た広告を押さない（押すと AdMob の不正なクリックになる）
- [ ] **Step 2: コミットして push**（`main` へ直接）。`gh workflow run ios-testflight.yml` で組み立てを始め、`gh run watch` で結果を文字で見る。失敗したら `gh run view --log-failed`
- [ ] **Step 3: ユーザーに実機で 18〜20 を見てもらう**。バナーがタブとずれていたら、`BANNER_MARGIN` を直す（下の安全域の扱いが想定と違うとき）か、設計書の代わりの形（バナーをいちばん下、タブをバナーの高さだけ上げる）に切り替える。「要審査」のあいだは本物の広告が出ないことがあり、そのときは空いた場所（高さ0）でよい

### Task 8: ストアの画面写真

**Files:**
- Create: `tools/store/shots.html`（1枚ずつ 1320×2868 で描くページ）、`tools/store/make-shots.mjs`（Chrome の headless で撮る）
- Create: `docs/store/raw/`（ユーザーの実機の画面。コミットする）、`docs/store/shots/`（出来上がり）

- [ ] **Step 1: 写すものを相談する**：3〜5枚（例：きめる画面のルーレット／結果カード／献立帳の絞り込み／記録カレンダー／YouTube の共有から登録）。他人の動画のサムネイルが大きく写らない料理の選び方を決め、ユーザーに実機で撮ってもらう（バナーは写さない）
- [ ] **Step 2:** `frontend-design:frontend-design` を読み、ギンガムの地＋上に一言（Zen Maru Gothic、`node_modules/@fontsource/zen-maru-gothic` の woff2 を読み込む）＋実機の画面、の形を `shots.html` で作る。一言は `docs/store/listing.md` に書き、ユーザーに見てもらう
- [ ] **Step 3:** `make-shots.mjs`：`C:/Program Files/Google/Chrome/Application/chrome.exe --headless --screenshot=<出力> --window-size=1320,2868 --hide-scrollbars file:///...shots.html?n=<番号>` を枚数ぶん流す
- [ ] **Step 4:** できた PNG を開いて大きさ（1320×2868）と見た目を確かめ、ユーザーに送る（SendUserFile）。OK ならコミット `ストアの画面写真を作る`

### Task 9: App Store Connect に入れて提出

- [ ] **Step 1:** ユーザーの Chrome で App Store Connect のクックポップ（アプリ番号 6826200575）を開き、`docs/store/listing.md` の内容を入れる。選択欄は開くと固まるので JavaScript で値を入れる（メモリにある前例）。画面写真を上げ、ビルド（Task 7 で確かめたもの）を選ぶ
- [ ] **Step 2:** 「審査に提出」の前に、入れた内容の一覧をユーザーに見せて確認をもらう。OK が出てから押す
- [ ] **Step 3:** 公開されたら：AdMob のクックポップで「ストアを追加」し、App Store の 6826200575 とつなぐ。メモリ（cookpop-progress.md）に進み具合と次にやることを書く
