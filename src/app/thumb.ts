// サムネイル画像。読み込めなかったときは、卵黄色の地に小さなポンの顔を出す。
import { el, svg } from './ui';

/** ポンの顔（40×40、案C）。線なし。卵黄の丸い体、白い帽子の帯（うすい縁）、点の目2つ（白い光つき）、ほっぺ、くちばし */
export const PON_FACE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
  <circle cx="20" cy="23" r="15" fill="#FFD95E"/>
  <ellipse cx="9.5" cy="26" rx="2.6" ry="1.6" fill="#FF8C7A" opacity=".6"/><ellipse cx="30.5" cy="26" rx="2.6" ry="1.6" fill="#FF8C7A" opacity=".6"/>
  <circle cx="14" cy="23.5" r="2.4" fill="#3B2614"/><circle cx="26" cy="23.5" r="2.4" fill="#3B2614"/>
  <circle cx="13.3" cy="22.7" r=".8" fill="#fff"/><circle cx="25.3" cy="22.7" r=".8" fill="#fff"/>
  <path d="M17.6 27.6 Q20 26 22.4 27.6 Q21.4 30.4 20 30.8 Q18.6 30.4 17.6 27.6 Z" fill="#FF9A57"/>
  <rect x="6.5" y="6.5" width="27" height="8" rx="4" fill="#fff" stroke="#E2CFAF" stroke-width="1.2"/>
</svg>`;

/** サムネイルの <img>。読み込みに失敗したとき、または YouTube が「動画が無い」ときに返す 120×90 の灰色の画像だったときは、代わりの絵（.thumb-fallback）に置き換わる */
export function thumbImg(src: string, alt: string): HTMLElement {
  const img = el('img', { src, alt, loading: 'lazy' });
  const replace = (): void => {
    const fallback = el('div', { class: 'thumb-fallback', 'aria-hidden': 'true' }, svg(PON_FACE));
    img.replaceWith(fallback);
  };
  img.addEventListener('error', replace, { once: true });
  // 削除された動画は、エラーにならず小さな灰色の画像（120×90）が返ってくる
  img.addEventListener('load', () => {
    if (img.naturalWidth === 120 && img.naturalHeight === 90) replace();
  });
  return img;
}
