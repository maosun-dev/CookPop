import UIKit
import UniformTypeIdentifiers

// 共有の受け口（Share Extension）。
// YouTube などの「共有」→「クックポップ」で呼ばれ、受け取ったリンクと文字を
// アプリと共有の置き場（App Group）の UserDefaults に書いて、小さなカードを出す。
// カードの「クックポップで開く」で cookpop://share を開くと、アプリがすぐ登録画面を開く。
// アプリ側は @capgo/capacitor-share-target が、cookpop://share で開かれたときと
// アプリが前に出たときにここを読む。
class ShareViewController: UIViewController {
    // アプリと受け口で同じ名前にする（変えるとアプリが読めなくなる）
    private let appGroupId = "group.com.maosundev.cookpop"
    private let storeKey = "share-target-data"

    // 色は固定（暗い画面設定でも同じ見た目）
    private let textColor = UIColor(red: 0x4A / 255.0, green: 0x2E / 255.0, blue: 0x1C / 255.0, alpha: 1)
    private let cardColor = UIColor(red: 0xFF / 255.0, green: 0xFD / 255.0, blue: 0xF8 / 255.0, alpha: 1)

    // 閉じるのは一度だけ
    private var finished = false
    // 置き場に書き込めたか（「クックポップで開く」はこれが済んでから）
    private var saved = false

    override init(nibName nibNameOrNil: String?, bundle nibBundleOrNil: Bundle?) {
        super.init(nibName: nibNameOrNil, bundle: nibBundleOrNil)
        modalPresentationStyle = .overFullScreen
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        modalPresentationStyle = .overFullScreen
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.black.withAlphaComponent(0.35)
        collectShared { [weak self] title, texts in
            self?.handle(title: title, texts: texts)
        }
    }

    // 共有されたものから、題と文字（リンクを含む）を集める
    private func collectShared(_ done: @escaping (String, [String]) -> Void) {
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let group = DispatchGroup()
        let lock = NSLock()
        var title = ""
        var texts: [String] = []

        func add(_ s: String?) {
            guard let s = s?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return }
            lock.lock()
            if !texts.contains(s) { texts.append(s) }
            lock.unlock()
        }

