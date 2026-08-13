# VCreatorTools App

Electron版の開発Repositoryです。App versionは`0.1.0-beta.1`、内蔵Serverは独立して`1.0.0`です。

## 開発起動

```powershell
npm install
npm start
```

初回起動時にElectronのuserData配下へ`server.config.json`、`data/`、`logs/`、`user_gadgets/`、`user_assets/`を作成します。

`user_gadgets/`は`http://127.0.0.1:<Main Port>/user_gadgets/<folder>/...`へ静的配信します。一覧掲載には検証可能な`manifest.json`が必要で、公式ツールと区別して`User`と表示します。Electron運用中のRemote管理Endpointは起動ごとの管理Tokenで保護され、持ち込みページや通常ブラウザーへPairing codeとSession情報を公開しません。

`user_assets/`はServer専用Effectが使う利用者画像の保存領域です。画像パフォーマンスは`screen_effect_v2/image_performance/`、Money Showerの肖像は`screen_effect_v2/money_shower/`へPNGを置きます。Main Serverだけが検証済み画像を配信し、Remote Serverからは公開しません。

公式単品版・統合版・ユーザーガジェットで共通利用できるversion付き`_vct_core`への構造移行方針は`CORE_MIGRATION.md`を参照してください。GP Multi CounterをPilotとし、Screen Effectの第三者Plugin対応は保留します。

配置方法、Trust境界、共有APIの未確定範囲は[USER_GADGETS.md](USER_GADGETS.md)を参照してください。

Mainは`127.0.0.1`、Remoteは有効時のみ`0.0.0.0`へ固定します。管理UIではMain Port、Remote有効／無効、Remote Portを変更でき、保存時にServerを再起動します。

管理UIには正式ガジェット一覧、Sync／Server／Standalone URLのコピーと起動、Remote URL／QR、Pairing code再生成、全Remote Session破棄も集約します。Browserの`/admin`は単体Server運用と診断用として残します。

`0.1.0-beta.1`ではInstaller／Portable Buildを利用者テスト用に提供します。既知事項は`RELEASE_NOTES.md`を参照してください。
