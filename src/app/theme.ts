// 見た目のテーマ（自動・ライト・ダーク）を画面全体に反映する。
import type { Theme } from '../core/store';

/** auto は属性を消して端末の設定に任せる。light/dark は data-theme で固定 */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
