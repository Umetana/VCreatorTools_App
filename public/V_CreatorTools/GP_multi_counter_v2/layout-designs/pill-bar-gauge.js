(function (registry) {
    'use strict';

    registry.register({
        id: 'pill-bar-gauge',
        name: 'ピル型バーゲージ',
        css: `
            .design-pill-bar-gauge {
                min-width: 260px; min-height: 64px; padding: 6px;
                border-radius: 999px;
            }
            .design-pill-bar-gauge .pill-gauge {
                position: relative; width: 100%; height: 100%; min-height: 38px;
                overflow: hidden; border: 1px solid rgba(255, 255, 255, .25);
                border-radius: 999px; background: rgba(255, 255, 255, .15);
            }
            .design-pill-bar-gauge .pill-gauge-fill {
                position: absolute; inset: 0 auto 0 0; width: 0;
                border-radius: inherit; background: #4a90e2;
                transition: width .3s ease, background-color .15s linear;
            }
            .design-pill-bar-gauge.is-goal-reached .pill-gauge-fill { background: #27ae60; }
            .design-pill-bar-gauge .pill-gauge-text {
                position: absolute; inset: 0; z-index: 1;
                display: grid; grid-template-columns: minmax(0, 1fr) minmax(90px, 1.25fr) minmax(46px, .55fr);
                align-items: center; gap: 10px; padding: 0 18px;
                color: var(--text-color, #fff); text-shadow: 1px 1px 3px rgba(0, 0, 0, .85);
                white-space: nowrap;
            }
            .design-pill-bar-gauge .pill-gauge-label {
                min-width: 0; overflow: hidden; text-overflow: ellipsis;
                font-size: var(--pill-label-size, 16px); opacity: .92;
            }
            .design-pill-bar-gauge .pill-gauge-value {
                overflow: hidden; text-align: center; text-overflow: ellipsis;
                font-size: var(--pill-count-size, 22px); font-weight: var(--count-weight, 700);
                font-variant-numeric: tabular-nums;
            }
            .design-pill-bar-gauge .pill-gauge-percent {
                min-width: 0; overflow: hidden; text-align: right; text-overflow: ellipsis;
                font-size: var(--pill-percent-size, 15px); opacity: .92;
                font-variant-numeric: tabular-nums;
            }
        `,
        create(container) {
            container.innerHTML = `
                <div class="pill-gauge">
                    <span class="pill-gauge-fill"></span>
                    <div class="pill-gauge-text">
                        <span class="pill-gauge-label"></span>
                        <span class="pill-gauge-value"></span>
                        <span class="pill-gauge-percent"></span>
                    </div>
                </div>`;
        },
        update(container, counter, widget) {
            const count = Number.isFinite(counter?.count) ? counter.count : 0;
            const goal = Number.isFinite(counter?.goalCount) ? counter.goalCount : 0;
            const hasGoal = Boolean(counter?.showGoal && goal > 0);
            const percent = hasGoal ? Math.min(100, Math.max(0, count / goal * 100)) : 0;
            const reached = hasGoal && count >= goal;

            const usableHeight = Math.max(38, widget.height - 5);
            container.style.setProperty('--pill-label-size', `${Math.max(10, Math.min(widget.labelSize, usableHeight * .36))}px`);
            container.style.setProperty('--pill-count-size', `${Math.max(12, Math.min(widget.countSize, usableHeight * .48))}px`);
            container.style.setProperty('--pill-percent-size', `${Math.max(10, Math.min(widget.goalSize, usableHeight * .30))}px`);

            container.querySelector('.pill-gauge-label').textContent = counter?.label || widget.counterId;
            container.querySelector('.pill-gauge-value').textContent = hasGoal
                ? `${count} / ${goal}${counter?.unit || ''}`
                : `${count}${counter?.unit || ''}`;
            container.querySelector('.pill-gauge-percent').textContent = hasGoal ? `${Math.floor(percent)}%` : '';
            container.querySelector('.pill-gauge-fill').style.width = `${percent}%`;
            container.classList.toggle('is-goal-reached', reached);
        }
    });
})(window.GPCounterDesigns);
