// マスコットのポン。丸いひよこにコック帽。表情・おなかは data 属性の切り替えだけ（見た目は pon.css）。
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

// ポンの絵。色と動きは pon.css が data-mood・data-belly を見て付ける
const ART = `<svg class="pon" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse class="shadow" cx="60" cy="110" rx="30" ry="4"/>
  <!-- 足 -->
  <ellipse class="foot line" cx="49" cy="105" rx="7" ry="3.5"/>
  <ellipse class="foot line" cx="71" cy="105" rx="7" ry="3.5"/>
  <!-- 羽 -->
  <path class="wing line" d="M30 70 C18 72 16 86 28 90 C32 84 32 76 30 70 Z"/>
  <path class="wing r line" d="M90 70 C102 72 104 86 92 90 C88 84 88 76 90 70 Z"/>
  <!-- 体 -->
  <circle class="body line" cx="60" cy="72" r="34"/>
  <!-- おなか -->
  <ellipse class="belly" cx="60" cy="84" rx="19" ry="14"/>
  <!-- ほっぺ -->
  <circle class="cheek" cx="40" cy="74" r="4.5"/>
  <circle class="cheek" cx="80" cy="74" r="4.5"/>
  <!-- 目 -->
  <g class="eyes">
    <g class="e-open">
      <circle class="eye-dot" cx="47" cy="64" r="4.2"/><circle class="eye-dot" cx="73" cy="64" r="4.2"/>
      <circle class="eye-hi" cx="48.6" cy="62.4" r="1.5"/><circle class="eye-hi" cx="74.6" cy="62.4" r="1.5"/>
    </g>
    <g class="e-spiral">
      <g><path class="thin" d="M47 64 m0 -4 a4 4 0 1 1 -4 4 a2.4 2.4 0 1 0 2.4 -2.4"/></g>
      <g><path class="thin" d="M73 64 m0 -4 a4 4 0 1 1 -4 4 a2.4 2.4 0 1 0 2.4 -2.4"/></g>
    </g>
    <g class="e-smile">
      <path class="thin" d="M42 65 q5 -6 10 0"/><path class="thin" d="M68 65 q5 -6 10 0"/>
    </g>
    <g class="e-sad">
      <circle class="eye-dot" cx="47" cy="65" r="3.6"/><circle class="eye-dot" cx="73" cy="65" r="3.6"/>
      <path class="thin" d="M41 61 l9 -3"/><path class="thin" d="M79 61 l-9 -3"/>
    </g>
    <g class="e-sleepy">
      <path class="thin" d="M42 64 q5 3 10 0"/><path class="thin" d="M68 64 q5 3 10 0"/>
    </g>
    <g class="e-star">
      <path class="eye-dot" d="M47 59 l1.6 3.4 3.6 .4 -2.7 2.5 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.5 3.6 -.4z"/>
      <path class="eye-dot" d="M73 59 l1.6 3.4 3.6 .4 -2.7 2.5 .8 3.6 -3.3 -1.9 -3.3 1.9 .8 -3.6 -2.7 -2.5 3.6 -.4z"/>
    </g>
  </g>
  <!-- くちばし -->
  <path class="beak line" d="M55 70 L65 70 L60 77 Z"/>
  <!-- 帽子 -->
  <path class="hat line" d="M44 42 C36 40 36 26 46 26 C46 16 60 14 62 24 C66 14 82 18 78 28 C86 28 86 42 76 42 Z"/>
  <rect class="hat line" x="42" y="40" width="36" height="8" rx="3"/>
  <!-- zzz（眠いとき） -->
  <path class="zzz" d="M90 42 h7 l-7 7 h7"/>
  <!-- 涙（しょんぼり） -->
  <path class="drop" d="M79 69 q3 5 0 7 q-3 -2 0 -7z"/>
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
