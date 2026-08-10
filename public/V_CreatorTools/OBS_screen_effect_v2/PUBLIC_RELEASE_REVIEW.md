# OBS Screen Effect V2 公開前レビュー

この文書はPhase 7で確定した事項、未決事項、変更影響を記録する。Server Transportの実装は本レビュー完了後に行う。

追記: Phase 7完了後のServer Transport第1段階として、Serverモードの`effect.trigger`をHTTP／WebSocketへ移行した。`settings.updated`はBroadcastChannelを維持し、Server側で設定は保存しない。

## 1. Channel・Storage名前空間（監査結果）

### 現状

| 用途 | 現在値 | 利用範囲 | 状態 |
|---|---|---|---|
| Effect通信 | `vct:obs-screen-effect:v2:channel` | Screen Effect V2内部 | 確定 |
| 設定保存 | `vct:obs-screen-effect:v2:settings` | Screen Effect V2内部のLocalStorage | 確定 |
| Counter通信 | `obs_counter_sync` | GP Multi Counterほか多数の既存ツール | 既存連携契約 |

### 判断

- `obs_counter_sync`は汎用名ではあるが、VCreatorTools内の既存Counter連携規約として広く利用されている。Screen Effect単体では変更しない。
- Counterチャンネルの新しい命名規則や移行は、Counter提供側と利用ツール全体を対象にした別レビューで扱う。
- Effect通信と設定保存は製品固有の名前空間へ変更済み。
- BroadcastChannel名とLocalStorageキーは同じ規則で命名するが、用途を末尾で区別する。

### 確定した命名

```text
vct:obs-screen-effect:v2:channel
vct:obs-screen-effect:v2:settings
```

考え方：

```text
組織／ツール群 : 製品ID : protocol/schema世代 : 用途
```

V2は未公開のため、開発中の旧V2キーからの自動移行は行わない。

## 2. Effect Message Envelope（確定・実装済み）

### 移行結果

V2内部の旧`trigger`／`CONFIG_UPDATED`形式は廃止し、以下のEnvelopeへ移行済み。Message Protocol層で形式とサイズを検証し、不正形式と重複message IDは実行しない。

Total Operations Console v1は旧`obs_effect_channel`と旧`obs_effect_settings`を使用しており、V2通信の互換利用者ではない。V2は未公開のため、旧Envelopeを恒久維持する必要はない。

### Envelope

```js
{
    protocol: 'vct.obs-screen-effect',
    protocolVersion: 1,
    messageId: 'UUID等のインスタンス内一意ID',
    source: {
        role: 'controller',
        instanceId: 'ページ単位ID'
    },
    type: 'effect.trigger',
    sentAt: 1785630000000,
    payload: {
        effectId: 'crown_effect',
        params: {}
    }
}
```

設定更新：

```js
{
    // 共通項目は同じ
    type: 'settings.updated',
    payload: { settings: {} }
}
```

### 責務

- `protocolVersion`は通信形式の世代。設定内容の世代である`settings.schemaVersion`とは分離する。
- Message Protocol層が共通項目、許可type、payloadの基本形、サイズを検証する。
- Settings Repositoryが`settings.updated`の設定内容を検証する。
- Effect Registry／Coreが`effect.trigger`のEffect IDとparamsを検証する。
- Transportは検証済みEnvelopeを運ぶだけにし、BroadcastChannelと将来のServerで共用する。
- 受信側は直近256件のmessage IDを保持し、同一IDの再配送を無視する。
- 未知protocol、未知version、未知type、不正payloadは実行せずログへ残す。

### 命名と同時に変更する候補

```text
Channel:     vct:obs-screen-effect:v2:channel
LocalStorage: vct:obs-screen-effect:v2:settings
Protocol:    vct.obs-screen-effect
Version:     1
```

製品バージョン、通信protocol version、settings schema versionはそれぞれ独立して更新できるものとする。

## 3. 確認状況

- Envelope仕様とV2内部通信: 完了
- Effect trigger payloadの上限・検証: 完了
- 多重実行、再発火、キャンセル、再読み込み規則: 完了
- Counter初期同期、減少、リセット、複数Screenの規則: 完了
- HTML安全化、Manifest検証、ログ整理: 完了
- Pluginガイド、テンプレート、現行仕様書の照合: 完了
- V1およびTotal Operations Consoleとの移行・廃止方針: 公開物整理工程で実施

