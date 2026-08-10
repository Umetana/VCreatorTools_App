(function () {
    'use strict';

    // Add one relative module filename here. Loading order is preserved.
    const files = [
        'simple.js',
        'compact.js',
        'bar-gauge.js',
        'pill-bar-gauge.js'
    ];

    for (const file of files) {
        if (!/^[a-z0-9][a-z0-9._-]*\.js$/i.test(file)) {
            console.warn('Skipped invalid counter design filename:', file);
            continue;
        }
        document.write(`<script src="layout-designs/${file}"><\/script>`);
    }
})();
