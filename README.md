# VCreatorTools App

Electron版の開発Repositoryです。App versionは`0.1.0-dev`、内蔵Serverは独立して`1.0.0`です。

## 開発起動

```powershell
npm install
npm start
```

初回起動時にElectronのuserData配下へ`server.config.json`、`data/`、`logs/`、`user_gadgets/`を作成します。

`user_gadgets/`は`http://127.0.0.1:<Main Port>/user_gadgets/<folder>/...`へ静的配信します。一覧掲載には検証可能な`manifest.json`が必要で、公式ツールと区別して`User`と表示します。Electron運用中のRemote管理Endpointは起動ごとの管理Tokenで保護され、持ち込みページや通常ブラウザーへPairing codeとSession情報を公開しません。

配置方法、Trust境界、共有APIの未確定範囲は[USER_GADGETS.md](USER_GADGETS.md)を参照してください。

Mainは`127.0.0.1`、Remoteは有効時のみ`0.0.0.0`へ固定します。管理UIではMain Port、Remote有効／無効、Remote Portを変更でき、保存時にServerを再起動します。

管理UIには正式ガジェット一覧、Sync／Server／Standalone URLのコピーと起動、Remote URL／QR、Pairing code再生成、全Remote Session破棄も集約します。Browserの`/admin`は単体Server運用と診断用として残します。

この段階では開発用起動・停止・状態表示と接続設定を検証します。Installerおよび正式配布Buildは未実装です。
