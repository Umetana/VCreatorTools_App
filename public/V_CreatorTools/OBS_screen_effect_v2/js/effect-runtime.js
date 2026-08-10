/**
 * Runs effect instances and owns the screen-level presentation lifecycle.
 * Lifecycle behavior intentionally matches the former index.html implementation.
 */
class EffectRuntime {
    constructor(options) {
        this.registry = options.registry;
        this.container = options.container;
        this.backdrop = options.backdrop;
        this.activeInstances = new Set();
        this.activeByEffect = new Map();
    }

    async trigger(effectId, params) {
        const EffectClass = await this.registry.load(effectId);
        if (!EffectClass) return;

        let instance = null;
        let context = null;
        try {
            const opacity = params.bgOpacity !== undefined ? params.bgOpacity : 0.4;
            this.backdrop.style.background = `radial-gradient(circle, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,${opacity * 1.5}) 100%)`;
            this.backdrop.style.opacity = 1;

            context = new EffectContext({
                effectId,
                container: this.container,
                onComplete: () => instance?.destroy()
            });
            instance = new EffectClass(context, this.createPluginParams(params));
            this.track(effectId, instance, context);
            instance.start();

            const lifecycleOwner = EffectClass.manifest?.runtime?.lifecycleOwner || 'host';
            if (lifecycleOwner === 'host') {
                setTimeout(() => {
                    instance.destroy();
                }, params.duration || 3000);
            }

            return instance;
        } catch (e) {
            console.error(`[EffectRuntime:${effectId}] Effect execution failed`, e);
            if (instance?.destroy) {
                instance.destroy();
            } else {
                context?.dispose();
                if (this.activeInstances.size === 0) {
                    this.backdrop.style.opacity = 0;
                }
            }
            return null;
        }
    }

    createPluginParams(params = {}) {
        const { options, ...commonParams } = params;
        return {
            ...(options || {}),
            ...commonParams
        };
    }

    track(effectId, instance, context = null) {
        const originalDestroy = instance.destroy.bind(instance);
        let destroyed = false;

        instance.destroy = () => {
            if (destroyed) return;
            destroyed = true;
            try {
                originalDestroy();
            } finally {
                context?.dispose();
                this.unregister(effectId, instance);
            }
        };

        this.activeInstances.add(instance);
        if (!this.activeByEffect.has(effectId)) {
            this.activeByEffect.set(effectId, new Set());
        }
        this.activeByEffect.get(effectId).add(instance);
    }

    unregister(effectId, instance) {
        this.activeInstances.delete(instance);
        const effectInstances = this.activeByEffect.get(effectId);
        if (effectInstances) {
            effectInstances.delete(instance);
            if (effectInstances.size === 0) {
                this.activeByEffect.delete(effectId);
            }
        }

        if (this.activeInstances.size === 0) {
            this.backdrop.style.opacity = 0;
        }
    }

    getActiveCount(effectId) {
        if (effectId === undefined) return this.activeInstances.size;
        return this.activeByEffect.get(effectId)?.size || 0;
    }

    destroyAll() {
        [...this.activeInstances].forEach((instance) => instance.destroy());
        this.backdrop.style.opacity = 0;
    }
}

window.EffectRuntime = EffectRuntime;
