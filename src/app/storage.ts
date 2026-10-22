// localStorage を安全に包む。プライベートモードなどで触れなくても、アプリが止まらないようにする。
import type { KeyValueStore } from '../core/store';

/** localStorage が使えればそれ、使えなければメモリの Map（アプリを閉じると消える） */
export function safeStore(): KeyValueStore {
  const mem = new Map<string, string>();
  let ls: Storage | null = null;
  try {
    ls = window.localStorage;
  } catch {
    ls = null; // 触るだけで例外になる環境
  }
  return {
    getItem(k) {
      if (ls) {
        try { return ls.getItem(k); } catch { /* メモリに切り替える */ }
      }
      return mem.get(k) ?? null;
    },
    setItem(k, v) {
      if (ls) {
        try { ls.setItem(k, v); return; } catch { /* 満杯など。メモリに残す */ }
      }
      mem.set(k, v);
    },
  };
}
