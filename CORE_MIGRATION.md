# VCreatorTools Core構造移行計画

Status: 依存棚卸し完了／GP Multi CounterをPilotとして移行予定

## 背景

各ガジェットは当初、単品配布を前提に独立して作られた。統合版では一部の共通処理を`public/__shared`、UI部品を`public/V_CreatorTools/_vct_lib`へ置く一方、Counterの共通処理は`GP_multi_counter_v2`本体内に残り、他ガジェットが同Folderを直接参照している。

この配置では公式統合版は動作するが、表示テンプレートを`user_gadgets`へ移した場合と、公式単品版を最小構成で配布する場合に相対Pathが成立しない。

## 現在の依存関係

### Runtime

`public/__shared/js/vct-runtime.js`を次が参照する。

- GP Multi Counter v2
- Total Operations Console v2
- OBS Gadget v2
- Open Panel Counter v2
- OBS Screen Effect v2
- Maro Panel Gadget v2

### GP Counter基盤

次の6 fileは現在`GP_multi_counter_v2`直下にある。

- `counter-core.js`
- `counter-schema.js`
- `counter-protocol.js`
- `counter-store.js`
- `counter-client.js`
- `gp-counter-server.js`

GP Multi Counter自身に加えて、次が`../GP_multi_counter_v2/...`として直接参照する。

- Total Operations Console v2
- OBS Gadget v2
- Open Panel Counter v2
- OBS Screen Effect v2の公式Host

これは画面固有実装ではなく、実質的な共有Counter SDKである。

### UI Library

`public/V_CreatorTools/_vct_lib`にはColor PickerとChoice Dialogがあり、現在は主にGP Multi CounterのLayout画面が利用する。これは直ちにCoreへ統合せず、利用範囲とAPI安定性を別に判断する。

## 目標構造

開発・統合版における正本を次へ置く。

```text
public/V_CreatorTools/
├─ _vct_core/
│  ├─ runtime/v1/vct-runtime.js
│  └─ gp-counter/v2/
│     ├─ counter-core.js
│     ├─ counter-schema.js
│     ├─ counter-protocol.js
│     ├─ counter-store.js
│     ├─ counter-client.js
│     └─ gp-counter-server.js
├─ GP_multi_counter_v2/
└─ その他の公式ガジェット/
```

公式ガジェットは共通して`../_vct_core/...`を参照する。

Electronの利用者領域には同じ相対構造を展開する。

```text
user_gadgets/
├─ _vct_core/
└─ <user gadget>/
```

`_vct_core`はApp管理領域とし、ガジェット一覧には掲載しない。ガジェットFolderはApp更新時に変更しない。

## 単品配布

公式単品版は同じ正本から、その製品に必要なCoreだけを含める。

```text
VCreatorTools_GP_Multi_Counter/
├─ _vct_core/
│  ├─ runtime/v1/
│  └─ gp-counter/v2/
├─ GP_multi_counter_v2/
└─ README.txt
```

この構造を任意の場所へ展開すればStandardで利用できる。Folder全体を任意のLocal Serverから配信すればSyncを利用できる。VCreatorTools Serverまたは互換Server上ではServerも利用できる。

## 互換性の必須条件

- 現在のStandard、Sync、Serverの意味を変えない
- 保存Key、BroadcastChannel名、Counter schema、Envelopeを変えない
- 現在の公式URLとmanifest pageを変えない
- Server JSON正本とrevision競合処理を変えない
- HTMLの表示・設定ロジックを同時に書き換えない
- 移行中は旧Pathを互換配置として残し、全Consumer切替後に削除判断する
- Core Pathはversion付きとし、破壊的変更で既存ガジェットを上書きしない

## 移行手順

1. `_vct_core/runtime/v1`と`_vct_core/gp-counter/v2`を追加する（完了）
2. Server側のCounter schema参照をCore正本へ切り替える（完了）
3. GP Multi Counter本体の参照をCoreへ切り替えて3 modeを検証する（完了）
4. TOC2、OBS Gadget、Open Panel Counterの参照を順に切り替える（完了）
5. OBS Screen Effect公式HostのRuntime／Counter参照だけを切り替える（完了）
6. `user_gadgets/_vct_core`をElectronが安全に展開・更新する（完了）
7. manifest付きのPortable Counter Display Starterを追加する（完了）
8. Standard、Sync、Server、OBS、単品相対Pathを自動・手動テストする（App運用分は完了、単品Build検証は未実施）
9. 旧`__shared`とGP Folder内の互換fileを削除できるか判定する（既存配布物互換のため当面保持）

## Screen Effectの今回の範囲

公式Hostが利用するRuntimeとCounter依存のPath整理だけを対象とする。Effect Plugin APIの共通化候補は棚卸しするが、第三者製演出の配置、読込、権限、manifest、設定UI統合は保留する。

## Shared APIとの関係

`/api/public/v1`は別ガジェットがServer上の公開情報を参照するための契約である。GP Multi Counterの独自表示部は、StandardとSyncも吸収する`_vct_core/gp-counter/v2`を標準経路とする。両者は代替関係ではない。
