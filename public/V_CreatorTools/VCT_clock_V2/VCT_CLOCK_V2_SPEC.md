# VCT Clock V2 製品仕様書

## 1. 製品概要

VCT Clock V2は、OBS Studioのブラウザソースで使用するStandaloneデジタル時計です。わんコメSDKおよびコメント連携を使用せず、`index.html`、ローカルCSS、Vanilla JavaScriptだけで動作します。

画面サイズは1920×1080、時計表示領域は左上の340×120です。設定後、OBS側で時計領域をクロップして使用します。

## 2. 配布構成

- `manifest.json`: `modes: ["standalone"]` の製品manifest
- `index.html`: 時計、設定UI、動作ロジック
- `style.css`: UIと時計のローカルCSS
- `README.md`: 利用手順
- `Thumb.png`: サムネイル

外部JavaScriptライブラリおよびTailwind CDNは使用しません。

## 3. 機能

- 4公式プリセット: サイバー・ネオン、ミニマル・モダン、レトロ・ポップ、シック・和モダン
- 3つのユーザー保存スロットとスロット名
- 時刻、秒、日付、12/24時間表記、コロン点滅
- 文字色、光彩、背景色、透明度、角丸、文字間隔、黒縁
- OBSクロップガイド
- LocalStorageによる最終設定と保存スロットの復元

## 4. フォント

標準フォントはOS搭載フォントを使うため通信不要です。Google Fontsはユーザーがオンラインフォントを選択した場合だけ、該当書体を個別に読み込みます。読み込み中または失敗時は標準フォントを表示します。

オンライン書体はShare Tech Mono、DotGothic16、M PLUS Rounded 1c、M PLUS 1p、Sawarabi Minchoです。

## 5. 保存とV1移行

V2の保存キー:

- `vct_clock_v2_config`
- `vct_clock_v2_slot_1`
- `vct_clock_v2_slot_2`
- `vct_clock_v2_slot_3`

V2データは`version: 2`と設定本体を保存します。V2データがない場合は次の旧キーを読み込み、検証・不足値補完後にV2キーへコピーします。旧キーは削除しません。

- `obs_clock_config`
- `obs_clock_slot_1`
- `obs_clock_slot_2`
- `obs_clock_slot_3`

## 6. オフライン動作

初期起動、標準フォント、時計、設定UI、プリセット、保存機能はネットワークなしで動作します。通信が発生するのはオンラインフォント選択時だけです。
