// 「きめる」画面：ポンが今日の料理をルーレットで決める。
import { el, clear } from '../ui';
import { toast } from '../toast';
import type { AppState } from '../state';
import type { Mascot } from '../mascot/pon';
import { bellyLevel, fewRecipesLine, greeting } from '../mascot/lines';
import { countOf, lastMade, monthCount } from '../../core/log';
import { monthOf } from '../../core/date';
import { pickMany, pickOne } from '../../core/picker';
import { CATS, type Cat, type Recipe } from '../../core/recipe';

export interface PickDeps {
  rng: () => number;
  mascot: Mascot;
  /** 動画を見るとき。host はカード内の枠 */
  openPlayer: (host: HTMLElement, videoId: string) => void;
  now: () => Date;
}

/** YouTube の動画ページのアドレス（r.url は使わない。core/recipe の watchUrl は外に出ていないのでここに持つ） */
export function watchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

const SPIN_TICKS = 16;
const SPIN_FIRST_MS = 50;
const SPIN_SLOWDOWN = 1.15;

/** 'YYYY-MM-DD' を「M月D日」にする */
function mdLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}月${d}日`;
}

function reducedMotion(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function createPickScreen(state: AppState, deps: PickDeps): { el: HTMLElement } {
  const { mascot, rng } = deps;

  // 画面の状態
  let cat: Cat | null = null; // null はすべて
  let favOnly = false;
  let pickThree = false;
  let spinning = false;
  let currentId: string | null = null; // 結果カードに出している料理
  let lastCount = state.data.recipes.length;

  const dish = el('div', { class: 'dish', 'aria-live': 'polite' }, '？');
  const empty = el('p', { class: 'muted empty' });
  const choices = el('div', { class: 'choices' });
  const resultHost = el('div', { class: 'result-host' });
  const rollBtn = el('button', { class: 'btn btn-yolk btn-big pop pop-press', id: 'roll', type: 'button', onclick: () => roll([]) }, 'きめて！');
  const catChips = el('div', { class: 'chips', role: 'group', 'aria-label': 'ジャンル' });
  const modeChips = el('div', { class: 'chips', role: 'group', 'aria-label': 'えらびかた' });

  function candidates(): Recipe[] {
    return state.data.recipes.filter(r => (cat === null || r.cat === cat) && (!favOnly || r.fav));
  }

  function chip(label: string, pressed: boolean, onClick: () => void): HTMLElement {
    return el('button', { class: 'chip', type: 'button', 'aria-pressed': pressed ? 'true' : 'false', onclick: onClick }, label);
  }

  /** ポンの一言と表情（動いていないとき用） */
  function idleMascot(): void {
    const n = state.data.recipes.length;
    if (n === 0) {
      mascot.setMood('sad');
      mascot.say('まずは献立帳で登録してね');
      return;
    }
    const few = fewRecipesLine(n);
    if (few) {
      mascot.setMood('sad');
      mascot.say(few);
      return;
    }
    mascot.setMood('normal');
    mascot.say(greeting(deps.now().getHours()));
  }

  function paintBelly(): void {
    mascot.setBelly(bellyLevel(monthCount(state.data.logs, monthOf(state.today()))));
  }

  function paintControls(): void {
    const list = candidates();
    clear(catChips);
    catChips.append(chip('すべて', cat === null, () => { cat = null; paintControls(); }));
    for (const c of CATS) catChips.append(chip(c, cat === c, () => { cat = c; paintControls(); }));
    clear(modeChips);
    modeChips.append(
      chip('お気に入りだけ', favOnly, () => { favOnly = !favOnly; paintControls(); }),
      chip('3つから選ぶ', pickThree, () => { pickThree = !pickThree; paintControls(); }),
    );
    rollBtn.disabled = spinning || list.length === 0;
    if (list.length === 0) {
      empty.textContent = state.data.recipes.length === 0
        ? 'まだ登録がありません。献立帳で足してね'
        : favOnly && cat === null ? 'お気に入りがまだ登録されていません' : 'このジャンルはまだ登録がありません';
    } else {
      empty.textContent = '';
    }
  }

  /** 結果カード。animate は出てきた瞬間だけ */
  function paintResult(recipe: Recipe, animate: boolean): void {
    const logs = state.data.logs;
    const n = countOf(logs, recipe.id);
    const last = lastMade(logs, recipe.id);
    const player = el('div', { class: 'player' });
    const card = el(
      'article',
      { class: `card pop result${animate ? ' rise' : ''}` },
      el('img', { src: recipe.thumb, alt: recipe.name, loading: 'lazy' }),
      el(
        'div',
        { class: 'card-body stack' },
        el('h2', { class: 'card-title' }, recipe.name),
        el('p', { class: 'muted' }, `${recipe.channel ? recipe.channel + '　' : ''}${recipe.cat}`),
        recipe.memo ? el('p', { class: 'memo' }, recipe.memo) : null,
        el('p', { class: 'count' }, n > 0 && last ? `作った回数 ${n}回（最後：${mdLabel(last)}）` : 'まだ作っていません'),
        el(
          'div',
          { class: 'row' },
          el('button', { class: 'btn btn-leaf pop pop-press', type: 'button', onclick: () => cooked(recipe) }, '作った！'),
          el('button', { class: 'btn pop pop-press', type: 'button', onclick: () => another(recipe) }, '別のにして'),
          el('button', { class: 'btn pop pop-press', type: 'button', onclick: () => deps.openPlayer(player, recipe.videoId) }, '動画を見る'),
        ),
        player,
      ),
    );
    clear(resultHost);
    resultHost.append(card);
  }

  /** 1品に決まった */
  function decide(recipe: Recipe): void {
    currentId = recipe.id;
    dish.textContent = recipe.name;
    clear(choices);
    paintResult(recipe, true);
    mascot.setMood('decided');
    mascot.say('これ！');
  }

  function cooked(recipe: Recipe): void {
    state.markCooked(recipe.id); // 購読で結果カードの回数が新しくなる
    mascot.setMood('happy');
    mascot.say('おいしくできた？');
    toast('記録しました');
  }

  function another(recipe: Recipe): void {
    if (candidates().length <= 1) return;
    roll([recipe.id]);
  }

  /** 3枚から選ぶ */
  function showChoices(list: Recipe[]): void {
    clear(choices);
    for (const r of list) {
      choices.append(
        el(
          'button',
          { class: 'choice pop pop-press', type: 'button', onclick: () => decide(r) },
          el('img', { src: r.thumb, alt: '', loading: 'lazy' }),
          el('span', {}, r.name),
        ),
      );
    }
    mascot.setMood('thinking');
    mascot.say('どれにする？');
  }

  function roll(extraExclude: string[]): void {
    if (spinning) return;
    const list = candidates();
    if (list.length === 0) return;
    const exclude = [...extraExclude];
    if (currentId !== null && !exclude.includes(currentId)) exclude.push(currentId);
    const input = { recipes: list, logs: state.data.logs, today: state.today(), rng, exclude };

    if (pickThree && list.length > 1) {
      clear(resultHost);
      currentId = null;
      dish.textContent = '？';
      showChoices(pickMany(input, 3));
      return;
    }

    clear(choices);
    mascot.setMood('thinking');
    mascot.say('えーと…');
    const finish = (): void => {
      spinning = false;
      const picked = pickOne({ ...input, logs: state.data.logs, today: state.today() });
      paintControls();
      if (picked) decide(picked);
    };
    if (reducedMotion() || list.length === 1) {
      finish();
      return;
    }
    spinning = true;
    paintControls();
    let tick = 0;
    let wait = SPIN_FIRST_MS;
    const step = (): void => {
      if (tick >= SPIN_TICKS) {
        finish();
        return;
      }
      dish.textContent = list[Math.floor(rng() * list.length) % list.length].name;
      tick++;
      setTimeout(step, wait);
      wait *= SPIN_SLOWDOWN;
    };
    step();
  }

  // データが変わったら描き直す。結果カードは残す（消された料理なら消す）
  state.subscribe(() => {
    paintControls();
    paintBelly();
    const count = state.data.recipes.length;
    if (count !== lastCount) {
      lastCount = count;
      if (!spinning) idleMascot();
    }
    if (currentId !== null) {
      const recipe = state.data.recipes.find(r => r.id === currentId);
      if (recipe) {
        if (!spinning) paintResult(recipe, false);
      } else {
        currentId = null;
        clear(resultHost);
        dish.textContent = '？';
      }
    }
  });

  paintControls();
  paintBelly();
  idleMascot();

  const root = el(
    'section',
    { class: 'screen pick' },
    el('h1', { class: 'sr-only' }, 'きめる'),
    mascot.el,
    el('div', { class: 'stage' }, dish, rollBtn, empty),
    choices,
    resultHost,
    el('div', { class: 'stack filters' }, catChips, modeChips),
  );
  return { el: root };
}
