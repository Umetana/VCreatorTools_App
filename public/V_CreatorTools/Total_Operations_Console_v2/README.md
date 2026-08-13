# Total Operations Console V2

V2世代のVCreatorToolsを操作・観測する独立Console。

## 対応機能

- GP Multi Counter V2
  - Standard／Sync／Server
  - Counterのお気に入り／すべて表示、ページ送り
  - increment／decrement／reset
  - revisionと通信ログ
- OBS Screen Effect V2
  - 検証済み設定からボタンを表示
  - `effect.trigger`による手動発火
  - `settings.updated`への追従
- Ms.Bridge Monitor
  - Server WebSocket接続とBridgeイベント受信実績を別表示
  - `msbridge.event.v1`の`comment`／`meta`をWebSocketで観測
  - Platform、同時視聴者、高評価、登録者、最終更新時刻
  - 最新コメント、監視ワード一致履歴
  - Bridge Server URLの保存と再接続

上部の`Server WS`は`/events`へのWebSocket接続状態を示す。`Bridge`は現在のWebSocket接続後に`comment`または`meta`を受信した実績を示し、時間によるタイムアウト判定は行わない。最終受信時刻とevent typeはBridgeタブへ表示する。
- System
  - Mode、origin、Storage、BroadcastChannel、Server診断
  - 簡易イベントログ

## Bridgeの責務

TOC V2のBridge機能は表示と診断だけを行う。ワード一致やmeta条件からCounter、Effect、外部Gadgetを自動操作しない。常時稼働、重複防止、ルール永続化が必要な自動連動は、後から独立Event Hubとして実装する。

VCT統合Serverから開いた場合はBridge URLを自動検出する。わんコメなど別のローカルServerから開く場合は、SystemタブでVCT Server URL（例：`http://127.0.0.1:3000`）を指定する。

V1 TOCとの通信互換や同時送信は行わない。

Counterのお気に入りはCounter schemaやServer状態へ含めず、TOC個人設定`vct:total-operations-console:v2:counter-favorites`へ保存する。
