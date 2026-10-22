import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('iPhone の包み', () => {
  it('capacitor.config.json：ID・名前・置き場・https', () => {
    const c = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
    expect(c.appId).toBe('com.maosundev.cookpop');
    expect(c.appName).toBe('クックポップ');
    expect(c.webDir).toBe('dist');
    expect(c.server.iosScheme).toBe('https');
    expect(c.ios.contentInset).toBe('never');
    expect(c.ios.backgroundColor).toBe('#FFF6E5');
  });
});
