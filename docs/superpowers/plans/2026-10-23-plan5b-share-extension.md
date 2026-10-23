# クックポップ 計画5b：YouTube の「共有」から登録 実装手順書

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** YouTube アプリの「共有」→「クックポップ」で動画を送ると、クックポップを開いたときに登録画面がそのリンクで埋まって開く。

**Architecture:**
- iPhone 側：Share Extension（共有の受け口）を足す。受け取ったリンクと文字を App Group（アプリと受け口の共有の置き場）`group.com.maosundev.cookpop` の UserDefaults に、鍵 `share-target-data` で書き、「クックポップに送りました」と出して閉じる（アプリは自動で開かない。共有の受け口からアプリを開くのは審査で嫌われるため）
- アプリ側：既製の部品 `@capgo/capacitor-share-target@8.0.63` が、起動時とアプリが前に出るたびに App Group を読み、`shareReceived` を知らせる。画面は受け取った文字から YouTube のリンクを探し、献立帳の登録画面を開いてリンク欄を埋める
- Mac が無いので、Xcode のプロジェクトへの受け口の追加は Ruby の台本（xcodeproj）で行い、GitHub の Mac で組み立てる直前に毎回流す（同じ結果になるよう、すでにあれば何もしない）
- 署名：組み立ては今までどおり署名なし。書き出し（TestFlight へ送る）で自動署名する前に、アプリと受け口に App Group の権利（entitlements）を付けた仮の署名をしておく

**Spec:** `docs/superpowers/specs/2026-10-23-cookpop-design.md` 9 節（この計画で App Group の名前・鍵の名前・部品の名前に書き換える）

## Global Constraints

- コードのコメント・テスト名・コミットメッセージは日本語。画面の文言は日本語
- 名前は固定：App Group `group.com.maosundev.cookpop`、受け口の背番号 `com.maosundev.cookpop.share`、受け口のターゲット名 `ShareExtension`、表示名 `クックポップ`、UserDefaults の鍵 `share-target-data`
- 受け口の対象 iOS は 15.0、Swift 5、iPhone のみ（`TARGETED_DEVICE_FAMILY = 1`）。アプリの版と組み立て番号は受け口も同じ（`MARKETING_VERSION = 0.1.0`、組み立て番号はワークフローがコマンドで上書き）
- `src/core/` は変えない。`npm test`・`npm run typecheck`・`npm run sync` が通る状態でコミット。main に直接コミットし push してよい（ユーザー了承）
- Apple の開発者サイトでの登録（App Group・背番号・権利の有効化）は controller が Chrome で行う（Task 0）。実装者は触らない

## Review Focus

- 共有された文字に YouTube のリンクが無い（Safari の普通のページなど）→ アプリを開いたとき「YouTube のリンクが見つかりませんでした」と出し、画面は変えない（Task 3）
- 文字の中にリンクが混ざっている（「動画の題 https://youtu.be/xxx」）→ リンクだけ取り出す（Task 3）
- 共有したあとアプリを開くまでに時間がたった・アプリが閉じていた → 次に開いたときに受け取る（部品が起動時にも読む。Task 3 のテストは偽の部品で `shareReceived` を後から送る）
- 台本を2回流す → 受け口が2つにならない（Task 2 のテストは台本の中に「すでにあれば抜ける」処理があることを文字列で確かめる。本当の確認は GitHub の Mac）
- 書き出しで App Group の権利が落ちる → ワークフローの仮の署名で entitlements を付ける（Task 2）。実機で「共有→開く→埋まる」をチェック表で確かめる

---

### Task 0（controller）: Apple の開発者サイトで登録

- App Group `group.com.maosundev.cookpop` を登録
- `com.maosundev.cookpop` の App Groups を有効にしてこのグループを割り当てる
- `com.maosundev.cookpop.share`（説明 CookPop Share）を登録し、App Groups を有効にしてこのグループを割り当てる

---

