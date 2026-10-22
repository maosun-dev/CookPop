// 日付の関数。日付は 'YYYY-MM-DD'（ローカル時刻）、月は 'YYYY-MM' の文字列で扱う。

const MS_PER_DAY = 86400000;

/** ローカル時刻の 'YYYY-MM-DD' にする */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** to − from の日数。UTC で計算するので夏時間の影響を受けない */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / MS_PER_DAY);
}

/** 'YYYY-MM-DD' から 'YYYY-MM' を取り出す */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** 'YYYY-MM-DD' の形の文字列か（実在する日かまでは見ない） */
export function isDateStr(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
