// マスコットのポン。計画2では仮の絵（丸い体＋コック帽）。表情は data-mood の切り替えだけ。
import { el, svg, clear } from '../ui';

export type Mood = 'normal' | 'thinking' | 'decided' | 'happy' | 'full' | 'sad' | 'sleepy';

export interface Mascot {
  el: HTMLElement;
  setMood(m: Mood): void;
  setBelly(n: 0 | 1 | 2 | 3): void;
  /** 吹き出しに一言（とボタン）を出す */
  say(text: string, action?: { label: string; onClick: () => void }): void;
  /** 吹き出しを空にする */
  hush(): void;
}

// 色は style.css の変数（.m-* のクラス）で付ける
const ART = `<svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <ellipse class="m-shadow" cx="60" cy="112" rx="30" ry="4"/>
  <circle class="m-body" cx="60" cy="74" r="36"/>
  <ellipse class="m-belly" cx="60" cy="86" rx="19" ry="17"/>
  <circle class="m-eye" cx="47" cy="70" r="3.6"/>
  <circle class="m-eye" cx="73" cy="70" r="3.6"/>
  <path class="m-beak" d="M54 78 L66 78 L60 86 Z"/>
  <circle class="m-hat" cx="46" cy="28" r="9"/>
  <circle class="m-hat" cx="60" cy="22" r="11"/>
  <circle class="m-hat" cx="74" cy="28" r="9"/>
  <path class="m-hat" d="M40 46 L44 30 L76 30 L80 46 Z"/>
  <path class="m-hat-line" d="M42 40 L78 40"/>
</svg>`;

export function createMascot(): Mascot {
  const bubble = el('div', { class: 'bubble pop', role: 'status' });
  const root = el('div', { class: 'mascot', 'data-mood': 'normal', 'data-belly': '0' }, bubble, svg(ART));

  return {
    el: root,
    setMood(m) {
      root.dataset.mood = m;
    },
    setBelly(n) {
      root.dataset.belly = String(n);
    },
    say(text, action) {
      clear(bubble);
      bubble.append(el('span', {}, text));
      if (action) {
        bubble.append(el('button', { class: 'btn pop pop-press', type: 'button', onclick: action.onClick }, action.label));
      }
    },
    hush() {
      clear(bubble);
    },
  };
}
