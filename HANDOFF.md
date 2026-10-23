# クックポップ iPhone アプリ（CookPop）

登録した YouTube の料理動画から、マスコットのポンが今日の献立を決めてくれるアプリ。vite + TypeScript で作り、Capacitor（ウェブのページを iPhone アプリに包む道具）で包んで、GitHub の Mac で組み立てて TestFlight に送る。

- 設計・計画は `docs/superpowers/` の下（`specs/` と `plans/`）
- 背番号（バンドルID）：`com.maosundev.cookpop`（変えられない）
- 表示名：クックポップ ／ 版：0.1.0
- 置き場：GitHub `maosun-dev/CookPop`（作っている間は公開。ストアに出たら非公開にする）

## 作り方
1. `npm test`（テストが全部通ること）
2. `npm run sync`（型の検査 → 画面の組み立て → フォントの余り削り → ios に入れる）
3. 変更をコミットして push
4. GitHub の Actions「iPhone版をTestFlightへ」→「Run workflow」で組み立てて TestFlight へ
   - 組み立ての前に、ワークフローが台本 `tools/ios/add-share-extension.rb`（xcodeproj）で共有の受け口（Share Extension、ターゲット `ShareExtension`・背番号 `com.maosundev.cookpop.share`）を Xcode のプロジェクトに足す。手元の `project.pbxproj` には受け口が入っていないのが正しい（すでにあれば台本は何もしない）
   - 受け口とアプリは App Group `group.com.maosundev.cookpop` でつながる。受け口の中身は `ios/App/ShareExtension/`、権利は `ios/App/App/App.entitlements` と `ios/App/ShareExtension/ShareExtension.entitlements`
5. 進み具合は文字で読む：`gh run list` ／ `gh run watch` ／ 失敗したら `gh run view --log-failed`
6. TestFlight で入れたら `docs/testflight-checklist.md` の表で実機を確かめる

## Secrets（GitHub の Settings → Secrets and variables → Actions）
- `APPLE_TEAM_ID`：Apple のチーム ID
- `APPSTORE_API_KEY_ID`：App Store Connect API キーの Key ID
- `APPSTORE_API_ISSUER_ID`：同じ Issuer ID
- `APPSTORE_API_PRIVATE_KEY`：ダウンロードした `AuthKey_XXXX.p8` の中身（全文）。**ユーザーが自分で入れる**
- 上の3つ（p8 以外）は、前に作ったアプリ（超将棋・TJA採譜台）の記録から同じものを写せる

## 安全の決まり
- このリポジトリに、maosun-dev 以外を共同作業者（Collaborators）として足さない
- ワークフローに `pull_request_target` を使わない
- ワークフローは手動（`workflow_dispatch`）だけ。push では動かさない
- p8 の鍵ファイルの中身は読まない・書き写さない

## App Store Connect でのアプリ登録（ユーザーがやる）
- 背番号 `com.maosundev.cookpop` で、App Store Connect にアプリを新規登録する（これがないと TestFlight に届かない）
- ストアに載せるURL（サポートURL・マーケティングURL・プライバシーポリシーなど）は **https://maosun-dev.com/** で書く。`maosun-dev.github.io` は使わない（AdMob の app-ads.txt が辿れなくなる）

## 気をつけること
- YouTube の埋め込み：アプリの中は `capacitor://localhost` で動く。YouTube の埋め込みが「エラー153」で再生できないときは、プレーヤーの下の「YouTube で開く」で逃げられる。本当の対策（候補：maosun-dev.com にプレーヤー用の小さなページを置き、アプリからそのページを iframe で読む）は、実機で 153 が出ると分かってから決める
- アイコンを作り直すとき：`npm run icon`
- フォントは中に入れてある（fontsource の日本語の部分入り）。ネットがなくても文字が出る
- 保存は Preferences（消えにくい保存領域）にも写してあり、起動時に戻す
