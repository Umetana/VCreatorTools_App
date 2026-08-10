# VCreatorTools App

Electron版の開発Repositoryです。App versionは`0.1.0-dev`、内蔵Serverは独立して`1.0.0`です。

## 開発起動

```powershell
npm install
npm start
```

初回起動時にElectronのuserData配下へ`server.config.json`、`data/`、`logs/`、`user_gadgets/`を作成します。現段階の`user_gadgets/`は保存場所のみで、静的配信は未実装です。

この段階では開発用起動・停止・状態表示を検証します。Installerおよび正式配布Buildは未実装です。
