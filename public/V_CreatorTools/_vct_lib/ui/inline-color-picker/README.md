# VCT Inline Color Picker

OBSの対話画面でOSネイティブのカラーダイアログを使わず、ページ内で色を選択する共通UIです。

## ファイル

```text
v1/
├─ picker.css
└─ picker.js
```

## 読み込み

共通配置を参照する例：

```html
<link rel="stylesheet" href="../_vct_lib/ui/inline-color-picker/v1/picker.css">
<script src="../_vct_lib/ui/inline-color-picker/v1/picker.js"></script>
```

ガジェットへ同梱した場合は、配置に合わせてパスだけ変更します。

```html
<link rel="stylesheet" href="lib/inline-color-picker/picker.css">
<script src="lib/inline-color-picker/picker.js"></script>
```

## 最小例

```html
<label>文字色 <input id="text-color" type="text" value="#ffffff"></label>
<div id="color-picker-mount"></div>

<script>
const input = document.getElementById('text-color');
const picker = VCTInlineColorPicker.create({
    mount: document.getElementById('color-picker-mount')
});

picker.attach(input, { label: '文字色' });

input.addEventListener('input', () => {
    if (!VCTInlineColorPicker.isHex(input.value)) return;
    document.body.style.color = input.value;
});
</script>
```

ピッカーから色を変更すると、対象inputへ7文字のHEX値が設定され、標準の`input`イベントが発火します。保存・同期・描画は利用側が実装します。

## API

### `VCTInlineColorPicker.create(options)`

ピッカーインスタンスを作成します。

```js
const picker = VCTInlineColorPicker.create({
    mount: element,
    presets: ['#ffffff', '#000000'] // 省略可能
});
```

`mount`は必須です。ライブラリが内部パネルを生成し、mountの内容を置き換えます。

### `picker.attach(input, options)`

色入力へピッカーを接続します。同じインスタンスへ複数inputを接続できます。

```js
picker.attach(input, {
    label: '背景色'
});
```

`label`には文字列または関数を指定できます。

### `picker.open(input)` / `picker.close()`

ピッカーを明示的に開閉します。無効化されたinputに対する`open()`は無視されます。

### `picker.refresh()`

利用側がinputの値や`disabled`をプログラムから変更した後に呼びます。色見本を更新し、選択中のinputが無効になった場合はパネルを閉じます。

### ユーティリティ

```js
VCTInlineColorPicker.isHex(value)
VCTInlineColorPicker.hexToHsl(hex)
VCTInlineColorPicker.hslToHex(h, s, l)
VCTInlineColorPicker.DEFAULT_PRESETS
```

## 責務

ライブラリが担当するもの：

- 色相・彩度・明度スライダー
- HEX入力と検証
- 現在色プレビュー
- プリセット
- 対象inputの値更新
- 標準`input`イベント通知

利用側が担当するもの：

- localStorage等への保存
- BroadcastChannel等の同期
- 透明度
- 色の適用先
- 設定データの正規化

## CSS

公開クラスは `vct-icp-` 接頭辞に限定しています。利用側の汎用クラスとの衝突を避けるため、これらのクラス名を別用途へ使用しないでください。
