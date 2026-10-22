// アイコンと起動画面の SVG。ポンの絵は docs/mockups/pon.html の PON から手で写したもの。
// CSS は使えない（resvg に渡す）ので、色と線は属性で直接書く。
export const CREAM = '#FFF6E5'; // 地の色（クリーム）
const YOLK = '#FFC43D'; // 体・羽
const INK = '#4A2E1C'; // 線・目
const PAPER = '#FFFDF8'; // おなか・帽子
const APRICOT = '#FF8A5B'; // くちばし・足・ほっぺ

const LINE = `stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;

/** ポン本体（viewBox 120 の座標のまま。影の楕円は入れない。目は「ふつう」、ほっぺは出す） */
function ponBody() {
  return `<g class="pon">
  <ellipse cx="49" cy="105" rx="7" ry="3.5" fill="${APRICOT}" ${LINE}/>
  <ellipse cx="71" cy="105" rx="7" ry="3.5" fill="${APRICOT}" ${LINE}/>
  <path d="M30 70 C18 72 16 86 28 90 C32 84 32 76 30 70 Z" fill="${YOLK}" ${LINE}/>
  <path d="M90 70 C102 72 104 86 92 90 C88 84 88 76 90 70 Z" fill="${YOLK}" ${LINE}/>
  <circle cx="60" cy="72" r="34" fill="${YOLK}" ${LINE}/>
  <ellipse cx="60" cy="84" rx="19" ry="14" fill="${PAPER}"/>
  <circle cx="40" cy="74" r="4.5" fill="${APRICOT}" opacity=".75"/>
  <circle cx="80" cy="74" r="4.5" fill="${APRICOT}" opacity=".75"/>
  <circle cx="47" cy="64" r="4.2" fill="${INK}"/><circle cx="73" cy="64" r="4.2" fill="${INK}"/>
  <circle cx="48.6" cy="62.4" r="1.5" fill="#fff"/><circle cx="74.6" cy="62.4" r="1.5" fill="#fff"/>
  <path d="M55 70 L65 70 L60 77 Z" fill="${APRICOT}" ${LINE}/>
  <path d="M44 42 C36 40 36 26 46 26 C46 16 60 14 62 24 C66 14 82 18 78 28 C86 28 86 42 76 42 Z" fill="${PAPER}" ${LINE}/>
  <rect x="42" y="40" width="36" height="8" rx="3" fill="${PAPER}" ${LINE}/>
</g>`;
}

/** アイコンの SVG（1024×1024）。クリームの無地に、ポンを大きく少し下寄せで置く */
export function iconSvg() {
  // viewBox 120 を 860px 四方に（860 / 120 倍）。横は中央、縦は少し下へ
  const scale = 860 / 120;
  const x = (1024 - 860) / 2;
  const y = x + 20;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<rect width="1024" height="1024" fill="${CREAM}"/>
<g transform="translate(${x} ${y}) scale(${scale})">
${ponBody()}
</g>
</svg>`;
}

/** 起動画面の SVG（2732×2732）。クリームの無地 */
export function splashSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="${CREAM}"/></svg>`;
}
