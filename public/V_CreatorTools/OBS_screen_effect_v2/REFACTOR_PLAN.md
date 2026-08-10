# OBS Screen Effect V2 リファクタ計画

V1を稼働基準として保持し、V2で現行の基本構成と外部挙動を維持しながら内部責務を整理する。
Server対応は公開前全体レビューの完了後に行う。

## フェーズ

1. V2分離・V1基準保存
2. 現行挙動の固定
3. 設定Repository・検証の分離
4. BroadcastChannel Transportの分離
5. EffectRegistry・EffectRuntimeの分離
6. Counter Trigger Engineの分離
7. 公開前全体レビュー
8. Server Transport対応
9. 公開準備

進捗: Phase 1（V2分離）、Phase 2（現行挙動固定）、Phase 3（設定Repository分離）、Phase 4（BroadcastChannel Transport分離）、Phase 5（EffectRegistry・EffectRuntime分離）、Phase 6（Counter Trigger Engine分離）まで完了。次はPhase 7（公開前全体レビュー）。

Counter連携はGP Multi Counter V2 Protocolへ移行した。Screen専用AdapterがStandard／SyncのCounterClientとServerのGPCounterServerを切り替え、Snapshotを発火対象から除外する。CounterTriggerEngineはChangedの明示的なprevious／current／operationだけを評価する。

Effect SDK（API v2）を導入し、公式Effectの移行を完了した。RegistryはapiVersion 2を必須とし、Legacy constructor互換は削除済み。

初見歓迎は統合版を正式版とし、A/B単体版は公式一覧から除外済み。比較用フォルダは公開前整理まで残す。

設定保存ではEffect固有値を`params.options`へ保持し、API v2 Pluginへ渡す際にRuntimeで平坦化する。共通パラメータ名はManifest Fieldの予約語として検証する。

設定schemaVersion 1とSettingsValidatorを導入。保存・読込境界で構造、識別子、Trigger、重複、数値範囲、ペイロードサイズを検証する。

通常ブラウザ用とOBS用の設定処理をconfig.htmlへ統合。`?view=dock`でコンパクト表示し、config_obs.htmlは互換転送入口とする。JSON貼り付け、JSONファイル、対応環境のFile System Access API、settings.js書き出しを同じ画面で提供する。

製品初期値は`js/settings_default.js`、利用者設定は生成可能な`js/settings.js`へ分離する。読込優先順位はLocalStorage、settings.js、settings_default.jsとし、settings.js差し替え後は設定UIからLocalStorageを消去して再読込できる。

## 現行互換として固定する項目

- Screen、Controller、Config、Config OBSの4画面構成
- Effect単位のフォルダ構成
- `static manifest`による設定UI生成
- `start()`と`destroy()`によるEffect API
- `settings.js`をLocalStorageのフォールバックにする構成
- Controllerの手動発火は開いている各Screenで実行される
- Counter入力は`vct:gp-multi-counter:v2:channel`とServer V2 APIを利用する

## 意図的な修正候補

以下は現行動作としてテストに記録するが、互換維持対象とはせず、該当フェーズで仕様を確定して修正する。

- 初回の非ゼロCounter値を0からの増加として発火する（GP Multi Counter V2移行で解消済み）
- 同一Effectの初回同時ロードでscript要素が複数作られる（EffectRegistryで修正済み）
- HostとEffectの双方が寿命を管理する（ManifestのlifecycleOwnerで分離済み）
- 多重実行中に共有Backdropが先行Effectの終了で消える（EffectRuntimeで修正済み）
- Config OBSは独立Lite版を廃止し、統合Configへ移行済み
- Effect List Editorから設定画面へ戻る導線がない（V2で修正済み）

## 公開前全体レビュー

- BroadcastChannel命名規則と名前空間（完了）
- メッセージEnvelope、message ID、protocol version（完了）
- LocalStorageキーと設定schema version（完了）
- Effect ID、Manifest、ライフサイクル契約（完了）
- 多重実行、再発火、キャンセル、再読み込み規則（完了）
- Counter初期同期、減少、リセット、複数Screenの規則（完了）
- 入力検証、HTMLエスケープ、ログ、エラー表示（完了）
- V1設定インポートと旧チャンネルの廃止手順（V1未公開のため互換実装なしで確定）
- 利用者向け文書と開発者向け仕様の一致（完了）

Effect channelは`vct:obs-screen-effect:v2:channel`、設定Storageキーは`vct:obs-screen-effect:v2:settings`で確定した。

EffectRuntimeは実行中インスタンスを追跡するが、標準動作は上限なしの`overlap`とする。`restart`、`ignore`、`queue`と任意上限は必要なEffectへ将来追加する拡張候補とし、公開前の必須要件にはしない。
