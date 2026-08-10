# OBSスクリーンエフェクト開発ガイド (v1.0)

本ガイドは、汎用エフェクトガジェット向けのカスタムエフェクトを作成するための仕様書です。AIアシスタントにエフェクト作成を依頼する際の入力としても最適化されています。

## 1. ディレクトリ構造
エフェクトは以下の命名規則に従って配置してください。

- **フォルダパス**: `effects/[name]_effect/`
- **主要ファイル**:
    - `main.js`: 演出ロジック、寿命管理、パラメータ定義（必須）
    - `style.css`: 演出スタイル（任意。JS内で完結させる場合は不要）
    - `assets/`: 音声、画像などの素材（任意）

## 2. 実装の基本ルール
1. **IDの一致**: フォルダ名、Effect ID、`REGISTERED_EFFECTS`の登録キーを一致させてください。JavaScriptのクラス名は任意です。
2. **名前空間の衝突防止**: CSSクラス名には必ず独自のプレフィックス（例: `.fx-[name]-`）を付けてください。
3. **副作用のクリーンアップ**: Context経由で作ったDOM、タイマー、AnimationはHostが自動解除します。Pluginが直接登録した外部イベントなどは`destroy()`で解除してください。
4. **安全な文字表示**: 設定値や外部入力を表示するときは`innerHTML`へ埋め込まず、`textContent`を使用してください。

## 3. Manifest定義 (設定項目)
`main.js` 内のクラスに `static manifest` を定義することで、設定UIからパラメータを編集できるようになります。

```javascript
static manifest = {
    apiVersion: 2,
    name: "エフェクト表示名",
    description: "短い説明文",
    fields: [
        { name: "count", label: "発生数", type: "number", default: 50, min: 1, max: 200 },
        { name: "isGlow", label: "発光", type: "boolean", default: true },
        { name: "color", label: "基本色", type: "color", default: "#4ecca3" },
        {
            name: "mode", 
            label: "動作モード", 
            type: "select", 
            default: "A",
            options: [
                { label: "モードA", value: "A" },
                { label: "モードB", value: "B" }
            ]
        },
        { name: "message", label: "表示文字", type: "text", default: "SUCCESS!" }
    ]
};
```

対応するField typeは`boolean`、`number`、`color`、`select`、`text`です。`number`は有限数を使い、`min <= max`、`step > 0`としてください。`select`の`default`は`options`内のいずれかの`value`と一致させます。Fieldは最大64件です。

## 4. クラス構造とライフサイクル
全ての項目（共通パラメータ + 独自パラメータ）は `constructor` の `params` に渡されます。

通常はHostが`params.duration`後に`destroy()`を呼びます。独自シーケンスの完了時にEffect自身が終了する場合だけ、Manifestへ次を追加して、終了時に`context.complete()`を呼んでください。

```javascript
runtime: { lifecycleOwner: "effect" }
```

`lifecycleOwner`は`host`または`effect`です。省略時は`host`になります。`effect`を指定したEffectは必ず自身で`context.complete()`を呼んでください。

API v2ではconstructorの第1引数に`EffectContext`が渡されます。`context.root`へDOMを追加し、アセットは`context.assets.url()`を利用してください。ContextがルートDOM、タイマー、Animation、キャンセルを一括管理します。

`context.assets.url()`にはPluginフォルダ内の相対パスだけを渡せます。絶対URL、`..`、`.`、URL scheme、query、hashは拒否されます。例: `context.assets.url('assets/image.png')`。

設定ファイルではEffect固有値を`params.options`へ保存しますが、RuntimeがPlugin境界で平坦化します。Pluginでは共通値と固有値をどちらも`params`直下から参照してください。

```javascript
this.params.mainText  // 共通値
this.params.count     // Manifestで定義した固有値
```

`mainText`、`duration`、`trigger`などの共通パラメータ名は予約語です。ManifestのField名には使用できません。

```javascript
class MyEffect {
    static manifest = {
        apiVersion: 2,
        name: "My Effect",
        fields: []
    };

    constructor(context, params) {
        this.context = context; // 管理対象DOM、タイマー、Animationなど
        this.params = params;   // 設定値
        // this.params.mainText, mainColor などの共通値も含まれる
    }

    start() {
        this.context.root.textContent = this.params.mainText;
    }

    destroy() {
        // 外部イベントなどPlugin固有の副作用だけ解除する。
        // Context管理のDOM、タイマー、Animationは自動解除される。
    }
}

// グローバルへの登録
window.REGISTERED_EFFECTS['[name]_effect'] = MyEffect;
```

`REGISTERED_EFFECTS`が未作成の環境も考慮する場合は、登録前に次を実行してください。

```javascript
window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
```

## 5. ユーザー独自エフェクトの登録
自作エフェクトをシステムに認識させるには、`js/effects_user.js` の `USER_EFFECTS` 配列に登録情報を追記してください。

```javascript
const USER_EFFECTS = [
    { id: "my_custom_effect", name: "俺のカスタム演出" }
];
```
