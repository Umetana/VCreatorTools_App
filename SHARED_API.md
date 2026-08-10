# User Gadget Shared API

Status: v1 discoveryのみ安定契約

## 目的と境界

`user_gadgets`から利用できる公開契約を、公式ツールの内部Endpointから分離する。公開契約は`/api/public/v1`配下だけとし、既存の`/api/...`と`/events`は明記されるまで内部APIとして扱う。

持ち込みガジェットはMain Serverと同一Originで実行される。したがって、この公開契約は互換性と推奨利用範囲を示すものであり、未信頼JavaScriptに対するSecurity sandboxではない。

## 分類と現行判断

| 区分 | 例 | v1公開 | 理由 |
|---|---|---:|---|
| Discovery | Server/API能力の確認 | Yes | 副作用がなく最小限 |
| 読取 | Counter、Material、Maro状態 | No | データ最小化とschema確定が必要 |
| 状態更新 | 設定・Catalogの全置換 | No | 永続正本を変更し影響範囲が大きい |
| Action | Counter操作、演出発火 | No | 意図しない配信操作を防ぐ設計が必要 |
| 管理 | Pairing、Session破棄 | No | Electron管理Token専用 |
| 入力Bridge | `POST /bridge` | No | わんコメ連携専用の入力境界 |

## Stable endpoint

### `GET /api/public/v1/capabilities`

認証不要、読取専用。HTTP 200で次のEnvelopeを返す。

```json
{
  "schema": "vct.public-capabilities.v1",
  "apiVersion": 1,
  "serverVersion": "1.0.0",
  "capabilities": {
    "discovery": { "available": true, "access": "read" },
    "stateRead": { "available": false },
    "stateWrite": { "available": false },
    "actions": { "available": false },
    "administration": { "available": false },
    "events": { "available": false }
  }
}
```

Consumerは未知のCapabilityとfieldを無視する。`apiVersion: 1`では既存fieldを削除せず、追加fieldは任意として導入する。破壊的変更は新しいURL versionで行う。

## Internal endpoint inventory

以下は現在の公式ツール用であり、共有APIの互換保証対象外。

- 読取: gadget一覧、Material、GP Counter v1/v2、Maro v2、Remote Effect Catalog、health、WebSocket event
- 状態更新: Material、GP Counter v1/v2、Maro v2、Remote Effect Catalog
- Action: Material command、GP Counter v1/v2 command、Maro command、Screen Effect trigger
- 管理: Remote status詳細、Pairing code再生成、全Session破棄
- 入力: Bridge event

管理系はElectron起動時の管理Tokenで保護する。通常BrowserとユーザーガジェットへTokenを公開しない。

## 次の段階

最初の状態読取候補はGP Multi Counter v2とする。公開用DTOから設定や不要な内部fieldを除外し、読取Endpointとevent schemaを同時に固定する。状態更新とActionは、その後に用途、確認UI、rate limit、Capability tokenの必要性を評価して追加する。
