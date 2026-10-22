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
  it('Info.plist：表示名・縦向きだけ・暗号化なし', () => {
    const p = readFileSync('ios/App/App/Info.plist', 'utf8');
    expect(p).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>クックポップ<\/string>/);
    const o = p.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)![1];
    expect(o).toContain('Portrait');
    expect(o).not.toContain('Landscape');
    expect(p).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  });
  it('Xcode：版 0.1.0・ID・PrivacyInfo が Resources に入っている', () => {
    const x = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
    expect(x).toMatch(/MARKETING_VERSION = 0\.1\.0;/);
    expect(x).toMatch(/PRODUCT_BUNDLE_IDENTIFIER = com\.maosundev\.cookpop;/);
    expect((x.match(/PrivacyInfo\.xcprivacy/g) || []).length).toBeGreaterThanOrEqual(4);
    const pi = readFileSync('ios/App/App/PrivacyInfo.xcprivacy', 'utf8');
    expect(pi).toContain('NSPrivacyAccessedAPICategoryUserDefaults');
    expect(pi).toContain('CA92.1');
  });
  it('ワークフロー：手動だけ・pull_request_target なし・Secrets の名前', () => {
    const w = readFileSync('.github/workflows/ios-testflight.yml', 'utf8');
    expect(w).toContain('workflow_dispatch');
    expect(w).not.toContain('pull_request_target');
    for (const s of ['APPLE_TEAM_ID', 'APPSTORE_API_KEY_ID', 'APPSTORE_API_ISSUER_ID', 'APPSTORE_API_PRIVATE_KEY']) expect(w).toContain(s);
  });
  it('package.json：Capacitor の部品が固定の版で入っている', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies['@capacitor/core']).toBe('8.5.2');
    expect(pkg.dependencies['@capacitor/preferences']).toBe('8.0.1');
    expect(pkg.devDependencies['@capacitor/cli']).toBe('8.5.2');
  });
});
