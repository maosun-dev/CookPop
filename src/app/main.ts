// 起動の流れ：文字と見た目を読み込み、データを用意し、4つのタブを画面に出す。
import '@fontsource/zen-maru-gothic/500.css';
import '@fontsource/zen-maru-gothic/700.css';
import '@fontsource/zen-maru-gothic/900.css';
import './style.css';
import { newId } from './ids';
import { ICONS } from './icons';
import { createPlaceholder } from './screens/placeholder';
import { createState } from './state';
import { safeStore } from './storage';
import { createTabs } from './tabs';
import { applyTheme } from './theme';

const state = createState(safeStore(), () => new Date(), newId);
applyTheme(state.data.settings.theme);

const tabs = createTabs([
  { id: 'pick', label: 'きめる', icon: ICONS.pick, view: createPlaceholder('きめる').el },
  { id: 'book', label: '献立帳', icon: ICONS.book, view: createPlaceholder('献立帳').el },
  { id: 'log', label: 'きろく', icon: ICONS.log, view: createPlaceholder('きろく').el },
  { id: 'settings', label: '設定', icon: ICONS.settings, view: createPlaceholder('設定').el },
]);

document.getElementById('app')!.append(tabs.el);

state.subscribe(() => applyTheme(state.data.settings.theme));
