// 起動の流れ：文字と見た目を読み込み、データを用意し、4つのタブを画面に出す。
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';
import './style.css';
import './mascot/pon.css';
import { watchClipboard } from './clipboardCheck';
import { suggestHandler } from './clipboardWire';
import { webFiles } from './files';
import { newId } from './ids';
import { ICONS } from './icons';
import { createMascot } from './mascot/pon';
import { openPlayer, pauseAllPlayers } from './player';
import { createBookScreen } from './screens/book';
import { createLogScreen } from './screens/log';
import { createPickScreen } from './screens/pick';
import { createSettingsScreen } from './screens/settings';
import { createState } from './state';
import { safeStore } from './storage';
import { createTabs } from './tabs';
import { applyTheme } from './theme';
import { toast } from './toast';

const state = createState(safeStore(), () => new Date(), newId);
applyTheme(state.data.settings.theme);

const mascot = createMascot();
const pick = createPickScreen(state, {
  rng: Math.random,
  mascot,
  now: () => new Date(),
  openPlayer: (host, videoId) => openPlayer(host, videoId),
});

const book = createBookScreen(state, {
  fetchJson: url => fetch(url).then(r => r.json()),
  openPlayer: (host, videoId) => openPlayer(host, videoId),
  confirm: msg => window.confirm(msg),
  pauseAll: pauseAllPlayers,
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
  files: webFiles(),
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

// クリップボードに新しい動画のリンクがあれば、ポンが登録を聞く
watchClipboard({
  read: async () => {
    try {
      return navigator.clipboard?.readText ? await navigator.clipboard.readText() : '';
    } catch {
      return '';
    }
  },
  state,
  onSuggest: suggestHandler({ mascot, tabs, book, toast }),
});
