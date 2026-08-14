# VCreatorTools App BOOTH配布準備案

対象リリース: VCreatorTools App `0.1.0-beta.1`  
内蔵Server: `1.0.0`  
Stream Deck Plugin: `0.1.0.0`

## 1. 配布方針

### GitHubとBOOTHの役割

| 項目 | GitHub | BOOTH |
|---|---|---|
| 主な対象 | 開発者、最新版を追う利用者 | 初めて導入する一般利用者 |
| 配布 | 最新版、過去版、変更履歴、SHA-256 | 動作確認済みの推奨版3ファイル |
| 説明 | 技術仕様、Issue、開発状況 | できること、選び方、導入手順、注意事項 |
| 更新 | リリースごとに即時 | 初心者向け案内を確認後に反映 |
| 問い合わせ | 不具合・技術報告はGitHub Issues | 購入・ダウンロード導線の問い合わせ |

BOOTHの商品ページは「説明と安心して選べる入口」、GitHub Releasesは「最新版の正本」とする。BOOTHへ置くファイルの更新が遅れる可能性を考慮し、商品説明の冒頭と末尾に現在の掲載版を明記する。

## 2. 商品設定案

- 商品名: `VCreatorTools App｜OBS配信向けガジェット統合ツール（Windows）`
- サブコピー: `カウンターや画面演出を、アプリからまとめて起動・管理。Stream Deck操作にも対応。`
- カテゴリ: ソフトウェア／配信者向けツールに近いカテゴリ
- 価格: 無料配布を基本案とする。有料または支援版を設ける場合も、同一機能の無料版を残し、支援による機能差がないことを明記する。
- 公開状態: `beta版`を商品名、1枚目画像、説明冒頭の3か所に表示
- 対応OS: `Windows`。具体的なWindows版の保証範囲は実機試験後に追記する。
- ライセンス: MIT License。内蔵する第三者ソフトウェアには各ライセンスが適用される。

## 3. BOOTHに登録するファイル

表示順は以下を推奨する。

1. `VCreatorTools-Setup-0.1.0-beta.1.exe` — 初めての方向け
2. `VCreatorTools-Portable-0.1.0-beta.1.zip` — インストールせず使いたい方向け
3. `jp.vcreatortools.streamdeck.streamDeckPlugin` — Stream Deck利用者向け追加Plugin

Stream Deck Pluginだけでは動作せず、VCreatorTools Appが必要であることをファイル説明にも記載する。`dev`版、`.blockmap`、`builder-debug.yml`、展開済みフォルダーはBOOTHへ掲載しない。

## 4. 商品ページ構成

商品ページは次の順にする。

1. 何ができるソフトか
2. beta版であること
3. 主な機能
4. 3ファイルの選び方
5. かんたん導入手順
6. Stream Deck Pluginの導入
7. 動作環境・必要なもの
8. 重要な注意事項
9. 更新・バックアップ
10. サポート・最新版・ライセンス

専門用語の説明より先に「どのファイルを選び、何をすればOBSに表示できるか」を見せる。

## 5. 商品説明文（掲載用）

### 冒頭

> VCreatorTools Appは、配信で使うカウンターや画面演出などのVCreatorTools製ガジェットを、ひとつの画面から起動・管理するWindows向けアプリです。表示用URLをコピーしてOBSのブラウザソースへ追加でき、対応機能はStream Deckからも操作できます。
>
> 現在の掲載版は **0.1.0-beta.1** です。正式版ではなく、利用者テスト中のbeta版です。配信本番で使用する前に動作確認を行い、更新前にはデータをバックアップしてください。

### 主な機能

> - VCreatorToolsの公式ガジェットを一覧表示
> - OBS向けURLのコピーとブラウザーでの起動
> - カウンターやScreen EffectのServer連携
> - スマートフォンから操作できるLAN内Remote UI
> - ユーザーガジェット、画像素材、設定、ログの管理
> - Local Automation APIとStream Deck Plugin
>
> VCT Event Hubはこの版には含まれません。次のbeta系列で導入予定です。

### ダウンロードするファイルの選び方

> **初めての方: Installer版（推奨）**  
> `VCreatorTools-Setup-0.1.0-beta.1.exe`をダウンロードしてください。セットアップ画面に沿ってインストールします。アプリ本体と設定データが分かれて保存されるため、通常はこちらがおすすめです。
>
> **持ち運び・フォルダー単位で管理したい方: Portable版**  
> ZIPを展開し、展開したフォルダー内の`VCreatorTools.exe`を起動します。設定やデータも同じフォルダーに保存されます。ZIPの中から直接起動せず、書き込み可能な場所へ展開してください。
>
> **Stream Deckを使う方: Stream Deck Plugin**  
> Appを導入したうえで、`.streamDeckPlugin`ファイルもダウンロードしてください。Plugin単体では動作しません。

### かんたんな使い方

