/**
 * エフェクト開発用テンプレートクラス
 */
class TemplateEffect {
    // 設定パネルに表示される項目定義
    static manifest = {
        apiVersion: 2,
        name: "エフェクト名",
        description: "エフェクトの説明",
        fields: [
            // 数値設定の例 (min, max, step 属性を推奨)
            { name: "count", label: "発生数", type: "number", default: 50, min: 1, max: 200, step: 1 },
            // チェックボックスの例
            { name: "useAnimation", label: "アニメーション有効", type: "boolean", default: true },
            // 色選択の例
            { name: "neonColor", label: "発光色", type: "color", default: "#4ecca3" },
            // セレクトボックスの例 (画像やSEの切り替えに便利)
            {
                name: "assetFile",
                label: "画像選択",
                type: "select",
                default: "image1.png",
                options: [
                    { label: "タイプA", value: "image1.png" },
                    { label: "タイプB", value: "image2.png" }
                ]
            },
            // テキスト入力の例
            { name: "customMessage", label: "追加メッセージ", type: "text", default: "" }
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
    }

    /**
     * エフェクトの開始処理
     */
    start() {
        this.element.className = 'fx-template-root';

        // 2. スタイルの適用
        const style = this.element.style;
        style.color = this.params.mainColor;
        style.fontSize = this.params.fontSize;
        if (this.params.fontFamily) style.fontFamily = this.params.fontFamily;

        // 3. DOM構造の構築（ユーザー文字列はtextContentを使用）
        const content = document.createElement('div');
        content.className = 'fx-template-content';
        const text = document.createElement('div');
        text.className = 'fx-template-text';
        text.textContent = this.params.mainText;
        content.appendChild(text);
        this.element.replaceChildren(content);
        this._initializeLogic();
    }

    _initializeLogic() {
        this.context.logger.log('Started');
    }

    /**
     * エフェクトの破棄処理 (重要)
     */
    destroy() {
        this.element = null;
        this.context.logger.log('Destroyed');
    }
}

// グローバルへの登録
if (typeof window !== 'undefined') {
    window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
    // 重要：キー名は必ず「フォルダ名」と一致させる（例：[name]_effect）
    window.REGISTERED_EFFECTS['template_effect'] = TemplateEffect;
}
