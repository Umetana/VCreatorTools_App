# 将来構想メモ：Effect Pluginの複数Host利用

## この文書の位置付け

これは将来の拡張アイデアを失わないためのメモであり、現行V2の仕様・実装計画・公開要件ではない。

- 実装可否、互換性、難易度、保守コスト、有用性は未検討
- Phase 7の公開前レビューおよびServer対応の対象外
- この案を理由に現行のPlugin APIやフォルダ構成を追加変更しない
- わんコメ側の基盤へ着手するときに、改めて要件と実環境を調査する

## 構想

Effectの実装と入力元を分離し、同じEffect Plugin契約を複数のHostで利用できる可能性を検討する。

```text
共通Effect Plugin
  ├─ VCreatorToolsのController
  ├─ Counter Trigger
  ├─ Server/API
  └─ わんコメHost／Trigger
```

中央のVCreatorToolsへ必ず接続させる構成ではなく、それぞれのHostが単体でRuntimeを持つ。配布パッケージやPluginの配置先はHostごとに分かれても、演出本体のソースと契約を可能な範囲で共通化する。

```text
VCreatorTools                     わんコメカスタムテンプレ
├─ Runtime                        ├─ Runtime
├─ Controller/Counter/Server      ├─ OneComme Extension/Trigger
└─ effects/                       └─ effects/
   └─ confetti_effect/               └─ confetti_effect/
```

## 共通化する場合の境界候補

Pluginの基本生成契約を揃える。

```js
new EffectClass(context, params)
```

標準Contextの候補：

- `context.root`
- `context.signal`
- `context.timers`
- `context.animations`
- `context.assets.url()`
- `context.complete()`
- `context.logger`

フォルダ構成と登録方式の候補：

```text
[name]_effect/
├─ main.js
├─ style.css
└─ assets/
```

```js
window.REGISTERED_EFFECTS['confetti_effect'] = ConfettiEffect;
```

コメント、ユーザー、支援情報などはPluginがわんコメAPIを直接読むのではなく、Host側で正規化して`params`へ渡す。

```js
runtime.trigger('welcome_effect', {
    mainText: '〇〇さん、いらっしゃい！',
    userName: '〇〇',
    commentText: 'こんにちは',
    eventType: 'firstComment',
    service: 'youtube'
});
```

## Pluginの分類候補

### 共通Effect Plugin

標準Contextと汎用paramsだけを使用する。紙吹雪、歓迎、警報、画面フラッシュなど、入力元に依存しない演出を想定する。

### わんコメTrigger＋共通Effect Plugin

わんコメ側がコメント受信、条件判定、初見・メンバー・ギフト等の判定、サービス差の吸収を行い、正規化したparamsで共通Effectを発火する。

### わんコメ専用Plugin／Template

コメントカードDOMの装飾、レイアウト変更、テンプレ内部の並べ替えなど、わんコメ固有DOMへ依存する処理。無理に共通化しない。

必要なら、わんコメ専用Pluginだけが使う任意拡張として`context.onecomme`のようなHost固有能力を提供する案もある。ただし共通PluginはHost固有Contextへ依存させない。

## わんコメ側の構成候補

```text
onecomme-template/
├─ runtime/
│  ├─ effect-context.js
│  ├─ effect-runtime.js
│  ├─ effect-registry.js
│  └─ host-adapter.js
├─ extensions/
│  └─ onecomme-extension.js
└─ effects/
   ├─ confetti_effect/
   ├─ welcome_effect/
   └─ support_effect/
```

VCreatorToolsそのものを埋め込むのではなく、同じPlugin契約を持つ別Hostとして構築し、わんコメ固有機能を拡張層へ置く考え方とする。

## 将来検討が必要な点

- わんコメのカスタムテンプレ環境で利用できるAPIと制約
- JavaScript、CSS、アセットのロード規則を揃えられるか
- Context実装を共有するか、契約だけ共有するか
- Pluginソースの同期・配布・バージョン管理方法
- Host能力の宣言と不足時の扱い
- 正規化イベント／paramsのスキーマ
- セキュリティ、入力検証、コメント本文の扱い
- わんコメ更新時の互換性と保守範囲
- 共通化による利益が複雑性と配布コストを上回るか

これらは、わんコメ側へ実際に着手する段階で調査・試作して判断する。
