(function (registry) {
    'use strict';

    registry.register({
        id: 'bar-gauge',
        name: '横バーゲージ',
        css: `
            .design-bar-gauge { padding: 16px 20px; }
            .design-bar-gauge .bar-gauge-content {
                display: grid; width: 100%; min-width: 0;
                grid-template-rows: auto auto auto; gap: 8px;
            }
            .design-bar-gauge .bar-gauge-head {
                display: flex; align-items: baseline; justify-content: space-between; gap: 14px;
                min-width: 0;
            }
            .design-bar-gauge .bar-gauge-label {
                min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                font-size: var(--label-size, 28px);
            }
            .design-bar-gauge .bar-gauge-percent {
                flex: none; font-size: var(--goal-size, 20px); opacity: .8;
                font-variant-numeric: tabular-nums;
            }
            .design-bar-gauge .bar-gauge-track {
                position: relative; width: 100%; height: 14px; overflow: hidden;
                border-radius: 999px; background: rgba(255, 255, 255, .18);
                box-shadow: inset 0 1px 3px rgba(0, 0, 0, .45);
            }
            .design-bar-gauge .bar-gauge-fill {
                display: block; width: 0; height: 100%; border-radius: inherit;
                background: currentColor; transition: width .25s ease-out, background-color .2s ease;
            }
            .design-bar-gauge.is-goal-reached .bar-gauge-fill { background: #38d27a; }
            .design-bar-gauge .bar-gauge-values {
                display: flex; align-items: baseline; justify-content: center; gap: 6px;
                white-space: nowrap;
            }
            .design-bar-gauge .bar-gauge-current {
                font-size: var(--count-size, 64px); font-weight: var(--count-weight, 700); line-height: 1;
            }
            .design-bar-gauge .bar-gauge-goal,
            .design-bar-gauge .bar-gauge-unit { font-size: var(--goal-size, 20px); opacity: .78; }
            .design-bar-gauge[data-layout="horizontal"] .bar-gauge-content {
                grid-template-columns: minmax(100px, .8fr) minmax(130px, 1.2fr);
                grid-template-rows: auto auto;
                align-items: center;
            }
            .design-bar-gauge[data-layout="horizontal"] .bar-gauge-head { grid-column: 1; grid-row: 1 / 3; flex-direction: column; justify-content: center; }
            .design-bar-gauge[data-layout="horizontal"] .bar-gauge-track { grid-column: 2; grid-row: 2; }
            .design-bar-gauge[data-layout="horizontal"] .bar-gauge-values { grid-column: 2; grid-row: 1; }
        `,
        create(container) {
            container.innerHTML = `
                <div class="bar-gauge-content">
                    <div class="bar-gauge-head"><span class="bar-gauge-label"></span><span class="bar-gauge-percent"></span></div>
                    <div class="bar-gauge-track"><span class="bar-gauge-fill"></span></div>
                    <div class="bar-gauge-values">
                        <span class="bar-gauge-current"></span><span class="bar-gauge-goal"></span><span class="bar-gauge-unit"></span>
                    </div>
                </div>`;
        },
        update(container, counter, widget) {
            const count = Number.isFinite(counter?.count) ? counter.count : 0;
            const goal = Number.isFinite(counter?.goalCount) ? counter.goalCount : 0;
            const hasGoal = Boolean(counter?.showGoal && goal > 0);
            const percent = hasGoal ? Math.min(100, Math.max(0, count / goal * 100)) : 0;
            const reached = hasGoal && count >= goal;

            container.querySelector('.bar-gauge-label').textContent = counter?.label || widget.counterId;
            container.querySelector('.bar-gauge-current').textContent = count;
            container.querySelector('.bar-gauge-goal').textContent = hasGoal ? `/ ${goal}` : '';
            container.querySelector('.bar-gauge-unit').textContent = counter?.unit || '';
            container.querySelector('.bar-gauge-percent').textContent = hasGoal ? `${Math.floor(percent)}%` : '目標未設定';
            container.querySelector('.bar-gauge-fill').style.width = `${percent}%`;
            container.classList.toggle('is-goal-reached', reached);
        }
    });
})(window.GPCounterDesigns);
