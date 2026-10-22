// 画面の下に短く出るお知らせ。
let node: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** 1.8秒だけ出す。続けて呼ばれたら最後の文言だけ残る */
export function toast(msg: string): void {
  if (!node) {
    node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    node.setAttribute('data-show', 'false');
    document.body.append(node);
  }
  node.textContent = msg;
  node.setAttribute('data-show', 'true');
  if (timer !== null) clearTimeout(timer);
  const shown = node;
  timer = setTimeout(() => {
    shown.setAttribute('data-show', 'false');
    timer = null;
  }, 1800);
}
