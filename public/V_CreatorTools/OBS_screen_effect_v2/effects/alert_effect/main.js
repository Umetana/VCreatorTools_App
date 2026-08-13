class AlertEffect {
  static manifest = {
    apiVersion: 2,
    name: "アラート",
    description: "警告帯、フラッシュ、回転照射光を組み合わせる軽量な警報演出です。",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "showBands", label: "警告帯", type: "boolean", default: true },
      { name: "showFlash", label: "画面フラッシュ", type: "boolean", default: true },
      { name: "beaconPlacement", label: "回転照射光", type: "select", default: "top", options: [
        { label: "なし", value: "none" }, { label: "上部左右", value: "top" }, { label: "四隅", value: "corners" }
      ]},
      { name: "rotationTimeMs", label: "回転速度(ms)", type: "number", default: 1200, min: 300, max: 5000, step: 100 },
      { name: "pulseTimeMs", label: "点滅間隔(ms)", type: "number", default: 650, min: 150, max: 3000, step: 50 },
      { name: "intensity", label: "光の強さ", type: "number", default: 1, min: 0.2, max: 2, step: 0.1 }
    ]
  };

  constructor(context, params) { this.context = context; this.params = params; this.root = context.root; }

  start() {
    const p = this.params;
    const duration = Math.max(500, Number(p.duration || 3500));
    this.root.className = "fx-alert-root";
    this.root.style.setProperty("--fx-alert-color", p.mainColor || "#ff3030");
    this.root.style.setProperty("--fx-alert-duration", `${duration}ms`);
    this.root.style.setProperty("--fx-alert-rotation", `${Math.max(300, Number(p.rotationTimeMs || 1200))}ms`);
    this.root.style.setProperty("--fx-alert-pulse", `${Math.max(150, Number(p.pulseTimeMs || 650))}ms`);
    this.root.style.setProperty("--fx-alert-intensity", String(Number(p.intensity || 1)));
    this.root.replaceChildren();

    if (p.showFlash !== false) this.root.appendChild(this.element("fx-alert-flash"));
    if (p.showBands !== false) {
      this.root.appendChild(this.element("fx-alert-band fx-alert-band-top"));
      this.root.appendChild(this.element("fx-alert-band fx-alert-band-bottom"));
    }
    this.addBeacons(p.beaconPlacement || "top");

    const text = this.element("fx-alert-text");
    text.textContent = p.mainText ?? "WARNING";
    text.style.fontFamily = p.fontFamily || "sans-serif";
    text.style.fontSize = p.fontSize || "110px";
    this.root.appendChild(text);
    this.context.timers.setTimeout(() => this.context.complete(), duration + 100);
  }

  addBeacons(placement) {
    if (placement === "none") return;
    const positions = placement === "corners"
      ? ["top-left", "top-right", "bottom-left", "bottom-right"]
      : ["top-left", "top-right"];
    positions.forEach(position => this.root.appendChild(this.element(`fx-alert-beacon is-${position}`)));
  }

  element(className) { const element = document.createElement("div"); element.className = className; return element; }
  destroy() { this.root = null; }
}
window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
window.REGISTERED_EFFECTS.alert_effect = AlertEffect;
