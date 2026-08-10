# user_gadgets 開発仕様

Status: 静的配信・一覧統合実装済み／共有API v1 discovery実装済み

## 配置とURL

実体はElectronのuserData配下に保存し、App更新後も維持する。

```text
<userData>/user_gadgets/<folder>/
http://127.0.0.1:<Main Port>/user_gadgets/<folder>/...
```

Electronの「ユーザーガジェット」ボタンから配置Folderを開ける。ServerはFolder外へ解決されるPathとシンボリックリンク／ジャンクションを配信しない。

「確認用サンプルを追加」は同梱の`templates/user-gadget-basic`を`vct_user_gadget_sample`として一度だけ複製する。既存Folderは上書きしない。サンプルはServer APIへ依存せず、StandaloneとBroadcastChannelによるSyncの最小構成を示す。

## 一覧掲載

静的ファイルはmanifestなしでもURLを直接指定して表示できる。一覧掲載には`manifest.json`が必須で、公式manifestと同じschema version 1、相対HTML Path、role、modeを検証する。不正なFolderだけを一覧から除外し、公式ツールの列挙は継続する。

一覧では`User`として表示し、公式Gadget／Web App／Customと区別する。

## Trust境界

持ち込みHTML／JSは利用者が内容と配布元を確認したものだけを配置する。同一Originで動くため、localStorage、BroadcastChannelと既存の状態／操作APIへ到達できる。

Electron運用中は起動ごとにランダムな管理Tokenを生成し、次を持ち込みページと通常Browserへ公開しない。

- Pairing codeの値
- Remote Sessionの端末情報
- Pairing code再生成
- 全Remote Session破棄

管理TokenはElectron Mainから子Serverへ環境変数で渡し、Renderer、Config、Diskへ保存しない。Electron IPCは用途別の限定Channelだけを公開する。

## 現段階のAPI

正式な共有Endpointは`GET /api/public/v1/capabilities`だけである。利用可能な共有Capabilityを機械判定するための読取専用APIで、現段階では`discovery`だけを`available: true`として返す。

Counter、Material、Maro、Screen Effect、Remote Effect Catalog、Bridge等の既存Endpointは、公式ブラウザーツールと同じOrigin契約を共有している。入力検証は行うが、`user_gadgets`向けの正式な共有APIとはまだ宣言しない。

同一OriginのJavaScriptに対し、URL単位の宣言だけで強制的な権限分離はできない。このため、現段階では信頼済みガジェットだけを配置する。未信頼コードまで扱う場合は、別Originでの配信またはガジェット単位のCapability tokenを将来導入する。

正式公開前に次を行う。

1. 読取専用の共有リソース候補を選定
2. version付き状態読取APIとevent購読を追加
3. 状態更新とActionにCapability tokenが必要か決定
4. BridgeとCatalog更新を含む既存Endpointの認証要否を決定
5. 悪意ある同一Originページを想定したSecurity testを追加
