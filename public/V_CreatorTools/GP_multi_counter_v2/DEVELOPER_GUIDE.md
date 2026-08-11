# GP Multi Counter V2 Developer Guide

## 1. この文書の目的

GP Multi Counter V2の設計背景、実装構成、拡張方法、運用上の注意をまとめる。

- 利用者向けの起動方法は`readme.md`
- 厳密な通信契約は`PROTOCOL.md`
- 本書は実装者向けの構成説明と組み込み手順

## 2. V2を作った理由

V1では`obs_counter_sync`へCounter配列全体を`type: update`として送っていた。この形式では、次を区別できなかった。

- 初回状態
- 再読み込み後の復元
- 実際の増減操作
- リセット
- 設定変更
- Serverから受信した状態

Screen Effect V2は最初に受信したCounter値を0からの変化として推測していたため、単なる初期状態でも演出が発火する可能性があった。Consumerが後から起動した場合に現在状態を問い合わせる方法もなかった。

V2では旧互換より、通信の意味を明確にすることを優先した。

## 3. V2の基本原則

1. Snapshotと実変更を別メッセージにする
2. `previous`と`current`をProducerが保証する
3. Consumerは過去値を推測しない
4. 遅れて起動したConsumerは状態を要求できる
5. Standard、Sync、Serverで同じ意味のEnvelopeを使う
6. Sync状態とServer状態を暗黙に混ぜない
7. V1とV2は別製品として共存させる
8. 未知Protocol、旧message type、不正schemaは拒否する

## 4. 実装構成

```text
../_vct_core/gp-counter/v2/counter-core.js
  Counter初期値、正規化、表示対象IDなどの共通処理

../_vct_core/gp-counter/v2/counter-schema.js
  CounterとState文書の検証

../_vct_core/gp-counter/v2/counter-protocol.js
  Message Envelopeの生成・検証・重複排除

../_vct_core/gp-counter/v2/counter-store.js
  LocalStorage、revision、差分、operationの管理

../_vct_core/gp-counter/v2/counter-client.js
  BroadcastChannel、State Request、Snapshot応答

../_vct_core/gp-counter/v2/gp-counter-server.js
  Server API／WebSocketをV2 Envelopeとして扱うブラウザClient

gp-counter-v2-service.js
  統合Server側のV2状態、操作、永続化、WebSocket配信
```

画面はStorageやBroadcastChannelを直接操作せず、RepositoryとClientを経由する。

## 5. 名前空間

```text
Channel:      vct:gp-multi-counter:v2:channel
Protocol:     vct.gp-multi-counter
Sync state:   vct:gp-multi-counter:v2:state
Server cache: vct:gp-multi-counter:v2:server-cache
Favorites:    vct:gp-multi-counter:v2:favorites
Layout:       vct:gp-multi-counter:v2:layout
Layout BC:    vct:gp-multi-counter:v2:layout-channel
Server state: data/gp-counter-v2.json
```

製品世代、Protocol version、State schema versionは別々に管理する。

```text
Product:         V2
protocolVersion: 1
schemaVersion:   1
```

## 6. State schema

State文書は配列ではなく、schema情報とrevisionを含む。

```js
{
  schema: 'vct.gp-multi-counter.state',
  schemaVersion: 1,
  revision: 12,
  updatedAt: 1785630000000,
  counters: []
}
```

Counterは次のフィールドを持つ。

```js
{
  id: 'counter1',
  label: 'カウンター1',
  count: 0,
  unit: '回',
  goalCount: 100,
  showGoal: false,
  bgColor: 'rgba(0,0,0,0.5)',
  borderColor: '#ffffff',
  textColor: '#ffffff',
  labelSize: '20px',
  countSize: '36px',
  isBold: true,
  isShadow: true,
  fontFamily: 'sans-serif'
}
```

主な制約：

- `id`は64文字以内の識別子
- ID重複は禁止
- 最大200 Counter
- `count`と`goalCount`は0以上の安全な整数
- 文字列長、boolean、配列型を境界で検証

## 7. Messageの意味

### counter.snapshot

現在状態の基準を渡す。起動、State Requestへの応答、再接続時の再同期に使用する。

Snapshotは利用者操作ではない。Screen Effect、通知、音声などを発火させてはならない。

### counter.changed

確定した実変更だけを通知する。

```js
{
  id: 'counter1',
  operation: 'increment',
  previous: { /* Counter */ },
  current: { /* Counter */ }
}
```

一括設定では複数Changeを同じrevisionへまとめる。状態が変わらなかった操作ではChangedを発行しない。

### counter.state.request

