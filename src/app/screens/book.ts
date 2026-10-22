// 献立帳：登録した料理の一覧・詳細・登録/編集フォーム。画面の中で3つの表示（一覧・詳細・フォーム）を切り替える。
import { el, clear } from '../ui';
import { toast } from '../toast';
import type { AppState } from '../state';
import { createForm } from './form';
import type { FetchJson } from '../../core/oembed';
import { countOf, lastMade } from '../../core/log';
import { CATS, type Cat, type Recipe } from '../../core/recipe';

export interface BookDeps {
  fetchJson: FetchJson;
  /** 動画を見るとき。host は詳細の中の枠 */
  openPlayer: (host: HTMLElement, videoId: string) => void;
  confirm: (msg: string) => boolean;
}

/** 'YYYY-MM-DD' を「M月D日」にする */
function mdLabel(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}月${d}日`;
}

const STAR_ON = '★';
const STAR_OFF = '☆';

type View = { kind: 'list' } | { kind: 'detail'; id: string } | { kind: 'form' };

interface DetailView {
  node: HTMLElement;
  /** 今のデータに合わせて文字を更新する */
  fill(recipe: Recipe): void;
}

export function createBookScreen(
  state: AppState,
  deps: BookDeps,
): { el: HTMLElement; openForm(prefillUrl?: string): void; showRecipe(id: string): void } {
  let view: View = { kind: 'list' };
  let cat: Cat | null = null; // null はすべて
  let favOnly = false;
  let detail: DetailView | null = null;

  const root = el('section', { class: 'screen book' });

  const findRecipe = (id: string): Recipe | undefined => state.data.recipes.find(r => r.id === id);

  /** 表示を入れ替える。見えている画面の先頭に戻す */
  function mount(node: HTMLElement, scroll: boolean): void {
    clear(root);
    root.append(node);
    if (scroll && typeof root.scrollIntoView === 'function') root.scrollIntoView({ block: 'start' });
  }

  // ===== 一覧 =====
  const countLabel = el('small', {});
  const addBtn = el('button', { class: 'btn btn-yolk pop pop-press', type: 'button', onclick: () => openForm() }, '＋ 登録する');
  const grid = el('ul', { class: 'grid' });
  const empty = el('p', { class: 'empty-note' });

  // チップは1度だけ作り、押した状態だけ更新する
  function makeChip(label: string, onClick: () => void): HTMLElement {
    return el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: onClick }, label);
  }
  const catChipList: Array<{ cat: Cat | null; node: HTMLElement }> = [
    { cat: null, node: makeChip('すべて', () => { cat = null; paintList(); }) },
    ...CATS.map(c => ({ cat: c as Cat | null, node: makeChip(c, () => { cat = c; paintList(); }) })),
  ];
  const favChip = makeChip('お気に入りだけ', () => { favOnly = !favOnly; paintList(); });
  const chips = el('div', { class: 'chips', role: 'group', 'aria-label': 'しぼりこみ' }, ...catChipList.map(c => c.node), favChip);

  const listView = el(
    'div',
    { class: 'stack' },
    el('div', { class: 'book-head' }, el('h1', { class: 'screen-title' }, '献立帳 ', countLabel), addBtn),
    chips,
    grid,
    empty,
  );

  function makeTile(r: Recipe): HTMLElement {
    const open = el(
      'button',
      { class: 'tile-open', type: 'button', onclick: () => showRecipe(r.id) },
      el('img', { src: r.thumb, alt: '', loading: 'lazy' }),
      el('span', { class: 'tile-body' }, el('span', { class: 'tile-name' }, r.name), el('span', { class: 'tag' }, r.cat)),
    );
    // 星はカードを開くボタンとは別の兄弟にする（押してもカードは開かない）
    const fav = el(
      'button',
      {
        class: 'icon fav', type: 'button', 'aria-label': 'お気に入り', 'aria-pressed': r.fav ? 'true' : 'false',
        'data-id': r.id, onclick: () => state.toggleFav(r.id),
      },
      r.fav ? STAR_ON : STAR_OFF,
    );
    return el('li', { class: 'card pop tile' }, open, fav);
  }

  /** 一覧を今のデータに合わせて描き直す。星を押した直後でもフォーカスは同じ星に戻す */
  function paintList(): void {
    const all = state.data.recipes;
    const shown = all.filter(r => (cat === null || r.cat === cat) && (!favOnly || r.fav));
    countLabel.textContent = `${all.length}品`;
    for (const c of catChipList) c.node.setAttribute('aria-pressed', cat === c.cat ? 'true' : 'false');
    favChip.setAttribute('aria-pressed', favOnly ? 'true' : 'false');

    const active = document.activeElement;
    const focusedId = active instanceof HTMLElement && grid.contains(active) ? active.getAttribute('data-id') : null;
    clear(grid);
    for (const r of shown) grid.append(makeTile(r));
    if (focusedId) {
      const again = [...grid.querySelectorAll<HTMLElement>('.fav')].find(b => b.getAttribute('data-id') === focusedId);
      again?.focus();
    }

    chips.hidden = all.length === 0;
    empty.textContent = all.length === 0
      ? 'まだ何もありません。＋ 登録する で好きな料理動画を足しましょう'
      : shown.length === 0 ? 'この条件の料理はありません' : '';
  }

  function showList(scroll = true): void {
    view = { kind: 'list' };
    detail = null;
    paintList();
    mount(listView, scroll);
  }

  // ===== 詳細 =====
  function buildDetail(id: string): DetailView {
    const img = el('img', { src: '', alt: '', loading: 'lazy' });
    const title = el('h2', { class: 'card-title' });
    const meta = el('p', { class: 'muted' });
    const memo = el('p', { class: 'memo' });
    const count = el('p', { class: 'count' });
    const player = el('div', { class: 'player' });
    const favBtn = el('button', { class: 'btn pop pop-press', type: 'button', 'aria-pressed': 'false', onclick: () => state.toggleFav(id) });

    const watch = (): void => {
      const r = findRecipe(id);
      if (r) deps.openPlayer(player, r.videoId);
    };
    const remove = (): void => {
      const r = findRecipe(id);
      if (!r) return;
      if (!deps.confirm(`「${r.name}」を削除しますか？作った記録は残ります`)) return;
      state.deleteRecipe(id); // 購読で一覧に戻る
      toast('削除しました');
    };
    const cooked = (): void => {
      state.markCooked(id);
      toast('記録しました');
    };

    const node = el(
      'article',
      { class: 'detail stack' },
      el('div', { class: 'row' }, el('button', { class: 'btn btn-quiet', type: 'button', onclick: () => showList() }, '← 献立帳')),
      el(
        'div',
        { class: 'card pop' },
        img,
        el(
          'div',
          { class: 'card-body stack' },
          el('button', { class: 'btn btn-yolk pop pop-press', type: 'button', onclick: watch }, '動画を見る'),
          player,
          title,
          meta,
          memo,
          count,
        ),
      ),
      el(
        'div',
        { class: 'row' },
        el('button', { class: 'btn btn-leaf pop pop-press', type: 'button', onclick: cooked }, '作った！'),
        favBtn,
        el('button', { class: 'btn pop pop-press', type: 'button', onclick: () => openEdit(id) }, '編集する'),
        el('button', { class: 'btn btn-apricot pop pop-press', type: 'button', onclick: remove }, '削除する'),
      ),
    );

    return {
      node,
      fill(recipe) {
        const n = countOf(state.data.logs, recipe.id);
        const last = lastMade(state.data.logs, recipe.id);
        if (img.getAttribute('src') !== recipe.thumb) img.setAttribute('src', recipe.thumb);
        img.setAttribute('alt', recipe.name);
        title.textContent = recipe.name;
        meta.textContent = `${recipe.channel ? recipe.channel + '　' : ''}${recipe.cat}`;
        memo.textContent = recipe.memo;
        memo.hidden = recipe.memo === '';
        count.textContent = n > 0 && last ? `作った回数 ${n}回（最後：${mdLabel(last)}）` : 'まだ作っていません';
        favBtn.setAttribute('aria-pressed', recipe.fav ? 'true' : 'false');
        favBtn.textContent = `${recipe.fav ? STAR_ON : STAR_OFF} お気に入り`;
      },
    };
  }

  function showRecipe(id: string): void {
    const recipe = findRecipe(id);
    if (!recipe) return;
    view = { kind: 'detail', id };
    detail = buildDetail(id);
    detail.fill(recipe);
    mount(detail.node, true);
  }

  // ===== フォーム =====
  function showForm(onDone: () => void, prefill?: { url?: string; recipeId?: string }): void {
    view = { kind: 'form' };
    detail = null;
    const form = createForm(state, { fetchJson: deps.fetchJson, onDone, prefill });
    mount(
      el(
        'div',
        { class: 'stack' },
        el('div', { class: 'row' }, el('button', { class: 'btn btn-quiet', type: 'button', onclick: () => showList() }, '← 献立帳')),
        el('h1', { class: 'screen-title' }, prefill?.recipeId ? '料理を編集' : '料理を登録'),
        form.el,
      ),
      true,
    );
  }

  function openForm(prefillUrl?: string): void {
    showForm(() => showList(), prefillUrl ? { url: prefillUrl } : undefined);
  }

  /** 編集。保存したらその料理の詳細に戻る */
  function openEdit(id: string): void {
    if (!findRecipe(id)) return;
    showForm(() => { if (findRecipe(id)) showRecipe(id); else showList(); }, { recipeId: id });
  }

  // データが変わったら、見えている表示を合わせる（詳細は作り直さず文字だけ。動画の枠を保つため）
  state.subscribe(() => {
    if (view.kind === 'list') {
      paintList();
    } else if (view.kind === 'detail') {
      const recipe = findRecipe(view.id);
      if (recipe && detail) detail.fill(recipe);
      else showList();
    }
  });

  showList(false);
  return { el: root, openForm, showRecipe };
}
