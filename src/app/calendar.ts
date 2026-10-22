// カレンダーの計算。月は 'YYYY-MM'、日は 'YYYY-MM-DD'。UTC で数えるので夏時間の影響を受けない。

const WEEK = 7;
const CELLS = WEEK * 6;

function parseMonth(month: string): { y: number; m: number } {
  const [y, m] = month.split('-').map(Number);
  return { y, m };
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** 日曜始まりの 6週×7日=42マス。月の外のマスは date が null */
export function calendarCells(month: string): { date: string | null }[] {
  const { y, m } = parseMonth(month);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(); // 1日の曜日（日曜=0）
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate(); // 月の日数
  const cells: { date: string | null }[] = [];
  for (let i = 0; i < CELLS; i++) {
    const day = i - lead + 1;
    cells.push({ date: day >= 1 && day <= days ? `${y}-${pad(m)}-${pad(day)}` : null });
  }
  return cells;
}

/** 月を delta か月ずらす */
export function shiftMonth(month: string, delta: number): string {
  const { y, m } = parseMonth(month);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** 「2026年10月」 */
export function monthLabel(month: string): string {
  const { y, m } = parseMonth(month);
  return `${y}年${m}月`;
}
