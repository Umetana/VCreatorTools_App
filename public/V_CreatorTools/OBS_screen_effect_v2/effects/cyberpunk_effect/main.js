/**
 * Cyberpunk Neon Effect
 */
class CyberpunkEffect {
    static manifest = {
        apiVersion: 2,
        name: "サイバーパンク・ネオン",
        description: "グリッチとネオン発光を伴う近未来風エフェクト",
        fields: [
            { name: "neonColor", label: "ネオンの色", type: "color", default: "#ff00ff" },
            { name: "glitchIntensity", label: "グリッチ強度", type: "number", default: 1.0, min: 0, max: 2, step: 0.1 },
            { name: "showScanlines", label: "スキャンラインを表示", type: "boolean", default: true }
        ]
    };

    constructor(context, params) {
        this.context = context;
        this.params = params;
        this.element = context.root;
    }

    start() {
        this.element.className = 'fx-cyber-root';
        if (this.params.showScanlines) {
            this.element.classList.add('fx-cyber-scanlines');
        }

        // カスタムカラーを変数としてセット
        const neonColor = this.params.neonColor || this.params.mainColor;
        this.element.style.setProperty('--neon-color', neonColor);

        // テキストスタイルの適用
        const fontSize = this.params.fontSize || '60px';
        const fontFamily = this.params.fontFamily || 'sans-serif';

        // グリッチ演出用に同じテキストを3層重ねる
        const content = document.createElement('div');
        content.className = 'fx-cyber-content';
        content.style.fontSize = fontSize;
        content.style.fontFamily = fontFamily;
        const layers = [
            ['fx-cyber-text', false],
            ['fx-cyber-glitch-copy r', true],
            ['fx-cyber-glitch-copy b', true]
        ];
        layers.forEach(([className, hidden]) => {
            const layer = document.createElement('div');
            layer.className = className;
            layer.textContent = this.params.mainText;
            if (hidden) layer.setAttribute('aria-hidden', 'true');
            content.appendChild(layer);
        });
        this.element.replaceChildren(content);

        this.context.logger.log('Started');
    }

    destroy() {
        this.element = null;
        this.context.logger.log('Destroyed');
    }
}

// 登録
if (typeof window !== 'undefined') {
    window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
    window.REGISTERED_EFFECTS['cyberpunk_effect'] = CyberpunkEffect;
}
