(function (global) {
    'use strict';

    const designs = new Map();

    function register(design) {
        if (!design || typeof design !== 'object') throw new TypeError('Design definition is required');
        if (!/^[a-z][a-z0-9_-]{0,63}$/i.test(design.id || '')) throw new TypeError('Invalid design id');
        if (typeof design.create !== 'function' || typeof design.update !== 'function') {
            throw new TypeError(`Design ${design.id} requires create() and update()`);
        }
        designs.set(design.id, Object.freeze({
            id: design.id,
            name: String(design.name || design.id),
            css: typeof design.css === 'string' ? design.css : '',
            create: design.create,
            update: design.update
        }));
    }

    function get(id) {
        return designs.get(id) || designs.get('simple') || designs.values().next().value || null;
    }

    function list() {
        return [...designs.values()];
    }

    function ensureStyles(documentObject) {
        for (const design of designs.values()) {
            if (!design.css || documentObject.querySelector(`style[data-counter-design="${design.id}"]`)) continue;
            const style = documentObject.createElement('style');
            style.dataset.counterDesign = design.id;
            style.textContent = design.css;
            documentObject.head.appendChild(style);
        }
    }

    global.GPCounterDesigns = Object.freeze({ register, get, list, ensureStyles });
})(window);
