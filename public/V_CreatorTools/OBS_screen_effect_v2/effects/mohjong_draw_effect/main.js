/**
 * Mahjong Draw Effect - Prototyping (Kokushi Musou guaranteed version)
 */
class MahjongDrawEffect {
    static manifest = {
        apiVersion: 2,
        name: "麻雀ツモ演出",
        description: "リーチからツモまでの緊張感を再現するエフェクト",
        assetDisclosure: "ai-generated",
        runtime: { lifecycleOwner: "effect" },
        fields: [
            {
                name: "roleType", label: "確定役モード", type: "select", default: "kokushi", options: [
                    { label: "ランダム (おまかせ)", value: "random" },
                    { label: "国士無双 (確定)", value: "kokushi" },
                    { label: "四暗刻 (20%)", value: "suanko" },
                    { label: "大三元 (25%)", value: "daisangen" }
                ]
            },
            { name: "waitDuration", label: "タメの時間(ms)", type: "number", default: 1500, min: 500, max: 5000 },
            { name: "resultDuration", label: "結果表示の時間(ms)", type: "number", default: 4000, min: 1000, max: 10000 }
        ]
    };

    constructor(context, params) {
        this.context = context;
        this.container = context.container;
        this.params = params;
        this.element = context.root;
        this.isAnimating = false;
    }

    start() {
        if (this.isAnimating) return;
        this.isAnimating = true;

        this.element.className = 'fx-mj-root';
        this._runSequence().catch((error) => {
            if (this.context.signal.aborted) return;
            this.context.logger.error('Sequence failed', error);
            this.context.complete();
        });
    }

    async _runSequence() {
        const assetPath = this.context.assets.url('assets/');
        const options = this.params;
        let roleType = options.roleType || 'kokushi';
        const waitDuration = options.waitDuration || 1500;
        const resultDuration = options.resultDuration || 4000;

        // ランダムモードなら内部的に役を決定
        if (roleType === 'random') {
            const roles = ['kokushi', 'suanko', 'daisangen'];
            roleType = roles[Math.floor(Math.random() * roles.length)];
            this.context.logger.log(`Random role selected: ${roleType}`);
        }

        // 1. リーチ目表示
        const reachView = this._createReachView(roleType);
        this.element.appendChild(reachView);

        if (!await this._wait(300)) return;

        // 2. リーチアクション（カットイン）
        const reachStyle = Math.random() < 0.5 ? '100' : '200';
        const reachLayout = Math.random() < 0.5 ? '1' : '2';
        const reachId = (parseInt(reachStyle) + parseInt(reachLayout)).toString();
        const reachClass = reachLayout === '1' ? 'is-band' : 'is-full';

        const cutin = document.createElement('div');
        cutin.className = `fx-mj-action-overlay ${reachClass} type-${reachId}`;
        cutin.innerHTML = `<img src="${assetPath}action/reach${reachId}.png" class="fx-mj-action-img" alt="REACH!">`;
        this.element.appendChild(cutin);

        if (!await this._wait(1200)) return;
        cutin.remove();

        // 3. タメ（ドラムロール的な間）
        if (!await this._wait(waitDuration)) return;

        // 4. ツモ牌表示
        const drawContainer = document.createElement('div');
        drawContainer.className = 'fx-mj-draw-container';

        // 当たり判定
        let isHit = false;
        let drawTile = 'chun';

        if (roleType === 'kokushi') {
            isHit = true; // 国士は確定（13面待ち）
            const tiles = ['1m', '9m', '1p', '9p', '1s', '9s', 'ton', 'nan', 'sei', 'pei', 'haku', 'hatu', 'chun'];
            drawTile = tiles[Math.floor(Math.random() * tiles.length)];
        } else if (roleType === 'suanko') {
            isHit = Math.random() < 0.2;
            // 当たりなら役満確定牌、ハズレなら違う牌（6pなど）を出す
            drawTile = isHit ? 'chun' : '6p';
        } else if (roleType === 'daisangen') {
            isHit = Math.random() < 0.25;
            // 当たりなら役満確定牌、ハズレなら関係ない牌（1sなど）を出す
            drawTile = isHit ? '3p' : '1s';
        }

        drawContainer.innerHTML = `<img src="${assetPath}tiles/${drawTile}.png" class="fx-mj-draw-tile" alt="Draw Tile">`;
        this.element.appendChild(drawContainer);

        drawContainer.classList.add('active');
        if (isHit) this.container.classList.add('fx-mj-shake');

        if (!await this._wait(300)) return;
        this.container.classList.remove('fx-mj-shake');

        // 5. 結果表示
        if (isHit) {
            const tsumoStyle = Math.random() < 0.5 ? '100' : '200';
            const tsumoLayout = Math.random() < 0.5 ? '1' : '2';
            const tsumoId = (parseInt(tsumoStyle) + parseInt(tsumoLayout)).toString();
            const tsumoClass = tsumoLayout === '1' ? 'is-band' : 'is-full';

            const result = document.createElement('div');
            result.className = `fx-mj-result-overlay tsumo ${tsumoClass} type-${tsumoId}`;
            result.innerHTML = `<img src="${assetPath}action/tsumo${tsumoId}.png" class="fx-mj-result-img" alt="ツモ！">`;
            this.element.appendChild(result);
        } else {
            const ryukyokuType = Math.random() < 0.5 ? '01' : '02';
            const result = document.createElement('div');
            result.className = `fx-mj-result-overlay ryukyoku is-full type-${ryukyokuType}`;
            result.innerHTML = `<img src="${assetPath}action/ryukyoku${ryukyokuType}.png" class="fx-mj-result-img" alt="流局">`;
            this.element.appendChild(result);
        }

        // 6. 終了処理（数秒後に消去）
        if (!await this._wait(resultDuration)) return;
        this.context.complete();
    }

    _createReachView(roleType) {
        const view = document.createElement('div');
        view.className = 'fx-mj-reach-view';
        const assetPath = this.context.assets.url('assets/tiles/');

        let tiles = [];
        if (roleType === 'kokushi') {
            tiles = ['1m', '9m', '1p', '9p', '1s', '9s', 'ton', 'nan', 'sei', 'pei', 'haku', 'hatu', 'chun'];
        } else if (roleType === 'daisangen') {
            tiles = ['haku', 'haku', 'haku', 'hatu', 'hatu', 'hatu', 'chun', 'chun', 'chun', '1p', '2p', '3p', '3p'];
        } else {
            // 四暗刻（暫定）
            tiles = ['1p', '1p', '1p', '9p', '9p', '9p', '1s', '1s', '1s', '9s', '9s', '9s', 'chun'];
        }

        tiles.forEach(t => {
            const tile = document.createElement('div');
            tile.className = 'fx-mj-tile-container';
            tile.innerHTML = `<img src="${assetPath}${t}.png" class="fx-mj-tile-img" alt="${t}">`;
            view.appendChild(tile);
        });

        return view;
    }

    _wait(ms) {
        return this.context.timers.wait(ms);
    }

    destroy() {
        this.isAnimating = false;
        this.container.classList.remove('fx-mj-shake');
        this.element = null;
        this.context.logger.log('Destroyed');
    }
}

// 登録
window.REGISTERED_EFFECTS = window.REGISTERED_EFFECTS || {};
window.REGISTERED_EFFECTS['mohjong_draw_effect'] = MahjongDrawEffect;
