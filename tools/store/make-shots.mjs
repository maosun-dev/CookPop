// ストアの画面写真を作る：tools/store/shots.html を Chrome の画面なしで 1320×2868 に撮り、docs/store/shots/<番号>.png に書く。
// 使い方：node tools/store/make-shots.mjs（docs/store/raw/ にある番号だけ撮る。無ければ全部を仮の絵で撮る）
// App Store Connect で必須の「中型ディスプレイ」用（1206×2622）は、撮ったあと Python の Pillow で縮めて docs/store/shots/6.3/ に書く
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const page = pathToFileURL(path.join(root, 'tools/store/shots.html')).href;
const rawDir = path.join(root, 'docs/store/raw');
const outDir = path.join(root, 'docs/store/shots');
mkdirSync(outDir, { recursive: true });

const have = existsSync(rawDir) ? readdirSync(rawDir).map(f => Number(f.match(/^(\d+)\.png$/)?.[1])).filter(Boolean) : [];
const nums = have.length ? have.sort((a, b) => a - b) : [1, 2, 3, 4, 5];

for (const n of nums) {
  const out = path.join(outDir, `${n}.png`);
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
    '--force-device-scale-factor=1', '--window-size=1320,2868', '--virtual-time-budget=3000',
    `--screenshot=${out}`, `${page}?n=${n}`,
  ], { stdio: 'ignore' });
  console.log(`${n}.png`);
}

// 中型ディスプレイ用に縮める（縦横比のずれは 0.1% 未満なので、そのまま合わせる）
const mid = path.join(outDir, '6.3');
mkdirSync(mid, { recursive: true });
const shrink = [
  'import os, sys',
  'from PIL import Image',
  'for a in sys.argv[2:]:',
  '    Image.open(a).convert("RGB").resize((1206, 2622), Image.LANCZOS).save(os.path.join(sys.argv[1], os.path.basename(a)))',
].join('\n');
execFileSync('python', ['-c', shrink, mid, ...nums.map(n => path.join(outDir, `${n}.png`))], { stdio: 'inherit' });
console.log('6.3/ に縮めた');
