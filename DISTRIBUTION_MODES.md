# Installed／Portableデータモード

VCreatorTools App本体と機能は共通で、可変データの保存Rootだけを切り替える。

## Installed（既定）

実行ファイル横に`portable.json`がない通常配布。Electron標準のuserDataを使用する。

```text
%APPDATA%/vcreator-tools-app/
├─ data/
├─ logs/
├─ user_gadgets/
└─ server.config.json
```

インストーラー版の推奨モード。アプリ更新と可変データを分離し、Program Filesの書込制限を避ける。

## Portable

実行ファイルと同じFolderに`portable.json`を置く。可変データを同じFolder直下へ保存する。

```text
VCreatorTools/
├─ VCreatorTools.exe
├─ portable.json
├─ data/
├─ logs/
├─ user_gadgets/
└─ server.config.json
```

Folder単位の移動・複製・バックアップが可能。Program Files等の書込禁止領域へ置かず、利用者が書き込める場所へ展開する。

Electron Builder等が`PORTABLE_EXECUTABLE_DIR`を設定した場合もPortableとして扱う。開発・診断時は`VCT_PORTABLE_ROOT`で明示的なRootを指定できる。

App管理画面は現在のデータモードと絶対保存先を表示する。どちらのモードでも公式`public`はアプリ本体側、設定・状態・ログ・ユーザーガジェットはData Root側に分離する。