遅れて起動したConsumerが現在状態を要求する。応答は`replyTo`付きのSnapshot。

Standard／Syncでは状態Repositoryを持つ画面が応答できる。複数候補がある場合は、先に送られた同一要求へのSnapshotを観測した候補が応答を取り消す。

ServerではHTTP初期取得がState Requestに相当し、ServerだけがSnapshotを返す。

## 8. operation

```text
increment  増加
decrement  減少
reset      0へ戻す
set        countを直接指定
update     count以外の設定変更
create     Counter追加
remove     Counter削除
replace    設定適用やインポートなどで既存countを置換
```

`create`だけは`previous: null`、`remove`だけは`current: null`を許可する。

インポートや設定画面などの発生元はoperationへ混ぜず、Changedの`payload.cause`で表す。

操作パネルとCommand APIは操作系operationを明示する。設定画面、JSONインポート、ServerのState PUTは状態置換として扱い、countを含む既存Counter変更へ`replace`を付ける。見た目だけの変更は`update`、追加・削除は`create`／`remove`とする。値の差だけを見て状態置換を`increment`などへ推測してはならない。

## 9. revisionと重複処理

- revisionは状態変更のコミットごとに1増える
- 一括変更は全Changeで同じrevision
- 現在revision以下のChangedは無視
- revisionが飛んだ場合はState Requestを送る
- Message IDは直近256件を保持し、同じMessageの再配送を無視
- WebSocketとHTTP応答の両方で同じChangedを受けても二重適用しない

## 10. モード

### Standard

`file:`で開いた場合。ブラウザー内StorageとBroadcastChannelを使用する。OBSのローカルファイルでは、画面ごとにStorage partitionが分かれる可能性がある。

### Sync

ローカルServer URLをパラメーターなしで開いた場合。同一origin内でBroadcastChannelを使う。

### Server

`?vctMode=server`を付けた場合。`data/gp-counter-v2.json`を正本として、HTTPとWebSocketを使う。

Server再接続時はSnapshotを再取得する。切断中のChangedを推測・再生せず、最新状態へ再同期する。

## 11. モード分離

V1ではServer画面が受信した状態を旧BroadcastChannelへ再送する箇所があり、Server操作部とSync表示部が偶然連動する場合があった。

V2ではこの中継を行わない。

```text
Sync  ─ BroadcastChannel ─ Sync
Server ─ HTTP/WebSocket ─ Server
```

Server画面のLocalStorageは表示フォールバック用キャッシュであり、Sync状態とは別キーを使う。モードを切り替えると別の状態が表示されるのが正常。

## 12. ブラウザConsumerの最小構成

読み込み順：

```html
<script src="../_vct_core/runtime/v1/vct-runtime.js"></script>
<script src="../_vct_core/gp-counter/v2/counter-core.js"></script>
<script src="../_vct_core/gp-counter/v2/counter-schema.js"></script>
<script src="../_vct_core/gp-counter/v2/counter-protocol.js"></script>
<script src="../_vct_core/gp-counter/v2/counter-store.js"></script>
<script src="../_vct_core/gp-counter/v2/counter-client.js"></script>
```

Sync Consumer：

```js
const repository = new CounterStateRepository({
  storageKey: CounterMessageProtocol.storageKeyForMode(VCTRuntime.mode)
});

const client = new CounterClient({
  role: 'display',
  repository,
  canRespond: false
});

const initial = repository.load([]);
render(initial.counters);

client.subscribe(event => {
  if (event.state) render(event.state.counters);

  if (event.type === 'counter.changed') {
    // 必要な場合だけ実変更を扱う
    consumeChanges(event.changes);
  }
});

client.start({ knownRevision: initial.revision });
```

状態表示だけならSnapshotとChangedの両方で`event.state`を描画する。演出などの副作用はChangedだけで処理する。

## 13. Screen Effect Consumerの規則

Screen Effect V2を移行する際は、次を守る。

```js
if (event.type === 'counter.snapshot') {
  // 現在値を基準として保存するだけ
  return;
}

if (event.type === 'counter.changed') {
  for (const change of event.changes) {
    evaluateTrigger(change.id, change.operation, change.previous, change.current);
  }
}
```

禁止事項：

- 初回値を0と仮定する
- Snapshotをincrementとして扱う
- Consumer側でpreviousを推測する
- 同じMessage IDを複数回実行する

## 14. Controllerの最小構成

```js
const repository = new CounterStateRepository({
  storageKey: CounterMessageProtocol.storageKeyForMode(VCTRuntime.mode)
});
const client = new CounterClient({ role: 'controller', repository });

let state = repository.load([]);
const counters = state.counters;
const target = counters.find(counter => counter.id === 'counter1');
target.count += 1;

client.commit(counters, {
  operations: { counter1: 'increment' },
  cause: 'custom-controller'
});
```

