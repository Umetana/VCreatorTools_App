class CrownEffect {
    static manifest = {
        apiVersion: 2,
        name: "豪華な王冠",
        fields: [
            { name: "particleCount", label: "キラキラの数", type: "number", default: 100, min: 0, max: 1000, step: 10 },
            { name: "sparkle", label: "キラキラを有効にする", type: "boolean", default: true }
        ]
    };

    constructor(context, params) {
        this.context = context;
        this.params = params;
        this.element = context.root;
    }

    start() {
        this.element.className = 'crown-effect';

        const style = this.element.style;
        style.color = this.params.mainColor;
        style.fontFamily = this.params.fontFamily;
        style.fontSize = this.params.fontSize;

        const content = document.createElement('div');
        content.className = 'crown-content';
        const icon = document.createElement('div');
        icon.className = 'crown-icon';
        icon.textContent = '👑';
        const text = document.createElement('div');
        text.className = 'crown-text';
        text.textContent = this.params.mainText;
        content.append(icon, text);
        this.element.replaceChildren(content);

        if (this.params.sparkle) {
            this.createSparkles();
        }

        this.context.logger.log('Started');
    }

    createSparkles() {
        const count = this.params.particleCount || 50;
        for (let i = 0; i < count; i++) {
            const s = document.createElement('div');
            s.className = 'sparkle-particle';
            s.style.left = Math.random() * 100 + '%';
            s.style.top = Math.random() * 100 + '%';
            s.style.animationDelay = Math.random() * 2 + 's';
            this.element.appendChild(s);
        }
    }

    destroy() {
        this.element = null;
    }
}

// Register for both ESM and global environments
if (typeof window !== 'undefined') {
    window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
    window.REGISTERED_EFFECTS['crown_effect'] = CrownEffect;
}
