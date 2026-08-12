var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import streamDeck, { action, SingletonAction } from "@elgato/streamdeck";
import { api } from "./api.js";
let CounterAction = (() => {
    let _classDecorators = [action({ UUID: "jp.vcreatortools.streamdeck.counter" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    var CounterAction = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            CounterAction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async updateTitle(action, counterId) {
            if (!counterId || !action.isKey())
                return;
            try {
                const result = await api.counters();
                const counter = result.counters.find((item) => item.id === counterId);
                if (counter)
                    await action.setTitle(`${counter.label}\n${counter.count}${counter.unit}`);
            }
            catch {
                await action.setTitle(counterId);
            }
        }
        async onWillAppear(ev) { await this.updateTitle(ev.action, ev.payload.settings.counterId); }
        async onPropertyInspectorDidAppear(_ev) { try {
            await streamDeck.ui.sendToPropertyInspector({ type: "catalog", counters: (await api.counters()).counters });
        }
        catch {
            await streamDeck.ui.sendToPropertyInspector({ type: "catalog-error" });
        } }
        async onKeyDown(ev) {
            const settings = ev.payload.settings;
            if (!settings.counterId || !settings.operation)
                return ev.action.showAlert();
            try {
                const result = await api.counterCommand({ ...settings, counterId: settings.counterId, operation: settings.operation });
                const counter = result.state.counters.find((item) => item.id === settings.counterId);
                if (counter)
                    await ev.action.setTitle(`${counter.label}\n${counter.count}${counter.unit}`);
                await ev.action.showOk();
            }
            catch {
                await ev.action.showAlert();
            }
        }
    };
    return CounterAction = _classThis;
})();
export { CounterAction };
let EffectAction = (() => {
    let _classDecorators = [action({ UUID: "jp.vcreatortools.streamdeck.effect" })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _classSuper = SingletonAction;
    var EffectAction = class extends _classSuper {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            EffectAction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        async onPropertyInspectorDidAppear(_ev) { try {
            await streamDeck.ui.sendToPropertyInspector({ type: "catalog", effects: (await api.effects()).buttons });
        }
        catch {
            await streamDeck.ui.sendToPropertyInspector({ type: "catalog-error" });
        } }
        async onKeyDown(ev) { const buttonId = ev.payload.settings.buttonId; if (!buttonId)
            return ev.action.showAlert(); try {
            await api.triggerEffect(buttonId);
            await ev.action.showOk();
        }
        catch {
            await ev.action.showAlert();
        } }
    };
    return EffectAction = _classThis;
})();
export { EffectAction };
//# sourceMappingURL=actions.js.map