// iPhone アプリのアイコンと起動画面の PNG を作る。
// 使い方：npm run icon  （確かめ用の 60px 版も欲しいときは -- --preview=art/out）
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { CREAM, iconSvg, splashSvg } from './icon.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const assets = join(root, 'ios', 'App', 'App', 'Assets.xcassets');

/** SVG を不透明な RGB の PNG に（背景をクリームで塗り、透明の層を持たない形で書く） */
export function renderRgbPng(svg, width) {
  const r = new Resvg(svg, {
    background: CREAM,
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false },
  });
  const img = r.render();
  return rgbPng(img.width, img.height, img.pixels);
}

/** RGBA の画素から、色の種類 2（RGB・透明なし）の PNG を組み立てる */
function rgbPng(w, h, rgba) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    const row = y * (w * 3 + 1);
    raw[row] = 0; // 行ごとの前処理なし
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const o = row + 1 + x * 3;
      raw[o] = rgba[i];
      raw[o + 1] = rgba[i + 1];
      raw[o + 2] = rgba[i + 2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 1色 8bit
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

/** 置き場所のフォルダが無ければ作ってから書く */
function write(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
}

/** 書き出し本体（直接実行のときだけ呼ぶ） */
function main() {
  const out = join(root, 'art', 'out');
  mkdirSync(out, { recursive: true });
  const icon = renderRgbPng(iconSvg(), 1024);
  const splash = renderRgbPng(splashSvg(), 2732);
  write(join(out, 'icon-1024.png'), icon);
  write(join(out, 'splash-2732.png'), splash);

  // iOS のプロジェクトができていれば、Xcode の置き場所にも書く
  if (existsSync(assets)) {
    write(join(assets, 'AppIcon.appiconset', 'AppIcon-512@2x.png'), icon);
    for (const name of ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']) {
      write(join(assets, 'Splash.imageset', name), splash);
    }
  }

  // 確かめ用：--preview=<フォルダ> で 60px に縮めたものも書く（Xcode には置かない）
  const preview = process.argv.find((a) => a.startsWith('--preview='));
  if (preview) {
    const dir = resolve(preview.slice('--preview='.length));
    mkdirSync(dir, { recursive: true });
    write(join(dir, 'icon-60.png'), renderRgbPng(iconSvg(), 60));
  }
  console.log(`アイコンと起動画面を書き出した（art/out${existsSync(assets) ? ' と Assets.xcassets' : ''}）`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
