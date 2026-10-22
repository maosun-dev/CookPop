// 画面で使う小さな整形の関数。

/** 'YYYY-MM-DD' を「M月D日」にする */
export function mdLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}月${d}日`;
}
