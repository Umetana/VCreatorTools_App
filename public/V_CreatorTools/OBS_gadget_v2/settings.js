// --- 配布用設定ファイル ---

// 【重要】外部設定を有効にするかどうかのスイッチ
window.useExternalSettings = true;

// --- 表示ブロックのオン・オフ ---
window.showSnsInfo = true; // SNS情報を表示するかどうか
window.showTicker = true;  // 告知テロップを表示するかどうか

// --- 右上表示モード設定 ---
// mode: "uptime"  -> 配信開始からの経過時間を表示
// mode: "custom"  -> 下記の customText を表示
// mode: "sync"    -> GP MULTI COUNTER V2 と同期表示
// mode: "onec"    -> わんコメ連携 (同接・高評価を表示)
// mode: "none"    -> 非表示
window.displayMode = "onec";

// 【mode: "onec" 用の設定】
window.onecLabelSize = "0.7rem"; // ラベル（VIEWERS/LIKES）のサイズ
window.onecValueSize = "1.3rem"; // 数値のサイズ
window.onecIsBold = true;      // 太字にするかどうか

// わんコメテンプレ外で使う場合の Ms.Bridge 受信先
// "auto" は現在のページと同じホストの /events に接続します。
// 別ポートの場合は "ws://127.0.0.1:3000/events" のように指定してください。
window.bridgeEventsUrl = "auto";

// 【mode: "sync" 用の設定（GP MULTI COUNTER V2）】
// 同期したいカウンターのIDを指定してください（counter1, counter2 など）
window.syncCounterId = "counter2";

// 【mode: "custom" 用の設定】
window.customLabel = "GOAL";
window.customText = "1,234 / 2,000";

// SNS情報の管理
window.snsConfig = {
    x_id: "@umetana_elf", // XのIDを@含めて入力
    yt_name: "Elke ch.うめたなエルケ", // Youtubeのチャンネル名
};

// 告知内容の設定（ティッカー部分）
window.overlayConfig = [
    {
        enabled: true,
        label: "Now Playing",
        text: "Sunset Beats - Lo-fi Chill ☕",
        color: "linear-gradient(90deg, #00ffcc, #0099ff)"
    },
    {
        enabled: true,
        label: "Notice",
        text: "GP Multi Counter V2からカウンターを受信します。",
        color: "#00ffcc"
    }
];
