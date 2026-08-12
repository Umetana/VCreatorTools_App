import streamDeck, { action, type DidReceiveSettingsEvent, type KeyAction, type KeyDownEvent, type PropertyInspectorDidAppearEvent, type SendToPluginEvent, SingletonAction, type WillAppearEvent } from "@elgato/streamdeck";
import { api, type CounterSettings, type EffectSettings } from "./api.js";

type CounterState = { id: string; label: string; count: number; unit: string };

function counterIcon(operation: CounterSettings["operation"]): string {
  const symbol = operation === "decrement" ? "−" : operation === "reset" ? "↺" : operation === "set" ? "SET" : "+";
  const size = operation === "set" ? 42 : 72;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 144 144"><rect width="144" height="144" rx="18" fill="#172033"/><text x="72" y="70" fill="#7dd3fc" font-family="Arial,sans-serif" font-size="${size}" font-weight="700" text-anchor="middle">${symbol}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

@action({ UUID: "jp.vcreatortools.streamdeck.counter" })
export class CounterAction extends SingletonAction<CounterSettings> {
  async sendCatalog() { try { await streamDeck.ui.sendToPropertyInspector({ type: "catalog", counters: (await api.counters()).counters }); } catch { await streamDeck.ui.sendToPropertyInspector({ type: "catalog-error" }); } }
  async setVisual(action: KeyAction<CounterSettings>, counter: CounterState, operation?: CounterSettings["operation"]) {
    await Promise.all([action.setImage(counterIcon(operation)), action.setTitle(`${counter.label}\n${counter.count}${counter.unit}`)]);
  }
  async updateTitle(action: WillAppearEvent<CounterSettings>["action"], counterId?: string, operation?: CounterSettings["operation"]) {
    if (!counterId || !action.isKey()) return;
    try { const result = await api.counters(); const counter = result.counters.find((item) => item.id === counterId); if (counter) await this.setVisual(action, counter, operation); }
    catch { await action.setTitle(counterId); }
  }
  async syncCounter(counter: CounterState) {
    const updates: Promise<void>[] = [];
    for (const action of streamDeck.actions) {
      if (action.manifestId !== "jp.vcreatortools.streamdeck.counter" || !action.isKey()) continue;
      updates.push((async () => {
        const settings = await action.getSettings<CounterSettings>();
        if (settings.counterId === counter.id) await this.setVisual(action, counter, settings.operation);
      })());
    }
    await Promise.allSettled(updates);
  }
  override async onWillAppear(ev: WillAppearEvent<CounterSettings>) { await this.updateTitle(ev.action, ev.payload.settings.counterId, ev.payload.settings.operation); }
  override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CounterSettings>) { await this.updateTitle(ev.action, ev.payload.settings.counterId, ev.payload.settings.operation); }
  override async onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<CounterSettings>) { await this.sendCatalog(); }
  override async onSendToPlugin(_ev: SendToPluginEvent<{ type: string }, CounterSettings>) { await this.sendCatalog(); }
  override async onKeyDown(ev: KeyDownEvent<CounterSettings>) {
    const settings = ev.payload.settings;
    if (!settings.counterId || !settings.operation) return ev.action.showAlert();
    try { const result = await api.counterCommand({ ...settings, counterId: settings.counterId, operation: settings.operation }); const counter = result.state.counters.find((item) => item.id === settings.counterId); if (counter) await this.syncCounter(counter); }
    catch { await ev.action.showAlert(); }
  }
}

@action({ UUID: "jp.vcreatortools.streamdeck.effect" })
export class EffectAction extends SingletonAction<EffectSettings> {
  async sendCatalog() { try { await streamDeck.ui.sendToPropertyInspector({ type: "catalog", effects: (await api.effects()).buttons }); } catch { await streamDeck.ui.sendToPropertyInspector({ type: "catalog-error" }); } }
  override async onPropertyInspectorDidAppear(_ev: PropertyInspectorDidAppearEvent<EffectSettings>) { await this.sendCatalog(); }
  override async onSendToPlugin(_ev: SendToPluginEvent<{ type: string }, EffectSettings>) { await this.sendCatalog(); }
  override async onKeyDown(ev: KeyDownEvent<EffectSettings>) { const buttonId = ev.payload.settings.buttonId; if (!buttonId) return ev.action.showAlert(); try { await api.triggerEffect(buttonId); } catch { await ev.action.showAlert(); } }
}
