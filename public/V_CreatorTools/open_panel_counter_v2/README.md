# Open Panel Counter V2

Counter値に応じてパネルを段階的に開くOBS向けガジェットです。単独動作とGP Multi Counter V2連動に対応します。

## ファイル

- `open_panel_counter.html`: 表示・操作画面
- `settings_ui.html`: `settings.js`作成画面
- `settings.js`: 初期設定

## GP Multi Counter V2連動

`settings.js`の`sync.enabled`を`true`にし、`counterId`を指定します。URLの`?id=`または`?counter=`がある場合はURL指定を優先します。

```text
?id=counter3
?counter=3
```

- Standard: GP Multi Counter V2と同じローカル環境で使用
- Sync: 同じローカルサーバーoriginで使用
- Server: 両方のURLへ`vctMode=server`を指定

Server例：

```text
http://127.0.0.1:3000/V_CreatorTools/open_panel_counter_v2/open_panel_counter.html?id=counter1&vctMode=server
```

V2はSnapshotから起動時の現在値を復元し、その後の増加・減少・Resetも正本どおり反映します。旧`obs_counter_sync`は購読しません。

## V1からの変更

- GP Multi Counter V2 Protocolへ移行
- Standard／Sync／Server対応
- count減少を常に反映し、古い保存値への張り付きを解消
- URLのCounter ID指定を設定値より優先
- V1とは別の進行保存キーを使用
- 正本画面と設定画面だけに構成を整理
