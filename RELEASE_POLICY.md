# VCreatorTools リリース方針

Status: 採用
確定日: 2026-08-11

## バージョンの単位

VCreatorTools App、内蔵Server、通信Protocolは別々にversionを管理する。

```text
VCreatorTools App: 0.x-dev -> 0.x-beta -> 1.0.0
Bundled Server:    独立version（現行1.0.0）
Protocol:          schema名／major versionごとに互換性管理
```

現行Serverの`1.0.0`は統合Server単体のversionであり、VCreatorTools製品全体の正式公開を意味しない。Electron Appは`0.1.0-dev`から開始する。

## Release Channel

- `dev`: 開発者向け。仕様、保存形式、Folder構造を変更する可能性がある
- `beta`: 必須機能が揃った利用者テスト版。移行、互換性、配布手順を検証する
- `stable`: 公開条件を満たした正式版。互換性と更新経路を維持する

dev／betaでは、実運用前のBackupと既知事項の確認を利用者へ案内する。

## App 1.0.0の公開条件

- ElectronによるServerの起動、停止、異常終了監視
- Main／Remoteの状態表示と設定管理
- 公式ガジェットの一覧、URL生成、OBSへの登録導線
- Config、Data、LogをuserDataへ分離し、Backup／復元手順を提供
- `user_gadgets`の静的配信、一覧統合、更新後の保持
- 公式、改造版、ユーザー追加ガジェットのUI上の区別
- ユーザーガジェット向け共有APIの公開範囲を確定
- 管理API、Remote、Pairing、認証、File操作とのアクセス境界を検証
- Local Automation APIと専用Token
- Counter／Effectを対象とするStream Deck Plugin
- Bridgeのcomment／metaを既存Actionへ接続するVCT Event Hub
- Windows配布Build、Installer、更新・移行方針
- Chrome、OBS、スマートフォンRemote、Stream Deckを含む実環境試験
- License、第三者依存、正式素材、配布内容の最終監査

上記へ到達するまでは、機能が安定していてもApp全体をdevまたはbetaとして配布する。

## 段階的な実装順序

1. Electron Appの最小構成とServer管理
2. userDataへのConfig／Data／Log分離
3. 状態画面、設定、公式ガジェットURL一覧
4. `user_gadgets`のmountとmanifest一覧統合
5. 共有APIと同一OriginのSecurity境界
6. dev配布Buildによる継続テスト
7. Local Automation APIとStream Deck Plugin
8. beta公開、移行・更新・互換性試験
9. VCT Event Hubの段階導入と実運用試験
10. 1.0.0の公開判定

段階ごとに動作確認とCommitを行い、後続機能を先行段階の必須条件にはしない。ただしstable 1.0.0の判定では全公開条件を満たす。

## beta系列の目安

- `0.1.0-beta.1`: Electron配布、Server管理、公式ツール、Remote、Stream Deck、ユーザー領域の基準版
- `0.2.0-beta.1`: Event Hub Server MVP。Rule保存、Bridge入力、Counter／Effect Action、監査ログ
- `0.3.0-beta.1`: TOC2 Event Hub設定UI、Import／Export、重複・再接続・閾値運用の実環境調整
- `1.0.0-rc.1`: 保存schemaとAction契約を固定し、更新・復元・長時間稼働を検証

Event Hubは現行`0.1.0-beta.1`へ差し込まず、安定した基準版との比較が可能な次minor betaから導入する。
