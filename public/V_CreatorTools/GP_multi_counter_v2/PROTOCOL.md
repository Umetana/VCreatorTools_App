# GP Multi Counter V2 Protocol

## 名前空間

```text
Channel:  vct:gp-multi-counter:v2:channel
Protocol: vct.gp-multi-counter
Storage:  vct:gp-multi-counter:v2:state
Server cache: vct:gp-multi-counter:v2:server-cache
```

製品世代、通信仕様、保存schemaは独立して管理する。

```text
Product:         V2
protocolVersion: 1
schemaVersion:   1
```

V2は旧`obs_counter_sync`、旧`type: update`、旧`allCountersSettings`を通信契約として使用しない。

Syncの正本とServer表示用キャッシュは分離する。ServerキャッシュをSyncへ配信したり、Sync状態をServerへ暗黙反映したりしない。

## 共通Envelope

```js
{
  protocol: 'vct.gp-multi-counter',
  protocolVersion: 1,
  messageId: 'UUID等の一意ID',
  source: {
    role: 'controller',
    instanceId: 'ページ単位ID',
    mode: 'standard'
  },
  type: 'counter.changed',
  sentAt: 1785630000000,
  payload: {}
}
```

要求への応答だけ、要求メッセージの`messageId`を`replyTo`へ設定する。

## counter.snapshot

現在状態の基準を提供する。Snapshotは実操作を意味せず、Screen Effectなどのアクションを発火させてはならない。

`reason`は`initial`、`requested`、`resync`のいずれかとする。`requested`の場合は`replyTo`を必須とする。

## counter.changed

確定した状態変更だけを通知する。1回のコミットで複数Counterが変わった場合は、同じ`revision`の`changes`へまとめる。

各Changeは次を持つ。

```js
{
  id: 'counter1',
  operation: 'increment',
  previous: Counter,
  current: Counter
}
```

`previous`と`current`は正規化済みCounter全体とする。`create`だけは`previous: null`、`remove`だけは`current: null`を使用できる。

operation：

```text
increment / decrement / reset / set
update / create / remove / replace
```

状態が実際には変化しなかった操作では`counter.changed`を発行しない。`import`などの発生理由はoperationではなく、トランザクション単位の`payload.cause`で表す。

操作パネルやCommand APIは`increment`／`decrement`／`reset`／`set`を明示する。設定適用、JSONインポート、State PUTなどの状態置換では、既存Counterのcountを含む変更を`replace`、count以外だけの変更を`update`として通知する。追加と削除は常に`create`／`remove`とする。状態置換から操作系operationを推測してはならない。

## counter.state.request

遅れて起動したConsumerが現在状態を要求する。応答側は`reason: requested`の`counter.snapshot`を返す。

Standard／Syncでは状態Repositoryを持つ画面だけが応答できる。複数候補がある場合は、同じ要求への別Snapshotを観測した候補が応答を取り消す。Consumerは最大revisionを採用し、Snapshotではアクションを発火しない。

ServerではServerだけを応答主体とする。

## revision

- revisionは状態文書に保存する非負の安全整数。
- 状態変更のコミットごとに1増やす。
- 1回の一括変更に含まれるChangeは同じrevisionを持つ。
- 古いrevisionは無視する。
- 状態Consumerがrevisionの欠落を検出した場合はSnapshotを再要求する。
- Screen Effectは`counter.changed`内の明示的な`previous`／`current`を使用し、過去値を推測しない。

## 保存文書

```js
{
  schema: 'vct.gp-multi-counter.state',
  schemaVersion: 1,
  revision: 0,
  updatedAt: 1785630000000,
  counters: []
}
```

V1データを利用する場合は、将来提供する明示的な一方向インポートで取り込む。V1との常時同期やV1への書き戻しは行わない。
