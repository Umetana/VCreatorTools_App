# OBS Screen Effect V2

## License

本ガジェットのコードおよび同梱画像素材はMIT Licenseで公開します。画像素材はDALL-E 3で生成した画像を元に、公開者が分解、透過処理、Clip Studio Paintによる加工を行ったものです。

設定画面で`[AI生成素材]`と表示されるEffectには、AIで生成後に加工した画像素材が含まれます。AI生成素材を使用したくない場合は、この表示がないEffectを選択してください。

公開者は、公開者が保有または許諾できる範囲の権利について、MIT Licenseの条件で自由な利用、改変、再配布等を許諾する意思を示します。AI生成物に関する権利の成立や解釈は国・地域によって異なり得るため、特定地域における権利の有効性を保証するものではありません。

OBSブラウザーソースへ演出を表示し、Controller、Total Operations Console V2、GP Multi Counter V2から発火できるスクリーンエフェクト基盤です。V1は未公開の開発版だったため、V2を最初の正式版とします。

## 画面

- `index.html`: OBSへ追加する演出表示画面
- `controller.html`: 手動発火パネル
- `config.html`: ブラウザー／OBS共通の設定画面
- `config_obs.html`: OBS Dock向け設定入口。統合Configへ転送
- `effect_editor.html`: Effect一覧の編集補助

## 基本的な使い方

1. `config.html`でボタン、演出、固有設定を編集します。
2. 設定を保存します。同じブラウザーコンテキストではLocalStorageへ即時反映されます。
3. 必要に応じて`settings.js`を書き出し、OBSが参照するフォルダへ保存します。
4. OBSブラウザーソースへ`index.html`を追加します。
5. `controller.html`またはTotal Operations Console V2から発火します。

同梱初期設定には公式演出が登録されています。Counterによる自動発火はすべて無効です。汎用パーティクルは同じPluginを複数ボタンへ登録し、素材・移動・発生方式を個別保存して使い分けられます。紙吹雪は3D反転や風を持つ専用Pluginです。設定済みボタンは編集画面の「複製」から空きマスへコピーできます。

画像パフォーマンスは開発Server専用です。`user_assets/screen_effect_v2/image_performance`へPNG画像を置き、Server起動中の設定画面から画像を選択します。設定には画像URLではなくファイル名の`assetId`を保存し、発火時にServerの一覧APIで再検証します。ローカルファイル直開きでは利用できません。

Money ShowerはAI生成の金貨・紙幣素材を使用します。肖像を合成する場合は`user_assets/screen_effect_v2/money_shower`へPNG画像を置き、Server起動中の設定画面から選択します。肖像なしなら固定素材だけで動作します。

## 設定の優先順位

設定は次の順で読み込まれます。

1. LocalStorage
2. `js/settings.js`
3. `js/settings_default.js`

`settings_default.js`は製品初期値です。利用者設定の保存先には`settings.js`を使用します。`settings.js`を差し替えた後に反映されない場合は、設定画面のファイル設定再読込を使用するか、初期設定へ戻してLocalStorageを更新してください。

## Standard／Sync／Server

- Standard: ローカルファイル中心の利用
- Sync: ローカルサーバー配信とGP Multi Counter V2のBroadcastChannel連携
- Server: GP Multi Counter V2とScreen Effect V2の発火をHTTP／WebSocketで連携

Standard／Syncでは`effect.trigger`と`settings.updated`の両方に`BroadcastChannel`を使用します。Serverモードでは`effect.trigger`をHTTPでServerへ送り、WebSocketでScreenへ配信します。`settings.updated`は第1段階ではBroadcastChannelのままで、Serverは設定を保存しません。同じ発火をBroadcastChannelへ重ねて送らないため、二重実行は発生しません。

Server発火APIは`POST /api/obs-screen-effect/v2/trigger`です。本文には通常の`vct.obs-screen-effect` Envelopeを渡します。Serverは`effect.trigger`だけを受理して検証し、共有`/events` WebSocketへ同じEnvelopeを中継します。

ControllerとTOC2はEffect Transportの接続状態を表示します。`connected`はWebSocket接続、`reconnecting`は切断後の再接続待ちを表します。HTTP応答の`delivered`は共有`/events`へ配送した全WebSocketクライアント数であり、演出を実行したScreen数や実行成功数ではありません。

## Counter連携

GP Multi Counter V2のSnapshotは初期状態としてのみ扱い、演出を発火しません。発火判定には`counter.changed`の`previous`、`current`、`operation`を使用します。対象操作は`increment`と`set`で、decrement、reset、replace、初期Snapshotなどでは発火しません。

初期設定ではCounter Triggerが無効です。必要なボタンだけ設定画面から`1増えるたび`、`指定値へ到達`、`指定間隔`を設定してください。

## 多重実行と再読み込み

標準動作は同一Effectを含む上限なしの重ね掛けです。連打した回数だけ演出インスタンスを生成します。再読み込みまたはページ離脱時は、実行中の全Effectを破棄し、途中状態を復元しません。

## Plugin開発

Plugin APIはv2のみ対応します。テンプレートと開発契約は`effects/template_effect/`にあります。

第三者製Effectの追加・配布・自動導入は現行リリースの対応範囲外です。関連コードは将来検討用に残していますが、設定画面の導線は非表示にしています。

- Effect ID、フォルダ名、`REGISTERED_EFFECTS`のキーを一致させる
- `new EffectClass(context, params)`で生成される
- 保存上の固有設定は`params.options`、Pluginへは平坦化して渡される
- 動的文字列は`textContent`で表示する
- アセットは`context.assets.url()`を使用する
- ManifestはRegistryで検証される

詳細は`effects/template_effect/OBSスクリーンエフェクト開発ガイド (v1.0).md`を参照してください。

## 通信識別子

- Effect channel: `vct:obs-screen-effect:v2:channel`
- Settings storage: `vct:obs-screen-effect:v2:settings`
- Protocol: `vct.obs-screen-effect`
- Protocol version: `1`
- Settings schema version: `1`

## 互換性

V1設定インポート、旧`obs_effect_channel`、旧`obs_effect_settings`、旧Counter channelには対応しません。Total Operations Console V2はV2の現行Protocolを直接使用します。
