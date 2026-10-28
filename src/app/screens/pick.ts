// 「きめる」画面：ポンが今日の料理をルーレットで決める。
import { el, clear, svg } from '../ui';
import { toast } from '../toast';
import type { AppState } from '../state';
import type { Mascot } from '../mascot/pon';
import { bellyLevel, fewRecipesLine, greeting, isFirstVisit, moodForHour, welcomeLine } from '../mascot/lines';
import { thumbImg } from '../thumb';
import { countOf, lastMade, monthCount } from '../../core/log';
import { monthOf } from '../../core/date';
import { filterRecipes, pickMany, pickOne } from '../../core/picker';
import type { Recipe } from '../../core/recipe';
import { createFilters } from '../filters';

export interface PickDeps {
  rng: () => number;
  mascot: Mascot;
  /** 動画を見るとき。host はカード内の枠 */
  openPlayer: (host: HTMLElement, videoId: string) => void;
  now: () => Date;
  /** 献立帳のタブへ移る（はじめましての案内のボタン用） */
  openBook?: () => void;
}

/** 上の大きな料理名の大きさ。8文字までは大きく、15文字までは一段小さく、それより長いともう一段小さく */
export function dishSize(name: string): '' | 'm' | 's' {
  const len = Array.from(name).length;
  return len <= 8 ? '' : len <= 15 ? 'm' : 's';
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
  let favOnly = false;
  let pickThree = false;
  let spinning = false;
  let currentId: string | null = null; // 結果カードに出している料理
  let choiceIds: string[] = []; // 3枚から選ぶで並べている料理
  let lastCount = state.data.recipes.length;
  let rolled = false; // この起動で「きめて！」を押したか（はじめましての案内は、その起動で1回だけ。保存しない）

  const dishText = el('span', { class: 'dish-text' }, '？');
  const dish = el('div', { class: 'dish', 'aria-live': 'polite' }, dishText); // 回している間は読み上げない
  /** 上の料理名を入れ替える。長さに合わせて大きさのクラスも替える */
  function setDish(name: string): void {
    dishText.textContent = name;
    dish.classList.remove('m', 's');
    const size = dishSize(name);
    if (size) dish.classList.add(size);
  }
  const empty = el('p', { class: 'muted empty' });
  const choices = el('div', { class: 'choices' });
  const resultHost = el('div', { class: 'result-host' });
  const rollBtn = el('button', { class: 'stamp pop-press', id: 'roll', type: 'button', onclick: () => roll([]) }, 'きめて！');

  // 2段の絞り込み（ジャンル・マイタグ）。チップは1度だけ作り、押した状態だけ更新する
  const filters = createFilters(state, () => paintControls());
  function makeChip(label: string, onClick: () => void): HTMLElement {
    return el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: onClick }, label);
  }
  const favChip = makeChip('お気に入りだけ', () => { favOnly = !favOnly; paintControls(); });
  const threeChip = makeChip('3つから選ぶ', () => { pickThree = !pickThree; paintControls(); });
  const modeChips = el('div', { class: 'chips', role: 'group', 'aria-label': 'えらびかた' }, favChip, threeChip);

  function candidates(): Recipe[] {
    return filterRecipes(state.data.recipes, { cat: filters.cat(), tag: filters.tag(), favOnly });
  }

  function findRecipe(id: string): Recipe | undefined {
    return state.data.recipes.find(r => r.id === id);
  }

  /** ポンの一言と表情（動いていないとき用） */
  function idleMascot(): void {
    const n = state.data.recipes.length;
    if (n === 0) {
      mascot.setMood('sad');
      mascot.say('まずは献立帳で登録してね');
      return;
    }
    if (!rolled && isFirstVisit(state.data)) {
      mascot.setMood(moodForHour(deps.now().getHours()));
      mascot.say(welcomeLine(), { label: '献立帳へ', onClick: () => deps.openBook?.() });
      return;
    }
    const few = fewRecipesLine(n);
    if (few) {
      mascot.setMood('sad');
      mascot.say(few);
      return;
    }
    mascot.setMood(moodForHour(deps.now().getHours()));
    mascot.say(greeting(deps.now().getHours()));
  }

  function paintBelly(): void {
    mascot.setBelly(bellyLevel(monthCount(state.data.logs, monthOf(state.today()))));
  }

  /** チップの押した状態・ボタンの無効・空の案内を更新する（作り直さない） */
  function paintControls(): void {
    const list = candidates();
    favChip.setAttribute('aria-pressed', favOnly ? 'true' : 'false');
    threeChip.setAttribute('aria-pressed', pickThree ? 'true' : 'false');
    rollBtn.disabled = spinning || list.length === 0;
    if (list.length === 0) {
      empty.textContent = state.data.recipes.length === 0
        ? 'まだ登録がありません。献立帳で足してね'
        : favOnly && filters.cat() === null && filters.tag() === null ? 'お気に入りがまだ登録されていません'
        : filters.tag() === null && !favOnly ? 'このジャンルはまだ登録がありません' : 'この条件の料理はまだ登録がありません';
    } else {
      empty.textContent = '';
    }
  }

  // 結果カード：1枚だけ作って持ち、中身の文字だけ更新する（プレーヤー枠やフォーカスを保つため）
  interface ResultView {
    thumbHost: HTMLElement;
    title: HTMLElement;
    meta: HTMLElement;
    memo: HTMLElement;
    count: HTMLElement;
  }
  let view: ResultView | null = null;

  function buildResult(id: string): HTMLElement {
    // 写真の入れ物。押すと、この入れ物の中身が動画のプレーヤー（と下の「YouTube で開く」）に替わる
    const mediaHost = el('div', { class: 'media-host' });
    const thumbHost = el('div', { class: 'thumb-host' });
    const play = (): void => {
      if (mediaHost.querySelector('.player')) return; // もう動画に替わっている
      watch(id, mediaHost);
    };
    mediaHost.append(el('button', { class: 'media', type: 'button', 'aria-label': '動画を流す', onclick: play }, thumbHost));
    const title = el('h2', { class: 'card-title' });
    const meta = el('p', { class: 'muted' });
    const memo = el('p', { class: 'memo' });
    const count = el('p', { class: 'count' });
    const card = el(
      'article',
      { class: 'card pop result rise' },
      // 右上の角のメモ。写真にも名前にも重ならない（カードの上の余白に貼る）
      el(
        'button',
        { class: 'play-memo', type: 'button', onclick: play },
        el('span', { class: 'play-dot', 'aria-hidden': 'true' }, svg('<svg viewBox="0 0 24 24"><path d="M6 4 L20 12 L6 20 Z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>')),
        '動画を流す',
      ),
      mediaHost,
      el(
        'div',
        { class: 'card-body stack' },
        title,
        meta,
        memo,
        count,
        el(
          'div',
          { class: 'row' },
          el('button', { class: 'btn btn-leaf pop pop-press', type: 'button', onclick: () => cooked(id) }, '作った！'),
          el('button', { class: 'btn pop pop-press', type: 'button', onclick: () => another(id) }, '別のにして'),
        ),
      ),
    );
    view = { thumbHost, title, meta, memo, count };
    return card;
  }

  /** 結果カードの表示を今のデータに合わせる */
  function fillResult(recipe: Recipe): void {
    if (!view) return;
    const logs = state.data.logs;
    const n = countOf(logs, recipe.id);
    const last = lastMade(logs, recipe.id);
    // 画像は元のアドレスが変わったときだけ作り直す（読めなかった代わりの絵を、むやみに読み直さない）
    if (view.thumbHost.dataset.src !== recipe.thumb) {
      view.thumbHost.dataset.src = recipe.thumb;
      clear(view.thumbHost);
      view.thumbHost.append(thumbImg(recipe.thumb, recipe.name));
    }
    view.thumbHost.querySelector('img')?.setAttribute('alt', recipe.name);
    view.title.textContent = recipe.name;
    view.meta.textContent = `${recipe.channel ? recipe.channel + '　' : ''}${recipe.cat}`;
    view.memo.textContent = recipe.memo;
    view.memo.hidden = recipe.memo === '';
    view.count.textContent = n > 0 && last ? `作った回数 ${n}回（最後：${mdLabel(last)}）` : 'まだ作っていません';
  }

  /** 結果カードを新しく出す（せり上がる） */
  function showResult(recipe: Recipe): void {
    const card = buildResult(recipe.id);
    clear(resultHost);
    resultHost.append(card);
    fillResult(recipe);
    // 決まったカードが画面の外なら見える所まで動かす（jsdom などには無いことがある）
    card.scrollIntoView?.({ block: 'nearest', behavior: reducedMotion() ? 'auto' : 'smooth' });
  }

  function clearResult(): void {
    view = null;
    clear(resultHost);
  }

  /** 1品に決まった */
  function decide(recipe: Recipe): void {
    currentId = recipe.id;
    choiceIds = [];
    setDish(recipe.name);
    clear(choices);
    showResult(recipe);
    mascot.setMood('decided');
    mascot.say('これ！');
  }

  function cooked(id: string): void {
    if (!findRecipe(id)) return;
    state.markCooked(id); // 購読で結果カードの回数が新しくなる
    mascot.setMood('happy');
    mascot.say('おいしくできた？');
    toast('記録しました');
  }

  function another(id: string): void {
    if (candidates().length <= 1) return;
    roll([id]);
  }

  function watch(id: string, host: HTMLElement): void {
    const recipe = findRecipe(id);
    if (recipe) deps.openPlayer(host, recipe.videoId);
  }

  /** 3枚から選ぶ */
  let choiceSignature = ''; // 並べているカードの名前と画像（変わったときだけ描き直す）
  function renderChoices(list: Recipe[]): void {
    choiceIds = list.map(r => r.id);
    choiceSignature = JSON.stringify(list.map(r => [r.id, r.name, r.thumb]));
    clear(choices);
    for (const r of list) {
      choices.append(
        el(
          'button',
          // 選ぶ瞬間の最新の料理で決める（名前を変えたあとでも古い名前にならない）
          { class: 'choice pop pop-press', type: 'button', onclick: () => decide(findRecipe(r.id) ?? r) },
          thumbImg(r.thumb, ''),
          el('span', {}, r.name),
        ),
      );
    }
  }
  function showChoices(list: Recipe[]): void {
    renderChoices(list);
    mascot.setMood('thinking');
    mascot.say('どれにする？');
  }

  function roll(extraExclude: string[]): void {
    if (spinning) return;
    if (candidates().length === 0) return;
    rolled = true; // これ以降は、はじめましてではなく時間帯の挨拶に戻す
    const exclude = [...extraExclude];
    if (currentId !== null && !exclude.includes(currentId)) exclude.push(currentId);
    // 候補は呼ぶたびに取り直す（回している間に料理が増減することがある）
    const base = () => ({ recipes: candidates(), logs: state.data.logs, today: state.today(), rng, exclude });

    if (pickThree && candidates().length > 1) {
      clearResult();
      currentId = null;
      setDish('？');
      const input = base();
      // 候補が3つ以下なら、除外すると3枚に満たないので除外しない
      if (input.recipes.length <= 3) input.exclude = [];
      showChoices(pickMany(input, 3));
      return;
    }

    clear(choices);
    choiceIds = [];
    mascot.setMood('thinking');
    mascot.say('えーと…');
    const finish = (): void => {
      spinning = false;
      dish.setAttribute('aria-live', 'polite'); // 止まったので、決まった名前だけ読み上げる
      const picked = pickOne(base());
      paintControls();
      if (picked) {
        decide(picked);
      } else {
        setDish('？');
        idleMascot();
      }
    };
    if (reducedMotion() || candidates().length === 1) {
      finish();
      return;
    }
    spinning = true;
    dish.removeAttribute('aria-live'); // 回転中は料理名が次々変わるので読み上げない
    paintControls();
    let tick = 0;
    let wait = SPIN_FIRST_MS;
    const step = (): void => {
      if (tick >= SPIN_TICKS) {
        finish();
        return;
      }
      const list = candidates();
      if (list.length > 0) setDish(list[Math.floor(rng() * list.length) % list.length].name);
      tick++;
      setTimeout(step, wait);
      wait *= SPIN_SLOWDOWN;
    };
    step();
  }

  // データが変わったら更新する。結果カードは残す（消された料理なら消す）
  state.subscribe(() => {
    filters.sync(); // 選んだタグの名前が変わった・消えた、を追いかける
    paintControls();
    paintBelly();
    const count = state.data.recipes.length;
    if (count !== lastCount) {
      lastCount = count;
      if (!spinning && choiceIds.length === 0) idleMascot();
    }
    if (currentId !== null) {
      const recipe = findRecipe(currentId);
      if (recipe) {
        fillResult(recipe);
      } else {
        currentId = null;
        clearResult();
        if (!spinning) setDish('？');
      }
    }
    // 3枚から選ぶで、消された料理のカードは除く
    if (choiceIds.length > 0) {
      const alive = choiceIds.map(findRecipe).filter((r): r is Recipe => r !== undefined);
      if (alive.length !== choiceIds.length) {
        if (alive.length > 0) {
          showChoices(alive);
        } else {
          choiceIds = [];
          clear(choices);
          idleMascot();
        }
      } else if (JSON.stringify(alive.map(r => [r.id, r.name, r.thumb])) !== choiceSignature) {
        // 名前や画像が変わったときは、カードの文字も合わせる
        renderChoices(alive);
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
    el('div', { class: 'stack filters' }, filters.catRow, filters.tagRow, modeChips),
    choices,
    resultHost,
  );
  return { el: root };
}
