# VCreatorTools 運用モード仕様 v0.1

VCreatorToolsの運用方式と、わんコメ等からデータを取り込むConnectorを別の軸として扱う。

## 運用モード

| モード | 起動元 | データの正本 | 同期範囲 |
| --- | --- | --- | --- |
| Standard | `file://` | `config.js`、各ブラウザーの`localStorage` | 原則として画面単体 |
| Sync | `http://127.0.0.1:3000` | 各ブラウザープロファイルの`localStorage` | 同一プロファイル・同一origin内 |
| Server | `http://127.0.0.1:3000` | 統合サーバー | Chrome、OBS、複数画面間 |

SyncとServerはいずれもローカルサーバー運用であり、クラウド接続を意味しない。正式originは`http://127.0.0.1:3000`とする。

## モード判定

- `file:`はStandard。
- `127.0.0.1`、`localhost`、`::1`のHTTP配信はSync。
- ローカルサーバー配信時に`?vctMode=server`を指定した場合はServer。
- Server対応が未実装のガジェットはSyncとして動作を継続する。

## 保存と同期

- 保存キーは`製品名_用途_スキーマ版`のsnake_caseとする。
- BroadcastChannel名も同じ規則とし、既存キーは互換性のため維持する。
- Syncの正本は`localStorage`。BroadcastChannelは更新通知であり、データ本体を正本にしない。
- `storage`イベントをBroadcastChannel非対応時および別タブ同期の補助経路として維持する。
- APIキーやトークン等の秘密情報は、明示的な保護設計なしにServerへ保存しない。

## Connector

Ms.Bridgeは運用モードではなく、わんコメの`comment`・`meta`を統合サーバーへ入力するConnectorである。運用モードと独立して対応可否を表記する。

## 共通ランタイム

`/__shared/js/vct-runtime.js`は環境・モード判定、安全なJSON保存、BroadcastChannel、storageイベント購読を提供する。初期導入では既存データ形式を変更しない。

URLへ`?vctDebug=1`を付けると、通常UIへ影響しない固定診断パネルを表示する。モード、origin、Storage、BroadcastChannel、統合サーバー接続、ランタイム版を確認できる。複数パラメーターを指定する場合は`&vctDebug=1`とする。

初期参照実装はMaterial Hub/ViewとTotal Operations Consoleとする。

公開APIの固定契約と導入手順は`VCreatorTools_RUNTIME_API_v0.1.md`を参照する。

## Material View Server参照実装

`material_view.html?...&vctMode=server`では、`material-view.state.v1`を統合サーバー上の正本として使用する。記事、案内カタログ、表示順、選択記事、表示中記事、共有設定、取込履歴を一括管理する。更新はrevision一致時のみ受理し、競合時はサーバー状態を再取得する。

取得・更新不能時は既存localStorageをキャッシュ兼フォールバックとして使用する。APIキー、Material Hubの編集中データ、画面固有UI状態はサーバー正本へ含めない。
