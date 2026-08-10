/*
 * GP MULTI COUNTER layout design template
 * 1. Copy this file and rename it.
 * 2. Replace template-design, テンプレート, DOM, CSS and update logic.
 * 3. Add the new filename to design-loader.js.
 * See DESIGN_SPEC.md for the complete contract.
 */
(function (registry) {
    'use strict';

    registry.register({
        id: 'template-design',
        name: 'テンプレート',
        css: `
            .design-template-design .template-label {
                font-size: var(--label-size, 28px);
            }
            .design-template-design .template-value {
                font-size: var(--count-size, 64px);
                font-weight: var(--count-weight, 700);
            }
        `,
        create(container) {
            container.innerHTML = `
                <div class="template-content">
                    <span class="template-label"></span>
                    <span class="template-value"></span>
                    <span class="template-unit"></span>
                </div>`;
        },
        update(container, counter, widget) {
            container.querySelector('.template-label').textContent = counter?.label || widget.counterId;
            container.querySelector('.template-value').textContent = Number.isFinite(counter?.count) ? counter.count : 0;
            container.querySelector('.template-unit').textContent = counter?.unit || '';
        }
    });
})(window.GPCounterDesigns);