> 1. Installer版をインストールしてVCreatorToolsを起動します。
> 2. 管理画面の「公式ツール」から使いたいガジェットを選びます。
> 3. 表示用URLをコピーします。
> 4. OBSで「ソース」→「ブラウザ」を追加し、URL欄へ貼り付けます。
> 5. 操作・設定用ページはChromeなどの通常ブラウザーで開きます。
>
> 通常はMain PortやRemote設定を変更する必要はありません。

### 動作環境・必要なもの

> - Windows PC
> - OBS Studio（配信画面へ表示する場合）
> - ChromeなどのWebブラウザー（操作・設定用として推奨）
> - Stream Deck本体とStream Deckアプリ（Pluginを使う場合のみ）
>
> Windows、OBS、Stream Deckアプリの具体的な対応versionは、公開前の実機試験結果をご確認ください。

### 注意事項

> - 本版は`0.1.0-beta.1`です。仕様や保存形式が今後変更される可能性があります。
> - Windows向け実行ファイルはコード署名されていません。Windows SmartScreen等の警告が表示される場合があります。配布元とファイル名を確認して使用してください。
> - Remote機能は、信頼できる同一LAN内だけで使用してください。Remote Portをルーター等でインターネットへ公開しないでください。
> - Automation Token、Pairing code、Session情報を配信画面、スクリーンショット、SNS等へ公開しないでください。
> - Appを完全終了すると内蔵Serverも停止し、OBSの表示や外部操作も停止します。
> - 公式ツールのファイルを直接編集せず、持ち込みデータは管理画面から開けるユーザー領域へ保存してください。
> - 配信本番で使う前に、OBS表示、操作、音声・映像への影響をテストしてください。

### 更新とバックアップ

> GitHubでは最新版と変更履歴を公開します。BOOTH版の更新が反映されるまで時間差が生じる場合があります。
>
> Installer版では、通常、再インストール後も設定やユーザーデータが保持されます。Portable版では、展開フォルダー内にデータが保存されます。どちらも更新・削除・移動の前に、管理画面に表示されるデータ保存先をフォルダーごとバックアップしてください。

### リンクと問い合わせ

> - 最新版・変更履歴・技術情報: https://github.com/Umetana/VCreatorTools_App
> - 不具合報告: GitHub Issues（再現手順、App version、利用環境を添えてください）
> - ライセンス: MIT License。第三者ソフトウェアにはそれぞれのライセンスが適用されます。

## 6. 初心者向け導入ガイド

商品説明とは別に、画像付きガイドまたは同梱PDF／Webページとして用意する。

### A. Installer版

1. BOOTHのファイル一覧から`VCreatorTools-Setup-0.1.0-beta.1.exe`を選ぶ。
2. ダウンロードしたファイル名とversionを確認する。
3. セットアップを起動する。SmartScreenが表示された場合は、配布元とファイル名を確認してから判断する。
4. インストール先は、特別な理由がなければ初期値のまま進める。
5. VCreatorToolsを起動し、管理画面でServerが起動済みになっていることを確認する。
6. 「公式ツール」から目的のツールの表示用URLをコピーする。
7. OBSの「ソース」欄で`+`→「ブラウザ」を選び、URLを貼り付ける。
8. 操作用URLはChromeなどで開く。
9. テスト操作を行い、OBS側へ反映されることを確認する。

### B. Portable版

1. `VCreatorTools-Portable-0.1.0-beta.1.zip`をダウンロードする。
2. ZIPを右クリックして「すべて展開」する。
3. ドキュメント配下など、書き込み可能で今後も移動しない場所へ置く。`Program Files`配下は避ける。
4. 展開フォルダー内の`VCreatorTools.exe`を起動する。
5. 以降はInstaller版の手順5〜9と同じ。
6. バックアップ時はVCreatorToolsを終了してから、Portableフォルダー全体をコピーする。

### C. Stream Deck Plugin

1. VCreatorTools AppとStream Deckアプリを導入し、VCreatorToolsを起動する。
2. `jp.vcreatortools.streamdeck.streamDeckPlugin`を開き、Stream Deckへインストールする。
3. VCreatorTools管理画面のLocal AutomationからAutomation Tokenをコピーする。
4. Stream Deck PluginのGlobal SettingsへTokenを貼り付けて保存する。
5. Counter ActionまたはEffect Actionをキーへ配置し、対象を設定する。
6. キーを押して動作を確認する。

Tokenは秘密情報として扱う。Tokenを再生成した場合は、Stream Deck側でも新しいTokenを設定し直す。

## 7. よくあるつまずき（FAQ候補）

### OBSに表示されない

- VCreatorTools Appが起動中か確認する。
- 管理画面でServerの状態を確認する。
- OBSへ表示用URLを貼り付けているか確認する。
- Portを変更した場合は、管理画面からURLをコピーし直す。

### アプリ終了後に表示が消えた

仕様どおり。Appを完全終了すると内蔵Serverも停止するため、配信中はAppを起動したままにする。

