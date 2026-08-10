(function (registry) {
    'use strict';

    registry.register({
        id: 'simple',
        name: 'シンプル',
        css: `
            .design-simple .counter-content {
                display: flex; width: 100%; align-items: baseline; justify-content: center;
                gap: 14px; white-space: nowrap;
            }
            .design-simple[data-layout="vertical"] .counter-content {
                flex-direction: column; align-items: center; gap: 2px;
            }
            .design-simple .counter-label {
                max-width: 45%; overflow: hidden; text-overflow: ellipsis;
                font-size: var(--label-size, 28px);
            }
            .design-simple[data-layout="vertical"] .counter-label { max-width: 100%; }
            .design-simple .counter-value-wrap { display: flex; align-items: baseline; gap: 7px; }
            .design-simple .counter-value {
                font-size: var(--count-size, 64px); font-weight: var(--count-weight, 700); line-height: 1;
            }
            .design-simple .counter-unit { font-size: var(--unit-size, 26px); }
            .design-simple .counter-goal { font-size: var(--goal-size, 20px); opacity: .76; }
        `,
        create(container) {
            container.innerHTML = `
                <div class="counter-content">
                    <span class="counter-label"></span>
                    <span class="counter-value-wrap">
                        <span class="counter-value"></span>
                        <span class="counter-unit"></span>
                        <span class="counter-goal"></span>
                    </span>
                </div>`;
        },
        update(container, counter, widget) {
            container.querySelector('.counter-label').textContent = counter?.label || widget.counterId;
            container.querySelector('.counter-value').textContent = Number.isFinite(counter?.count) ? counter.count : 0;
            container.querySelector('.counter-unit').textContent = counter?.unit || '';
            container.querySelector('.counter-goal').textContent = counter?.showGoal ? `/ ${counter.goalCount}` : '';
        }
    });
})(window.GPCounterDesigns);