### Task 1: アプリ側：共有を受け取って登録画面を開く（部品の導入と shareReceive.ts）

**Files:**
- Create: `src/app/shareReceive.ts`, `tests/app/shareReceive.test.ts`
- Modify: `package.json`（`@capgo/capacitor-share-target` を exact `8.0.63`）, `capacitor.config.json`（`"plugins": { "CapacitorShareTarget": { "appGroupId": "group.com.maosundev.cookpop" } }`）, `src/app/main.ts`, `tests/app/ios.test.ts`

**Interfaces:**
- `findYouTubeUrl(texts: string[], title?: string): string | null` — 文字の中から最初に `parseVideoId` で読めるリンクを返す。文字の中の空白で区切った各語も調べる（「題 https://youtu.be/xxx」から取り出す）。無ければ null
- `interface ShareEventLike { title?: string; texts?: string[] }`
- `interface ShareTargetLike { addListener(ev: 'shareReceived', fn: (e: ShareEventLike) => void): Promise<unknown> | unknown }`
- `listenShares(plugin: ShareTargetLike, onUrl: (url: string) => void, onNone: () => void): void`
- `main.ts`：`isNativeApp()` のとき `listenShares(CapacitorShareTarget, url => { tabs.select('book'); book.openForm(url); }, () => toast('YouTube のリンクが見つかりませんでした'))`。Web では何もしない

**Tests:** findYouTubeUrl（youtu.be の si 付き／題と混ざった文字／shorts／リンクなし→null／title だけにリンク）、listenShares（偽の部品で shareReceived を送ると onUrl、リンクなしなら onNone）、ios.test に appGroupId と部品の版

- [ ] テストを書いて失敗を確かめる → 部品を入れる（`npm install --save-exact @capgo/capacitor-share-target@8.0.63`）→ 書く → `npm test && npm run typecheck && npm run sync`（`ios/App/CapApp-SPM/Package.swift` に部品が足されることを確かめる）→ コミット `共有で受け取った YouTube のリンクで登録画面を開く`

---

### Task 2: iPhone 側：Share Extension・権利・台本・ワークフロー

**Files:**
- Create:
  - `ios/App/ShareExtension/ShareViewController.swift`
  - `ios/App/ShareExtension/Info.plist`
  - `ios/App/ShareExtension/ShareExtension.entitlements`
  - `ios/App/App/App.entitlements`
  - `tools/ios/add-share-extension.rb`
- Modify: `.github/workflows/ios-testflight.yml`, `tests/app/ios.test.ts`, `HANDOFF.md`（作り方に「組み立て前に台本で受け口を足す」）

**ShareViewController.swift（UIKit、ストーリーボードなし）:**
- `UIViewController` を継承。`viewDidLoad` で `extensionContext?.inputItems` の `NSExtensionItem` の `attachments` を見る
- `UTType.url` を持つものは `loadItem` で `URL` → `absoluteString`、`UTType.plainText` を持つものは `String` を集める（`texts`）。`attributedContentText` も文字として足す
- `UserDefaults(suiteName: "group.com.maosundev.cookpop")?.set(["title": タイトル or "", "texts": texts, "files": []], forKey: "share-target-data")`
- 画面には中央に小さなカード（白地・角丸）で「クックポップに送りました」「アプリを開くと登録できます」と「OK」ボタン。OK または 2.5 秒で `extensionContext?.completeRequest(returningItems: nil)`
- リンクが1つも無ければ「YouTube のリンクが見つかりませんでした」と出して何も書かない
- コメントは日本語

