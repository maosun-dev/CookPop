// 見た目のテーマ（自動・ライト・ダーク）とふきんの色を画面全体に反映する。
import type { Cloth, Theme } from '../core/store';

/** auto は属性を消して端末の設定に任せる。light/dark は data-theme。ふきんの色は data-cloth */
export function applyTheme(theme: Theme, cloth: Cloth): void {
  const root = document.documentElement;
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  root.setAttribute('data-cloth', cloth);
}
