/**
 * newcomer_surround_effect (Integrated A/B)
 * typeA: 囲み集合（従来）
 * typeB: ランダム配置＋軽い上下バウンス（新）
 *
 * assets:
 *  - ./effects/newcomer_surround_effect/assets/newcomer.png
 *  - ./effects/newcomer_surround_effect/assets/newcomer2.png
 *  - ./effects/newcomer_surround_effect/assets/listener.png
 */

class NewcomerSurroundEffect {
  static manifest = {
    apiVersion: 2,
    name: "初見歓迎！統合版（A/B切替）",
    description: "集合形式(A)とランダムぴょんぴょん(B)を切り替え可能な初見歓迎演出です。",
    assetDisclosure: "ai-generated",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      {
        name: "mode",
        label: "挙動タイプ",
        type: "select",
        default: "A",
        options: [
          { label: "TypeA: 囲み集合", value: "A" },
          { label: "TypeB: ランダム配置＋ぴょんぴょん", value: "B" }
        ]
      },
      {
        name: "assetFile",
        label: "初見画像選択",
        type: "select",
        default: "newcomer.png",
        options: [
          { label: "タイプA", value: "newcomer.png" },
          { label: "タイプB", value: "newcomer2.png" }
        ]
      },
      { name: "maxListeners", label: "リスナー数", type: "number", default: 12, min: 1, max: 60, step: 1 },
      {
        name: "speechSet",
        label: "台詞セット",
        type: "select",
        default: "welcome",
        options: [
          { label: "歓迎（標準）", value: "welcome" },
          { label: "カオス", value: "chaos" }
        ]
      },
      { name: "speechDensity", label: "セリフ出現率", type: "number", default: 0.45, min: 0, max: 1, step: 0.05 },
      { name: "speechDurationMs", label: "セリフ表示時間(ms)", type: "number", default: 1200, min: 500, max: 5000, step: 100 },

      // 配置設定（保存済み設定との互換のためキー名は維持）
      { name: "safeAreaBottomPx", label: "A: 下からの位置(px)", type: "number", default: 140, min: 0, max: 400, step: 10 },
      { name: "safeMarginPx", label: "画面端の安全距離 (TypeB用)", type: "number", default: 40, min: 0, max: 200, step: 5 },

      // TypeA 固有
      { name: "noGoMarginPx", label: "A: 初見との距離(px)", type: "number", default: 28, min: 0, max: 200, step: 5 },
      { name: "ringRadiusStart", label: "A: 出現半径(px)", type: "number", default: 520, min: 200, max: 1200, step: 10 },
      { name: "ringRadiusEnd", label: "A: 集合半径(px)", type: "number", default: 240, min: 120, max: 700, step: 10 },
      { name: "orbitDegrees", label: "A: 円周の回転量(deg)", type: "number", default: 90, min: -360, max: 360, step: 15 },

      // TypeB 固有
      { name: "centerSizePx", label: "B: 初見画像サイズ(px)", type: "number", default: 512, min: 100, max: 1000, step: 10 },
      { name: "centerBoxSize", label: "B: 中央保護領域(px)", type: "number", default: 560, min: 320, max: 900, step: 10 },
      { name: "bounceAmpPx", label: "B: ぴょん幅(px)", type: "number", default: 26, min: 6, max: 80, step: 2 },
      { name: "bouncePeriodMs", label: "B: ぴょん周期(ms)", type: "number", default: 900, min: 300, max: 2000, step: 50 },

      // スケール
      { name: "listenerScaleMin", label: "最小スケール", type: "number", default: 0.65, min: 0.1, max: 1.5, step: 0.05 },
      { name: "listenerScaleMax", label: "最大スケール", type: "number", default: 0.95, min: 0.1, max: 1.5, step: 0.05 }
    ]
  };

  constructor(context, params) {
    this.context = context;
    this.container = context.container;
    this.params = params || {};
    this.root = context.root;
    this.running = false;
  }

  start() {
    this.running = true;
    const p = this._normalize(this.params);

    const root = this.root;
    root.style.position = "absolute";
    root.style.inset = "0";
    root.style.pointerEvents = "none";
    root.style.overflow = "hidden";
    root.style.zIndex = "200";
    // newcomer (shared)
    const newcomer = document.createElement("img");
    newcomer.src = this._asset(p.options.assetFile);
    newcomer.alt = "newcomer";
    newcomer.style.position = "absolute";
    newcomer.style.left = "50%";

    if (p.options.mode === "B") {
      newcomer.style.top = "50%";
      newcomer.style.transform = "translate(-50%,-50%)";
      newcomer.style.width = `${p.options.centerSizePx}px`;
      newcomer.style.height = "auto";
      newcomer.style.maxWidth = "55vw";
    } else {
      newcomer.style.bottom = `${p.options.safeAreaBottomPx}px`;
      newcomer.style.transform = "translateX(-50%)";
      newcomer.style.maxWidth = "36vw";
      newcomer.style.height = "auto";
    }

    newcomer.style.filter = "drop-shadow(0 10px 18px rgba(0,0,0,.35))";
    root.appendChild(newcomer);

    this.context.assets.ready(newcomer).then((ready) => {
      if (!this.running) return;
      if (!ready) {
        this.context.complete();
        return;
      }

      const nr = newcomer.getBoundingClientRect();
      const cx = nr.left + nr.width / 2;
      const cy = nr.top + nr.height / 2;

      if (p.options.mode === "B") {
        this._runTypeB(cx, cy, nr, p);
      } else {
        // TypeA cy adjustment (center around middle-upper part of the image)
        const cyA = nr.top + nr.height * 0.52;
        this._runTypeA(cx, cyA, nr, p);
      }

      this._later(() => this.context.complete(), p.duration);
    });
  }

  destroy() {
    this.running = false;
    this.root = null;
  }

  // ---------------- TypeA: 等間隔の円周配置＋緩やかな周回 ----------------

  _runTypeA(cx, cy, newcomerRect, p) {
    const noGoR = Math.max(newcomerRect.width, newcomerRect.height) * 0.55 + p.options.noGoMarginPx;
    const N = p.options.maxListeners;
    const totalMs = p.duration;
    const flyMs = Math.max(1000, Math.min(1800, Math.floor(totalMs * 0.32)));
    const orbitRadians = (p.options.orbitDegrees * Math.PI) / 180;

    const speechWelcome = ["初見さんようこそ！", "いらっしゃい〜！", "ゆっくりしてって！", "わーい初見！", "お茶どうぞ☕", "こちら側へどうぞ"];
    const speechChaos = ["初見だ！", "囲め囲め！", "確保〜！", "新規発見！", "歓迎の儀〜！", "逃がすな（歓迎）"];
    const pool = p.options.speechSet === "chaos" ? speechChaos : speechWelcome;

    for (let i = 0; i < N; i++) {
      const img = document.createElement("img");
      img.src = this._asset("listener.png");
      img.alt = "listener";
      img.style.position = "absolute";
      img.style.left = `${cx}px`;
      img.style.top = `${cy}px`;
      img.style.opacity = "0";
      img.style.filter = "drop-shadow(0 10px 18px rgba(0,0,0,.28))";

      const scale = this._rand(p.options.listenerScaleMin, p.options.listenerScaleMax);
      const flip = i % 2 === 0 ? 1 : -1;

      let endR = p.options.ringRadiusEnd;
      endR = Math.max(endR, noGoR + 12);

      const a2 = -Math.PI / 2 + (Math.PI * 2 * i) / N;
      const x2 = Math.cos(a2) * endR;
      const y2 = Math.sin(a2) * endR;

      const x0 = Math.cos(a2) * p.options.ringRadiusStart;
      const y0 = Math.sin(a2) * p.options.ringRadiusStart;
      const entryDelay = Math.min(360, i * 35);

      this.root.appendChild(img);

      this.context.animations.animate(img,
        [
          { opacity: 0, transform: `translate(-50%,-50%) translate(${x0}px,${y0}px) scale(${scale}) scaleX(${flip})` },
          { opacity: 1, transform: `translate(-50%,-50%) translate(${x2}px,${y2}px) scale(${scale}) scaleX(${flip}) rotate(0deg)` }
        ],
        { duration: flyMs, delay: entryDelay, easing: "cubic-bezier(.25,.8,.25,1)", fill: "forwards" }
      );

      this._later(() => {
        if (!this.running) return;
        const orbitMs = Math.max(700, totalMs - flyMs - entryDelay - 280);
        const frames = [];
        const steps = 12;
        for (let step = 0; step <= steps; step++) {
          const progress = step / steps;
          const angle = a2 + orbitRadians * progress;
          const x = Math.cos(angle) * endR;
          const y = Math.sin(angle) * endR;
          frames.push({
            offset: progress,
            opacity: progress < 0.9 ? 1 : Math.max(0, (1 - progress) * 10),
            transform: `translate(-50%,-50%) translate(${x}px,${y}px) scale(${scale}) scaleX(${flip})`
          });
        }
        this.context.animations.animate(img, frames, { duration: orbitMs, easing: "linear", fill: "forwards" });
      }, flyMs + entryDelay - 20);

      if (Math.random() < p.options.speechDensity) {
        const text = pool[Math.floor(Math.random() * pool.length)];
        this._later(() => this._spawnSpeech(cx + x2, cy + y2, text, p), flyMs + entryDelay);
      }
    }
  }

  // ---------------- TypeB: ランダム配置＋ぴょんぴょん ----------------

  _runTypeB(cx, cy, newcomerRect, p) {
    const N = p.options.maxListeners;
    const totalMs = p.duration;

    const speechWelcome = ["初見さんようこそ！", "いらっしゃい！", "ゆっくりしてね", "わーい！", "歓迎！", "お茶どうぞ☕"];
    const speechChaos = ["初見だ！", "囲め囲め！（歓迎）", "確保〜！", "新規発見！", "ようこそ沼へ", "逃がすな（歓迎）"];
    const pool = p.options.speechSet === "chaos" ? speechChaos : speechWelcome;

    const W = this.container.clientWidth || 1920;
    const H = this.container.clientHeight || 1080;

    const boxSize = p.options.centerBoxSize;
    const half = boxSize / 2;
    const forbid = { left: cx - half, right: cx + half, top: cy - half, bottom: cy + half };
    const margin = p.options.safeMarginPx;

    for (let i = 0; i < N; i++) {
      const img = document.createElement("img");
      img.src = this._asset("listener.png");
      img.style.position = "absolute";
      img.style.filter = "drop-shadow(0 10px 18px rgba(0,0,0,.28))";
      img.style.opacity = "0";

      const scale = this._rand(p.options.listenerScaleMin, p.options.listenerScaleMax);
      const flip = Math.random() < 0.5 ? -1 : 1;
      const pos = this._randomPosOutsideBox(W, H, forbid, margin);
      img.style.left = `${pos.x}px`;
      img.style.top = `${pos.y}px`;

      this.root.appendChild(img);

      this.context.animations.animate(img,
        [
          { opacity: 0, transform: `translate(-50%,-50%) scale(${scale}) scaleX(${flip})` },
          { opacity: 1, transform: `translate(-50%,-50%) scale(${scale}) scaleX(${flip})` }
        ],
        { duration: 260 + Math.random() * 180, easing: "ease-out", fill: "forwards" }
      );

      const amp = p.options.bounceAmpPx * this._rand(0.75, 1.15);
      const period = p.options.bouncePeriodMs * this._rand(0.85, 1.20);
      const phase = Math.random() * period;
      const startAt = 80 + Math.random() * 250;

      this._later(() => {
        if (!this.running) return;
        this.context.animations.animate(img,
          [
            { transform: `translate(-50%,-50%) translateY(0px) scale(${scale}) scaleX(${flip})` },
            { transform: `translate(-50%,-50%) translateY(${-amp}px) scale(${scale}) scaleX(${flip})` },
            { transform: `translate(-50%,-50%) translateY(0px) scale(${scale}) scaleX(${flip})` }
          ],
          { duration: period, delay: -phase, iterations: Math.max(1, Math.floor((totalMs - 600) / period)), easing: "ease-in-out", fill: "forwards" }
        );
      }, startAt);

      if (Math.random() < p.options.speechDensity) {
        const t = 400 + Math.random() * (totalMs - 1200);
        const text = pool[Math.floor(Math.random() * pool.length)];
        this._later(() => this._spawnSpeech(pos.x, pos.y, text, p), t);
      }

      this._later(() => {
        img.style.transition = "opacity 420ms ease";
        img.style.opacity = "0";
      }, totalMs - 520 + this._rand(-120, 80));
    }
  }

  _randomPosOutsideBox(W, H, box, margin) {
    const bands = [];
    if (box.left - margin > margin) bands.push({ x1: margin, x2: box.left - margin, y1: margin, y2: H - margin });
    if (W - margin > box.right + margin) bands.push({ x1: box.right + margin, x2: W - margin, y1: margin, y2: H - margin });
    if (box.top - margin > margin) bands.push({ x1: margin, x2: W - margin, y1: margin, y2: box.top - margin });
    if (H - margin > box.bottom + margin) bands.push({ x1: margin, x2: W - margin, y1: box.bottom + margin, y2: H - margin });
    const b = bands.length ? bands[Math.floor(Math.random() * bands.length)] : { x1: margin, x2: W - margin, y1: margin, y2: H - margin };
    return { x: this._rand(b.x1, b.x2), y: this._rand(b.y1, b.y2) };
  }

  _spawnSpeech(x, y, text, p) {
    if (!this.running || !this.root) return;
    const duration = p.options.speechDurationMs;
    const s = document.createElement("div");
    s.textContent = text;
    s.style.position = "absolute";
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.transform = "translate(-50%,-110%)";
    s.style.padding = "10px 14px";
    s.style.borderRadius = "999px";
    s.style.fontWeight = "800";
    s.style.whiteSpace = "nowrap";
    s.style.color = p.mainColor;
    s.style.fontSize = this._speechFont(p.fontSize);
    if (p.fontFamily) s.style.fontFamily = p.fontFamily;
    s.style.background = "rgba(0,0,0,.55)";
    s.style.textShadow = "2px 2px 0 rgba(0,0,0,.8)";
    s.style.boxShadow = "0 8px 22px rgba(0,0,0,.25)";
    s.style.opacity = "0";
    this.root.appendChild(s);
    this.context.animations.animate(s,
      [
        { offset: 0, opacity: 0, transform: "translate(-50%,-95%) translateY(0)" },
        { offset: 0.18, opacity: 1, transform: "translate(-50%,-110%) translateY(0)" },
        { offset: 0.78, opacity: 1, transform: "translate(-50%,-110%) translateY(-8px)" },
        { offset: 1, opacity: 0, transform: "translate(-50%,-120%) translateY(-32px)" }
      ],
      { duration, easing: "ease-out", fill: "forwards" }
    );
    this._later(() => { if (s && s.parentNode) s.parentNode.removeChild(s); }, duration + 200);
  }

  _normalize(params) {
    const o = params || {};
    const options = Object.assign(
      {
        mode: "A",
        assetFile: "newcomer.png",
        maxListeners: 12,
        speechSet: "welcome",
        speechDensity: 0.45,
        speechDurationMs: 1200,
        safeAreaBottomPx: 140,
        safeMarginPx: 40,
        noGoMarginPx: 28,
        ringRadiusStart: 520,
        ringRadiusEnd: 240,
        orbitDegrees: 90,
        centerSizePx: 512,
        centerBoxSize: 560,
        bounceAmpPx: 26,
        bouncePeriodMs: 900,
        listenerScaleMin: 0.65,
        listenerScaleMax: 0.95
      },
      o
    );

    return {
      mainColor: params.mainColor ?? "#ffffff",
      fontFamily: params.fontFamily ?? "",
      fontSize: params.fontSize ?? "64px",
      duration: Math.max(800, Math.min(20000, Number(params.duration ?? 5500))),
      options
    };
  }

  _asset(file) {
    return this.context.assets.url(`assets/${file}`);
  }
  _speechFont(base) {
    const m = String(base).match(/(\d+)\s*px/i);
    const px = m ? Number(m[1]) : 64;
    return `${Math.max(22, Math.min(44, Math.round(px * 0.42)))}px`;
  }
  _later(fn, ms) {
    return this.context.timers.setTimeout(fn, Math.max(0, ms));
  }
  _rand(a, b) {
    return a + Math.random() * (b - a);
  }
}

if (typeof window !== "undefined") {
  window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
  window.REGISTERED_EFFECTS["newcomer_surround_effect"] = NewcomerSurroundEffect;
}
