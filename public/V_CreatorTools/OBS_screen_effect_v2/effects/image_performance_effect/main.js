class ImagePerformanceEffect {
  static manifest = {
    apiVersion: 2,
    name: "画像パフォーマンス",
    description: "Serverの利用者画像をカットイン、強調表示、画像シャワーで演出します。",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "assetId", label: "表示画像", type: "asset-select", default: "", dataSource: "/api/user-assets/v1/screen-effect/image-performance" },
      { name: "motion", label: "演出", type: "select", default: "cutin", options: [
        { label: "カットイン", value: "cutin" }, { label: "フェード＋揺れ", value: "emphasis" }, { label: "画像シャワー", value: "shower" }
      ]},
      { name: "position", label: "表示位置", type: "select", default: "center", options: [
        { label: "中央", value: "center" }, { label: "左", value: "left" }, { label: "右", value: "right" },
        { label: "上", value: "top" }, { label: "下", value: "bottom" }, { label: "座標指定", value: "custom" }
      ]},
      { name: "targetX", label: "X位置(%)", type: "number", default: 50, min: 0, max: 100, step: 1 },
      { name: "targetY", label: "Y位置(%)", type: "number", default: 50, min: 0, max: 100, step: 1 },
      { name: "imageSize", label: "画像サイズ(画面高%)", type: "number", default: 45, min: 5, max: 120, step: 1 },
      { name: "direction", label: "カットイン方向", type: "select", default: "left", options: [
        { label: "左から", value: "left" }, { label: "右から", value: "right" }, { label: "上から", value: "top" }, { label: "下から", value: "bottom" }
      ]},
      { name: "cutinExit", label: "カットインの終了", type: "select", default: "fade", options: [
        { label: "停止位置で消える", value: "fade" }, { label: "躍動して反対側へ抜ける", value: "through" }
      ]},
      { name: "shakePx", label: "揺れ幅(px)", type: "number", default: 16, min: 0, max: 100, step: 1 },
      { name: "count", label: "シャワー画像数", type: "number", default: 28, min: 1, max: 150, step: 1 },
      { name: "minSize", label: "シャワー最小サイズ(px)", type: "number", default: 50, min: 10, max: 300, step: 5 },
      { name: "maxSize", label: "シャワー最大サイズ(px)", type: "number", default: 130, min: 10, max: 500, step: 5 },
      { name: "fallTimeMs", label: "シャワー落下時間(ms)", type: "number", default: 3800, min: 500, max: 15000, step: 100 }
    ]
  };

  constructor(context, params) { this.context = context; this.params = params; this.root = context.root; this.running = false; }

  async start() {
    this.running = true;
    this.root.className = `fx-image-performance-root is-${this.params.motion || "cutin"}`;
    this.root.style.setProperty("--fx-image-duration", `${Math.max(500, Number(this.params.duration || 3500))}ms`);
    const asset = await this.resolveAsset(this.params.assetId);
    if (!this.running) return;
    if (!asset) {
      this.context.logger.warn("Selected user image is unavailable.");
      this.context.complete();
      return;
    }
    if (this.params.motion === "shower") this.startShower(asset.url);
    else await this.startSingle(asset.url);
  }

  async resolveAsset(assetId) {
    if (typeof assetId !== "string" || !assetId) return null;
    try {
      const response = await fetch("/api/user-assets/v1/screen-effect/image-performance", { cache: "no-store" });
      if (!response.ok) return null;
      const body = await response.json();
      if (!body?.ok || !Array.isArray(body.assets)) return null;
      const asset = body.assets.find((item) => item?.assetId === assetId);
      return asset && typeof asset.url === "string" && asset.url.startsWith("/user-assets/screen-effect-v2/image-performance/") ? asset : null;
    } catch { return null; }
  }

  async startSingle(url) {
    const p = this.params, target = this.targetPosition(p);
    const image = document.createElement("img");
    image.className = "fx-image-performance-single";
    image.src = url;
    image.alt = "";
    image.style.left = `${target.x}%`;
    image.style.top = `${target.y}%`;
    image.style.height = `${this.clamp(p.imageSize, 5, 120, 45)}vh`;
    if ((p.motion || "cutin") === "cutin") image.style.opacity = "0";
    const shake = this.clamp(p.shakePx, 0, 100, 16);
    image.style.setProperty("--fx-image-shake", `${shake}px`);
    image.style.setProperty("--fx-image-shake-half", `${shake / 2}px`);
    this.root.appendChild(image);
    const ready = await this.context.assets.ready(image);
    if (!this.running) return;
    if (!ready) {
      this.context.logger.warn("Selected user image could not be decoded.");
      this.context.complete();
      return;
    }
    const duration = this.clamp(p.duration, 800, 600000, 3500);
    if ((p.motion || "cutin") === "cutin") this.animateCutin(image, duration, p.direction || "left", p.cutinExit || "fade", shake, target);
    this.finishAfter(duration);
  }

  animateCutin(image, duration, direction, exitMode, shake, target) {
    const viewportWidth = Math.max(this.root.clientWidth || 0, window.innerWidth || 0, 1280);
    const viewportHeight = Math.max(this.root.clientHeight || 0, window.innerHeight || 0, 720);
    const bounds = image.getBoundingClientRect();
    const halfWidth = Math.max(1, bounds.width / 2);
    const halfHeight = Math.max(1, bounds.height / 2);
    const centerX = viewportWidth * target.x / 100;
    const centerY = viewportHeight * target.y / 100;
    const travel = {
      left: [-(centerX + halfWidth + 8), 0],
      right: [viewportWidth - centerX + halfWidth + 8, 0],
      top: [0, -(centerY + halfHeight + 8)],
      bottom: [0, viewportHeight - centerY + halfHeight + 8]
    };
    const entry = {
      left: travel.left, right: travel.right,
      top: travel.top, bottom: travel.bottom
    }[direction] || travel.left;
    const exit = {
      left: travel.right, right: travel.left,
      top: travel.bottom, bottom: travel.top
    }[direction] || travel.right;
    const at = (x, y, scale = 1, rotate = 0) =>
      `translate(-50%,-50%) translate3d(${x}px,${y}px,0) scale(${scale}) rotate(${rotate}deg)`;
    const frames = [
      { offset: 0, opacity: 0, transform: at(entry[0], entry[1], .88) },
      { offset: .18, opacity: 1, transform: at(0, 0, 1.05) },
      { offset: .28, opacity: 1, transform: at(0, 0) }
    ];
    if (exitMode === "through") {
      frames.push(
        { offset: .62, opacity: 1, transform: at(0, 0) },
        { offset: .70, opacity: 1, transform: at(-shake, 0, 1.04, -1.2) },
        { offset: .78, opacity: 1, transform: at(shake, 0, 1.04, 1.2) },
        { offset: .86, opacity: 1, transform: at(0, 0), easing: "linear" },
        { offset: 1, opacity: 1, transform: at(exit[0], exit[1], .94) }
      );
    } else {
      frames.push(
        { offset: .82, opacity: 1, transform: at(0, 0) },
        { offset: 1, opacity: 0, transform: at(0, 0, .96) }
      );
    }
    this.context.animations.animate(image, frames, { duration, easing: "cubic-bezier(.2,.75,.2,1)", fill: "both" });
  }

  startShower(url) {
    const p = this.params, count = Math.floor(this.clamp(p.count, 1, 150, 28));
    const fall = this.clamp(p.fallTimeMs, 500, 15000, 3800);
    const duration = this.clamp(p.duration, 100, 600000, 4500);
    const spread = Math.max(0, duration - fall);
    const minSize = this.clamp(p.minSize, 10, 300, 50);
    const maxSize = this.clamp(p.maxSize, minSize, 500, 130);
    for (let i = 0; i < count; i++) {
      const image = document.createElement("img");
      image.className = "fx-image-performance-drop";
      image.src = url; image.alt = "";
      image.style.left = `${Math.random() * 100}%`;
      image.style.width = `${this.rand(minSize, maxSize)}px`;
      this.root.appendChild(image);
      const drift = this.rand(-160, 160), rotation = this.rand(-540, 540);
      this.context.animations.animate(image, [
        { opacity:0, transform:"translate3d(0,-18vh,0) rotate(0deg)" },
        { offset:.1, opacity:1, transform:`translate3d(${drift*.12}px,-4vh,0) rotate(${rotation*.1}deg)` },
        { offset:.9, opacity:1, transform:`translate3d(${drift*.9}px,102vh,0) rotate(${rotation*.9}deg)` },
        { opacity:0, transform:`translate3d(${drift}px,118vh,0) rotate(${rotation}deg)` }
      ], { duration:fall*this.rand(.8,1.25), delay:(i/count)*spread, easing:"linear", fill:"forwards" });
    }
    this.finishAfter(Math.max(duration, fall * 1.25 + spread) + 100);
  }

  targetPosition(p) {
    const positions={center:{x:50,y:50},left:{x:25,y:50},right:{x:75,y:50},top:{x:50,y:28},bottom:{x:50,y:72}};
    return p.position === "custom" ? {x:this.clamp(p.targetX,0,100,50),y:this.clamp(p.targetY,0,100,50)} : (positions[p.position] || positions.center);
  }
  clamp(value,min,max,fallback) { const number=Number(value); return Math.min(max,Math.max(min,Number.isFinite(number)?number:fallback)); }
  finishAfter(ms) { this.context.timers.setTimeout(() => this.context.complete(), ms); }
  rand(a,b) { return Number(a)+Math.random()*(Number(b)-Number(a)); }
  destroy() { this.running=false; this.root=null; }
}
window.REGISTERED_EFFECTS=window.REGISTERED_EFFECTS||{};
window.REGISTERED_EFFECTS.image_performance_effect=ImagePerformanceEffect;
