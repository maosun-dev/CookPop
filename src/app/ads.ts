// バナー広告（AdMob）の係。動くのはアプリ版だけで、Web 版では何もしない。
// 出すか隠すかは bannerRule.ts が画面の様子（動画・シート・入力中）から決め、setBannerWanted で届く。
// バナーは画面のいちばん上（時計やノッチを避けた安全域のすぐ下）に出す。タブやボタンから離して、押し間違いを防ぐ。
// 出したバナーの高さは CSS の --ad-h に入れ、画面をその高さぶん下から始める（中身がバナーの裏にもぐらない）。
// 起動の順番は Apple と Google の決まりに合わせる：追跡の確認 → 広告の同意 → 広告の仕組みを動かす。
// SuperShogi（src/app/ads.ts）と同じ流れ。開発中だけ ?adpreview で仮のバナー（高さ 50px）を出せる。
import { AdMob, BannerAdPluginEvents, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { isNativeApp } from './native';

// Google が公開しているテスト用のバナー。本物の番号（AdMob で作る）が空のあいだはこちらを使う
const TEST_BANNER_ID = 'ca-app-pub-3940256099942544/2435281174';
const REAL_BANNER_ID: string = 'ca-app-pub-7017663942238206/4663691703';
const testing = REAL_BANNER_ID === '';

/** バナーを上の安全域からどれだけ離すか（ぴったり付ける） */
export const BANNER_MARGIN = 0;

/** 使うものだけを並べたプラグインの形（テストでは偽物を渡す） */
export interface AdsPlugin {
  trackingAuthorizationStatus(): Promise<{ status: string }>;
  requestTrackingAuthorization(): Promise<void>;
  requestConsentInfo(): Promise<{ status: string; isConsentFormAvailable?: boolean }>;
  showConsentForm(): Promise<unknown>;
  initialize(o: { initializeForTesting: boolean }): Promise<void>;
  showBanner(o: { adId: string; adSize: 'ADAPTIVE_BANNER'; position: 'TOP_CENTER'; margin: number; isTesting: boolean }): Promise<void>;
  hideBanner(): Promise<void>;
  resumeBanner(): Promise<void>;
  addListener(ev: 'bannerAdSizeChanged', fn: (s: { width: number; height: number }) => void): unknown;
  /** 読み込みに失敗したとき（部品はバナーを外す） */
  onFailedToLoad(fn: () => void): unknown;
}

/** 読み込みに失敗したあと、作り直すまで待つ時間 */
const RETRY_MS = 60000;

export interface Ads {
  init(): Promise<void>;
  setWanted(on: boolean): void;
}

export function createAds(deps: {
  plugin: AdsPlugin;
  setHeight: (px: number) => void;
  ready: () => Promise<void>;   // 画面が前に出きるまで待つ
  wait: (ms: number) => Promise<void>;
}): Ads {
  const { plugin } = deps;
  let wanted = false;   // 出してほしいか（最後に頼まれた方）
  let shown = false;    // 今出しているか
  let created = false;  // 一度作ったら、あとは resume / hide で出し入れする
  let ready = false;    // 広告の仕組みが動き出したか
  let dead = false;     // 動かせなかった（以後は何もしない）
  let busy = false;
  let height = 0;
  const paint = (): void => deps.setHeight(shown ? height : 0);

  // 出す・隠すを1つずつ順に進め、最後に頼まれた状態にそろえる（途中で頼みが変わっても追いかける）
  async function settle(): Promise<void> {
    if (busy || !ready || dead) return;
    busy = true;
    try {
      while (wanted !== shown) {
        if (wanted) {
          if (created) {
            // 読み込みに失敗した部品はバナーを外してしまい、resume できない。そのときは作り直す
            try { await plugin.resumeBanner(); shown = true; } catch { created = false; continue; }
            paint();
            continue;
          }
          try {
            await plugin.showBanner({
              adId: testing ? TEST_BANNER_ID : REAL_BANNER_ID,
              adSize: 'ADAPTIVE_BANNER', position: 'TOP_CENTER', margin: BANNER_MARGIN, isTesting: testing,
            });
            created = true;
            shown = true;
          } catch { break; } // 出せなかった：高さ0のまま、次に頼まれたらまた試す
        } else {
          try { await plugin.hideBanner(); } catch { /* 隠せなくても隠したことにする */ }
          shown = false;
        }
        paint();
      }
    } finally {
      busy = false;
    }
  }

  // 追跡の確認。アプリが前に出きる前に頼むと iOS は黙って出さないので、待ってから頼み、決まるまで最大5回
  async function askTracking(): Promise<void> {
    try {
      for (let i = 0; i < 5; i++) {
        const s = await plugin.trackingAuthorizationStatus();
        if (s.status !== 'notDetermined') return;
        await deps.ready();
        await deps.wait(i === 0 ? 1000 : 2000);
        await plugin.requestTrackingAuthorization(); // 画面が出たときは、選ぶまで戻ってこない
      }
    } catch { /* 聞けなくても広告は動かす */ }
  }

  // 広告の同意（ヨーロッパなど）。必要なときだけ Google の同意の画面を出す
  async function askConsent(): Promise<void> {
    try {
      const info = await plugin.requestConsentInfo();
      if (info.status === 'REQUIRED' && info.isConsentFormAvailable) await plugin.showConsentForm();
    } catch { /* 同意の画面が出せなくても進む */ }
  }

  return {
    async init() {
      await askTracking();
      await askConsent();
      try {
        await plugin.initialize({ initializeForTesting: testing });
      } catch {
        dead = true;
        return;
      }
      plugin.addListener('bannerAdSizeChanged', (s) => {
        height = s.height || 0;
        // 部品は読み込みが終わると、隠す頼みのあとでもバナーを表に出す。隠したいときは隠し直す
        if (height > 0 && !wanted) void plugin.hideBanner().catch(() => { /* 隠せなくても続ける */ });
        paint();
      });
      plugin.onFailedToLoad(() => {
        // 部品はバナーを外してしまうので、しばらく待って作るところからやり直す
        created = false;
        shown = false;
        paint();
        void deps.wait(RETRY_MS).then(() => settle());
      });
      ready = true;
      void settle();
    },
    setWanted(on) {
      wanted = on;
      void settle();
    },
  };
}

// ---------- 本物（アプリ版）と仮（?adpreview） ----------

const setCssHeight = (px: number): void => {
  document.documentElement.style.setProperty('--ad-h', `${Math.round(px)}px`);
};

// 画面が読み込み終わり、前に出ているまで待つ
const pageShown = (): Promise<void> => new Promise((res) => {
  const ok = (): boolean => document.readyState === 'complete' && document.visibilityState === 'visible';
  if (ok()) { res(); return; }
  const check = (): void => {
    if (!ok()) return;
    window.removeEventListener('load', check);
    document.removeEventListener('visibilitychange', check);
    res();
  };
  window.addEventListener('load', check);
  document.addEventListener('visibilitychange', check);
});

// 本物のプラグインを AdsPlugin の形に包む（列挙の型の違いをここで吸収する）
function realPlugin(): AdsPlugin {
  return {
    trackingAuthorizationStatus: () => AdMob.trackingAuthorizationStatus(),
    requestTrackingAuthorization: () => AdMob.requestTrackingAuthorization(),
    requestConsentInfo: () => AdMob.requestConsentInfo(),
    showConsentForm: () => AdMob.showConsentForm(),
    initialize: (o) => AdMob.initialize(o),
    showBanner: (o) => AdMob.showBanner({
      adId: o.adId, adSize: BannerAdSize.ADAPTIVE_BANNER, position: BannerAdPosition.TOP_CENTER,
      margin: o.margin, isTesting: o.isTesting,
    }),
    hideBanner: () => AdMob.hideBanner(),
    resumeBanner: () => AdMob.resumeBanner(),
    addListener: (_ev, fn) => AdMob.addListener(BannerAdPluginEvents.SizeChanged, (s) => fn(s)),
    onFailedToLoad: (fn) => AdMob.addListener(BannerAdPluginEvents.FailedToLoad, () => fn()),
  };
}

// 開発中の仮のバナー：画面のいちばん上に高さ 50px の帯を出すだけ
function previewAds(): Ads {
  const bar = document.createElement('div');
  bar.textContent = '広告（仮）';
  bar.style.cssText = `position:fixed;left:0;right:0;top:calc(env(safe-area-inset-top) + ${BANNER_MARGIN}px);height:50px;z-index:60;display:none;`
    + 'align-items:center;justify-content:center;background:#ddd;color:#555;font:700 13px sans-serif;border-bottom:1px solid #aaa';
  document.body.append(bar);
  return {
    async init() { /* 準備はいらない */ },
    setWanted(on) {
      bar.style.display = on ? 'flex' : 'none';
      setCssHeight(on ? 50 : 0);
    },
  };
}

let ads: Ads | null = null;
let pending = false; // initAds より先に頼まれた分

/** 起動時に1回呼ぶ。アプリ版なら本物、開発中の ?adpreview なら仮のバナー。どちらでもなければ何もしない */
export function initAds(): void {
  if (isNativeApp()) {
    ads = createAds({ plugin: realPlugin(), setHeight: setCssHeight, ready: pageShown, wait: (ms) => new Promise((r) => setTimeout(r, ms)) });
  } else if (import.meta.env.DEV && /[?&]adpreview\b/.test(location.search)) {
    ads = previewAds();
  } else {
    return;
  }
  ads.setWanted(pending);
  void ads.init();
}

/** バナーを出す（true）／隠す（false） */
export function setBannerWanted(on: boolean): void {
  pending = on;
  ads?.setWanted(on);
}