        for item in items {
            if title.isEmpty, let t = item.attributedTitle?.string {
                title = t.trimmingCharacters(in: .whitespacesAndNewlines)
            }
            // 添えられた文章も文字として足す
            add(item.attributedContentText?.string)

            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    // リンク：URL として受け取り、文字に直す
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { data, _ in
                        if let url = data as? URL {
                            add(url.absoluteString)
                        } else if let s = data as? String {
                            add(s)
                        } else if let d = data as? Data, let url = URL(dataRepresentation: d, relativeTo: nil) {
                            add(url.absoluteString)
                        }
                        group.leave()
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    // 文字：そのまま受け取る
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { data, _ in
                        if let s = data as? String {
                            add(s)
                        } else if let d = data as? Data {
                            add(String(data: d, encoding: .utf8))
                        } else if let url = data as? URL {
                            add(url.absoluteString)
                        }
                        group.leave()
                    }
                }
            }
        }

        // 全部そろったら画面の処理へ（画面はメインの流れで触る）
        group.notify(queue: .main) {
            lock.lock()
            let result = texts
            lock.unlock()
            done(title, result)
        }
    }

    // リンクがあれば置き場に書いて「送りました」、無ければ書かずに知らせる
    private func handle(title: String, texts: [String]) {
        let hasLink = texts.contains { $0.range(of: "https?://", options: [.regularExpression, .caseInsensitive]) != nil }
        if hasLink {
            // 置き場への書き込みは、ボタンを出す前に済ませる（開いたアプリがすぐ読めるように）
            let payload: [String: Any] = ["title": title, "texts": texts, "files": [] as [Any]]
            if let store = UserDefaults(suiteName: appGroupId) {
                store.set(payload, forKey: storeKey)
                saved = true
            }
            // 「クックポップで開く」を押すまで待つ（自動では閉じない）
            showCard(heading: "クックポップに送りました", message: "このまま開いて登録できます", showOpen: saved)
            if saved { return }
        } else {
            showCard(heading: "YouTube のリンクが見つかりませんでした", message: "動画の「共有」から送ってください", showOpen: false)
        }
        // 2.5 秒で自動で閉じる
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) { [weak self] in
            self?.finish()
        }
    }

    // 中央の小さなカード（見出し・説明・「クックポップで開く」・OK）
    private func showCard(heading: String, message: String, showOpen: Bool) {
        let card = UIView()
        card.backgroundColor = cardColor
        card.layer.cornerRadius = 22
        card.layer.shadowColor = UIColor.black.cgColor
        card.layer.shadowOpacity = 0.18
        card.layer.shadowRadius = 16
        card.layer.shadowOffset = CGSize(width: 0, height: 6)
        card.translatesAutoresizingMaskIntoConstraints = false

        let headingLabel = UILabel()
        headingLabel.text = heading
        headingLabel.textColor = textColor
        headingLabel.font = UIFont.systemFont(ofSize: 19, weight: .bold)
        headingLabel.textAlignment = .center
        headingLabel.numberOfLines = 0

        let messageLabel = UILabel()
        messageLabel.text = message
        messageLabel.textColor = textColor.withAlphaComponent(0.8)
        messageLabel.font = UIFont.systemFont(ofSize: 15, weight: .regular)
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0

        let ok = UIButton(type: .system)
        ok.setTitle("OK", for: .normal)
        ok.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .bold)
        ok.layer.cornerRadius = 14
        ok.addTarget(self, action: #selector(okTapped), for: .touchUpInside)
        ok.heightAnchor.constraint(equalToConstant: 46).isActive = true

        var rows: [UIView] = [headingLabel, messageLabel]
        if showOpen {
            // 主なボタン：塗りつぶし。OK は枠だけの控えめなボタンにする
            let openButton = UIButton(type: .system)
            openButton.setTitle("クックポップで開く", for: .normal)
            openButton.setTitleColor(cardColor, for: .normal)
            openButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .bold)
            openButton.backgroundColor = textColor
            openButton.layer.cornerRadius = 14
            openButton.addTarget(self, action: #selector(openTapped), for: .touchUpInside)
            openButton.heightAnchor.constraint(equalToConstant: 46).isActive = true
            rows.append(openButton)

            ok.setTitleColor(textColor, for: .normal)
            ok.backgroundColor = .clear
            ok.layer.borderWidth = 1.5
            ok.layer.borderColor = textColor.withAlphaComponent(0.35).cgColor
        } else {
            ok.setTitleColor(cardColor, for: .normal)
            ok.backgroundColor = textColor
        }
        rows.append(ok)

        let stack = UIStackView(arrangedSubviews: rows)
        stack.axis = .vertical
        stack.spacing = 12
        stack.setCustomSpacing(20, after: messageLabel)
        stack.translatesAutoresizingMaskIntoConstraints = false

        card.addSubview(stack)
        view.addSubview(card)
        NSLayoutConstraint.activate([
            card.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            card.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            card.widthAnchor.constraint(equalToConstant: 290),
            stack.topAnchor.constraint(equalTo: card.topAnchor, constant: 24),
            stack.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -20),
            stack.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
            stack.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
        ])

        // ふわっと出す
        card.alpha = 0
        card.transform = CGAffineTransform(scaleX: 0.92, y: 0.92)
        UIView.animate(withDuration: 0.22) {
            card.alpha = 1
            card.transform = .identity
        }
    }

    @objc private func okTapped() {
        finish()
    }

    // 「クックポップで開く」：書き込み済みを確かめてから cookpop://share を開き、受け口を閉じる。
    // 開けなかったときも書き込みは残るので、次にアプリを開けば登録画面が出る。
    @objc private func openTapped() {
        guard !finished else { return }
        if saved, let url = URL(string: "cookpop://share") {
            _ = openHostApp(url)
        }
        finish()
    }

    // 受け口には正式な「アプリを開く」が無いので、画面部品の next をたどって UIApplication を探し、
    // open(_:options:completionHandler:) を Objective-C の名前で呼ぶ
    // （受け口ではアプリ本体の shared を使えず、open も直接は呼べないため）
    private func openHostApp(_ url: URL) -> Bool {
        let selector = NSSelectorFromString("openURL:options:completionHandler:")
        var responder: UIResponder? = self
        while let current = responder {
            if let app = current as? UIApplication, app.responds(to: selector),
               let imp = app.method(for: selector) {
                typealias OpenFunc = @convention(c) (AnyObject, Selector, NSURL, NSDictionary, AnyObject?) -> Void
                let callOpen = unsafeBitCast(imp, to: OpenFunc.self)
                callOpen(app, selector, url as NSURL, NSDictionary(), nil)
                return true
            }
            responder = current.next
        }
        return false
    }

    // 共有の画面を閉じる（一度だけ）
    private func finish() {
        guard !finished else { return }
        finished = true
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
