class ConfettiEffect {
  static manifest = {
    apiVersion: 2,
    name: "紙吹雪",
    description: "風と3D反転を伴う色とりどりの紙吹雪です。",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "count", label: "紙片数", type: "number", default: 120, min: 10, max: 500, step: 10 },
      { name: "emission", label: "発生方式", type: "select", default: "burst", options: [
        { label: "一斉", value: "burst" }, { label: "継続", value: "continuous" }
      ]},
      { name: "fallTimeMs", label: "落下時間(ms)", type: "number", default: 4500, min: 1000, max: 15000, step: 100 },
      { name: "windPx", label: "風の強さ(px)", type: "number", default: 140, min: -600, max: 600, step: 20 },
      { name: "swayPx", label: "左右の揺れ(px)", type: "number", default: 70, min: 0, max: 300, step: 10 },
      { name: "minSize", label: "最小サイズ(px)", type: "number", default: 8, min: 3, max: 40, step: 1 },
      { name: "maxSize", label: "最大サイズ(px)", type: "number", default: 18, min: 4, max: 60, step: 1 },
      { name: "palette", label: "配色", type: "select", default: "party", options: [
        { label: "パーティー", value: "party" }, { label: "ゴールド", value: "gold" }, { label: "パステル", value: "pastel" }
      ]}
    ]
  };

  constructor(context, params) { this.context = context; this.params = params; this.root = context.root; }
  start() {
    this.root.className = "fx-confetti-root";
    const p = this.params; const count = Math.floor(p.count || 120); const fall = p.fallTimeMs || 4500;
    const spread = p.emission === "continuous" ? Math.max(0, (p.duration || 5000) - fall) : 400;
    for (let i = 0; i < count; i++) this.createPiece(i, count, fall, spread);
    this.context.timers.setTimeout(() => this.context.complete(), Math.max(p.duration || 5000, fall * 1.3 + spread) + 100);
  }
  createPiece(index, count, fall, spread) {
    const palettes = { party:["#ff4757","#2ed573","#1e90ff","#ffa502","#e056fd"], gold:["#fff1a8","#ffd24a","#d89b16","#fff8dc"], pastel:["#ffb7c5","#b8e8fc","#c7f9cc","#e0c3fc"] };
    const p=this.params, piece=document.createElement("i"), size=this.rand(p.minSize||8,p.maxSize||18), colors=palettes[p.palette]||palettes.party;
    piece.className="fx-confetti-piece"; piece.style.left=`${Math.random()*100}%`; piece.style.width=`${size}px`; piece.style.height=`${size*this.rand(.45,1.5)}px`; piece.style.background=colors[Math.floor(Math.random()*colors.length)]; this.root.appendChild(piece);
    const duration=fall*this.rand(.72,1.3);
    const initialProgress=this.rand(.12,.78);
    const delay=p.emission==="continuous"?(index/count)*spread:-duration*initialProgress, wind=Number(p.windPx||0)*this.rand(.45,1.35), sway=this.rand(-(p.swayPx||0),p.swayPx||0), turns=this.rand(2,7)*360;
    this.context.animations.animate(piece,[
      {opacity:0,transform:"translate3d(0,-15vh,0) rotateX(0deg) rotateZ(0deg)"},
      {offset:.1,opacity:1,transform:`translate3d(${sway*.2}px,0vh,0) rotateX(${turns*.1}deg) rotateZ(${turns*.06}deg)`},
      {offset:.35,transform:`translate3d(${sway}px,30vh,0) rotateX(${turns*.35}deg) rotateZ(${turns*.2}deg)`},
      {offset:.7,transform:`translate3d(${wind-sway}px,75vh,0) rotateX(${turns*.72}deg) rotateZ(${turns*.55}deg)`},
      {opacity:0,transform:`translate3d(${wind}px,115vh,0) rotateX(${turns}deg) rotateZ(${turns*.8}deg)`}
    ],{duration,delay,easing:"linear",fill:"forwards"});
  }
  rand(a,b){return Number(a)+Math.random()*(Number(b)-Number(a));}
  destroy(){this.root=null;}
}
window.REGISTERED_EFFECTS=window.REGISTERED_EFFECTS||{};
window.REGISTERED_EFFECTS.confetti_effect=ConfettiEffect;
