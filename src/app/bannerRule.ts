// バナー広告を今出してよいかを、画面（DOM）の様子だけから決める。
// 隠すのは3つ：シートを開いている間（sheet.ts が body に sheet-open を付ける）、
// 今のタブで動画の枠が生きている間（YouTube の決まりで、埋め込み動画と広告を並べない）、
// 文字を入力している間（キーボードとバナーがぶつかる）。

// キーボードが出ない input の種類
const NO_KEYBOARD = new Set(['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'color', 'file', 'image', 'hidden']);

function typing(doc: Document): boolean {
  const a = doc.activeElement;
  if (!a) return false;
  if (a.tagName === 'TEXTAREA') return true;
  if (a.tagName !== 'INPUT') return false;
  return !NO_KEYBOARD.has((a as HTMLInputElement).type);
}

/** 今バナーを出してよいか */
export function bannerWanted(doc: Document): boolean {
  if (doc.body.classList.contains('sheet-open')) return false;
  // 再生できず「YouTube で開く」に替わった枠には iframe が無いので数えない
  if (doc.querySelector('[data-active="true"] .player iframe')) return false;
  return !typing(doc);
}

/** 画面の変化と入力欄の出入りを見張り、出してよいかが変わったときだけ set を呼ぶ。最初に1回は必ず呼ぶ。戻り値で見張りをやめる */
export function watchBanner(doc: Document, set: (on: boolean) => void): () => void {
  let last = bannerWanted(doc);
  let stopped = false;
  let queued = false;
  set(last);

  // focusout の直後は activeElement がまだ決まっていないことがあるので、1拍あとにまとめて判定する
  const check = (): void => {
    if (queued || stopped) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (stopped) return;
      const now = bannerWanted(doc);
      if (now === last) return;
      last = now;
      set(now);
    });
  };

  const mo = new MutationObserver(check);
  mo.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-active'] });
  doc.addEventListener('focusin', check);
  doc.addEventListener('focusout', check);

  return () => {
    stopped = true;
    mo.disconnect();
    doc.removeEventListener('focusin', check);
    doc.removeEventListener('focusout', check);
  };
}
