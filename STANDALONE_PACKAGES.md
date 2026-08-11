# 公式単品パッケージ

統合版と同じ正本から、公式ガジェット単品と必要なCore／Libraryだけを生成する。

## GP Multi Counter

```powershell
npm run build:standalone
npm run package:standalone
```

Folder出力:

```text
dist/standalone/VCreatorTools_GP_Multi_Counter/
├─ _vct_core/
├─ _vct_lib/
└─ GP_multi_counter_v2/
```

ZIP出力は`dist/standalone/VCreatorTools_GP_Multi_Counter.zip`。ZIP直下も同じ3 Folderとし、展開後の相対Pathを統合版から変更しない。

- Standard: Folder内のHTMLを`file:`で開く
- Sync: 3 Folderを含む出力Rootを任意のLocal Serverで配信する
- Server: VCreatorTools Serverまたは互換APIを持つServerで配信する

Buildは出力先だけを作り直し、正本を変更しない。HTMLの相対`src`／`href`がPackage外へ出ていないことと参照先の存在を検証する。
