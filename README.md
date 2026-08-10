# VCreatorTools App

Electron版の開発Repositoryです。App versionは`0.1.0-dev`、内蔵Serverは独立して`1.0.0`です。

## 開発起動

```powershell
npm install
npm start
```

初回起動時にElectronのuserData配下へ`server.config.json`、`data/`、`logs/`、`user_gadgets/`を作成します。現段階の`user_gadgets/`は保存場所のみで、静的配信は未実装です。

Mainは`127.0.0.1`、Remoteは有効時のみ`0.0.0.0`へ固定します。管理UIではMain Port、Remote有効／無効、Remote Portを変更でき、保存時にServerを再起動します。

管理UIには正式ガジェット一覧、Sync／Server／Standalone URLのコピーと起動、Remote URL／QR、Pairing code再生成、全Remote Session破棄も集約します。Browserの`/admin`は単体Server運用と診断用として残します。

この段階では開発用起動・停止・状態表示と接続設定を検証します。Installerおよび正式配布Buildは未実装です。
