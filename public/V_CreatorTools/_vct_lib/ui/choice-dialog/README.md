# VCT Choice Dialog

ネイティブselectの候補ポップアップが使いにくいOBS対話画面向けに、ページ内モーダルとラジオボタンで選択できる共通UIです。

元のselectをデータとイベントの契約として残し、選択確定時に標準の`input`イベントと`change`イベントを発火します。保存・同期・選択肢生成は利用側が担当します。

## 読み込み

```html
<link rel="stylesheet" href="../_vct_lib/ui/choice-dialog/v1/dialog.css">
<script src="../_vct_lib/ui/choice-dialog/v1/dialog.js"></script>
```

## 最小例

```html
<select id="design">
    <option value="simple">シンプル</option>
    <option value="compact">コンパクト</option>
</select>
<div id="choice-dialog-mount"></div>

<script>
const dialog = VCTChoiceDialog.create({
    mount: document.getElementById('choice-dialog-mount')
});

const select = document.getElementById('design');
dialog.attach(select, { label: 'デザイン' });

select.addEventListener('input', () => {
    console.log(select.value);
});
</script>
```

## API

### `VCTChoiceDialog.create({ mount })`

1つのモーダルを作成します。mountの内容はモーダルDOMに置き換えます。

### `dialog.attach(select, options)`

selectを視覚的に隠し、現在の選択名を表示する代替ボタンを追加します。`label`には文字列または関数を指定できます。

### `dialog.open(select)` / `dialog.close()`

モーダルを明示的に開閉します。開くたびにselectの現在のoption一覧からラジオボタンを生成します。

### `dialog.refresh(select?)`

selectの値、option、disabledを利用側が変更した後に呼びます。引数を省略すると接続済みの全selectを更新します。

## 操作

- マウスまたはタッチでラジオを選択
- 「決定」で元selectへ反映
- 「キャンセル」、背景クリック、Escapeで破棄
- ラジオにフォーカスした状態では矢印キーで候補移動
- Enterで確定

## 責務

ライブラリは元selectの値更新と標準イベント通知だけを担当します。localStorage、BroadcastChannel、選択肢の取得、業務データの正規化は利用側で実装してください。
