# VCreatorTools Core

VCreatorTools公式ガジェットとユーザーガジェットが共有するversion付きブラウザー基盤の正本。

- `runtime/v1`: Mode判定、Storage、BroadcastChannel等
- `gp-counter/v2`: GP Multi Counterのschema、protocol、repository、client、Server transport

ガジェット固有UIと素材は置かない。破壊的変更は既存versionを上書きせず、新しいversion Pathへ追加する。

移行期間中は旧`public/__shared`と`GP_multi_counter_v2`直下にも互換fileを残す。正本は本Folderとする。
