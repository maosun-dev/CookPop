// 設定（下から出るシートの中身）：ふきんの色、見た目、マイタグの整理、バックアップ、このアプリについて。
import { el, clear } from '../ui';
import { toast } from '../toast';
import type { FileDeps } from '../files';
import type { AppState } from '../state';
import { CLOTHS, type Cloth } from '../../core/store';
import { TAG_MAX_LEN } from '../../core/tagRules';

export interface SettingsDeps {
  files: FileDeps;
  /** 読み込み方を聞く。やめるなら null */
  confirmMode: () => Promise<'replace' | 'merge' | null>;
  version: string;
  /** 「消す」の確認。省略するとブラウザの確認ダイアログ */
  confirm?: (msg: string) => boolean;
}

const THEMES = [
  ['auto', '端末に合わせる'],
  ['light', '明るい'],
  ['dark', '暗い'],
] as const;

const CLOTH_NAMES: Record<Cloth, string> = {
  yellow: 'たまご', red: 'トマト', green: '抹茶', blue: 'ソーダ', pink: 'いちご', purple: 'ぶどう',
};

const TAG_ERRORS: Record<string, string> = {
  empty: '名前を入れてね',
  long: `${TAG_MAX_LEN}文字までです`,
  dup: 'その名前はもうあります',
  missing: 'そのタグが見つかりませんでした',
};

export function createSettingsScreen(state: AppState, deps: SettingsDeps): { el: HTMLElement; reset(): void } {
  const confirmFn = deps.confirm ?? ((m: string) => window.confirm(m));

  // ===== ふきんの色 =====
  const clothBtns = CLOTHS.map(cloth => ({
    cloth,
    node: el(
      'button',
      { class: 'cloth-btn', type: 'button', 'data-cloth': cloth, 'aria-label': CLOTH_NAMES[cloth], 'aria-pressed': 'false', onclick: () => state.updateSettings({ cloth }) },
      el('span', { class: 'cloth-swatch' }),
      el('span', { class: 'cloth-name' }, CLOTH_NAMES[cloth]),
    ),
  }));

  // ===== 見た目 =====
  const chips = THEMES.map(([theme, text]) => ({
    theme,
    node: el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => state.updateSettings({ theme }) }, text),
  }));

  // ===== マイタグの整理 =====
  const tagList = el('ul', { class: 'tag-list' });
  let editing: string | null = null;

  function tagRow(name: string): HTMLElement {
    if (editing === name) {
      const input = el('input', { class: 'input', type: 'text', value: name, maxlength: String(TAG_MAX_LEN * 2), 'aria-label': `${name}の新しい名前` });
      const done = (): void => {
        const r = state.renameTag(name, input.value);
        if (r !== 'ok') { toast(TAG_ERRORS[r]); return; }
        editing = null;
        renderTags();
      };
      input.addEventListener('keydown', e => { if (e.key === 'Enter') done(); });
      return el(
        'li',
        { class: 'tag-row' },
        input,
        el('button', { class: 'btn btn-yolk pop pop-press', type: 'button', onclick: done }, '決める'),
        el('button', { class: 'btn pop pop-press', type: 'button', onclick: () => { editing = null; renderTags(); } }, 'やめる'),
      );
    }
    return el(
      'li',
      { class: 'tag-row' },
      el('span', { class: 'tag-name' }, name),
      el('button', { class: 'btn pop pop-press', type: 'button', 'aria-label': `${name}の名前を変える`, onclick: () => { editing = name; renderTags(); } }, '名前を変える'),
      el('button', {
        class: 'btn pop pop-press', type: 'button', 'aria-label': `${name}を消す`,
        onclick: () => { if (confirmFn(`「${name}」を消しますか？\n付いている料理からも外れます（料理は消えません）`)) state.deleteTag(name); },
      }, '消す'),
    );
  }
  const tagEmpty = el('p', { class: 'note' }, 'まだありません。登録や編集の画面で作れます。');
  function renderTags(): void {
    const tags = state.data.settings.myTags;
    if (editing !== null && !tags.includes(editing)) editing = null;
    clear(tagList);
    for (const t of tags) tagList.append(tagRow(t));
    tagEmpty.hidden = tags.length > 0;
    tagList.hidden = tags.length === 0;
  }

  // ===== バックアップ =====
  async function exportBackup(): Promise<void> {
    try {
      await deps.files.saveText(`cookpop-backup-${state.today()}.json`, state.exportBackup());
      toast('書き出しました');
    } catch {
      toast('書き出せませんでした');
    }
  }
  async function importBackup(): Promise<void> {
    let raw: string | null;
    let mode: 'replace' | 'merge' | null;
    try {
      raw = await deps.files.pickText();
      if (raw === null) return; // やめた
      mode = await deps.confirmMode();
    } catch {
      toast('読み込めませんでした');
      return;
    }
    if (mode === null) return;
    toast(state.importBackup(raw, mode) ? '読み込みました' : '読めませんでした。クックポップのバックアップを選んでね');
  }

  const root = el(
    'div',
    { class: 'settings-sheet' },
    el(
      'div',
      { class: 'stack' },
      el(
        'div',
        { class: 'stack' },
        el('h2', { class: 'section-title' }, 'ふきんの色'),
        el('div', { class: 'cloth-row', role: 'group', 'aria-label': 'ふきんの色' }, ...clothBtns.map(c => c.node)),
      ),
      el(
        'div',
        { class: 'stack' },
        el('h2', { class: 'section-title' }, '見た目'),
        el('div', { class: 'chips', role: 'group', 'aria-label': '見た目' }, ...chips.map(c => c.node)),
      ),
      el(
        'div',
        { class: 'stack tag-manage' },
        el('h2', { class: 'section-title' }, 'マイタグの整理'),
        tagEmpty,
        tagList,
      ),
      el(
        'div',
        { class: 'stack' },
        el('h2', { class: 'section-title' }, 'バックアップ'),
        el('p', { class: 'note' }, '献立と記録をファイルに書き出せます。機種変更のときは、読み込むと元に戻せます。'),
        el(
          'div',
          { class: 'chips' },
          el('button', { class: 'btn btn-leaf pop pop-press', type: 'button', onclick: () => void exportBackup() }, '書き出す'),
          el('button', { class: 'btn btn-yolk pop pop-press', type: 'button', onclick: () => void importBackup() }, '読み込む'),
        ),
      ),
      el(
        'div',
        { class: 'stack' },
        el('h2', { class: 'section-title' }, 'このアプリについて'),
        el('p', { class: 'about-name' }, `クックポップ v${deps.version}`),
        el('p', { class: 'note' }, '動画は YouTube の公式プレーヤーで再生します。再生できない動画は「YouTube で開く」から開いてください。'),
        el('p', { class: 'note' }, '文字：Zen Maru Gothic（SIL Open Font License）'),
        el('p', { class: 'note' }, '部品：Capacitor（MIT）、capawesome File Picker（MIT）'),
      ),
    ),
  );

  function render(): void {
    const s = state.data.settings;
    for (const c of chips) c.node.setAttribute('aria-pressed', String(s.theme === c.theme));
    for (const c of clothBtns) c.node.setAttribute('aria-pressed', String(s.cloth === c.cloth));
    // 名前を入力している最中は、他の変更で入力欄を作り直さない
    if (editing === null || !tagList.querySelector('input')) renderTags();
  }
  state.subscribe(render);
  render();

  /** シートを開くたびに呼ぶ。名前変更の入力欄が残らないよう、一覧の表示に戻す */
  function reset(): void {
    editing = null;
    renderTags();
  }

  return { el: root, reset };
}
