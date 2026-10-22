// ポンのセリフと、おなかの段階。

/** 時間帯の挨拶。hour は 0〜23 */
export function greeting(hour: number): string {
  if (hour >= 5 && hour <= 9) return 'おはよう！朝ごはん、なににする？';
  if (hour >= 10 && hour <= 14) return 'こんにちは！お昼はなににする？';
  if (hour >= 15 && hour <= 22) return '今日の晩ごはん、なににする？';
  return 'もう遅いね…軽いのにする？';
}

/** 今月作った回数からおなかの段階を決める */
export function bellyLevel(monthCount: number): 0 | 1 | 2 | 3 {
  if (monthCount <= 0) return 0;
  if (monthCount <= 4) return 1;
  if (monthCount <= 9) return 2;
  return 3;
}

/** 登録が5品未満のときだけの一言。それ以外は null */
export function fewRecipesLine(count: number): string | null {
  return count < 5 ? `まだ${count}品しか知らないよ。献立帳で足してね` : null;
}
