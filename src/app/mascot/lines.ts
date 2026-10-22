// ポンのセリフと、おなかの段階。
import type { AppData } from '../../core/store';

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

/** 初めて開いたか。記録が無く、料理が最初に入っている見本（id が d- で始まる）だけのとき */
export function isFirstVisit(data: AppData): boolean {
  return data.logs.length === 0 && data.recipes.every(r => r.id.startsWith('d-'));
}

/** 初めて開いたときの一言 */
export function welcomeLine(): string {
  return 'はじめまして、ポンだよ。まずは献立帳で好きな料理動画を足してね';
}

/** 待機中の表情。23〜4時は眠い */
export function moodForHour(hour: number): 'normal' | 'sleepy' {
  return hour >= 23 || hour <= 4 ? 'sleepy' : 'normal';
}
