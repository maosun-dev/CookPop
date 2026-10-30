# クックポップ 1.0.0 ストアの文字と App Store Connect の答え（下書き）

App Store Connect のアプリ番号：6826200575。URL はすべて maosun-dev.com で書く。

## 基本

| 項目 | 内容 |
|---|---|
| 名前（30字まで） | クックポップ |
| サブタイトル（30字まで） | 料理動画から今日の献立を決める |
| カテゴリ | フード＆ドリンク（副：ライフスタイル） |
| 価格 | 無料 |
| 配信する国・地域 | 日本だけ（2026-10-29 ユーザーが決定。ヨーロッパなどに広げるときは、広告の同意をあとから変えるボタンを設定に足してから） |
| サポート URL | https://maosun-dev.com/cookpop/ |
| マーケティング URL | https://maosun-dev.com/cookpop/ |
| プライバシーポリシー URL | https://maosun-dev.com/cookpop/privacy.html |
| 著作権 | 2026 maosun-dev |

## プロモーション用テキスト（170字まで）

「今日なに作ろう？」をポンにおまかせ。YouTube で見つけたお気に入りの料理動画を集めておくと、ボタンひとつで今日の献立が決まります。

## 説明文

保存したまま眠っている料理動画、ありませんか？
クックポップは、YouTube のお気に入りの料理動画を集めておくと、マスコットのポンが今日の献立を決めてくれるアプリです。

■ ボタンひとつで献立が決まる
「きめて！」を押すと、ポンが登録した料理の中から1つ選びます。決まった料理の動画は、その場ですぐに再生できます。

■ YouTube から、共有ボタンで登録
YouTube アプリで料理動画を開き、「共有」から「クックポップ」を選ぶだけ。動画のリンクを貼って登録することもできます。題名とサムネイルは自動で入ります。

■ ジャンルとマイタグで絞り込み
主菜・副菜・汁物・ご飯・麺・パン・おやつの7つのジャンルに加えて、「時短」「作り置き」など自分だけのタグを作れます。「今日は汁物から」「今日は時短で」と、絞り込んでから決められます。

■ 作った記録がカレンダーに
作ったら「作った！」を押すと、きろくのカレンダーに残ります。

■ 6色のふきん
画面の地は、ギンガムチェックのふきん。たまご・トマト・抹茶・ソーダ・いちご・ぶどうの6色から選べます。暗い見た目にも対応しています。

■ データは iPhone の中だけ
登録した料理や記録は、あなたの iPhone の中にだけ保存します。アカウント登録はいりません。機種変更のときは、バックアップのファイルで移せます。

※ 動画は YouTube の公式の埋め込みプレーヤーで再生します。投稿者が埋め込みを止めている動画は、「YouTube で開く」から YouTube アプリなどで見られます。
※ 画面の上に広告が表示されます。

## キーワード（100字まで、カンマ区切り、名前と重ねない）

献立,こんだて,レシピ,料理,ごはん,夕飯,晩ごはん,メニュー,ルーレット,YouTube,動画,自炊,作り置き,時短,お弁当,決める

## アプリのプライバシー（App Store Connect の「App のプライバシー」）

アプリ自身は何も集めない。答えは AdMob（Google Mobile Ads SDK）の分。

- データの収集：**はい**
- 種類と用途

| 種類 | 用途 | ユーザーに紐づけ | トラッキング |
|---|---|---|---|
| 識別子：デバイス ID | サードパーティ広告 | いいえ | はい |
| 使用状況データ：製品の操作 | サードパーティ広告、分析 | いいえ | いいえ |
| 使用状況データ：広告データ | サードパーティ広告 | いいえ | はい |
| 診断：クラッシュデータ | アプリの機能 | いいえ | いいえ |
| 診断：パフォーマンスデータ | アプリの機能 | いいえ | いいえ |
| 位置情報：おおよその場所 | サードパーティ広告 | いいえ | いいえ |

入力するときに、ワンタップ収支・転落牌の答えと食い違いがないかを App Store Connect で見比べる（同じ AdMob を使っているため）。

## 年齢の区分（アンケート）

すべて「なし」／「いいえ」。

- 制限のないウェブアクセス：**いいえ**（決まった YouTube 動画を埋め込むだけで、自由に見て回れない）
- ユーザーが作るコンテンツ・他人とのやりとり：いいえ
- 広告：あり（アンケートに項目があれば）

## 審査の人へのメモ（英語。審査の人が読むため）

No login is required.

How to use:
1. Open the "献立帳" (Recipe book) tab at the bottom and tap "＋ 登録する" (Add). Paste a YouTube cooking video URL (for example https://www.youtube.com/watch?v=...). The title and thumbnail are filled in automatically. You can also add a video from the YouTube app: Share > クックポップ.
2. Open the "きめる" (Pick) tab and tap "きめて！" (Pick!). The mascot picks one recipe at random, and you can play its video on the result card.
3. Tap "作った！" (I made it) to record it on the calendar in the "きろく" (Log) tab.

The app comes with 8 sample recipes, so you can try "きめて！" right away.

Videos are played with the official YouTube embedded player (YouTube IFrame API). Because YouTube refuses embeds from the app's local origin, the player is loaded from our own page, https://maosun-dev.com/cookpop/player.html, inside an iframe. If a video cannot be embedded, the app shows a button to open it in the YouTube app.

The app shows a banner ad (Google AdMob) at the top of the screen, just below the status bar. The ad is hidden while a video player is shown, while a sheet (such as Settings) is open, and while the keyboard is up.
