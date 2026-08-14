# Material Hub v1.0.0

Gemini APIを利用して配信用の話題を調査・記事化し、OBSのブラウザソースへ表示するツール一式です。

初期配布ではローカルファイルでの運用を基本とします。ローカルサーバーから開くと、同一originのMaterial View間で設定や表示操作を即時同期できます。

運用モードはStandard（ローカルファイル）、Sync（ローカルサーバー＋ブラウザー保存）、Server（サーバー正本）の3段階です。Material ViewとMaterial Editorは共通`vct-runtime.js`を使って環境判定を行います。

Material HubのGemini設定、APIキー、調査履歴、記事ストックと、Material Editorの下書きは、ローカルサーバーから開いた場合も各ブラウザーの保存領域で管理します。Serverモードでは、Editorから確定した案内カタログだけをサーバーへ直接保存できます。

ローカルサーバー運用時にURLへ`vctDebug=1`を加えると、画面右下へ動作モードと同期機能の診断結果を表示します。例: `material_view.html?mode=view&vctDebug=1`

## Serverモード（試験実装）

`material_view.html?mode=view&vctMode=server`のように`vctMode=server`を指定すると、記事・表示順・選択・共有設定を統合サーバーへ保存します。ChromeとOBSは同じサーバー状態を取得し、更新はWebSocketで反映されます。サーバーへ接続できない場合は、そのブラウザーのlocalStorageキャッシュで動作を継続します。

`material_editor.html?vctMode=server`は起動時にサーバー正本の案内カタログを取得して編集欄へ読み込みます。「ServerのViewerへ保存」を押すと、案内カタログ全体をサーバーへ直接送信します。追加・編集は即時反映され、Editorで削除した記事はViewerの案内カタログ、表示順、表示対象からも除去されます。取得に失敗した場合は空または古い下書きによる上書きを防ぐため、Server保存を無効にします。競合判定は案内カタログ専用revisionを使用するため、Viewer側の通常操作では編集中の記事保存を妨げません。

Editorの「下書きを復元」はEditorバックアップに加え、Material Viewバックアップ内の`extraCatalog`も読み込めます。Server障害や誤置換から案内カタログを戻す場合は、ViewバックアップをEditorへ読み込み、内容を確認してから「ServerのViewerへ保存」を実行します。

設定画面例: `material_view.html?mode=settings&vctMode=server&vctDebug=1`

## ファイル構成

- `index.html` — Material Hub。リサーチ、記事ストック、出力候補の管理を行います。
- `material_view.html` — Material View。OBSに表示する画面と設定画面です。
- `material_editor.html` — 自身の活動案内や作品紹介などを手動作成します。
- `active_material.js` — Material Hubから追加する配信ネタです。
- `extra_material.js` — Material Editorで管理する案内・紹介記事です。
- `config.js` — Material Viewの初期設定です。
- `gadget.js` / `gadget.css` — Material View本体です。
- `active_material_def.js` — 空の配信ネタデータのひな型です。

## 必要なもの

- Google Gemini APIキー
- Chromeなどの対応ブラウザ
- OBS Studio
- インターネット接続

Material HubはGemini APIと外部ライブラリを利用するため、ローカルファイル運用でもインターネット接続が必要です。

## 基本的な使い方

### 1. 配信ネタを作る

1. Chromeで`index.html`を開きます。
2. 設定画面でGemini APIキーと生成条件を設定します。
3. リサーチを実行し、使用したい記事を出力候補へ追加します。
4. 出力候補から`active_material.js`を書き出します。
5. Material Viewと同じフォルダの`active_material.js`へ上書きします。

対応ブラウザでは「保存先フォルダ」を登録して直接上書きできます。利用できない場合は、ダウンロードしたファイルを手動で置き換えてください。

### 2. OBSへ表示する

1. OBSでブラウザソースを追加します。
2. 「ローカルファイル」を有効にして`material_view.html`を指定します。
3. 幅`1920`、高さ`1080`を基準に設定します。
4. OBSの変換機能で任意の大きさと位置へ調整します。
5. 記事データを更新した場合はブラウザソースを再読み込みします。

画面右上へカーソルを移動すると設定ボタンが表示されます。OBSの「対話」を使用すると、記事選択、並べ替え、配色、文字サイズなどを変更できます。

### 3. 案内・紹介記事を作る

1. Chromeで`material_editor.html`を開きます。
2. タイトル、カテゴリ、本文などを入力して下書きへ保存します。
3. `extra_material.js`を書き出し、Material Viewと同じフォルダへ配置します。
4. Material Viewの設定で「案内・紹介」または「両方を混在」を選びます。

Serverモードでは、手順3の代わりにEditorの「ServerのViewerへ保存」を使用します。`extra_material.js`の配置やViewの起動状態に依存せず、サーバー正本へカタログ全体を反映します。

## Material Viewの画面モード

ローカルサーバーで使用する場合は、URLパラメーターで画面を分けられます。

- `material_view.html?mode=view` — 視聴者向け表示
- `material_view.html?mode=settings` — OBSドック向け設定・記事管理
- `material_view.html?mode=all` — 想定反応と活用ヒントを含む配信者向け表示

同一originで開いた画面は、設定、記事キュー、表示順を自動同期します。「allモードの操作にviewを連動する」を有効にすると、allで開いた記事をviewにも表示できます。この連動設定の初期値はOFFです。

連動を有効にすると、all画面の「VIEW 表示中／VIEW 非表示」ボタンからviewの描画を一時的に透明化できます。OBSソース自体は停止せず、非表示中もデータ同期を継続します。この状態は保存されず、viewを再読み込みすると必ず表示へ戻ります。

## 保存データとバックアップ

Hub、Editor、Viewは、それぞれのブラウザ保存領域へデータを保存します。通常ブラウザとOBS内蔵ブラウザの保存領域は共有されません。

- Hub — 設定、リサーチ履歴、記事ストック、出力候補
- Editor — 案内記事の下書き
- View — 表示設定、記事キュー、案内カタログ、表示順、取込履歴

各画面のデータ管理機能から個別にバックアップしてください。Material Viewでは、OBSのファイル保存機能に制約があるため、バックアップJSONの表示とクリップボードへのコピーを基本とします。コピーした内容をテキストエディターへ貼り付け、UTF-8の`.json`ファイルとして保存してください。

## APIキーについて

Gemini APIキーはMaterial Hubを開いたブラウザの`localStorage`だけに保存します。

- HubのバックアップJSONには含めません。
- Hubのデータ初期化では削除しません。
- `active_material.js`、`extra_material.js`、Viewerバックアップには含めません。
- APIキーを保存しない場合は、Hubの設定で保存をOFFにしてください。

APIキーを含む画面やブラウザ保存データを第三者と共有しないでください。

## データ更新時の注意

- `active_material.js`は追加バッチとして扱います。同じバッチを再読み込みしても重複追加されません。
- `extra_material.js`は案内カタログ全体を置き換えます。
- Viewerで削除した配信ネタは、新しいバッチを読み込むまで削除状態が維持されます。
- Viewer内の表示順は、HubおよびEditorでの出力順とは別に保存されます。
- Viewerの「記事を読込元から再構築」は保存済み記事を消去した後、現在配置されている2つのJSから再読み込みします。

## バージョン

- Material Hub: v1.0.0
- Material View: v1.0.0
- Material Editor: v1.0.0
- 記事データスキーマ: 1.0

アプリのバージョンとデータスキーマのバージョンは別に管理します。
