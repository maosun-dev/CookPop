// ファイルの書き出しと読み込み。画面からは FileDeps だけを見る（テストでは差し替える）。

/**
 * 決まり：キャンセルは pickText が null を返す。失敗（例外）は投げてよい（画面が拾って知らせる）。
 */
export interface FileDeps {
  /** テキストをファイルとして保存する */
  saveText(name: string, text: string): Promise<void>;
  /** ファイルを選んでもらい、中身を返す。やめたら null */
  pickText(): Promise<string | null>;
}

/** ブラウザ用：保存は一時的なリンクのダウンロード、読み込みはファイル選択 */
export function webFiles(): FileDeps {
  return {
    async saveText(name, text) {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.append(a);
      a.click();
      a.remove();
      // すぐ解放すると Safari でダウンロードが始まる前に消えることがあるので、少し待つ
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    pickText() {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.addEventListener('change', () => {
          const file = input.files?.[0];
          if (!file) {
            resolve(null);
            return;
          }
          file.text().then(resolve, () => resolve(null));
        });
        // 選ばずに閉じたとき（対応している端末だけ）
        input.addEventListener('cancel', () => resolve(null));
        input.click();
      });
    },
  };
}
