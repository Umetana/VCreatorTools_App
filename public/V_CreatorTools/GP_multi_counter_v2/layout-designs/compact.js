(function (registry) {
    'use strict';

    registry.register({
        id: 'compact',
        name: 'コンパクト',
        css: `
            .design-compact { padding: 12px 18px; }
            .design-compact .compact-content {
                display: grid; width: 100%; min-width: 0;
                grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 18px;
            }
            .design-compact[data-layout="vertical"] .compact-content {
                grid-template-columns: 1fr; justify-items: center; gap: 3px;
            }
            .design-compact .compact-label {
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                font-size: var(--label-size, 28px); opacity: .82;
            }
            .design-compact .compact-value-wrap { display: flex; align-items: baseline; gap: 5px; white-space: nowrap; }
            .design-compact .compact-value {
                font-size: var(--count-size, 64px); font-weight: var(--count-weight, 700); line-height: .95;
            }
            .design-compact .compact-unit { font-size: var(--unit-size, 26px); opacity: .8; }
            .design-compact .compact-progress-track {
                position: absolute; left: 14px; right: 14px; bottom: 10px; height: 6px;
                overflow: hidden; border-radius: 999px; background: rgba(255, 255, 255, .18);
                box-shadow: inset 0 1px 2px rgba(0, 0, 0, .35);
            }
            .design-compact .compact-progress {
                display: block; width: 0; height: 100%; border-radius: inherit;
                background: currentColor; opacity: .9; transition: width .2s ease-out;
            }
        `,
        create(container) {
            container.innerHTML = `
                <div class="compact-content">
                    <span class="compact-label"></span>
                    <span class="compact-value-wrap"><span class="compact-value"></span><span class="compact-unit"></span></span>
                </div>
                <span class="compact-progress-track"><span class="compact-progress"></span></span>`;
        },
        update(container, counter, widget) {
            container.querySelector('.compact-label').textContent = counter?.label || widget.counterId;
            container.querySelector('.compact-value').textContent = Number.isFinite(counter?.count) ? counter.count : 0;
            container.querySelector('.compact-unit').textContent = counter?.unit || '';
            const enabled = Boolean(counter?.showGoal && counter.goalCount > 0);
            const progress = enabled
                ? Math.min(100, Math.max(0, counter.count / counter.goalCount * 100)) : 0;
            container.querySelector('.compact-progress-track').style.display = enabled ? 'block' : 'none';
            container.querySelector('.compact-progress').style.width = `${progress}%`;
        }
    });
})(window.GPCounterDesigns);
