// アイコンと起動画面の SVG。ポンの絵は docs/mockups/pon-c.html の PON から手で写したもの。
// CSS は使えない（resvg に渡す）ので、色と線は属性で直接書く。
export const CREAM = '#FFF6E5'; // 地の色（クリーム）

/** ポン本体（案C。viewBox 200 の座標のまま。影・考え中の吹き出し・zzz・あご・涙・ふつう以外の目は入れない。ほっぺは opacity .55） */
function ponBody() {
  return `<g class="pon">
  <g>
    <ellipse cx="74" cy="180" rx="12" ry="7" fill="#FF9A57"/>
    <ellipse cx="126" cy="180" rx="12" ry="7" fill="#FF9A57"/>
    <path d="M100 74 C154 74 176 108 176 138 C176 170 148 184 100 184 C52 184 24 170 24 138 C24 108 46 74 100 74 Z" fill="#FFD95E"/>
    <path d="M28 150 C40 172 66 180 100 180 C134 180 160 172 172 150 C168 170 144 184 100 184 C56 184 32 170 28 150 Z" fill="#F7C743"/>
    <ellipse cx="100" cy="164" rx="34" ry="14" fill="#FFE89A"/>
    <g><ellipse cx="34" cy="138" rx="10" ry="16" transform="rotate(20 34 138)" fill="#F7C743"/></g>
    <g><ellipse cx="166" cy="138" rx="10" ry="16" transform="rotate(-20 166 138)" fill="#F7C743"/></g>
    <g>
      <path d="M40 80 C26 76 22 48 46 46 C46 22 78 14 90 32 C100 10 136 12 140 34 C162 28 178 54 160 80 Z" fill="#FFFFFF" stroke="#E2CFAF" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M50 74 C70 64 130 64 150 74 L160 80 L40 80 Z" fill="#EFE4D2"/>
      <rect x="40" y="76" width="120" height="16" rx="8" fill="#FFFFFF" stroke="#E2CFAF" stroke-width="2.5"/>
      <rect x="40" y="86" width="120" height="6" rx="3" fill="#EFE4D2"/>
    </g>
    <ellipse cx="58" cy="136" rx="12" ry="7" fill="#FF8C7A" opacity=".55"/>
    <ellipse cx="142" cy="136" rx="12" ry="7" fill="#FF8C7A" opacity=".55"/>
    <g>
      <g>
        <circle cx="72" cy="124" r="5.2" fill="#3B2614"/><circle cx="70.4" cy="122.2" r="1.7" fill="#fff"/>
        <circle cx="128" cy="124" r="5.2" fill="#3B2614"/><circle cx="126.4" cy="122.2" r="1.7" fill="#fff"/>
      </g>
    </g>
    <path d="M94 134 Q100 130 106 134 Q103 141 100 142 Q97 141 94 134 Z" fill="#FF9A57"/>
  </g>
</g>`;
}

/** アイコンの SVG（1024×1024）。クリームの無地に、ポンを大きく少し下寄せで置く */
export function iconSvg() {
  // viewBox 200 を 880px 四方に（880 / 200 倍）。横は中央、縦は少し下へ
  const scale = 880 / 200;
  const x = (1024 - 880) / 2;
  const y = x + 16;
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
