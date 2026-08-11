# GP MULTI COUNTER V2

OBS配信向けのマルチカウンター管理・表示システム。V1とは別製品として動作し、旧Channel、旧LocalStorage、旧Server APIとの互換通信は行わない。

## 主要画面

- `control_setting.html`: Counter構成、表示設定、現在値の編集
- `control_setting_obs.html`: 旧OBS Dock登録用の互換リダイレクト。新規登録では使用しない
- `control_ops.html`: 配信中の増減・リセット操作
- `display.html`: Counter単体表示。`?id=counter1`で対象を指定
- `display_layout.html`: 1920×1080の複数Counter配置表示
- `display_custom_template/display_template.html`: カスタム表示のV2対応ベース

`display_layout.html?mode=settings`で配置編集画面を開ける。Counter状態とレイアウト設定は別々に保存される。

## 動作モード

### Standard

`file:`で直接開いた場合。BroadcastChannelとブラウザー内保存を使用する。OBSのローカルファイルは保存領域やChannelが画面間で共有されない場合がある。

### Sync

ローカルサーバーURLをパラメーターなしで開いた場合。同じprotocol、host、portの画面間でBroadcastChannelを使用する。

```text
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/control_setting.html
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/control_ops.html
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/display_layout.html
```

`localhost`と`127.0.0.1`、異なるport、`file:`とHTTPを混在させない。

### Server

ローカルサーバーURLへ`vctMode=server`を指定した場合。Server JSONを正本とし、HTTPとWebSocketで状態を同期する。

```text
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/control_setting.html?vctMode=server
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/control_ops.html?vctMode=server
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/display_layout.html?vctMode=server
http://127.0.0.1:3000/V_CreatorTools/GP_multi_counter_v2/display_layout.html?mode=settings&vctMode=server
```

Server実装を更新した場合は統合サーバーを再起動する。`/health`の`features.gpCounterV2`が`true`であることを確認する。

## モード間の状態分離

SyncとServerは独立した状態を持ち、自動同期しない。

```text
Sync state:   vct:gp-multi-counter:v2:state
Server cache: vct:gp-multi-counter:v2:server-cache
Server state: data/gp-counter-v2.json
```

Server cacheはServer接続不能時の一時表示用であり、Syncの正本として使用しない。

## V2通信

```text
Channel:  vct:gp-multi-counter:v2:channel
Protocol: vct.gp-multi-counter
```

メッセージ：

- `counter.snapshot`: 初期状態・再同期。演出などの実操作トリガーにしない
- `counter.changed`: 確定した実変更。`id`、`operation`、`previous`、`current`を持つ
- `counter.state.request`: 遅れて起動したConsumerからの状態要求

通信契約の詳細は`PROTOCOL.md`、実装方法と設計背景は`DEVELOPER_GUIDE.md`を参照。

## 設定の移行

V2の通常運用ではJSONコピーによるOBS反映は不要。同一Sync環境またはServerモードへ画面を統一する。

書き出し・読み込み機能はバックアップおよび明示的なデータ移動用として残している。V1データとの常時同期やV1への書き戻しは行わない。

## TOC V2

`Total_Operations_Console_v2`はV2専用。Counter一覧、増減、リセット、Snapshot／ChangedログをStandard／Sync／Serverで確認できる。

## カスタム表示

新しい表示は`display_custom_template/display_template.html`を基準に作成する。V1の`display_sample`は旧Protocol依存のためV2へ同梱しない。旧サンプルは`GP_multi_counter_v1`に保存されている。

VCreatorTools Appでは「GP Counter表示スターターを追加」により、`user_gadgets`へmanifest付きのPortable表示を作成できる。`user_gadgets/_vct_core`を相対参照するため、Standard、Sync、Serverで同じ表示コードを利用する。

共通Counter SDKの正本は`../_vct_core/gp-counter/v2`。本Folder直下の`counter-*.js`と`gp-counter-server.js`は、既存カスタム表示との互換用に当面保持する。

## ライセンス

MIT License
