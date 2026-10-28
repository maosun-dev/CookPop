# 共有の受け口（Share Extension）を Xcode のプロジェクトに足す台本。
# Mac が無いので、GitHub の Mac で組み立てる直前に毎回流す。
# すでに受け口があれば何もしない（2回流しても受け口が2つにならない）。
#
# 使い方: gem install xcodeproj --no-document && ruby tools/ios/add-share-extension.rb
require 'xcodeproj'

ROOT = File.expand_path('../..', __dir__)
PROJECT_PATH = File.join(ROOT, 'ios/App/App.xcodeproj')
EXT_NAME = 'ShareExtension'
EXT_BUNDLE_ID = 'com.maosundev.cookpop.share'

project = Xcodeproj::Project.open(PROJECT_PATH)

# すでにあれば抜ける
if project.targets.find { |t| t.name == EXT_NAME }
  puts "#{EXT_NAME} はすでにあります。何もしません。"
  exit 0
end

app = project.targets.find { |t| t.name == 'App' }
abort 'App のターゲットが見つかりません' unless app

# 受け口のターゲットを作る（iOS 15.0・Swift）
ext = project.new_target(:app_extension, EXT_NAME, :ios, '15.0', nil, :swift)

# ファイルのまとまり（ios/App/ShareExtension）
group = project.main_group.new_group(EXT_NAME, EXT_NAME)
swift_ref = group.new_reference('ShareViewController.swift')
group.new_reference('Info.plist')
group.new_reference('ShareExtension.entitlements')
ext.add_file_references([swift_ref])

# 受け口の設定（Debug・Release とも）
ext.build_configurations.each do |c|
  s = c.build_settings
  s['PRODUCT_BUNDLE_IDENTIFIER'] = EXT_BUNDLE_ID
  s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  s['INFOPLIST_FILE'] = 'ShareExtension/Info.plist'
  s['CODE_SIGN_ENTITLEMENTS'] = 'ShareExtension/ShareExtension.entitlements'
  s['MARKETING_VERSION'] = '1.0.0'
  s['CURRENT_PROJECT_VERSION'] = '1'
  s['SWIFT_VERSION'] = '5.0'
  s['TARGETED_DEVICE_FAMILY'] = '1'
  s['IPHONEOS_DEPLOYMENT_TARGET'] = '15.0'
  s['SKIP_INSTALL'] = 'YES'
  s['CODE_SIGN_STYLE'] = 'Automatic'
  s['GENERATE_INFOPLIST_FILE'] = 'NO'
  s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
end

# アプリにも App Group の権利を付ける
app.build_configurations.each do |c|
  c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements'
end
group_app = project.main_group.children.find { |g| g.respond_to?(:path) && g.path == 'App' && g.isa == 'PBXGroup' }
if group_app && !group_app.files.find { |f| f.path == 'App.entitlements' }
  group_app.new_reference('App.entitlements')
end

# アプリが受け口を先に組み立て、PlugIns に入れる
app.add_dependency(ext)
phase = app.new_copy_files_build_phase('Embed Foundation Extensions')
phase.dst_subfolder_spec = '13'
phase.dst_path = ''
build_file = phase.add_file_reference(ext.product_reference, true)
build_file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }

project.save
puts "#{EXT_NAME} を足しました。"
