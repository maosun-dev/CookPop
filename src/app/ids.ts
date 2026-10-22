// 料理や記録につける、かぶらない目印。

/** crypto.randomUUID があればそれ、無ければ乱数と時刻から作る（16文字以上） */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const rand = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');
  return `${Date.now().toString(36)}${rand()}${rand()}`;
}
