class MoneyShowerEffect {
  static manifest = {
    apiVersion: 2,
    name: "Money Shower",
    description: "金貨・紙幣に利用者の肖像を合成して降らせます。",
    assetDisclosure: "ai-generated",
    runtime: { lifecycleOwner: "effect" },
    fields: [
      { name: "material", label: "素材", type: "select", default: "mixed", options: [
        { label: "金貨", value: "coin" }, { label: "紙幣", value: "bill" }, { label: "混合", value: "mixed" }
      ]},
      { name: "usePortrait", label: "利用者画像を肖像に使う", type: "boolean", default: false },
      { name: "portraitAssetId", label: "肖像画像", type: "asset-select", default: "", dataSource: "/api/user-assets/v1/screen-effect/money-shower" },
      { name: "portraitTone", label: "肖像の色調", type: "select", default: "auto", options: [
        { label: "素材に合わせる", value: "auto" }, { label: "原色", value: "original" },
        { label: "単色", value: "monochrome" }, { label: "白黒", value: "grayscale" }
      ]},
      { name: "count", label: "枚数", type: "number", default: 42, min: 1, max: 180, step: 1 },
      { name: "minSize", label: "最小サイズ(px)", type: "number", default: 80, min: 20, max: 300, step: 5 },
      { name: "maxSize", label: "最大サイズ(px)", type: "number", default: 170, min: 30, max: 500, step: 5 },
      { name: "fallTimeMs", label: "落下時間(ms)", type: "number", default: 4300, min: 800, max: 15000, step: 100 },
      { name: "swayPx", label: "横揺れ(px)", type: "number", default: 130, min: 0, max: 600, step: 10 },
      { name: "rotationTurns", label: "回転数", type: "number", default: 3, min: 0, max: 12, step: .5 },
      { name: "coinBounce", label: "金貨を画面下で跳ねさせる", type: "boolean", default: true },
      { name: "billBounce", label: "紙幣を画面下で跳ねさせる", type: "boolean", default: false }
    ]
  };

  constructor(context, params) { this.context=context; this.params=params; this.root=context.root; this.running=false; }

  async start() {
    this.running=true;
    this.root.className="fx-money-root";
    const portrait=this.params.usePortrait ? await this.resolvePortrait(this.params.portraitAssetId) : null;
    if (!this.running) return;
    const p=this.params, count=Math.floor(this.clamp(p.count,1,180,42)), fall=this.clamp(p.fallTimeMs,800,15000,4300);
    const duration=this.clamp(p.duration,100,600000,5200), spread=Math.max(350,duration-fall);
    for(let i=0;i<count;i++) this.createMoney(i,count,fall,spread,portrait?.url||"");
    this.context.timers.setTimeout(()=>this.context.complete(),Math.max(duration,fall*1.25+spread)+150);
  }

  async resolvePortrait(assetId) {
    if(typeof assetId!=="string"||!assetId) return null;
    try {
      const response=await fetch("/api/user-assets/v1/screen-effect/money-shower",{cache:"no-store"});
      if(!response.ok) return null;
      const body=await response.json();
      const asset=body?.ok&&Array.isArray(body.assets)?body.assets.find(item=>item?.assetId===assetId):null;
      return asset&&typeof asset.url==="string"&&asset.url.startsWith("/user-assets/screen-effect-v2/money-shower/")?asset:null;
    } catch { return null; }
  }

  createMoney(index,count,fall,spread,portraitUrl) {
    const p=this.params, type=p.material==="mixed"?(Math.random()<.58?"coin":"bill"):(p.material||"coin");
    const item=document.createElement("div");
    item.className=`fx-money-item is-${type}`;
    const minSize=this.clamp(p.minSize,20,300,80), maxSize=this.clamp(p.maxSize,minSize,500,170);
    const size=this.rand(minSize,maxSize);
    item.style.width=`${type==="bill"?size*1.5:size}px`;
    item.style.aspectRatio=type==="bill"?"3 / 2":"1 / 1";
    item.style.left=`${this.rand(1,93)}%`;
    item.append(this.layer(type,"base"));
    if(portraitUrl) {
      const portrait=document.createElement("div");
      portrait.className=`fx-money-portrait tone-${p.portraitTone||"auto"}`;
      portrait.style.backgroundImage=`url("${portraitUrl.replace(/["\\]/g,"\\$&")}")`;
      item.appendChild(portrait);
    }
    item.append(this.layer(type,"overlay"));
    const shine=document.createElement("i"); shine.className="fx-money-shine"; item.appendChild(shine);
    this.root.appendChild(item);
    const duration=fall*this.rand(.82,1.18), delay=(index/count)*spread-this.rand(0,fall*.28);
    const swayLimit=this.clamp(p.swayPx,0,600,130), sway=this.rand(-swayLimit,swayLimit);
    const turns=this.clamp(p.rotationTurns,0,12,3)*360*this.rand(.7,1.3)*(Math.random()<.5?-1:1);
    const legacyBounce=typeof p.bounce==="boolean"?p.bounce:undefined;
    const bounce=type==="coin"
      ? Boolean(p.coinBounce ?? legacyBounce ?? true)
      : Boolean(p.billBounce ?? legacyBounce ?? false);
    const frames=[
      {opacity:0,transform:`translate3d(0,-25vh,0) rotateX(0deg) rotateY(0deg) rotateZ(${this.rand(-20,20)}deg)`},
      {offset:.08,opacity:1},
      {offset:bounce ? .82 : .92,opacity:1,transform:`translate3d(${sway}px,${bounce?92:108}vh,0) rotateX(${turns*.65}deg) rotateY(${turns}deg) rotateZ(${turns*.14}deg)`}
    ];
    if(bounce) frames.push(
      {offset:.9,opacity:1,transform:`translate3d(${sway*1.04}px,76vh,0) rotateX(${turns*.76}deg) rotateY(${turns*1.12}deg) rotateZ(${turns*.18}deg)`},
      {offset:1,opacity:0,transform:`translate3d(${sway*1.1}px,110vh,0) rotateX(${turns}deg) rotateY(${turns*1.35}deg) rotateZ(${turns*.24}deg)`}
    ); else frames.push({offset:1,opacity:0,transform:`translate3d(${sway}px,120vh,0) rotateX(${turns}deg) rotateY(${turns*1.2}deg) rotateZ(${turns*.2}deg)`});
    this.context.animations.animate(item,frames,{duration,delay,easing:bounce?"cubic-bezier(.3,.02,.65,1)":"linear",fill:"both"});
  }

  layer(type,name) {
    const image=document.createElement("img");
    image.className=`fx-money-${name}`; image.alt="";
    image.src=this.context.assets.url(`assets/${type}_${name}.png`);
    return image;
  }
  clamp(value,min,max,fallback){const number=Number(value);return Math.min(max,Math.max(min,Number.isFinite(number)?number:fallback));}
  rand(a,b){return Number(a)+Math.random()*(Number(b)-Number(a));}
  destroy(){this.running=false;this.root=null;}
}
window.REGISTERED_EFFECTS=window.REGISTERED_EFFECTS||{};
window.REGISTERED_EFFECTS.money_shower_effect=MoneyShowerEffect;
