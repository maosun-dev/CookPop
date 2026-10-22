import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version: string };

export default defineConfig({
  // iPhone 向けに包むときも相対パスで読めるようにする
  base: './',
  build: { target: 'es2022' },
  // 設定画面の「クックポップ v…」に package.json の version を入れる
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
});
