import streamDeck, { action, type KeyDownEvent, type PropertyInspectorDidAppearEvent, SingletonAction, type WillAppearEvent } from "@elgato/streamdeck";
import { api, type CounterSettings, type EffectSettings } from "./api.js";

@action({ UUID: "jp.vcreatortools.streamdeck.counter" })
export class CounterAction extends SingletonAction<CounterSettings> {
  async updateTitle(action: WillAppearEvent<CounterSettings>["action"], counterId?: string) {
    if (!counterId || !action.isKey()) return;
    try { const result = await api.counters(); const counter = result.counters.find((item) => item.id === counterId); if (counter) await action.setTitle(`${counter.label}\n${counter.count}${counter.unit}`); }
    catch { await action.setTitle(counterId); }
  }
  override async onWillAppear(ev: WillAppearEvent<CounterSettings>) { await this.updateTitle(ev.action, ev.payload.settings.counterId); }
  override async onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<CounterSettings>) { try { await streamDeck.ui.sendToPropertyInspector({ type: "catalog", counters: (await api.counters()).counters }); } catch { await streamDeck.ui.sendToPropertyInspector({ type: "catalog-error" }); } }
  override async onKeyDown(ev: KeyDownEvent<CounterSettings>) {
    const settings = ev.payload.settings;
    if (!settings.counterId || !settings.operation) return ev.action.showAlert();
    try { const result = await api.counterCommand({ ...settings, counterId: settings.counterId, operation: settings.operation }); const counter = result.state.counters.find((item) => item.id === settings.counterId); if (counter) await ev.action.setTitle(`${counter.label}\n${counter.count}${counter.unit}`); await ev.action.showOk(); }
    catch { await ev.action.showAlert(); }
  }
}

@action({ UUID: "jp.vcreatortools.streamdeck.effect" })
export class EffectAction extends SingletonAction<EffectSettings> {
  override async onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<EffectSettings>) { try { await streamDeck.ui.sendToPropertyInspector({ type: "catalog", effects: (await api.effects()).buttons }); } catch { await streamDeck.ui.sendToPropertyInspector({ type: "catalog-error" }); } }
  override async onKeyDown(ev: KeyDownEvent<EffectSettings>) { const buttonId = ev.payload.settings.buttonId; if (!buttonId) return ev.action.showAlert(); try { await api.triggerEffect(buttonId); await ev.action.showOk(); } catch { await ev.action.showAlert(); } }
}
