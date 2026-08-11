# GP Counter Custom Display Starter

GP Multi Counterの状態管理・同期・Server transportを`../_vct_core`から読み込み、表示部分だけを自由に編集するための公式スターター。

- `display.html?id=1`: Counter 1を表示
- `display.html?id=counter2`: Counter IDを直接指定
- `display.html?vctMode=server&id=1`: VCreatorTools Server正本を利用
- ParameterなしのLocal Server URL: Sync
- `file:`で直接開く: Standard

通信処理を直接書き換えず、HTML、CSSと`apply()`の描画処理を編集する。`_vct_core`はVCreatorTools Appが管理するため編集しない。
