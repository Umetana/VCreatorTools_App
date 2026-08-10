# VCreatorTools Runtime API v0.1

## Gadget manifest v1

正式ガジェットの`manifest.json`は次の形式を使用する。

```json
{
  "id": "example_v2",
  "schemaVersion": 1,
  "version": "2.0.0-beta.1",
  "name": "Example V2",
  "status": "beta",
  "modes": ["sync", "server"],
  "pages": [
    {
      "name": "Display",
      "file": "display.html",
      "type": "view",
      "role": "display",
      "obs": true,
      "modes": ["sync", "server"]
    }
  ]
}
```

- `schemaVersion`: 現行は`1`
- `version`: Semantic Version。開発版suffixを許可する
- `status`: `development`、`beta`、`release`
- Gadget `modes`: Gadget全体の既定能力
- Page `modes`: Pageごとの実対応。省略時はGadget `modes`を継承
- `role`: `display`、`control`、`settings`、`hub`、`editor`
- `obs`: OBS Browser SourceまたはCustom Browser Dockへ直接追加する候補か
- `type`: 旧Consumerとの互換用。新規処理は`role`を使用する

`type: "view"`だけを持つ旧manifestは、一覧APIで`role: "display"`へ変換される。

対象: `/__shared/js/vct-runtime.js` 0.1.x

この文書はStandard / Sync / Serverの環境差を吸収するブラウザー共通APIの互換契約を定める。v0.1系列では、ここに記載した名前と基本動作を破壊的に変更しない。

## 読み込み

各ガジェットから`public/__shared/js/vct-runtime.js`への相対パスを、ガジェット本体より先に読み込む。

```html
<script src="../../__shared/js/vct-runtime.js"></script>
```

グローバルは`window.VCTRuntime`。既存のコメント・IndexedDB処理用`window.VCT_RUNTIME`とは別APIであり、置換しない。

## 固定プロパティ

- `version`: ランタイム実装版。現在は`0.1.0`。
- `apiVersion`: API互換系列。`0.1`。
- `MODES`: `STANDARD`、`SYNC`、`SERVER`。
- `mode`: 現在の`standard`、`sync`、`server`。
- `environment`: `protocol`、`host`、`isFile`、`isLocalServer`。
- `storage`: 既定の`localStorage`用JSONストレージ。

## 関数

- `detectEnvironment(locationLike?)`: URLから実行環境を返す。
- `resolveMode(locationLike?)`: 運用モードを返す。
- `createStorage(storage?)`: `get`、`set`、`remove`を持つJSONストレージを返す。
- `createChannel(name, options?)`: `publish`、`subscribe`、`close`を持つ同期チャンネルを返す。
- `observeStorage(keys, listener)`: 指定キーのstorageイベントを購読する。
- `diagnostics()` / `showDiagnostics()`: 診断データ取得／パネル表示。

`createChannel().publish()`は通知へ`type`、`senderId`、`revision`を付与する。`subscribe()`と`observeStorage()`は購読解除関数を返す。

## 互換性ルール

- 既存の保存キー、チャンネル名、データスキーマを導入時に変更しない。
- Syncでは`localStorage`を正本、BroadcastChannelを通知として扱う。
- ランタイムが読み込めない場合も従来処理へフォールバック可能にする。
- 0.1.xでは既存プロパティ・関数を削除せず、追加は任意プロパティとして行う。
- APIキーやトークンを共通ストレージへ自動保存しない。
- `VCTRuntime`と`VCT_RUNTIME`を混同・上書きしない。

## 導入チェック

1. 通常URLで表示・操作が従来どおりである。
2. `vctDebug=1`でmode、origin、各機能が表示される。
3. Standardで既存設定を読める。
4. Syncで設定画面から表示画面へ更新通知が届く。
5. ブラウザーコンソールに新しいエラーがない。
