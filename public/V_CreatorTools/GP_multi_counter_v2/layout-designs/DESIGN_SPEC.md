# GP MULTI COUNTER レイアウトデザイン仕様 v1

`display_layout.html` のウィジェット内部だけを描画するデザインモジュールの仕様です。

## 追加手順

1. `design-template.js` を別名でコピーする
2. `id`、`name`、`css`、`create()`、`update()`を実装する
3. `design-loader.js` の `files` 配列へファイル名を追加する
4. OBSブラウザソースを再読み込みする
5. 編集画面の「デザイン」に追加項目が表示されることを確認する

外部画像を使う完成スキンは、このモジュール方式ではなく個別表示HTMLとして作成することを推奨します。

## 登録形式

```js
(function (registry) {
    'use strict';

    registry.register({
        id: 'sample-design',
        name: 'サンプル',
        css: `.design-sample-design .value { font-size: var(--count-size); }`,
        create(container) {
            container.innerHTML = `<span class="value"></span>`;
        },
        update(container, counter, widget) {
            container.querySelector('.value').textContent = counter?.count ?? 0;
        }
    });
})(window.GPCounterDesigns);
```

## 必須項目

### `id`

- デザインを識別する一意の文字列
- 英字で始め、英数字・ハイフン・アンダースコアのみ使用可能
- 保存データに記録されるため、公開後は変更しない
- CSSのルートクラスとして `.design-{id}` が自動付与される

### `name`

編集画面のデザイン選択欄に表示する名称です。

### `create(container)`

- デザイン選択時に一度呼ばれる
- `container`内部へ必要なDOMを作成する
- リサイズハンドルはレイアウト本体が後から追加するため、モジュールで作らない
- `container`自体を削除・置換しない

### `update(container, counter, widget)`

- カウンターデータや表示設定の更新時に呼ばれる
- `create()`で作成したDOMへ値を反映する
- `counter`と`widget`は読み取り専用として扱う
- タイマーやイベント購読を作らず、呼び出し時点の状態を描画する

## 利用できる主なデータ

### `counter`

```js
{
    id, label, count, unit,
    goalCount, showGoal,
    bgColor, borderColor, textColor,
    labelSize, countSize,
    isBold, isShadow, fontFamily
}
```

対象カウンターが見つからない場合は `null` 相当になる可能性があるため、オプショナルチェーンや初期値を使用してください。

### `widget`

```js
{
    widgetId, counterId, designId, styleSource,
    x, y, width, height, zIndex, layout,
    labelSize, countSize, goalSize, unitSize,
    textColor, backgroundColor, backgroundAlpha,
    borderColor, borderWidth, borderRadius
}
```

共通スタイルはレイアウト本体がCSSカスタムプロパティとして設定します。

```css
var(--label-size)
var(--count-size)
var(--goal-size)
var(--unit-size)
var(--text-color)
var(--background-color)
var(--border-color)
var(--border-width)
var(--border-radius)
var(--font-family)
var(--count-weight)
```

## モジュールの原則

- HTML・CSS・JavaScript・インラインSVGで完結させる
- 外部画像、動画、Webフォントへ依存しない
- `localStorage`を直接操作しない
- `BroadcastChannel`を直接購読しない
- カウンターデータを変更しない
- ウィジェット設定を変更しない
- 配置、ドラッグ、リサイズ、保存を実装しない
- グローバル変数を追加しない
- CSSは必ず `.design-{id}` 以下へスコープする
- `create()`や`update()`内で信頼できない文字列を`innerHTML`へ連結しない

## 動作確認

- ローカルファイルとして読み込める
- デザイン選択欄へ表示される
- 同じカウンターを複数配置しても互いに干渉しない
- デザイン切り替え後も位置とサイズが維持される
- 目標なし、0%、途中、100%以上で例外が発生しない
- 本体設定追従と配置固有スタイルの両方で表示できる
- OBS対話画面とドックの双方で表示できる