### Portが使用中と表示される

別のVCreatorTools、旧Server、または同じPortを使うソフトが起動していないか確認する。通常はMain Portを変更しない。

### スマートフォンから接続できない

PCとスマートフォンが同じLANに接続されているか、Remoteが有効か、表示中のURLとPairing codeが最新か確認する。インターネット越しの利用はサポート対象にしない。

### Stream Deckが反応しない

VCreatorTools Appが起動中か、Base URLが既定の`http://127.0.0.1:3000`と一致するか、Automation Tokenが正しく保存されているか確認する。

## 8. 掲載画像案

BOOTHの一覧では1枚目しか見られない状況を想定し、文字を詰め込みすぎない。

1. **メイン画像**  
   ロゴ＋管理画面＋「OBS配信ガジェットをひとつに」「Windows / beta 0.1.0」の3要素。`beta`を小さく隠さない。

2. **できること**  
   「一覧から選ぶ → URLをコピー → OBSへ追加」の3ステップ図。初心者が用途を一目で理解できる構成。

3. **管理画面**  
   実画面のスクリーンショットへ番号付き吹き出しを付け、「Server状態」「公式ツール」「URLコピー」を示す。Token、Pairing code、ローカルパスは必ずマスクする。

4. **OBS導入**  
   VCreatorToolsとOBSブラウザソース設定の対応を左右に並べる。貼り付ける場所を枠で強調する。

5. **収録ツール例**  
   実際の配信画面風に、カウンターやScreen Effect等を並べる。未収録機能や開発中機能を載せない。

6. **3ファイルの選び方**  
   Installer＝初めての方、Portable＝持ち運び、Plugin＝Stream Deck利用者、という比較カード。

7. **スマホRemote**  
   PCとスマートフォンが同一LANでつながる図。「LAN内専用」「外部公開しない」を画像内にも明記。

8. **Stream Deck連携**  
   Counter ActionとEffect Actionのキー例。実機写真を使う場合は、メーカーのブランド・画像利用条件を確認する。安全策として自作の模式図を優先する。

9. **beta版の注意**  
   「配信前にテスト」「更新前にバックアップ」「未署名のため警告が出る場合あり」の3点を読みやすく掲載。

推奨サイズはBOOTHの公開時点の仕様を確認して決める。各画像はPC表示だけでなく、スマートフォンの縮小表示でも主要文字が読めるか確認する。

## 9. 公開前チェックリスト

### 内容と品質

- [ ] クリーンなWindows環境でInstaller版を導入・起動できる
- [ ] Portable版を日本語を含む一般的なパスへ展開して起動できる
- [ ] Installer／Portableのデータ保存先が想定どおり異なる
- [ ] OBSブラウザソースへの表示と操作を確認した
- [ ] App終了時にServerが停止することを案内した
- [ ] Remoteを同一LAN内で試験した
- [ ] Stream Deck Pluginのインストール、Token設定、Counter／Effect操作を確認した
- [ ] アンインストール、再インストール、バックアップ、復元を確認した
- [ ] SmartScreen表示時の案内が実際の画面と一致する

### 配布ファイル

- [ ] ファイル名と商品ページのversionが一致する
- [ ] `dev`版と`.blockmap`を除外した
- [ ] SHA-256をGitHub Releaseへ掲載した
- [ ] マルウェアスキャンを実施した
- [ ] ZIP内の案内文、License、第三者ライセンスを確認した
- [ ] Stream Deck PluginがAppと別versionであることを明記した

### 商品ページ

- [ ] 1枚目画像にWindows向け・beta版と表示した
- [ ] Installer版を初心者向け推奨として先頭にした
- [ ] Plugin単体では動作しないと明記した
- [ ] GitHub ReleasesとIssuesへのリンクを設定した
- [ ] 対応Windows／OBS／Stream Deck versionを実機試験に基づき記載した
- [ ] Token、Pairing code、個人情報、ローカルパスが画像に写っていない
- [ ] BOOTHとGitHubに掲載したファイルのSHA-256が一致する

## 10. 更新時の運用テンプレート

1. GitHubでtagとReleaseを作成し、3配布物、変更履歴、SHA-256を公開する。
2. クリーン環境でGitHubからダウンロードしたファイルを最終確認する。
3. BOOTHの商品説明冒頭、ファイル、version表記、既知事項を更新する。
4. BOOTHから再ダウンロードし、SHA-256がGitHub掲載値と一致することを確認する。
5. 告知では「新機能」「重要な変更」「更新前の作業」「既知事項」を短く伝える。

更新告知例:

> VCreatorTools App `0.1.0-beta.1`を公開しました。Windows向けInstaller版、Portable版、Stream Deck Pluginを配布しています。本版は利用者テスト用betaです。導入前に商品ページの注意事項を、更新前にバックアップ手順をご確認ください。最新版と変更履歴はGitHubで公開しています。
