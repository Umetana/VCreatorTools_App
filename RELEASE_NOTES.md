# VCreatorTools App 0.2.0-beta.1

Event Hubを導入する利用者テスト用Beta版です。正式版ではなく、更新前のBackupと既知事項の確認を推奨します。

## 含まれる機能

- Electron Appによる統合Serverの起動、停止、状態表示
- 公式ガジェット一覧とOBS向けURL生成
- Main Server、Remote UI、Pairing管理
- Counter／Screen EffectのServer連携
- `user_gadgets`／`user_assets`の利用者領域
- Local Automation APIとStream Deck Plugin
- Installer版とPortable版
- Server常駐のVCT Event Hub
- Comment／Meta条件からCounterまたは登録済みEffect Buttonを実行するRule
- revision付きRule保存、Comment重複防止、Metaエッジ発火
- `containsAny`による複数ワードのいずれか一致
- 独立Event Hub管理UIとTOC2の状態表示・管理UI導線
- Electron管理画面から設定を変更せずに内蔵Serverを再起動する操作
- GP Multi Counter V2 `2.0.2`の設定UI改善
- Total Operations Console V2 `2.1.0-beta.1`のEvent Hub状態表示と管理UI導線
- Material Hub `1.1.0-beta.1`のEditor Serverモードと案内カタログ専用API

## 既知事項

- Windows向け実行ファイルはコード署名されていません。SmartScreen等の警告が表示される場合があります。
- Remoteは信頼できる同一LAN内だけで利用し、ルーター等で外部へポート公開しないでください。
- Stream Deck PluginはAppとは別versionで管理し、このBetaにはPlugin `0.1.0.0`を添付します。
- Event HubのRuleは1 Event／1 Condition／1 Actionです。複合条件、Action Chain、任意JavaScript、正規表現は未対応です。
- Event HubのJSON Import／Exportと長時間負荷試験は次のBetaで対応予定です。

## 更新と保存データ

Installerのアンインストール／再インストールでは、通常はElectronのuserDataにある設定、データ、ログ、ユーザー領域を保持します。削除や移行の前にはBackupしてください。Portable版は実行ファイルと同じ場所のruntime領域を使用します。
