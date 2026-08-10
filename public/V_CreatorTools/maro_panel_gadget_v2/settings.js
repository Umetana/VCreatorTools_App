/**
 * マロ読み配信演出ガジェット V2
 * 基本設定ファイル
 */
const CONFIG = {
    // グリッドの数
    grid: {
        cols: 4,
        rows: 4
    },
    
    // 状態の保存設定
    saveState: {
        enabled: true, // true: 前回の開封状態を保存する / false: ページ更新でリセット
        key: "vct:maro-panel-gadget:v2:panel-states"
    },

    // デザイン設定 (デフォルト色)
    colors: {
        panelDefault: "#ffffff", // 未開封パネルの背景
        textDefault: "#333333",  // 未開封パネルの文字
        panelActive: "#ff85a2",  // 開封済みパネルの背景
        textActive: "#ffffff",   // 開封済みパネルの文字
        accent: "#ff4d79",       // 番号やアクセントの色
        modalBg: "#fffcf9"       // モーダルの背景色
    },

    // フォントサイズ設定
    fonts: {
        panelTitleSize: "1.1rem",
        phraseSize: "1.1rem",
        modalTextSize: "1.6rem"
    }
};

if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
