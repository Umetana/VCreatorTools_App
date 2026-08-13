class SpotlightEffect {
  static manifest = {
    apiVersion: 2,
    name: "スポットライト",
    description: "周囲を暗くして指定位置へ注目を集める舞台照明演出です。",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "mode", label: "モード", type: "select", default: "focus", options: [
        { label: "フォーカス", value: "focus" }, { label: "サーチ", value: "search" }, { label: "クロス", value: "cross" }
      ]},
      { name: "position", label: "照射位置", type: "select", default: "center", options: [
        { label: "中央", value: "center" }, { label: "左", value: "left" }, { label: "右", value: "right" },
        { label: "上", value: "top" }, { label: "下", value: "bottom" }, { label: "座標指定", value: "custom" }
      ]},
      { name: "targetX", label: "X位置(%)", type: "number", default: 50, min: 0, max: 100, step: 1 },
      { name: "targetY", label: "Y位置(%)", type: "number", default: 50, min: 0, max: 100, step: 1 },
      { name: "shape", label: "光の形", type: "select", default: "ellipse", options: [
        { label: "円形", value: "circle" }, { label: "楕円", value: "ellipse" }, { label: "舞台照明", value: "stage" }
      ]},
      { name: "spotSize", label: "光の大きさ(%)", type: "number", default: 28, min: 8, max: 80, step: 1 },
      { name: "darkness", label: "周囲の暗さ", type: "number", default: 0.72, min: 0, max: 0.95, step: 0.05 },
      { name: "textPosition", label: "文字位置", type: "select", default: "spot", options: [
        { label: "スポット内", value: "spot" }, { label: "画面下部", value: "bottom" }, { label: "表示しない", value: "none" }
      ]},
      { name: "showDust", label: "光の粒子", type: "boolean", default: true },
      { name: "dustCount", label: "粒子数", type: "number", default: 24, min: 5, max: 100, step: 1 }
    ]
  };

  constructor(context, params) { this.context = context; this.params = params; this.root = context.root; }

  start() {
    const p = this.params;
    const duration = Math.max(700, Number(p.duration || 4000));
    const target = this.targetPosition(p);
    this.root.className = `fx-spotlight-root is-${p.mode || "focus"} shape-${p.shape || "ellipse"}`;
    this.root.style.setProperty("--fx-spot-color", p.mainColor || "#fff3b0");
    this.root.style.setProperty("--fx-spot-x", `${target.x}%`);
    this.root.style.setProperty("--fx-spot-y", `${target.y}%`);
    const size = Number(p.spotSize || 28);
    this.root.style.setProperty("--fx-spot-size", `${size}vmin`);
    this.root.style.setProperty("--fx-spot-size-y", `${size * .72}vmin`);
    this.root.style.setProperty("--fx-spot-darkness", String(Number(p.darkness ?? .72)));
    this.root.style.setProperty("--fx-spot-duration", `${duration}ms`);
    this.root.replaceChildren();

    this.root.appendChild(this.element("fx-spotlight-shade"));
    if ((p.mode || "focus") === "search") {
      const searchRig = this.element("fx-spotlight-search-rig");
      searchRig.appendChild(this.element("fx-spotlight-search-beam"));
      searchRig.appendChild(this.element("fx-spotlight-search-pool"));
      this.root.appendChild(searchRig);
    }
    this.addFinalLighting(p.mode || "focus", target, size);
    if (p.showDust !== false) this.addDust(Math.max(5, Math.floor(Number(p.dustCount || 24))));
    if ((p.textPosition || "spot") !== "none") this.addText(p);
    this.context.timers.setTimeout(() => this.context.complete(), duration + 100);
  }

  targetPosition(p) {
    const positions = { center:{x:50,y:50}, left:{x:25,y:50}, right:{x:75,y:50}, top:{x:50,y:28}, bottom:{x:50,y:72} };
    return p.position === "custom" ? { x:Number(p.targetX ?? 50), y:Number(p.targetY ?? 50) } : (positions[p.position] || positions.center);
  }

  addFinalLighting(mode, target, size) {
    const sources = mode === "cross" ? [{ x:15, y:-4 }, { x:85, y:-4 }] : [{ x:50, y:-4 }];
    sources.forEach((source, index) => {
      const beam = this.element(`fx-spotlight-final-beam beam-${index + 1}`);
      const dx = (target.x - source.x) * window.innerWidth / 100;
      const dy = (target.y - source.y) * window.innerHeight / 100;
      const length = Math.hypot(dx, dy);
      beam.style.left = `${source.x}%`;
      beam.style.top = `${source.y}%`;
      beam.style.height = `${length}px`;
      beam.style.width = `${Math.max(20, size * (this.params.shape === "stage" ? 3 : 2.65))}vmin`;
      beam.style.setProperty("--fx-beam-angle", `${-Math.atan2(dx, dy) * 180 / Math.PI}deg`);
      this.root.appendChild(beam);
    });
    this.root.appendChild(this.element("fx-spotlight-pool"));
  }

  addText(p) {
    const text = this.element(`fx-spotlight-text is-${p.textPosition || "spot"}`);
    text.textContent = p.mainText ?? "SPOTLIGHT";
    text.style.fontFamily = p.fontFamily || "sans-serif";
    text.style.fontSize = p.fontSize || "100px";
    this.root.appendChild(text);
  }

  addDust(count) {
    for (let i = 0; i < count; i++) {
      const dust = this.element("fx-spotlight-dust");
      dust.style.left = `${Math.random() * 100}%`;
      dust.style.top = `${Math.random() * 100}%`;
      dust.style.animationDelay = `${-Math.random() * 4000}ms`;
      dust.style.animationDuration = `${2200 + Math.random() * 2800}ms`;
      this.root.appendChild(dust);
    }
  }

  element(className) { const element = document.createElement("div"); element.className = className; return element; }
  destroy() { this.root = null; }
}
window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
window.REGISTERED_EFFECTS.spotlight_effect = SpotlightEffect;
