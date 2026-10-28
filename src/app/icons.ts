// タブのアイコン（自作の線画）。24×24、線だけ、色は currentColor。
import type { TabId } from './tabs';

const open = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';

export const ICONS: Record<TabId | 'pot', string> = {
  // きめる：ごはん茶碗から「？」の形に立ちのぼる湯気（点と茶碗のふちは離す）
  pick: `${open}<path d="M3.5 13.5h17a8.5 7.5 0 0 1-17 0z"/><path d="M9.5 22.5h5"/><path d="M9.4 3.9a2.6 2.6 0 1 1 4.2 2.1c-.9.6-1.6 1.1-1.6 2.1"/><path d="M12 10.3v.01"/></svg>`,
  // 献立帳：リボンのしおりが付いた本（しおりは右の縁から離す）
  book: `${open}<path d="M6 3.5h11.5A1.5 1.5 0 0 1 19 5v14a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z"/><path d="M8.5 3.5v17"/><path d="M12 3.5v7l2-1.6 2 1.6v-7"/></svg>`,
  // きろく：日めくりの紙に、小さな丸印
  log: `${open}<path d="M5 5.5h14A1.5 1.5 0 0 1 20.5 7v12a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5z"/><path d="M8 3v4M16 3v4"/><path d="M3.5 10h17"/><circle cx="12" cy="15.2" r="2.4"/></svg>`,
  // pot：ふた付きのお鍋（設定のボタン。歯車ではなく）
  pot: `${open}<path d="M4.5 11h15v6.5a3 3 0 0 1-3 3h-9a3 3 0 0 1-3-3z"/><path d="M6 11a6 4.5 0 0 1 12 0"/><path d="M12 6.5V4.8"/><path d="M10.5 4.8h3"/><path d="M4.5 14H2.5M19.5 14h2"/></svg>`,
};

/** お気に入りの星（五芒星）。20×20、塗りは currentColor、線はなし。押していない間は CSS で輪郭だけにする */
export const STAR_ICON = '<svg viewBox="0 0 20 20" fill="currentColor" stroke="none" stroke-linejoin="round"><path d="M10 2.4L12.06 7.97L17.99 8.2L13.33 11.88L14.94 17.6L10 14.3L5.06 17.6L6.67 11.88L2.01 8.2L7.94 7.97z"/></svg>';

/** 「戻る」の左向きの矢印。24×24、線だけ、色は currentColor（タブのアイコンと同じ太さ） */
export const BACK_ICON = `${open}<path d="M20 12H5"/><path d="M11 5.5L4.5 12L11 18.5"/></svg>`;
