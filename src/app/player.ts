// 動画プレーヤー：アプリの中（capacitor://localhost）では YouTube が埋め込みを断るため、
// 自分のサイトの動画ページ（maosun-dev.com）を iframe で開き、その中で YouTube を流す。
// 再生できないときや時間切れのときは「YouTube で開く」に切り替える。
import { el, clear } from './ui';
import { watchUrl } from '../core/recipe';

const PLAYER_PAGE = 'https://maosun-dev.com/cookpop/player.html';
const PLAYER_ORIGIN = 'https://maosun-dev.com';

export interface PlayerDeps {
  /** 外のブラウザで開く（iPhone では差し替える）。無ければふつうのリンクとして開く */
  openExternal?: (url: string) => void;
  /** 動画ページから「準備できた」が来るまで待つ時間（ミリ秒）。既定 10000 */
  timeoutMs?: number;
}

interface HostState {
  /** 聞き耳とタイマーを外す */
  cleanup: () => void;
}
// host ごとに、今の状態を覚えておく
const hostStates = new WeakMap<HTMLElement, HostState>();

// 生きている iframe と、その置き場所。タブを移るときに全部止めるために持つ
const liveFrames = new Map<HTMLIFrameElement, HTMLElement>();

/** 鳴っている動画をすべて止める（タブの切り替えなどで使う）。止められないものは黙って飛ばす */
export function pauseAllPlayers(): void {
  for (const [frame, host] of [...liveFrames]) {
    try {
      frame.contentWindow?.postMessage({ source: 'cookpop-app', command: 'pause' }, PLAYER_ORIGIN);
    } catch {
      // すでに消えているなら何もしない
    }
    // 画面から外れた置き場所の iframe は、もう鳴らせないので一覧から外す
    if (!host.isConnected) liveFrames.delete(frame);
  }
}

/** host の中に動画の枠を作って再生する。再生できなければ YouTube で開くリンクに切り替える */
export function openPlayer(host: HTMLElement, videoId: string, deps: PlayerDeps = {}): void {
  const url = watchUrl(videoId);

  // 前の枠の聞き耳とタイマーを外す
  hostStates.get(host)?.cleanup();
  const state: HostState = { cleanup: () => {} };
  hostStates.set(host, state);
  const isCurrent = (): boolean => hostStates.get(host) === state;

  /** リンクを押したとき。外で開く関数があればそちらに任せる */
  const onOpen = (e: Event): void => {
    if (!deps.openExternal) return;
    e.preventDefault();
    deps.openExternal(url);
  };

  const loading = el('p', { class: 'player-loading muted' }, '読み込み中…');
  const iframe = document.createElement('iframe');
  iframe.src = `${PLAYER_PAGE}?v=${encodeURIComponent(videoId)}`;
  iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
  iframe.setAttribute('allowfullscreen', '');
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  iframe.title = '動画';
  const frame = el('div', { class: 'player pop' }, loading, iframe);
  const smallLink = el(
    'a',
    { class: 'muted player-open', href: url, target: '_blank', rel: 'noopener', onclick: onOpen },
    'YouTube で開く',
  );
  clear(host);
  host.append(frame, smallLink);
  liveFrames.set(iframe, host);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const onMessage = (e: MessageEvent): void => {
    if (!isCurrent()) return;
    if (e.origin !== PLAYER_ORIGIN || e.source !== iframe.contentWindow) return;
    const data = e.data as { source?: string; event?: string } | null;
    if (!data || data.source !== 'cookpop-player') return;
    if (data.event === 'ready') {
      clearTimeout(timer);
      loading.remove();
    } else if (data.event === 'error') {
      showFallback();
    }
  };
  state.cleanup = () => {
    clearTimeout(timer);
    window.removeEventListener('message', onMessage);
    liveFrames.delete(iframe);
  };
  window.addEventListener('message', onMessage);

  /** 枠の中身を「再生できません」と大きなボタンに置き換える */
  function showFallback(): void {
    if (!isCurrent()) return;
    state.cleanup();
    clear(frame);
    frame.classList.add('player-fail');
    frame.append(
      el('p', { class: 'player-msg' }, 'この動画はアプリの中では再生できません'),
      el('a', { class: 'btn pop pop-press', href: url, target: '_blank', rel: 'noopener', onclick: onOpen }, 'YouTube で開く'),
    );
  }

  timer = setTimeout(showFallback, deps.timeoutMs ?? 10000);
}