### Total Operations Console

V1は開発中の未公開版で利用者がいないため、V1設定インポート、旧チャンネル購読、旧Envelope互換は実装しない。V2を最初の正式公開版とする。Total Operations ConsoleはV1互換を経由せず、V2の設定schema、名前空間、Message Envelopeへ直接移行する。TOC移行はScreen Effect本体と分離した公開準備工程として行う。

## 3. 多重実行・再発火・再読み込み（確定）

### 現状

- 同じEffectを連打すると、押した回数だけ独立インスタンスとして重なる。
- Runtimeは実行中インスタンスを追跡するが、個数制限を設けていない。
- Effectごとの再発火方針はManifestに存在しない。
- Screen再読込時はブラウザーによるページ破棄に任せており、`runtime.destroyAll()`を明示的に呼んでいない。
- 実行中状態や未処理triggerは保存されず、再読込後に復元・再実行されない。

### 基本方針

- 既定値は現在と同じ`overlap`とし、同時実行数を一律制限しない。
- 利用者の連打による負荷は原則として利用者管理とする。
- 多重実行に向かないEffectだけがManifestで方針を宣言できる。
- Host側設定による一律制限や自動調整は導入しない。
- Screenの`pagehide`で`runtime.destroyAll()`を呼び、Pluginの`destroy()`とContext破棄を明示的に完了する（実装済み）。
- 再読込後は新しいRuntimeとして開始し、実行中Effect、queue、trigger履歴を引き継がない。

### 将来のManifest候補

```js
static manifest = {
    apiVersion: 2,
    runtime: {
        lifecycleOwner: 'host',
        replayPolicy: 'overlap',
        maxInstances: 4
    }
};
```

`replayPolicy`候補：

| 値 | 同じEffectの再発火 |
|---|---|
| `overlap` | 新しいインスタンスを重ねる。既定値 |
| `restart` | 実行中の同Effectを終了して新しく開始 |
| `ignore` | 同Effectが実行中なら新しい発火を無視 |
| `queue` | 同Effectの終了後に到着順で開始 |

`maxInstances`は`overlap`でPlugin作者が明示した場合だけ有効とし、上限到達後の新しい発火を無視する候補。未指定なら無制限とする。

今回は`pagehide`での明示破棄と既定`overlap`だけを仕様化する。`restart`、`ignore`、`queue`、`maxInstances`は、公式Effectで必要性が決まるまで実装・公開契約化しない。

## 4. GP Multi Counter V2連携（確定・実装済み）

### 監査結果

- 旧`obs_counter_sync`はSnapshotと実操作を区別できず、Screen再読込後に既存Counterが一斉発火する問題があった。
- GP Multi Counter V2は`counter.snapshot`、`counter.changed`、`counter.state.request`を分離し、Changedへ`previous`、`current`、`operation`を含める。
- Screen EffectはScreen専用AdapterからGP Multi Counter V2を利用し、旧チャンネルを購読しない。
- Standard／SyncではCounterClient、ServerではGPCounterServerを利用する。

### 確定仕様

| 状況 | 動作 |
|---|---|
| `counter.snapshot` | 状態同期のみ。発火しない |
| `counter.changed` | 明示されたChangeだけを評価 |
| `increment` | previous/currentの上昇を判定 |
| `set` | previous/currentの上昇を判定 |
| `decrement`／`reset` | 発火しない |
| `replace`／`update` | 設定変更として発火しない |
| `create`／`remove` | 発火しない |
| Screen再読込・Server再接続 | Snapshotのみ受け取り、既存値では発火しない |
| 複数Screen | 各Screenで1回ずつ独立発火 |

### 理由

EngineはConsumer側で過去値を推測せず、検証済みChanged内のprevious/currentだけを使用する。これによりSnapshot誤発火と、再読込後の最初の実操作の取りこぼしを同時に防ぐ。

複数Screenを1つに制限すると、別シーン・別出力・プレビュー等の独立表示ができなくなるため、リーダー選出は行わない。

## 5. 次の確認項目

- 入力検証、HTMLエスケープ、ログ、エラー表示
- 配布用初期設定とREADMEの確定（完了）
- Total Operations Console V2の参照先移行（V2 Protocol直接利用を確認済み）
