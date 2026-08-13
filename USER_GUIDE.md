# VCreatorTools 利用ガイド

## 起動

VCreatorToolsを起動すると、ローカルServerと管理画面が開きます。通常はMain Portを変更せず、`127.0.0.1`で利用してください。

管理画面の公式ツール一覧からURLをコピーし、OBSのブラウザーソースまたは通常ブラウザーへ追加します。表示用ページはOBS、操作・設定用ページはChromeなどで開く運用を推奨します。

## 運用モード

- Standard: ガジェットをローカルファイルとして使用
- Sync: 同じorigin内でブラウザー間同期
- Server: Serverを設定と状態の正本として利用

統合版ではServerを基本にし、用途に応じてSyncを選択してください。

## Remote

スマートフォンから操作する場合だけ、管理画面でRemoteを有効にします。表示されたLAN内URLまたはQRコードを使い、管理画面で発行した一回限りのPairing codeを入力します。

Remote Portをインターネットへ公開しないでください。HTTPSではないLAN内接続では、ブラウザーに「安全ではありません」と表示される場合があります。

## ユーザー領域

- `user_gadgets`: 利用者が持ち込むガジェット
- `user_assets`: Screen Effectなどで利用する画像素材
- `data`: Serverが管理する設定・状態
- `logs`: 動作ログ

管理画面から対応フォルダーを開けます。公式ツールの`public`は直接編集せず、持ち込みファイルはユーザー領域へ置いてください。

## 終了

VCreatorToolsを完全終了すると内蔵Serverも停止します。終了後もPortが使用中になる場合は、別のVCreatorToolsや旧Serverが起動していないか確認してください。
