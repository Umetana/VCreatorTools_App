# Local Automation API v1

Stream Deck等、同じPC上の外部ツールからVCreatorToolsを操作するためのAPI。Main Serverの`127.0.0.1`だけで提供し、Remote用LAN Serverには公開しない。

すべてのRequestに`Authorization: Bearer <Automation Token>`または`X-VCT-Automation-Token: <Automation Token>`を付ける。TokenはElectron Appでコピー・再生成する。URL、ログ、設定ファイルへ埋め込まない。

## Endpoint

- `GET /api/automation/v1/status`
- `GET /api/automation/v1/counters`
- `POST /api/automation/v1/counters/:counterId/command`
- `GET /api/automation/v1/effects`
- `POST /api/automation/v1/effects/:buttonId/trigger`

Counter commandの`operation`は`increment`、`decrement`、`reset`、`set`。`delta`は増減幅、`value`はset値。resetには`confirm: true`が必要。

EffectはServer正本のRemote Effect Catalogに保存されたButtonだけを実行できる。任意のEffect IDやparamsは受け取らず、一覧で得た`buttonId`を指定する。

Automation APIは設定変更、File操作、Remote管理、Server停止、任意Event送信を提供しない。
