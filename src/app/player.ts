// 動画プレーヤー：YouTube 公式の埋め込みプレーヤーを使う。
// 埋め込みが禁止されている動画や、ネットにつながらないときは「YouTube で開く」に切り替える。
import { el, clear } from './ui';
import { watchUrl } from '../core/recipe';

/** 使う分だけ書いた YouTube IFrame API の型 */
export interface YTLike {
  Player: new (
    host: HTMLElement,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: { onReady?: () => void; onError?: (e: { data: number }) => void };
    },
  ) => { destroy(): void };
}

interface YTWindow {
  YT?: Partial<YTLike>;
  onYouTubeIframeAPIReady?: () => void;
}

const API_URL = 'https://www.youtube.com/iframe_api';

// 読み込み中・読み込み済みの Promise を1つだけ持つ（失敗したら捨てて、次にやり直せるようにする）
let apiPromise: Promise<YTLike> | null = null;

/** YouTube の API を読み込む。script は1回だけ足し、2回目以降は同じ Promise を返す */
export function loadYouTubeApi(doc: Document = document, timeoutMs = 8000): Promise<YTLike> {
  try {
    const win = window as unknown as YTWindow;
    if (win.YT && typeof win.YT.Player === 'function') return Promise.resolve(win.YT as YTLike);
    if (apiPromise) return apiPromise;

    const p = new Promise<YTLike>((resolve, reject) => {
      const script = doc.createElement('script');
      const previous = win.onYouTubeIframeAPIReady;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const fail = (message: string): void => {
        clearTimeout(timer);
        script.remove();
        win.onYouTubeIframeAPIReady = previous;
        reject(new Error(message));
      };
      win.onYouTubeIframeAPIReady = () => {
        previous?.();
        clearTimeout(timer);
        if (win.YT && typeof win.YT.Player === 'function') resolve(win.YT as YTLike);
        else fail('YouTube の API が使えません');
      };
      timer = setTimeout(() => fail('YouTube の API の読み込みが時間切れです'), timeoutMs);
      script.src = API_URL;
      script.async = true;
      script.onerror = () => fail('YouTube の API を読み込めませんでした');
      (doc.head ?? doc.documentElement).append(script);
    });
    apiPromise = p;
    // 失敗したら次の呼び出しでやり直せるように捨てる
    p.catch(() => { if (apiPromise === p) apiPromise = null; });
    return p;
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
}

export interface PlayerDeps {
  loadApi?: () => Promise<YTLike>;
  /** 外のブラウザで開く（iPhone では差し替える）。無ければふつうのリンクとして開く */
  openExternal?: (url: string) => void;
}

interface HostState {
  token: number;
  player: { destroy(): void } | null;
}
// host ごとに、今のプレーヤーと「何回目の呼び出しか」を覚えておく
const hostStates = new WeakMap<HTMLElement, HostState>();

function destroyQuietly(player: { destroy(): void } | null): void {
  try {
    player?.destroy();
  } catch {
    // すでに消えているなら何もしない
  }
}

/** host の中に動画の枠を作って再生する。再生できなければ YouTube で開くリンクに切り替える */
export function openPlayer(host: HTMLElement, videoId: string, deps: PlayerDeps = {}): void {
  const loadApi = deps.loadApi ?? (() => loadYouTubeApi());
  const url = watchUrl(videoId);

  const prev = hostStates.get(host);
  destroyQuietly(prev?.player ?? null);
  const state: HostState = { token: (prev?.token ?? 0) + 1, player: null };
  hostStates.set(host, state);
  const mine = state.token;
  const isCurrent = (): boolean => hostStates.get(host) === state && state.token === mine;

  /** リンクを押したとき。外で開く関数があればそちらに任せる */
  const onOpen = (e: Event): void => {
    if (!deps.openExternal) return;
    e.preventDefault();
    deps.openExternal(url);
  };

  const loading = el('p', { class: 'player-loading muted' }, '読み込み中…');
  const mount = el('div', { class: 'player-mount' }); // YouTube がこの要素を iframe に置き換える
  const frame = el('div', { class: 'player pop' }, loading, mount);
  const smallLink = el(
    'a',
    { class: 'muted player-open', href: url, target: '_blank', rel: 'noopener', onclick: onOpen },
    'YouTube で開く',
  );
  clear(host);
  host.append(frame, smallLink);

  /** 枠の中身を「再生できません」と大きなボタンに置き換える */
  const showFallback = (): void => {
    if (!isCurrent()) return;
    destroyQuietly(state.player);
    state.player = null;
    clear(frame);
    frame.classList.add('player-fail');
    frame.append(
      el('p', { class: 'player-msg' }, 'この動画はアプリの中では再生できません'),
      el('a', { class: 'btn pop pop-press', href: url, target: '_blank', rel: 'noopener', onclick: onOpen }, 'YouTube で開く'),
    );
  };

  let api: Promise<YTLike>;
  try {
    api = loadApi();
  } catch {
    showFallback();
    return;
  }
  api.then(
    yt => {
      if (!isCurrent()) return;
      try {
        state.player = new yt.Player(mount, {
          videoId,
          host: 'https://www.youtube-nocookie.com',
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => { if (isCurrent()) loading.remove(); },
            onError: () => showFallback(),
          },
        });
        if (frame.classList.contains('player-fail')) { destroyQuietly(state.player); state.player = null; }
      } catch {
        showFallback();
      }
    },
    () => showFallback(),
  );
}
