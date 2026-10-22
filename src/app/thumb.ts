// サムネイル画像。読み込めなかったときは、卵黄色の地に小さなポンの顔を出す。
import { el, svg } from './ui';

/** ポンの顔（40×40）。卵黄のからだ、こげ茶の目2つ（白いきらり付き）、あんずのくちばし、帽子の白い帯だけ */
export const PON_FACE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true" focusable="false">
  <circle cx="20" cy="23" r="15" fill="#FFC43D" stroke="#4A2E1C" stroke-width="2.2"/>
  <circle cx="14" cy="25" r="2.3" fill="#4A2E1C"/><circle cx="26" cy="25" r="2.3" fill="#4A2E1C"/>
  <circle cx="14.8" cy="24.1" r=".8" fill="#FFFDF8"/><circle cx="26.8" cy="24.1" r=".8" fill="#FFFDF8"/>
  <path d="M17.6 28.6 L22.4 28.6 L20 32.4 Z" fill="#FF8A5B" stroke="#4A2E1C" stroke-width="1.4" stroke-linejoin="round"/>
  <rect x="9" y="5.5" width="22" height="6.5" rx="2.6" fill="#FFFDF8" stroke="#4A2E1C" stroke-width="2.2" stroke-linejoin="round"/>
</svg>`;

/** サムネイルの <img>。読み込みに失敗したら代わりの絵（.thumb-fallback）に置き換わる */
export function thumbImg(src: string, alt: string): HTMLElement {
  const img = el('img', { src, alt, loading: 'lazy' });
  img.addEventListener(
    'error',
    () => {
      const fallback = el('div', { class: 'thumb-fallback', 'aria-hidden': 'true' }, svg(PON_FACE));
      img.replaceWith(fallback);
    },
    { once: true },
  );
  return img;
}
