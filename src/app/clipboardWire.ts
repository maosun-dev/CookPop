// クリップボードの提案を受けたときの動き。main.ts から切り出して、テストできるようにしてある。
import type { Mascot } from './mascot/pon';
import type { TabId } from './tabs';

export interface SuggestDeps {
  mascot: Pick<Mascot, 'say' | 'hush'>;
  tabs: { current(): TabId; select(id: TabId): void };
  book: { openForm(prefillUrl?: string): void };
  toast: (msg: string) => void;
}

/** watchClipboard の onSuggest に渡す。ポンの吹き出しで聞き、「きめる」以外のタブにいるときはトーストでも知らせる */
export function suggestHandler(deps: SuggestDeps): (videoId: string, url: string) => void {
  const { mascot, tabs, book, toast } = deps;
  return (_videoId, url) => {
    mascot.say('クリップボードに動画のリンクがあるよ。登録する？', {
      label: '登録する',
      onClick: () => {
        tabs.select('book');
        book.openForm(url);
        mascot.hush();
      },
    });
    // ポンの吹き出しは「きめる」にしか見えないので、ほかのタブではトーストで気づいてもらう
    if (tabs.current() !== 'pick') toast('クリップボードに動画のリンクがあるよ。「きめる」でポンに聞いてね');
  };
}
