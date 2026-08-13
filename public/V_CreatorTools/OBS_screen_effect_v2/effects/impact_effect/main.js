class ImpactEffect {
  static manifest = {
    apiVersion: 2,
    name: "インパクト",
    description: "集中線、衝撃波、フラッシュを組み合わせて画面を強調します。",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "showRays", label: "集中線", type: "boolean", default: true },
      { name: "showShockwave", label: "衝撃波", type: "boolean", default: true },
      { name: "showFlash", label: "フラッシュ", type: "boolean", default: true },
      { name: "rayCount", label: "集中線の密度", type: "number", default: 32, min: 8, max: 80, step: 2 },
      { name: "shockwaveCount", label: "衝撃波の数", type: "number", default: 3, min: 1, max: 8, step: 1 },
      { name: "intensity", label: "強さ", type: "number", default: 1, min: 0.2, max: 2, step: 0.1 }
    ]
  };

  constructor(context, params) { this.context = context; this.params = params; this.root = context.root; }

  start() {
    const p = this.params;
    const duration = Math.max(300, Number(p.duration || 1800));
    const color = p.mainColor || "#ffffff";
    this.root.className = "fx-impact-root";
    this.root.style.setProperty("--fx-impact-color", color);
    this.root.style.setProperty("--fx-impact-duration", `${duration}ms`);
    this.root.style.setProperty("--fx-impact-wave-duration", `${duration * .68}ms`);
    this.root.style.setProperty("--fx-impact-intensity", String(Number(p.intensity || 1)));
    this.root.replaceChildren();

    if (p.showFlash !== false) this.root.appendChild(this.layer("fx-impact-flash"));
    if (p.showRays !== false) {
      const rays = this.layer("fx-impact-rays");
      const count = Math.max(8, Math.floor(Number(p.rayCount || 32)));
      rays.style.setProperty("--fx-impact-ray-step", `${360 / count}deg`);
      this.root.appendChild(rays);
    }
    if (p.showShockwave !== false) {
      const count = Math.max(1, Math.floor(Number(p.shockwaveCount || 3)));
      for (let i = 0; i < count; i++) {
        const wave = this.layer("fx-impact-wave");
        wave.style.animationDelay = `${(duration * .12 * i)}ms`;
        this.root.appendChild(wave);
      }
    }

    const text = this.layer("fx-impact-text");
    text.textContent = p.mainText ?? "IMPACT!";
    text.style.fontFamily = p.fontFamily || "sans-serif";
    text.style.fontSize = p.fontSize || "100px";
    this.root.appendChild(text);
    this.context.timers.setTimeout(() => this.context.complete(), duration + 100);
  }

  layer(className) { const element = document.createElement("div"); element.className = className; return element; }
  destroy() { this.root = null; }
}
window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
window.REGISTERED_EFFECTS.impact_effect = ImpactEffect;
