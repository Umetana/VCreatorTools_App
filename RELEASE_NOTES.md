# VCreatorTools App 0.1.0-beta.2

利用者テスト用の最初のBeta版です。正式版ではなく、更新前のBackupと既知事項の確認を推奨します。

## 含まれる機能

- Electron Appによる統合Serverの起動、停止、状態表示
- 公式ガジェット一覧とOBS向けURL生成
- Main Server、Remote UI、Pairing管理
- Counter／Screen EffectのServer連携
- `user_gadgets`／`user_assets`の利用者領域
- Local Automation APIとStream Deck Plugin
- Installer版とPortable版
- TOC2の視聴者コメントHTML処理に対するSecurity修正
- 内蔵Server `1.0.1`のBridgeトークン定数時間比較

## 既知事項

- Windows向け実行ファイルはコード署名されていません。SmartScreen等の警告が表示される場合があります。
- Remoteは信頼できる同一LAN内だけで利用し、ルーター等で外部へポート公開しないでください。
- Stream Deck PluginはAppとは別versionで管理し、このBetaにはPlugin `0.1.0.0`を添付します。
- VCT Event Hubは次のBeta系列で導入予定です。`0.1.0-beta.2`には含まれません。

## 更新と保存データ

Installerのアンインストール／再インストールでは、通常はElectronのuserDataにある設定、データ、ログ、ユーザー領域を保持します。削除や移行の前にはBackupしてください。Portable版は実行ファイルと同じ場所のruntime領域を使用します。