Serverモードの操作は`GPCounterServer.createClient()`の`command()`を使用する。Server状態をローカルで先に変更してから送らない。

## 15. Server API

```text
GET  /api/gp-counter/v2/state
PUT  /api/gp-counter/v2/state
POST /api/gp-counter/v2/command
WS   /events
```

操作例：

```json
{
  "operation": "increment",
  "counterId": "counter1",
  "delta": 1
}
```

Serverは状態を確定してrevisionを増やし、V2 Changed EnvelopeをWebSocketへ配信する。設定のPUTはrevision競合時にHTTP 409と最新Snapshotを返す。

## 16. カスタム表示

公式Folder内で作る場合は`display_custom_template/display_template.html`を複製する。Electron Appのユーザー領域で作る場合は「GP Counter表示スターターを追加」を使用し、`gp_counter_custom_display/display.html`のHTML、CSS、`apply(counter)`を変更する。

テンプレートには次が実装済み。

- URL、hash、ファイル名からCounter IDを解決
- Standard／Sync／Serverの切替
- 起動時Snapshot
- Changed反映
- Server再接続
- schema検証

独自表示内でBroadcastChannel、LocalStorage、Server APIを直接扱わない。

Counter SDKの正本は`../_vct_core/gp-counter/v2`。GP Multi Counter直下の同名fileは既存カスタム表示との互換用であり、新規実装から参照しない。

## 17. TOC V2

`Total_Operations_Console_v2`はV2専用の操作・通信確認画面。

- Counter一覧
- increment／decrement／reset
- Snapshot／Changedログ
- revision表示
- Standard／Sync／Server

V1 TOCへV2通信を追加せず、製品世代を分離している。

## 18. OBSでの注意

### URL

次は別originになる。

```text
http://127.0.0.1:3000
http://localhost:3000
file:
異なるport
```

URLの`http://`のスラッシュ不足にも注意する。

### 標準ダイアログ

OBSの対話画面では`confirm()`などのブラウザー標準ダイアログが操作できない場合がある。削除や初期化確認にはページ内モーダルを使用する。

### Server更新

ブラウザーファイルは再読み込みで更新されるが、Node側Server実装はプロセス再起動が必要。

```text
GET /health
features.gpCounterV2 === true
```

## 19. 今回確認された問題と対策

| 問題 | 原因 | 対策 |
|---|---|---|
| 初期状態でEffectが誤発火 | Snapshotと操作が同じupdate | SnapshotとChangedを分離 |
| 遅延Consumerが状態を受け取れない | BroadcastChannelに履歴がない | State Requestを追加 |
| 旧Channel名が衝突しやすい | `obs_counter_sync`が汎用的 | 製品固有名前空間へ変更 |
| Server操作が効かない | 稼働Serverが更新前 | 再起動とhealth確認 |
| SyncとServerが偶然混ざる | LocalStorageキャッシュ共有 | Server cacheを別キーへ分離 |
| OBS対話で削除できない | 標準confirmが操作不能 | ページ内確認モーダル |
| 同じhostなのに同期しない | URL typoやmode混在 | 完全なURLとqueryを確認 |

## 20. V1との関係

- V1フォルダーは旧版として保持
- V2は旧Channelを購読・送信しない
- V2は旧LocalStorageへ書き戻さない
- V1 Server APIとV2 Server APIは別Endpoint
- V1 stateとV2 stateは別ファイル
- 旧サンプルはV1側に保持

V1データを取り込む場合も、将来の明示的な一方向インポートとして実装し、常時互換層にはしない。

## 21. テスト範囲

自動テストでは次を確認している。

- schema検証
- SnapshotとChangedの分離
- State Request応答
- messageId重複排除
- no-op抑制
- operationとprevious／current
- revision欠落時の再同期要求
- Sync／Server Storage分離
- Server APIとWebSocket
- V1 Server、V1 Screen Effectの回帰
- 主要画面が旧Channelを使用しないこと

実機確認ではSyncとServerそれぞれについて、設定、操作、TOC V2、総合レイアウトの連動を確認している。

## 22. 今後の工程

1. Screen Effect V2をV2 Counter Protocolへ移行
2. SnapshotではTrigger Engineの基準値だけを初期化
3. Changedのoperation、previous、currentから演出を判定
4. OBS Gadgetなど他Consumerを必要に応じて移行
5. 公開前にschema、ログ、エラー表示、READMEを最終レビュー
