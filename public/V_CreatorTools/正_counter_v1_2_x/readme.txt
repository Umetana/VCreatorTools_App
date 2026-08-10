# 正カウンター Ver 1.2.1

正カウンターは、配信などで「正」の字を画面に表示してカウントを行えるシンプルなツールです。
カウントの増減だけでなく、表示される「正」の字の色や透明度をカスタマイズしたり、画像として表示を切り替えたりすることができます。

-----

## 主な機能

  * **カウント機能**: 「正」の字でカウントを増減できます。
  * **デザインモード切り替え**:
      * **CSSモード**: CSSで描画されたベタ塗りの「正」の字を表示します。
      * **画像モード**: 透過PNG画像を使用した「正」の字を表示します。独自のフォントやデザインを適用したい場合に便利です。
  * **色・透明度カスタマイズ (CSSモード/画像モード共通)**:
      * RGB形式で色を指定し、リアルタイムで反映できます。
      * 透明度（アルファ値）をスライダーで調整できます。
  * **ランダム表示**: 各「正」の字は、画面内のランダムな位置に表示され、わずかに回転します。
  * **状態保存**: カウント数、色設定、表示モードはブラウザのローカルストレージに自動で保存され、次回起動時に前回の状態が復元されます。
  * **リセット機能**: カウント、色、表示モードなどの設定をすべて初期状態にリセットできます。

-----

## 使い方

1.  **ファイルの配置**:

      * `index.html`
      * `style.css`
      * `script.js`
      * `shou_1.png`
      * `shou_2.png`
      * `shou_3.png`
      * `shou_4.png`
      * `shou_5.png`
        これら全てのファイルを同じフォルダに配置してください。

2.  **OBS Studio での利用**:

    1.  OBS Studioの「ソース」欄で `+` ボタンをクリックし、「ブラウザ」を選択します。
    2.  「ローカルファイル」にチェックを入れ、「参照」ボタンから`index.html`ファイルを選択します。
    3.  幅、高さをOBS Studioのキャンバスサイズに合わせるか、表示したいサイズに調整します。
    4.  「FPS を制御する」にチェックを入れることを推奨します。
    5.  **「現在のページのキャッシュを更新」ボタンをクリック**して設定を適用します。

3.  **操作方法**:

      * **[+] ボタン**: カウントを1増やし、「正」の字を1画追加します。
      * **[-] ボタン**: カウントを1減らし、「正」の字を1画削除します。
      * **カラーモード選択**: 「CSSモード」または「画像モード」のラジオボタンで表示方法を切り替えます。
      * **R,G,B 入力**: CSSモードと画像モード共通で、RGB値を直接入力して色や画像の透明部分の背景色を設定します。(例: `255,255,255` で白)
      * **透明度スライダー**: 「正」の字全体の透明度を調整します。
      * **[色を適用] ボタン**: RGB値と透明度の変更を適用します。
      * **[リセット] ボタン**: カウント数、色、表示モード（CSSモードに戻ります）をすべて初期状態にリセットします。

-----

## 画像モードのカスタマイズについて

画像モードでは、`shou_1.png`から`shou_5.png`までの透過PNG画像を使用します。
これらの画像は、**710x710ピクセル**のキャンバス内で「正」の字の各画が元の位置関係を保って描画されていることを想定しています。

現在の設定では、`style.css` で `.shou-group.image-mode` の `width` と `height` が `71px` に設定されています。
これにより、元の画像が高解像度であっても、このサイズに縮小されて画面に表示されます。

**別の画像ファイルに置き換えることで、他の字体や異なるモチーフのカウントツールとして利用できます。
**その際、必要に応じて `style.css` 内の `.shou-group.image-mode` および `.shou-group.image-mode .stroke` の `width` と `height` を、新しい画像の表示サイズに合わせて調整してください。

-----

## バージョン履歴

### Ver 1.2.1 (2025/06/29)

  * **バグ修正**: 画像モードにおける「正」の字のランダム配置が、画面からはみ出したり、特定の位置に偏ったりする問題を修正しました。画面全体に均等かつ適切に配置されるようになりました。

### Ver 1.2.0

  * **機能追加**: 画像モードを導入しました。透過PNG画像による「正」の字の表示が可能になりました。
  * **改善**: CSSモードと画像モードの切り替え機能、それに伴う表示サイズの自動調整、リセットボタンの機能強化など、全体的なUI操作性と安定性を向上させました。

### Ver 1.1.0 (画像モード追加前最終バージョン)

  * 基本的な「正」の字カウント機能。
  * CSSによる「正」の字の描画。
  * 色と透明度のカスタマイズ機能。
  * カウント状態の保存機能。

-----

## ライセンス

このプロジェクトは、MITライセンスのもとで公開されています。

```
画像素材について

shou_1.pngからshou_5.pngまでの画像はDALL-E 3で生成した画像を元に、公開者が分解、透過処理、Clip Studio Paintによる加工を行ったものです。これらの画像も以下のMIT Licenseの適用対象に含みます。

公開者は、公開者が保有または許諾できる範囲の権利について、MIT Licenseの条件で自由な利用、改変、再配布等を許諾する意思を示します。AI生成物に関する権利の成立や解釈は国・地域によって異なり得るため、特定地域における権利の有効性を保証するものではありません。

MIT License

Copyright (c) 2025 Umetana Elke

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

-----

### MITライセンス（日本語訳・参考用）

MITライセンス

Copyright (c) 2025 Umetana Elke

本ソフトウェアおよび関連ドキュメントファイル（以下「本ソフトウェア」）のコピーを入手したすべての者に対し、本ソフトウェアを無制限に取り扱う権利（使用、複製、改変、統合、公開、頒布、サブライセンス、および／または販売する権利を含みますが、これらに限定されません）を無償で付与します。
また、本ソフトウェアの提供を受けた者に対し、以下の条件に従うことを条件とします。

上記の著作権表示および本許可通知は、本ソフトウェアのすべてのコピーまたは大部分に記載されるものとします。

本ソフトウェアは「現状有姿」で提供され、明示または黙示を問わず、商品性、特定目的への適合性、および非侵害性に関する保証（ただしこれらに限定されません）を含む、いかなる種類の保証も付与されません。いかなる場合においても、著作者または著作権者は、契約違反、不法行為、その他の理由を問わず、本ソフトウェア、本ソフトウェアの使用、その他の取り扱いに起因または関連して生じるいかなる請求、損害、その他の責任についても責任を負わないものとします。
