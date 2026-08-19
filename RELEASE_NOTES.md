# VCreatorTools App 0.2.0-beta.2

Event Hubの運用調整と同梱ツール更新を含む利用者テスト用Beta版です。正式版ではなく、更新前のBackupと既知事項の確認を推奨します。

## 主な変更

- Server常駐のVCT Event Hubを`0.2.0-beta.2`へ更新
- Rule JSONのファイル／テキストImport・Export、dry-run、非永続診断を追加
- VCT SDK 2.0のNormalizedコメント構造へ対応
- Bridgeの送信形式とは独立したServerコメント処理モードを追加（Normalized既定／RAW調査用）
- TOC2を`2.1.0-beta.2`へ更新し、SDK 2.0のNormalized／RAW監視へ対応
- GP Multi Counter V2 `2.0.2`の設定UIを改善
- VCT Clock V2 `2.1.0-beta.2`へプリセット、任意ローカルフォント、画面内JSON入出力を追加
- Material Hub `1.1.0-beta.1`のEditor Serverモードと案内カタログ専用APIを収録
- 運用ログをローカル日時とUTCオフセット付き表記へ変更
- Electron管理画面へ内蔵Serverの再起動操作を追加
- 内蔵Serverを`1.1.0`へ更新

## 継続して含まれる機能

- Electron Appによる統合Serverの起動、停止、異常終了監視
- 公式ツール一覧とOBS向けURL生成
- Main Server、Remote UI、Pairing管理
- Counter／Screen EffectのServer連携
- `user_gadgets`／`user_assets`の利用者領域
- Local Automation APIとStream Deck Plugin
- Installer版とPortable版

## 任意追加コンポーネント

- `Ms.Bridge_V2.zip`: Event Hubへわんコメのcomment／metaを送信する場合に、わんコメのカスタムテンプレートとして導入します。VCreatorTools本体やわんコメ公式機能には含まれません。

## 既知事項

- Windows向け実行ファイルはコード署名されていません。SmartScreen等の警告が表示される場合があります。
- Remoteは信頼できる同一LAN内だけで利用し、ルーター等で外部へPort公開しないでください。
- Stream Deck PluginはAppとは別versionで管理し、このBetaにはPlugin `0.1.0.0`を添付します。
- Event Hubは1 Event／1 Condition／1 Actionです。複合条件、Action Chain、任意JavaScript、正規表現は未対応です。
- Event Hubの長時間稼働、大量コメント負荷、保存schema移行、Backup／復元はRC判定前の確認項目です。
- VCT Clock V2はOBS実機確認済みですが、追加改修の可能性があるためbeta扱いです。

## 更新と保存データ

Installerのアンインストール／再インストールでは、通常はElectronのuserDataにある設定、データ、ログ、ユーザー領域を保持します。削除や移行の前にはBackupしてください。Portable版は実行ファイルと同じ場所のruntime領域を使用します。

Event Hubは、わんコメから受信したコメント本文、投稿者情報、配信メタ情報を履歴として保存しません。受信データはルール判定と重複除外のため一時的に処理され、保存されるのは利用者が作成したRuleとVCreatorToolsの設定です。
