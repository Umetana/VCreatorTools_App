# VCreatorTools Stream Deck Plugin

Status: Design adopted / implementation in progress

## Scope

- Counter Action: Counter IDと`increment`、`decrement`、`reset`、`set`を設定して実行
- Effect Action: Local Automation APIのEffect CatalogからButtonを選択して実行
- Base URL: `http://127.0.0.1:3000`
- Automation Token: Plugin Global Settingsへ保存し、Action SettingsやLogへ保存しない

初版はKeypadを対象とし、Dial対応は後続。設定変更、File操作、Server管理、Remote管理、任意Event送信は扱わない。

## Feedback

- 成功: Stream Deck標準のOK表示
- 接続失敗、認証失敗、設定不足: Alert表示
- Counter Action title: 選択したCounterのlabelと現在値
- Effect Action title: Catalogのlabel

## Version

Plugin manifestはStream Deck仕様に従う4桁versionを使う。初版は`0.1.0.0`。
