# Readable Explainer Chrome Extension

テキスト選択箇所をGemini 2.5 Flashで解説するChrome拡張機能です。

## 機能

- Webページ上のテキストを選択すると「💡 解説」ボタンが表示
- ボタンクリックまたは右クリックメニューからテキストの解説を取得
- Gemini 2.5 Flash APIを使用した日本語での解説
- モーダルウィンドウで解説結果を表示

## インストール方法

1. Chrome拡張機能の開発者モードを有効にする
2. 「パッケージ化されていない拡張機能を読み込む」でこのフォルダを選択
3. 拡張機能のポップアップからGemini API キーを設定

## API キーの取得

1. [Google AI Studio](https://makersuite.google.com/app/apikey)にアクセス
2. 新しいAPI キーを作成
3. 拡張機能のポップアップで設定

## 使い方

1. Webページでテキストを選択
2. 表示される「💡 解説」ボタンをクリック
3. または選択テキストを右クリックして「Readable Explainerで解説」を選択
4. モーダルウィンドウで解説を確認

## ファイル構成

```
chrome-extension/
├── manifest.json          # 拡張機能の設定
├── popup.html             # ポップアップUI
├── README.md              # このファイル
├── js/
│   ├── background.js      # バックグラウンドスクリプト
│   ├── content.js         # コンテンツスクリプト
│   └── popup.js           # ポップアップのJavaScript
├── css/
│   └── content.css        # コンテンツのスタイル
└── icons/                 # アイコンファイル（別途用意が必要）
```

## 注意事項

- Gemini API キーが必要です
- API使用量に応じて料金が発生する場合があります
- インターネット接続が必要です