**Info.plist:** `CFBundleDisplayName` = クックポップ、`CFBundleIdentifier` = `$(PRODUCT_BUNDLE_IDENTIFIER)`、`CFBundleShortVersionString` = `$(MARKETING_VERSION)`、`CFBundleVersion` = `$(CURRENT_PROJECT_VERSION)`、`CFBundlePackageType` = `XPC!`、`CFBundleExecutable` = `$(EXECUTABLE_NAME)`、`NSExtension` = { `NSExtensionPointIdentifier` = `com.apple.share-services`、`NSExtensionPrincipalClass` = `$(PRODUCT_MODULE_NAME).ShareViewController`、`NSExtensionAttributes` = { `NSExtensionActivationRule` = { `NSExtensionActivationSupportsWebURLWithMaxCount` = 1、`NSExtensionActivationSupportsText` = true } } }

**entitlements（2つとも）:** `com.apple.security.application-groups` = [`group.com.maosundev.cookpop`]

**add-share-extension.rb（xcodeproj gem）:**
- `ios/App/App.xcodeproj` を開く。`ShareExtension` という名前のターゲットがあれば「すでにある」と出して終わる
- `project.new_target(:app_extension, 'ShareExtension', :ios, '15.0')`。グループ `ShareExtension`（パス `ShareExtension`）を作り、`ShareViewController.swift` をソースに、`Info.plist`・`ShareExtension.entitlements` は参照だけ
- 受け口の設定（Debug・Release とも）：`PRODUCT_BUNDLE_IDENTIFIER = com.maosundev.cookpop.share`、`INFOPLIST_FILE = ShareExtension/Info.plist`、`CODE_SIGN_ENTITLEMENTS = ShareExtension/ShareExtension.entitlements`、`MARKETING_VERSION = 0.1.0`、`CURRENT_PROJECT_VERSION = 1`、`SWIFT_VERSION = 5.0`、`TARGETED_DEVICE_FAMILY = 1`、`IPHONEOS_DEPLOYMENT_TARGET = 15.0`、`SKIP_INSTALL = YES`、`CODE_SIGN_STYLE = Automatic`、`GENERATE_INFOPLIST_FILE = NO`、`LD_RUNPATH_SEARCH_PATHS = $(inherited) @executable_path/Frameworks @executable_path/../../Frameworks`
- アプリのターゲット `App`：`CODE_SIGN_ENTITLEMENTS = App/App.entitlements` を足す。受け口への依存（`add_dependency`）と、「Embed Foundation Extensions」のコピー（`dst_subfolder_spec = '13'`、`ATTRIBUTES: ['RemoveHeadersOnCopy']`）を足す
- 保存（`project.save`）

**ワークフロー（ios-testflight.yml）:**
- 「アプリを組み立てる」の前に、手順「共有の受け口を足す」：`gem install xcodeproj --no-document` → `ruby tools/ios/add-share-extension.rb`
- archive のあとの仮の署名を、次の順にする：Frameworks の中を今までどおり → `App.app/PlugIns/ShareExtension.appex` に `codesign --force --sign - --timestamp=none --entitlements ios/App/ShareExtension/ShareExtension.entitlements` → `App.app` に `codesign --force --sign - --timestamp=none --entitlements ios/App/App/App.entitlements`
- ほかは変えない（`workflow_dispatch` だけ、`pull_request_target` なし）

**Tests（ios.test.ts に追記）:** Info.plist の NSExtension の3つの値／entitlements 2つに App Group／Swift に `group.com.maosundev.cookpop` と `share-target-data`／台本に背番号・`ShareExtension`・「すでにあれば抜ける」処理（`targets.find` など）・`dst_subfolder_spec`／ワークフローに `add-share-extension.rb` と `--entitlements` が2回、`pull_request_target` が無い

- [ ] テストを書いて失敗を確かめる → 書く → `npm test && npm run typecheck && npm run sync` → コミット `YouTube の共有からクックポップへ送れる受け口（Share Extension）を足す`

---

### Task 3（controller）: GitHub の Mac で組み立てて TestFlight へ

- push → ワークフロー実行 → `gh run watch`。失敗したら `gh run view --log-failed` で原因を読み、systematic-debugging で直す
- 成功したら、チェック表に「YouTube の共有→クックポップ→OK→クックポップを開くと登録画面が埋まって開く」を足す
