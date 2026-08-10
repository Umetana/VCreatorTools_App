/**
 * Feather Falling Effect
 * 指定された angel_feather.png を使用して舞い散るエフェクト
 */
class FeatherEffect {
    // OBS設定パネルの項目定義
    static manifest = {
        apiVersion: 2,
        name: "エンジェル・フェザー",
        description: "羽根が優雅に舞い落ちるスクリーンエフェクト",
        fields: [
            { name: "count", label: "羽根の数", type: "number", default: 25, min: 1, max: 80, step: 1 },
            { name: "minSize", label: "最小サイズ(px)", type: "number", default: 30, min: 10, max: 100, step: 1 },
            { name: "maxSize", label: "最大サイズ(px)", type: "number", default: 60, min: 20, max: 200, step: 1 },
            { name: "speed", label: "落下速度", type: "number", default: 1.0, min: 0.1, max: 3.0, step: 0.1 },
            { name: "useColorTint", label: "テキスト色で着色", type: "boolean", default: true }
        ]
    };

    /**
     * @param {EffectContext} context - SDK context
     * @param {Object} params - 共通設定 + 独自オプション
     */
    constructor(context, params) {
        this.context = context;
        this.params = params;
        this.element = context.root;
        this.items = [];
    }

    /**
     * エフェクト開始
     */
    start() {
        this.element.className = 'fx-feather-root';

        // 設定値の取得
        const count = this.params.count || 25;
        const assetPath = this.context.assets.url('assets/angel_feather.png');

        // 羽根の生成
        for (let i = 0; i < count; i++) {
            this._createFeather(assetPath);
        }

        this.context.logger.log(`Started with ${count} feathers`);
    }

    /**
     * 個別の羽根要素を生成
     */
    _createFeather(src) {
        const feather = document.createElement('div');
        feather.className = 'fx-feather-item';

        // ランダムなパラメータ設定
        const minSize = this.params.minSize || 30;
        const maxSize = this.params.maxSize || 60;
        const size = Math.random() * (maxSize - minSize) + minSize;
        
        const left = Math.random() * 100;
        const duration = (Math.random() * 6 + 6) / (this.params.speed || 1);
        const delay = Math.random() * -12; // 画面内に最初から散らばらせるためのマイナス遅延
        const swayDuration = Math.random() * 3 + 3;

        // スタイルの適用
        feather.style.width = `${size}px`;
        feather.style.height = `${size}px`;
        feather.style.left = `${left}%`;
        feather.style.animationDuration = `${duration}s, ${swayDuration}s`;
        feather.style.animationDelay = `${delay}s, 0s`;

        // 画像要素の作成
        const img = document.createElement('img');
        img.src = src;
        img.className = 'fx-feather-img';

        // 着色設定が有効な場合、CSSの混色モード等で色味を付ける
        if (this.params.useColorTint && this.params.mainColor) {
            // 背景色として指定色を入れ、マスク的な効果（簡易版）
            img.style.filter += ` drop-shadow(0 0 1px ${this.params.mainColor})`;
        }

        feather.appendChild(img);
        this.element.appendChild(feather);
        this.items.push(feather);
    }

    /**
     * エフェクト破棄
     */
    destroy() {
        this.items = [];
        this.context.logger.log('Destroyed.');
    }
}

// 登録IDをフォルダ名「feather_effect」と一致させる
if (typeof window !== 'undefined') {
    window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
    window.REGISTERED_EFFECTS['feather_effect'] = FeatherEffect;
}
