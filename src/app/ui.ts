// DOM を組み立てる小さな部品。innerHTML は使わない（文字列を勝手に HTML として読ませないため）。

export type Attrs = Record<string, string | number | boolean | EventListener>;
export type Child = Node | string | null | undefined | false;

/** 要素を作る。`on` で始まる鍵はイベント、true は属性あり、false は属性なし */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') {
      if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    } else if (value === true) {
      node.setAttribute(key, '');
    } else if (value !== false) {
      node.setAttribute(key, String(value));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** SVG の文字列を要素にする（DOMParser で読む）。xmlns が無ければ補う */
export function svg(markup: string): SVGElement {
  const src = markup.includes('xmlns=') ? markup : markup.replace('<svg', `<svg xmlns="${SVG_NS}"`);
  const doc = new DOMParser().parseFromString(src, 'image/svg+xml');
  return document.adoptNode(doc.documentElement) as unknown as SVGElement;
}

/** 子をすべて消す */
export function clear(node: Element): void {
  while (node.firstChild) node.removeChild(node.firstChild);
}
