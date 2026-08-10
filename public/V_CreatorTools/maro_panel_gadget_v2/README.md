# Maro Panel Gadget V2

マシュマロ読み配信などで使うパネル開封ガジェット。GP Multi Counterから独立した単体製品です。

## 画面構成

- `index.html`: Hub／Editor／Controlを切り替える統合管理画面
- `maro_control.html`: Controlを初期表示する互換・ローカルファイル用入口
- `maro_view.html`: OBS視聴者向け表示専用画面

企画データ（パネル内容・デザイン）と進行状態（開封済みID・表示中本文）を同じState内で明確に分離しています。

## 動作モード

- Standard: ローカルファイル。画面ごとのブラウザー保存で動作
- Sync: ローカルサーバーから開き、同一originの画面をBroadcastChannelで同期
- Server: URLへ`?vctMode=server`を付け、`data/maro-v2.json`を正本としてHTTP／WebSocket同期

Serverモードの例:

```text
http://127.0.0.1:3000/V_CreatorTools/maro_panel_gadget_v2/index.html?vctMode=server
http://127.0.0.1:3000/V_CreatorTools/maro_panel_gadget_v2/index.html?screen=control&vctMode=server
http://127.0.0.1:3000/V_CreatorTools/maro_panel_gadget_v2/maro_view.html?vctMode=server
```

## Server API

```text
GET  /api/maro/v2/state
PUT  /api/maro/v2/state
POST /api/maro/v2/command
```

Command: `open`, `close`, `show-detail`, `hide-detail`, `undo`, `reset`, `show`, `hide`

## V1データ

初回起動時にV2の保存状態がなければ、同梱の`settings.js`と`data.js`を初期企画として読み込みます。以後の正本はV2 Stateです。V1フォルダやV1のLocalStorageは変更しません。

既に空のServer Stateが作成されている場合は、Hubの「同梱データを読み直す」で`settings.js`／`data.js`をServer正本へ反映できます。
