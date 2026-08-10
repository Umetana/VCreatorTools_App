/**
 * Managed services exposed to apiVersion 2 effect plugins.
 */
class EffectContext {
    constructor(options) {
        this.effectId = options.effectId;
        this.container = options.container;
        this.onComplete = options.onComplete;
        this.abortController = new AbortController();
        this.signal = this.abortController.signal;
        this.timerIds = new Set();
        this.animationHandles = new Set();
        this.disposed = false;

        this.root = document.createElement('div');
        this.root.dataset.effectId = this.effectId;
        this.container.appendChild(this.root);

        this.timers = {
            setTimeout: (callback, delay) => this.setTimeout(callback, delay),
            clearTimeout: (timerId) => this.clearTimeout(timerId),
            wait: (delay) => this.wait(delay)
        };
        this.animations = {
            animate: (element, keyframes, options) => this.animate(element, keyframes, options)
        };
        this.assets = {
            url: (relativePath) => this.resolveAssetUrl(relativePath),
            ready: (image) => this.waitForImage(image)
        };
        this.logger = {
            log: (...args) => console.log(`[Effect:${this.effectId}]`, ...args),
            warn: (...args) => console.warn(`[Effect:${this.effectId}]`, ...args),
            error: (...args) => console.error(`[Effect:${this.effectId}]`, ...args)
        };
    }

    resolveAssetUrl(relativePath) {
        if (typeof relativePath !== 'string' || relativePath.length === 0) {
            throw new TypeError('Asset path must be a non-empty relative path');
        }
        const normalized = relativePath.replace(/\\/g, '/');
        let segments;
        try {
            segments = normalized.split('/').map((segment) => decodeURIComponent(segment));
        } catch {
            throw new TypeError(`Unsafe asset path: ${relativePath}`);
        }
        if (
            normalized.startsWith('/') ||
            normalized.includes('?') ||
            normalized.includes('#') ||
            /^[A-Za-z][A-Za-z0-9+.-]*:/.test(normalized) ||
            segments.some((segment) => segment === '.' || segment === '..')
        ) {
            throw new TypeError(`Unsafe asset path: ${relativePath}`);
        }
        return `./effects/${this.effectId}/${normalized}`;
    }

    setTimeout(callback, delay) {
        if (this.disposed) return null;
        const timerId = setTimeout(() => {
            this.timerIds.delete(timerId);
            if (!this.signal.aborted) callback();
        }, delay);
        this.timerIds.add(timerId);
        return timerId;
    }

    clearTimeout(timerId) {
        if (timerId === null || timerId === undefined) return;
        clearTimeout(timerId);
        this.timerIds.delete(timerId);
    }

    wait(delay) {
        if (this.signal.aborted) return Promise.resolve(false);
        return new Promise((resolve) => {
            const finish = (completed) => {
                this.signal.removeEventListener('abort', onAbort);
                resolve(completed);
            };
            const timerId = this.setTimeout(() => finish(true), delay);
            const onAbort = () => {
                this.clearTimeout(timerId);
                finish(false);
            };
            this.signal.addEventListener('abort', onAbort, { once: true });
        });
    }

    animate(element, keyframes, options) {
        if (this.disposed) return null;
        const animation = element.animate(keyframes, options);
        this.animationHandles.add(animation);
        return animation;
    }

    async waitForImage(image) {
        if (this.signal.aborted) return false;
        try {
            if (typeof image.decode === 'function') {
                await image.decode();
            } else if (!image.complete) {
                await new Promise((resolve, reject) => {
                    const cleanup = () => {
                        image.removeEventListener('load', onLoad);
                        image.removeEventListener('error', onError);
                        this.signal.removeEventListener('abort', onAbort);
                    };
                    const onLoad = () => { cleanup(); resolve(); };
                    const onError = () => { cleanup(); reject(new Error('Image failed to load')); };
                    const onAbort = () => { cleanup(); resolve(); };
                    image.addEventListener('load', onLoad, { once: true });
                    image.addEventListener('error', onError, { once: true });
                    this.signal.addEventListener('abort', onAbort, { once: true });
                });
            }
        } catch (error) {
            this.logger.warn('Image preparation failed', error);
            return false;
        }
        return !this.signal.aborted;
    }

    complete() {
        if (!this.disposed) this.onComplete?.();
    }

    dispose() {
        if (this.disposed) return;
        this.disposed = true;
        this.abortController.abort();
        this.timerIds.forEach((timerId) => clearTimeout(timerId));
        this.timerIds.clear();
        this.animationHandles.forEach((animation) => animation.cancel());
        this.animationHandles.clear();
        this.root.remove();
    }
}

window.EffectContext = EffectContext;
