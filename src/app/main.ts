// 起動の流れ：文字と見た目を読み込み、（iPhone では）消えにくい保存から戻し、データを用意し、4つのタブを画面に出す。
// 日本語のサブセットだけを読み込む（英数字も含まれる）。全部入りだと CSS が重い
import '@fontsource/zen-maru-gothic/japanese-500.css';
import '@fontsource/zen-maru-gothic/japanese-700.css';
import '@fontsource/zen-maru-gothic/japanese-900.css';
import './style.css';
import './mascot/pon.css';
import { Clipboard } from '@capacitor/clipboard';
import { Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { webFiles } from './files';
import { nativeClipboardRead, nativeFiles, nativeOpenExternal, type FsLike } from './nativeDeps';
import { newId } from './ids';
import { ICONS } from './icons';
import { createMascot } from './mascot/pon';
import { openPlayer, pauseAllPlayers } from './player';
import { createBookScreen } from './screens/book';
import { createLogScreen } from './screens/log';
import { createPickScreen } from './screens/pick';
import { createSettingsScreen } from './screens/settings';
import { createState } from './state';
import { isNativeApp, mirrorStore, nativePrefs, prepareSaves } from './native';
import { safeStore } from './storage';
import { createTabs } from './tabs';
import { applyTheme } from './theme';

async function boot(): Promise<void> {
  // 先に消えにくい保存から戻す（失敗しても起動は続ける）。戻し終わってから画面を描く
  await prepareSaves().catch(() => {});

  // iPhone アプリでは、書くたびに消えにくい保存領域にも写す。Web ではこれまで通り
  const store = isNativeApp() ? mirrorStore(safeStore(), nativePrefs()) : safeStore();
  const state = createState(store, () => new Date(), newId);
  applyTheme(state.data.settings.theme);

  const native = isNativeApp();
  // iPhone では動画を外のブラウザ（YouTube アプリ・Safari）で開く。Web ではそのまま
  const openExternal = native ? nativeOpenExternal(window) : undefined;
  const openVideo = (host: HTMLElement, videoId: string): void => openPlayer(host, videoId, { openExternal });
  // Filesystem の directory / encoding は enum 型なので、文字列で受ける FsLike へは型だけ合わせる（中身は同じ文字列）
  const files = native ? nativeFiles({ Filesystem: Filesystem as FsLike, Share, FilePicker }) : webFiles();

  const mascot = createMascot();
  const pick = createPickScreen(state, {
    rng: Math.random,
    mascot,
    now: () => new Date(),
    openPlayer: openVideo,
    openBook: () => tabs.select('book'),
  });

  const book = createBookScreen(state, {
    fetchJson: url => fetch(url).then(r => r.json()),
    openPlayer: openVideo,
    confirm: msg => window.confirm(msg),
    pauseAll: pauseAllPlayers,
    // 押されたときだけ読む（勝手に読むと iPhone が毎回「ペーストを許可」と聞くため）
    readClipboard: native
      ? nativeClipboardRead(Clipboard)
      : navigator.clipboard?.readText ? () => navigator.clipboard.readText() : undefined,
  });

  const log = createLogScreen(state, {
    mascot,
    now: () => new Date(),
    showRecipe: id => {
      tabs.select('book');
      book.showRecipe(id);
    },
  });

  const settings = createSettingsScreen(state, {
    files,
    version: __APP_VERSION__,
    // 計画2ではブラウザの確認ダイアログを2段で使う
    confirmMode: async () => {
      if (window.confirm('今のデータをバックアップの内容に置き換えますか？\n（キャンセルすると「足す」を選べます）')) return 'replace';
      return window.confirm('今のデータにバックアップの料理と記録を足しますか？') ? 'merge' : null;
    },
  });

  const tabs = createTabs([
    { id: 'pick', label: 'きめる', icon: ICONS.pick, view: pick.el },
    { id: 'book', label: '献立帳', icon: ICONS.book, view: book.el },
    { id: 'log', label: 'きろく', icon: ICONS.log, view: log.el },
    { id: 'settings', label: '設定', icon: ICONS.settings, view: settings.el },
  ]);

  document.getElementById('app')!.append(tabs.el);

  // 別のタブに移ったら、鳴っている動画を止める
  tabs.onChange(() => pauseAllPlayers());

  state.subscribe(() => applyTheme(state.data.settings.theme));
}

// 起動で落ちても白い画面のままにしない
boot().catch(() => {
  const app = document.getElementById('app');
  if (app) app.textContent = '起動できませんでした。アプリを閉じて開き直してください';
});
