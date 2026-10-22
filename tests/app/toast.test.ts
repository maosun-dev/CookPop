// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { toast } from '../../src/app/toast';

describe('お知らせ', () => {
  it('出て、1.8秒で消える。連続なら最後の文言', () => {
    vi.useFakeTimers();
    toast('ひとつ'); toast('ふたつ');
    const t = document.querySelector('.toast')!;
    expect(t.textContent).toBe('ふたつ');
    expect(t.getAttribute('data-show')).toBe('true');
    vi.advanceTimersByTime(1800);
    expect(t.getAttribute('data-show')).toBe('false');
    vi.useRealTimers();
  });
});
