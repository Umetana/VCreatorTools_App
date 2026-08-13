class ParticleEffect {
  static manifest = {
    apiVersion: 2,
    name: "汎用パーティクル",
    description: "ハート、星、コインなどを落下または浮上させます。",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "shape", label: "素材", type: "select", default: "heart", options: [
        { label: "ハート", value: "heart" }, { label: "星", value: "star" },
        { label: "コイン", value: "coin" }, { label: "キラキラ", value: "sparkle" },
        { label: "花びら", value: "petal" }
      ]},
      { name: "motion", label: "移動", type: "select", default: "rise", options: [
        { label: "下から浮上", value: "rise" }, { label: "上から落下", value: "fall" }
      ]},
      { name: "emission", label: "発生方式", type: "select", default: "continuous", options: [
        { label: "継続", value: "continuous" }, { label: "一斉", value: "burst" }
      ]},
      { name: "spawnArea", label: "出現範囲", type: "select", default: "screen", options: [
        { label: "画面全体", value: "screen" }, { label: "画面の端", value: "edge" }
      ]},
      { name: "count", label: "個数", type: "number", default: 40, min: 1, max: 300, step: 5 },
      { name: "minSize", label: "最小サイズ(px)", type: "number", default: 24, min: 8, max: 200, step: 2 },
      { name: "maxSize", label: "最大サイズ(px)", type: "number", default: 54, min: 8, max: 300, step: 2 },
      { name: "travelTimeMs", label: "移動時間(ms)", type: "number", default: 3500, min: 500, max: 15000, step: 100 },
      { name: "swayPx", label: "横揺れ(px)", type: "number", default: 60, min: 0, max: 400, step: 10 },
      { name: "rotation", label: "回転量(deg)", type: "number", default: 180, min: -1080, max: 1080, step: 15 },
      { name: "useMainColor", label: "共通色で着色", type: "boolean", default: false }
    ]
  };

  constructor(context, params) { this.context = context; this.params = params; this.root = context.root; }

  start() {
    this.root.className = "fx-particle-root";
    const p = this.params;
    const count = Math.max(1, Math.floor(p.count || 40));
    const travel = p.travelTimeMs || 3500;
    const spread = p.emission === "continuous" ? Math.max(0, (p.duration || 4000) - travel) : 250;
    for (let i = 0; i < count; i++) this.createParticle(i, count, travel, spread);
    this.context.timers.setTimeout(() => this.context.complete(), Math.max(p.duration || 4000, travel * 1.3 + spread) + 100);
  }

  createParticle(index, count, travel, spread) {
    const symbols = { heart: "♥", star: "★", coin: "●", sparkle: "✦", petal: "❀" };
    const colors = { heart: "#ff5f8f", star: "#ffd84d", coin: "#f5b942", sparkle: "#fff4a8", petal: "#ffb7d5" };
    const p = this.params;
    const item = document.createElement("span");
    item.className = `fx-particle-item is-${p.shape}`;
    item.textContent = symbols[p.shape] || symbols.heart;
    item.style.left = `${Math.random() * 100}%`;
    item.style.fontSize = `${this.rand(p.minSize || 24, p.maxSize || 54)}px`;
    item.style.color = p.useMainColor ? p.mainColor : colors[p.shape];
    this.root.appendChild(item);
    const rising = p.motion !== "fall";
    const screenWide = p.spawnArea !== "edge";
    const startY = screenWide ? this.rand(rising ? 15 : -5, rising ? 105 : 85) : (rising ? 110 : -15);
    const distance = screenWide ? this.rand(75, 125) : 125;
    const endY = startY + (rising ? -distance : distance);
    const swayLimit = Number(p.swayPx || 0);
    const swayA = this.rand(-swayLimit, swayLimit);
    const swayB = this.rand(-swayLimit, swayLimit);
    const y12 = startY + (endY - startY) * .12;
    const y50 = startY + (endY - startY) * .5;
    const y90 = startY + (endY - startY) * .9;
    const rotation = Number(p.rotation || 0);
    const delay = p.emission === "continuous" ? (index / count) * spread : Math.random() * spread;
    this.context.animations.animate(item, [
      { opacity: 0, transform: `translate(0, ${startY}vh) rotate(0deg) scale(.8)` },
      { offset: .12, opacity: 1, transform: `translate(${swayA * .25}px, ${y12}vh) rotate(${rotation * .12}deg) scale(.9)` },
      { offset: .5, opacity: 1, transform: `translate(${swayA}px, ${y50}vh) rotate(${rotation * .5}deg) scale(1)` },
      { offset: .9, opacity: 1, transform: `translate(${swayB * .8}px, ${y90}vh) rotate(${rotation * .9}deg) scale(.95)` },
      { opacity: 0, transform: `translate(${swayB}px, ${endY}vh) rotate(${rotation}deg) scale(.9)` }
    ], { duration: travel * this.rand(.72, 1.3), delay, easing: "linear", fill: "forwards" });
  }

  rand(a, b) { return Number(a) + Math.random() * (Number(b) - Number(a)); }
  destroy() { this.root = null; }
}
window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
window.REGISTERED_EFFECTS.particle_effect = ParticleEffect;
