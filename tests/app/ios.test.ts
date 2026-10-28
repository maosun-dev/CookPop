import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('iPhone の包み', () => {
  it('capacitor.config.json：ID・名前・置き場・server の項なし', () => {
    const c = JSON.parse(readFileSync('capacitor.config.json', 'utf8'));
    expect(c.appId).toBe('com.maosundev.cookpop');
    expect(c.appName).toBe('クックポップ');
    expect(c.webDir).toBe('dist');
    expect(c.server).toBeUndefined();
    expect(c.ios.contentInset).toBe('never');
    expect(c.ios.backgroundColor).toBe('#FFF6E5');
    expect(c.ios.scrollEnabled).toBe(false);
    expect(c.plugins.CapacitorShareTarget.appGroupId).toBe('group.com.maosundev.cookpop');
  });
  it('Info.plist：表示名・縦向きだけ・暗号化なし', () => {
    const p = readFileSync('ios/App/App/Info.plist', 'utf8');
    expect(p).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>クックポップ<\/string>/);
    const o = p.match(/<key>UISupportedInterfaceOrientations<\/key>\s*<array>([\s\S]*?)<\/array>/)![1];
    expect(o).toContain('Portrait');
    expect(o).not.toContain('Landscape');
    expect(p).toMatch(/<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\/>/);
  });
  it('Info.plist：AdMob の番号・追跡の説明・広告ネットワーク', () => {
    const p = readFileSync('ios/App/App/Info.plist', 'utf8');
    expect(p).toMatch(/<key>GADApplicationIdentifier<\/key>\s*<string>ca-app-pub-7017663942238206~7979412343<\/string>/);
    expect(p).toMatch(/<key>NSUserTrackingUsageDescription<\/key>\s*<string>許可すると、あなたの興味に合った広告が表示されやすくなります。許可しなくても、アプリはすべて使えます。<\/string>/);
    expect(p).toContain('<key>SKAdNetworkItems</key>');
    expect(p).toContain('cstr6suwn9.skadnetwork');
  });
  it('Xcode：版 1.0.0・ID・PrivacyInfo が Resources に入っている', () => {
    const x = readFileSync('ios/App/App.xcodeproj/project.pbxproj', 'utf8');
    expect(x).toMatch(/MARKETING_VERSION = 1\.0\.0;/);
    expect(readFileSync('tools/ios/add-share-extension.rb', 'utf8')).toContain("'1.0.0'");
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
  it('共有の受け口：Info.plist の NSExtension', () => {
    const p = readFileSync('ios/App/ShareExtension/Info.plist', 'utf8');
    expect(p).toMatch(/<key>NSExtensionPointIdentifier<\/key>\s*<string>com\.apple\.share-services<\/string>/);
    expect(p).toMatch(/<key>NSExtensionPrincipalClass<\/key>\s*<string>\$\(PRODUCT_MODULE_NAME\)\.ShareViewController<\/string>/);
    expect(p).toMatch(/<key>NSExtensionActivationSupportsWebURLWithMaxCount<\/key>\s*<integer>1<\/integer>/);
    expect(p).toMatch(/<key>NSExtensionActivationSupportsText<\/key>\s*<true\/>/);
    expect(p).toMatch(/<key>CFBundleDisplayName<\/key>\s*<string>クックポップ<\/string>/);
    expect(p).toMatch(/<key>CFBundlePackageType<\/key>\s*<string>XPC!<\/string>/);
  });
  it('共有の受け口：権利（entitlements）2つに App Group', () => {
    for (const f of ['ios/App/App/App.entitlements', 'ios/App/ShareExtension/ShareExtension.entitlements']) {
      const e = readFileSync(f, 'utf8');
      expect(e).toMatch(/<key>com\.apple\.security\.application-groups<\/key>\s*<array>\s*<string>group\.com\.maosundev\.cookpop<\/string>\s*<\/array>/);
    }
  });
  it('共有の受け口：Swift が App Group の share-target-data に書く', () => {
    const s = readFileSync('ios/App/ShareExtension/ShareViewController.swift', 'utf8');
    expect(s).toContain('"group.com.maosundev.cookpop"');
    expect(s).toContain('"share-target-data"');
    expect(s).toContain('completeRequest');
  });
  it('Info.plist：URL の呼び名 cookpop を登録している', () => {
    const p = readFileSync('ios/App/App/Info.plist', 'utf8');
    const t = p.match(/<key>CFBundleURLTypes<\/key>\s*<array>([\s\S]*?)<\/array>\s*(?=<key>)/)![1];
    expect(t).toMatch(/<key>CFBundleURLName<\/key>\s*<string>com\.maosundev\.cookpop<\/string>/);
    expect(t).toMatch(/<key>CFBundleURLSchemes<\/key>\s*<array>\s*<string>cookpop<\/string>\s*<\/array>/);
  });
  it('共有の受け口：「クックポップで開く」で cookpop://share を開く（書き込みのあと）', () => {
    const s = readFileSync('ios/App/ShareExtension/ShareViewController.swift', 'utf8');
    expect(s).toContain('クックポップで開く');
    expect(s).toContain('"cookpop://share"');
    // open(_:options:completionHandler:) を Objective-C の名前で呼ぶ
    expect(s).toContain('"openURL:options:completionHandler:"');
    expect(s).toMatch(/as\? UIApplication/);
    expect(s).not.toContain('UIApplication.shared');
    // 置き場への書き込みが、開く処理より前にある
    const write = s.indexOf('.set(payload, forKey: storeKey)');
    expect(write).toBeGreaterThan(-1);
    expect(write).toBeLessThan(s.indexOf('"cookpop://share"'));
    expect(write).toBeLessThan(s.indexOf('"openURL:options:completionHandler:"'));
  });
  it('台本：背番号・ShareExtension・すでにあれば抜ける・埋め込み', () => {
    const r = readFileSync('tools/ios/add-share-extension.rb', 'utf8');
    expect(r).toContain('com.maosundev.cookpop.share');
    expect(r).toContain("'ShareExtension'");
    expect(r).toMatch(/targets\.find/);
    expect(r).toMatch(/exit/);
    expect(r).toMatch(/dst_subfolder_spec\s*=\s*'13'/);
    expect(r).toContain('App/App.entitlements');
    expect(r).toContain('project.save');
  });
  it('ワークフロー：台本を流し、権利付きで仮の署名を2回する', () => {
    const w = readFileSync('.github/workflows/ios-testflight.yml', 'utf8');
    expect(w).toContain('ruby tools/ios/add-share-extension.rb');
    expect((w.match(/--entitlements/g) || []).length).toBe(2);
    expect(w).toContain('PlugIns/ShareExtension.appex');
    expect(w.indexOf('add-share-extension.rb')).toBeLessThan(w.indexOf('xcodebuild archive'));
    expect(w).not.toContain('pull_request_target');
  });
  it('package.json：Capacitor の部品が固定の版で入っている', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(pkg.dependencies['@capacitor/core']).toBe('8.5.2');
    expect(pkg.dependencies['@capacitor/preferences']).toBe('8.0.1');
    expect(pkg.dependencies['@capgo/capacitor-share-target']).toBe('8.0.63');
    expect(pkg.devDependencies['@capacitor/cli']).toBe('8.5.2');
  });
});
