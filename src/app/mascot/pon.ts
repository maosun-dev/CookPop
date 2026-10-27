// マスコットのポン。線なしの丸いひよこに大きなふわふわのコック帽（案C）。表情・おなかは data 属性の切り替えだけ（見た目は pon.css）。
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
const ART = `<svg class="pon" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <ellipse class="shadow" cx="100" cy="186" rx="58" ry="7" fill="#000" opacity=".08"/>
  <g class="body-g">
    <ellipse class="foot" cx="74" cy="180" rx="12" ry="7" fill="#FF9A57"/>
    <ellipse class="foot" cx="126" cy="180" rx="12" ry="7" fill="#FF9A57"/>
    <path class="body" d="M100 74 C154 74 176 108 176 138 C176 170 148 184 100 184 C52 184 24 170 24 138 C24 108 46 74 100 74 Z" fill="#FFD95E"/>
    <path class="body-shade" d="M28 150 C40 172 66 180 100 180 C134 180 160 172 172 150 C168 170 144 184 100 184 C56 184 32 170 28 150 Z" fill="#F7C743"/>
    <ellipse class="belly" cx="100" cy="164" rx="34" ry="14" fill="#FFE89A"/>
    <g class="wing l"><ellipse cx="34" cy="138" rx="10" ry="16" transform="rotate(20 34 138)" fill="#F7C743"/></g>
    <g class="wing r"><ellipse cx="166" cy="138" rx="10" ry="16" transform="rotate(-20 166 138)" fill="#F7C743"/></g>
    <g class="hat">
      <path d="M40 80 C26 76 22 48 46 46 C46 22 78 14 90 32 C100 10 136 12 140 34 C162 28 178 54 160 80 Z" fill="#FFFFFF" stroke="#E2CFAF" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M50 74 C70 64 130 64 150 74 L160 80 L40 80 Z" fill="#EFE4D2"/>
      <rect x="40" y="76" width="120" height="16" rx="8" fill="#FFFFFF" stroke="#E2CFAF" stroke-width="2.5"/>
      <rect x="40" y="86" width="120" height="6" rx="3" fill="#EFE4D2"/>
    </g>
    <ellipse class="cheek" cx="58" cy="136" rx="12" ry="7" fill="#FF8C7A"/>
    <ellipse class="cheek" cx="142" cy="136" rx="12" ry="7" fill="#FF8C7A"/>
    <g class="eyes">
      <g class="e-open">
        <circle cx="72" cy="124" r="5.2" fill="#3B2614"/><circle cx="70.4" cy="122.2" r="1.7" fill="#fff"/>
        <circle cx="128" cy="124" r="5.2" fill="#3B2614"/><circle cx="126.4" cy="122.2" r="1.7" fill="#fff"/>
      </g>
      <g class="e-up">
        <circle cx="69.6" cy="121" r="4.6" fill="#3B2614"/><circle cx="68.4" cy="119.4" r="1.5" fill="#fff"/>
        <circle cx="125.6" cy="121" r="4.6" fill="#3B2614"/><circle cx="124.4" cy="119.4" r="1.5" fill="#fff"/>
      </g>
      <g class="e-smile" fill="none" stroke="#3B2614" stroke-width="3.6" stroke-linecap="round">
        <path d="M64 126 Q72 117 80 126"/><path d="M120 126 Q128 117 136 126"/>
      </g>
      <g class="e-sad">
        <circle cx="72" cy="126" r="4.6" fill="#3B2614"/><circle cx="70.8" cy="124.6" r="1.5" fill="#fff"/>
        <circle cx="128" cy="126" r="4.6" fill="#3B2614"/><circle cx="126.8" cy="124.6" r="1.5" fill="#fff"/>
        <path d="M63 119 L79 114" fill="none" stroke="#3B2614" stroke-width="2.6" stroke-linecap="round"/>
        <path d="M137 119 L121 114" fill="none" stroke="#3B2614" stroke-width="2.6" stroke-linecap="round"/>
      </g>
      <g class="e-sleepy" fill="none" stroke="#3B2614" stroke-width="3.4" stroke-linecap="round">
        <path d="M64 124 Q72 130 80 124"/><path d="M120 124 Q128 130 136 124"/>
      </g>
      <g class="e-star" fill="#3B2614">
        <path d="M72 115 l2.6 5.4 5.9 .7 -4.4 4 1.2 5.9 -5.3 -3 -5.3 3 1.2 -5.9 -4.4 -4 5.9 -.7z"/>
        <path d="M128 115 l2.6 5.4 5.9 .7 -4.4 4 1.2 5.9 -5.3 -3 -5.3 3 1.2 -5.9 -4.4 -4 5.9 -.7z"/>
      </g>
    </g>
    <path class="beak" d="M94 134 Q100 130 106 134 Q103 141 100 142 Q97 141 94 134 Z" fill="#FF9A57"/>
    <path class="chin" d="M118 140 c-10 -4 -18 4 -14 12 c4 6 14 6 18 -2 c2 -4 0 -8 -4 -10 z" fill="#F7C743"/>
    <path class="drop" d="M140 128 q5 8 0 11 q-5 -3 0 -11z" fill="#9FD4F0"/>
  </g>
  <g class="think">
    <circle cx="132" cy="48" r="3" fill="#FFFFFF" stroke="#D9C4A2" stroke-width="2"/>
    <circle cx="141" cy="38" r="5" fill="#FFFFFF" stroke="#D9C4A2" stroke-width="2"/>
    <path d="M142 20 c-2 -12 14 -18 20 -9 c5 -9 22 -6 21 6 c10 2 9 17 -2 18 c-3 9 -18 9 -21 2 c-10 4 -22 -6 -18 -17 z" fill="#FFFFFF" stroke="#D9C4A2" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M157 18 c0 -6 10 -6 10 0 c0 4 -5 4 -5 9" fill="none" stroke="#8A6A55" stroke-width="3" stroke-linecap="round"/>
    <circle cx="162" cy="33" r="2" fill="#8A6A55"/>
  </g>
  <g class="zzz" fill="none" stroke="#8A6A55" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M156 64 h10 l-10 10 h10"/>
    <path d="M170 48 h7 l-7 7 h7"/>
  </g>
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
