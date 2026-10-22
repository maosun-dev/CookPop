# アイコンと起動画面の道具

クックポップのアイコン（1024px）と起動画面（2732px）の PNG を作ります。

## 使い方

```
npm run icon
npm run icon -- --preview=art/out   # 60px に縮めた確かめ用も書く
```

- 書き出し先は `art/out/`（`icon-1024.png`・`splash-2732.png`）。Git には入れません。
- `ios/App/App/Assets.xcassets` があるときは、`AppIcon.appiconset` と `Splash.imageset` にも書きます。
- PNG は透明なしの RGB です（App Store はアイコンに透明があると受け付けません）。

## 絵について

ポンの絵は `docs/mockups/pon.html` の `PON` から手で写しています（`icon.mjs`）。
見本ページは CSS で色を付けていますが、PNG を作る道具は CSS を読めないので、色と線は属性で直接書いています。
見本のポンの形や色を変えたら、`icon.mjs` も合わせて直してください。
