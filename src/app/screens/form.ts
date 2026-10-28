// 登録・編集フォーム：リンクを貼ると、題とチャンネルを自動で埋める。
import { el, clear } from '../ui';
import { toast } from '../toast';
import type { AppState } from '../state';
import { CATS, findByVideoId, parseVideoId, type Cat } from '../../core/recipe';
import { fetchMeta, type FetchJson } from '../../core/oembed';
import { TAGS_PER_RECIPE } from '../../core/tags';

export interface FormDeps {
  fetchJson: FetchJson;
  onDone: () => void;
  /** url：開いた時点で貼っておくリンク／recipeId：編集する料理 */
  prefill?: { url?: string; recipeId?: string };
  /** クリップボードの文字を読む（ボタンを押したときだけ呼ぶ）。無ければ貼るボタンを出さない */
  readClipboard?: () => Promise<string>;
}

export function createForm(state: AppState, deps: FormDeps): { el: HTMLElement; setUrl(url: string): void } {
  const editing = deps.prefill?.recipeId ? state.data.recipes.find(r => r.id === deps.prefill?.recipeId) : undefined;

  let cat: Cat = editing?.cat ?? '主菜';
  /** この料理に付けるマイタグ */
  let selectedTags: string[] = editing ? [...editing.tags] : [];
  let tagMaking = false; // 「＋ タグを作る」の小さな欄を開いているか
  /** 取ってきたサムネイル。どの動画のものかも覚えておく */
  let thumb = '';
  let thumbFor = '';
  /** もう問い合わせた動画 ID（同じものは2回取らない） */
  const requested = new Set<string>();
  let pending = 0;

  const errLine = el('p', { class: 'err', role: 'alert' });
  const hint = el('p', { class: 'muted hint' });
  const root = el('div', { class: 'form stack' });

  const showError = (msg: string) => { errLine.textContent = msg; };

  const urlInput = editing ? null : el('input', {
    class: 'input', name: 'url', type: 'url', inputmode: 'url', autocomplete: 'off',
    autocapitalize: 'off', spellcheck: 'false', placeholder: 'https://youtu.be/…',
  });
  const nameInput = el('input', { class: 'input', name: 'name', type: 'text', maxlength: 40, autocomplete: 'off' });
  const channelInput = el('input', { class: 'input', name: 'channel', type: 'text', maxlength: 40, autocomplete: 'off' });
  const memoInput = el('textarea', { class: 'input', name: 'memo', maxlength: 400 });
  if (editing) {
    nameInput.value = editing.name;
    channelInput.value = editing.channel;
    memoInput.value = editing.memo;
  }

  const setBusy = () => {
    root.setAttribute('data-busy', pending > 0 ? 'true' : 'false');
    hint.textContent = pending > 0 ? '題を取ってくる…' : '';
  };
  setBusy();

  /** 動画の題などを取ってきて、空の欄だけ埋める。失敗したら黙って手入力に任せる */
  async function autofill(videoId: string): Promise<void> {
    pending++;
    setBusy();
    try {
      const meta = await fetchMeta(videoId, deps.fetchJson);
      const current = urlInput ? parseVideoId(urlInput.value) : null;
      // 取っている間にリンクが変わっていたら、古い答えは使わない
      if (!meta || current !== videoId) return;
      if (!nameInput.value.trim()) nameInput.value = meta.title;
      if (!channelInput.value.trim()) channelInput.value = meta.channel;
      thumb = meta.thumb;
      thumbFor = videoId;
    } finally {
      pending--;
      setBusy();
    }
  }

  /**
   * リンク欄を調べる。読めない・登録済みなら案内を出して false。
   * quietIfEmpty：空の欄は、まだ何も入れていないだけなので責めない（入力中・欄を離れたとき用。登録ボタンでは責める）
   */
  function checkUrl(quietIfEmpty = false): boolean {
    if (!urlInput) return true;
    if (quietIfEmpty && urlInput.value.trim() === '') {
      showError('');
      return false;
    }
    const videoId = parseVideoId(urlInput.value);
    if (!videoId) {
      showError('YouTube の動画リンクを貼ってください');
      return false;
    }
    const dup = findByVideoId(state.data.recipes, videoId);
    if (dup) {
      showError(`もう登録してあるよ：${dup.name}`);
      return false;
    }
    showError('');
    if (!requested.has(videoId)) {
      requested.add(videoId);
      void autofill(videoId);
    }
    return true;
  }

  const catChips = el('div', { class: 'chips', role: 'group', 'aria-label': 'ジャンル' });
  function drawCats(): void {
    clear(catChips);
    for (const c of CATS) {
      catChips.append(el('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(c === cat),
        onclick: () => { cat = c; drawCats(); },
      }, c));
    }
  }
  drawCats();

  // マイタグ：作ったタグのチップ（押して付け外し）と「＋ タグを作る」
  const tagChips = el('div', { class: 'chips', role: 'group', 'aria-label': 'マイタグ' });
  const tagErr = el('p', { class: 'err', role: 'alert' });
  function drawTags(): void {
    clear(tagChips);
    for (const t of state.data.settings.myTags) {
      const on = selectedTags.includes(t);
      tagChips.append(el('button', {
        class: 'chip', type: 'button', 'aria-pressed': String(on),
        onclick: () => {
          if (on) {
            selectedTags = selectedTags.filter(x => x !== t);
            tagErr.textContent = '';
          } else if (selectedTags.length >= TAGS_PER_RECIPE) {
            tagErr.textContent = `1品に付けられるのは${TAGS_PER_RECIPE}個までだよ`;
            return;
          } else {
            selectedTags = [...selectedTags, t];
            tagErr.textContent = '';
          }
          drawTags();
        },
      }, t));
    }
    if (!tagMaking) {
      tagChips.append(el('button', { class: 'chip chip-add', type: 'button', onclick: () => { tagMaking = true; tagErr.textContent = ''; drawTags(); } }, '＋ タグを作る'));
    }
    drawMaker();
  }
  const tagMaker = el('div', { class: 'tag-maker row' });
  function makeTag(box: HTMLInputElement): void {
    const name = box.value.trim();
    const res = state.addTag(name);
    if (res === 'ok') {
      if (selectedTags.length < TAGS_PER_RECIPE) selectedTags = [...selectedTags, name];
      tagMaking = false;
      tagErr.textContent = '';
      drawTags();
      return;
    }
    tagErr.textContent = res === 'long' ? '12文字までにしてね'
      : res === 'dup' ? 'もうあるよ'
      : res === 'full' ? '20個までだよ'
      : 'タグの名前を入れてね';
  }
  function drawMaker(): void {
    tagMaker.hidden = !tagMaking;
    // 開いたまま・閉じたままのときは作り直さない（打ちかけの文字を消さないため）
    if (tagMaking === (tagMaker.childElementCount > 0)) return;
    clear(tagMaker);
    if (!tagMaking) return;
    const box = el('input', { class: 'input', name: 'newTag', type: 'text', autocomplete: 'off', placeholder: 'タグの名前（12文字まで）' });
    // 小さな欄で Enter を押しても、料理の登録は進めず、タグを作るだけにする
    box.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); makeTag(box); }
    });
    tagMaker.append(
      box,
      el('button', { class: 'btn btn-yolk pop-press', type: 'button', onclick: () => makeTag(box) }, '作る'),
      el('button', { class: 'btn btn-quiet', type: 'button', onclick: () => { tagMaking = false; tagErr.textContent = ''; drawTags(); } }, 'やめる'),
    );
    box.focus?.();
  }
  drawTags();

  const field = (label: string, control: HTMLElement) => el('label', { class: 'field' }, el('span', {}, label), control);

  function submit(e: Event): void {
    e.preventDefault();
    if (editing) {
      const name = nameInput.value.trim();
      if (!name) { showError('料理の名前を入れてください'); return; }
      const ok = state.updateRecipe(editing.id, { name, cat, channel: channelInput.value.trim(), memo: memoInput.value.trim() });
      if (!ok) { showError('料理の名前を入れてください'); return; }
      state.setRecipeTags(editing.id, selectedTags);
      toast('保存しました');
      deps.onDone();
      return;
    }
    if (!checkUrl()) return;
    const name = nameInput.value.trim();
    if (!name) { showError('料理の名前を入れてください'); return; }
    const url = urlInput!.value.trim();
    const videoId = parseVideoId(url);
    const res = state.addRecipe({
      url, name, cat,
      channel: channelInput.value.trim(),
      thumb: thumbFor === videoId ? thumb : '',
      memo: memoInput.value.trim(),
      tags: selectedTags,
    });
    if (res.ok) {
      toast(`「${res.recipe.name}」を登録しました`);
      deps.onDone();
    } else if (res.reason === 'duplicate') {
      const dup = videoId ? findByVideoId(state.data.recipes, videoId) : undefined;
      showError(`もう登録してあるよ：${dup?.name ?? ''}`);
    } else {
      showError('YouTube の動画リンクを貼ってください');
    }
  }

  if (urlInput) {
    for (const ev of ['input', 'paste', 'blur']) {
      // paste は貼り付けた文字が入ってから読みたいので、1拍おく
      urlInput.addEventListener(ev, () => {
        if (ev === 'paste') setTimeout(() => checkUrl(true), 0);
        else checkUrl(true);
      });
    }
  }

  /** 「クリップボードから貼る」：押したときだけ読む。空や失敗は案内だけ出す */
  async function pasteFromClipboard(): Promise<void> {
    let text = '';
    try {
      text = ((await deps.readClipboard?.()) ?? '').trim();
    } catch {
      text = '';
    }
    if (!text) {
      toast('クリップボードに YouTube のリンクがありません');
      return;
    }
    setUrl(text);
  }
  const pasteBtn = !editing && deps.readClipboard
    ? el('button', { class: 'btn pop pop-press', type: 'button', onclick: () => void pasteFromClipboard() }, 'クリップボードから貼る')
    : null;

  const form = el('form', { class: 'stack', novalidate: true, onsubmit: submit },
    urlInput && field('YouTube のリンク', urlInput),
    pasteBtn,
    errLine,
    hint,
    field('料理の名前', nameInput),
    el('div', { class: 'field' }, el('span', {}, 'ジャンル'), catChips),
    el('div', { class: 'field' }, el('span', {}, 'マイタグ'), tagChips, tagMaker, tagErr),
    field('チャンネル名（なくてもOK）', channelInput),
    field('メモ', memoInput),
    el('button', { class: 'btn btn-yolk btn-big pop-press', type: 'submit' }, editing ? '保存する' : '登録する'),
  );
  root.append(form);

  function setUrl(url: string): void {
    if (!urlInput) return;
    urlInput.value = url;
    checkUrl(true);
  }

  if (deps.prefill?.url) setUrl(deps.prefill.url);

  return { el: root, setUrl };
}
