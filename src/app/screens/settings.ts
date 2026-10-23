// 設定：見た目、バックアップ、このアプリについて。
import { el } from '../ui';
import { toast } from '../toast';
import type { FileDeps } from '../files';
import type { AppState } from '../state';

export interface SettingsDeps {
  files: FileDeps;
  /** 読み込み方を聞く。やめるなら null */
  confirmMode: () => Promise<'replace' | 'merge' | null>;
  version: string;
}

const THEMES = [
  ['auto', '端末に合わせる'],
  ['light', '明るい'],
  ['dark', '暗い'],
] as const;

export function createSettingsScreen(state: AppState, deps: SettingsDeps): { el: HTMLElement } {
  // ===== 見た目 =====
  const chips = THEMES.map(([theme, text]) => ({
    theme,
    node: el('button', { class: 'chip', type: 'button', 'aria-pressed': 'false', onclick: () => state.updateSettings({ theme }) }, text),
  }));

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
    'section',
    { class: 'screen settings' },
    el('h1', { class: 'screen-title' }, '設定'),
    el(
      'div',
      { class: 'stack' },
      el(
        'div',
        { class: 'stack' },
        el('h2', { class: 'section-title' }, '見た目'),
        el('div', { class: 'chips', role: 'group', 'aria-label': '見た目' }, ...chips.map(c => c.node)),
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
  }
  state.subscribe(render);
  render();

  return { el: root };
}
