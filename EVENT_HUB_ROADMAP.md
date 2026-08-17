# VCT Event Hub 導入計画

Status: 0.2.0-beta.1実装

## 配置と責務

Event HubはElectron内蔵Serverの常駐サービスとして実装する。Rule編集は独立したEvent Hub管理UIが担当し、ブラウザーを閉じても判定処理はServerで継続する。TOC2は総合操作パネルとして、Event Hubの稼働状態と管理UIへの導線だけを提供する。

```text
Ms.Bridge → Event Hub → 既存Action Service → Counter / Screen Effect
                         ↑
       TOC2 / Remote / Stream Deck / Event Hub管理UI
```

Event Hub自身はCounter状態更新やEffect描画を実装しない。既存の`gpCounterV2`と`effectTransport`を内部Actionとして呼び出す。Local Automation APIのHTTP endpointへ自己接続せず、同じService層を共有する。

## 初期契約

- 入力：検証済み`msbridge.event.v1`の`comment`と`meta`
- Rule：1 Event／1 Condition／1 Action
- Action：Counterのincrement、decrement、reset、set、および登録済みEffect Buttonの発火
- Effect：Remote Effect Catalogと同様に登録済みButtonだけを参照し、任意paramsをRuleへ保存しない
- 保存：`data/event-hub-v1.json`
- Rule schema：`vct.event-hub.rules.v1`
- 実行ログ：通常ログへRule ID、Event識別子、Action結果を記録する。コメント本文や利用者名を恒久保存しない

## 0.2.0-beta.1 — Server MVP・管理UI

- Rule repository、schema検証、revisionによる競合防止
- 有効／無効、Event field、operator、比較値、Action target
- 文字列Conditionの`containsAny`（最大50語、1つのActionを1回実行）
- Bridge検証成功後にEvent Hubへ渡す内部購読点
- Counter／Effect Action adapter
- Commentの重複防止
- Meta数値条件のエッジ発火
- APIによる一覧、置換、診断、テスト実行
- 単体・統合テスト
- Event、Condition、Actionを1行で編集できる独立Rule UI
- Counter一覧とEffect Catalogからの選択
- Ruleの複製、有効／無効、削除
- 最終一致時刻、最終実行結果、エラー表示
- TOC2へ稼働状態、Rule件数、最終実行結果、管理UIへの導線を追加

### beta.2前の基盤仕上げ

- 編集中RuleへサンプルEvent値を入力するdry-run UI
- 一致／不一致とServer解釈値を表示し、Actionは実行しない
- Event Hub管理UIへ現在のコメント処理モードを表示
- Event Hub管理UIへ受理、一致、Action、失敗、重複除外、最終Eventの非永続診断を表示
- dry-run結果とサンプルEventは保存しない

## beta.2 — 運用調整

- JSON Import／Export（Server検証後に編集画面へ読み込み、明示保存）
- Bridge再接続、Server再起動、設定更新中の挙動確認
- OBS、Chrome、Remote、Stream Deckとの同時運用試験

## RC — 契約固定

- 保存schemaの移行試験
- Backup／復元手順
- 長時間稼働と大量コメント時の負荷試験
- Rate limit、失敗時の再実行方針、ログ上限の確定
- 旧TOC2ワード監視設定が存在する場合の扱いを確定

## 発火意味論

### Comment

1つのBridge Eventにつき、各Ruleは最大1回だけ評価・実行する。`raw.data.id`、`commentId`等のコメント本体に属する安定IDを優先し、なければEventのsequenceと受信情報から短期dedupe keyを作る。Bridge/sourceを表す場合がある`raw.id`単独はコメントIDとして扱わない。再接続による同一コメント再送でActionを重複させない。

### Meta

`viewer >= 100`のような条件は、未一致から一致へ変化した瞬間だけ発火する。同じ条件を満たすMetaが継続して届いても連続発火しない。一度未一致へ戻った後の再到達は再発火できる。

### 設定変更と再起動

Rule追加・編集直後の現在値評価ではActionを発火しない。Server再起動後の最初のMetaはbaselineとして扱い、次の変化から判定する。Commentは受信した新規Eventだけを対象とする。

## 初期版で行わないこと

- AND／ORを含む複合条件
- 複数ActionのChain
- 遅延ActionやSchedule
- 任意JavaScript、正規表現
- Event Hubからのわんコメ直接購読
- 公開Shared APIからのRule変更
- RemoteやStream DeckからのRule編集
- TOC2内部へのRule編集ロジックの実装

必要性が確認されるまで汎用Automation Engineへ拡張しない。
