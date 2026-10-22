// 起動の流れ：文字と見た目を読み込み、データを用意し、4つのタブを画面に出す。
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';
import './style.css';
import { newId } from './ids';
import { ICONS } from './icons';
import { createMascot } from './mascot/pon';
import { createPickScreen, watchUrl } from './screens/pick';
import { createPlaceholder } from './screens/placeholder';
import { createState } from './state';
import { safeStore } from './storage';
import { createTabs } from './tabs';
import { applyTheme } from './theme';
import { el } from './ui';

const state = createState(safeStore(), () => new Date(), newId);
applyTheme(state.data.settings.theme);

const mascot = createMascot();
const pick = createPickScreen(state, {
  rng: Math.random,
  mascot,
  now: () => new Date(),
  // 動画の再生はあとの作業で作る。それまでは YouTube を開くリンクだけ出す
  openPlayer: (host, videoId) => {
    host.replaceChildren(el('a', { class: 'btn pop pop-press', href: watchUrl(videoId), target: '_blank', rel: 'noopener' }, 'YouTube で開く'));
  },
});

const tabs = createTabs([
  { id: 'pick', label: 'きめる', icon: ICONS.pick, view: pick.el },
  { id: 'book', label: '献立帳', icon: ICONS.book, view: createPlaceholder('献立帳').el },
  { id: 'log', label: 'きろく', icon: ICONS.log, view: createPlaceholder('きろく').el },
  { id: 'settings', label: '設定', icon: ICONS.settings, view: createPlaceholder('設定').el },
]);

document.getElementById('app')!.append(tabs.el);

state.subscribe(() => applyTheme(state.data.settings.theme));
