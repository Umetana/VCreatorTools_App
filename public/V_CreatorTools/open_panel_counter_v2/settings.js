/**
 * Open Panel Counter V2 settings
 *
 * 推奨OBSサイズ（目安）
 * - 正方形：930 × 1080 （表示 930 × 930 + 操作部 150）
 * - まず推奨値で置いて、最後はOBSの拡大縮小で合わせてください。
 */

window.PANEL_REVEAL_SETTINGS = {
  layout: "square",

  // layoutに連動（上級者のみ手動変更）
  grid: { rows: 5, cols: 5, gap: 2 },

  panel: { color: "rgba(0,0,0,0.92)", opacity: 1.0, borderRadius: 0 },

  reveal: {
    step: 5,
    mode: "random",
    orderedDirection: "tlbr",
    seed: null
  },

  anim: { type: "fade", durationMs: 180 },

  persist: { progress: true, key: "vct:open-panel-counter:v2:progress" },

  sync: {
    enabled: true,
    counterId: "counter1",
    lockUI: true
  },

  ui: { version: "v2" }
};
