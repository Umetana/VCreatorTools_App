import streamDeck from "@elgato/streamdeck";

const BASE_URL = "http://127.0.0.1:3000";

export type GlobalSettings = { automationToken?: string };
export type CounterSettings = { counterId?: string; operation?: "increment" | "decrement" | "reset" | "set"; amount?: number };
export type EffectSettings = { buttonId?: string };

async function request<T>(pathname: string, init: RequestInit = {}): Promise<T> {
  const settings = await streamDeck.settings.getGlobalSettings<GlobalSettings>();
  const token = typeof settings.automationToken === "string" ? settings.automationToken.trim() : "";
  if (!token) throw new Error("automation_token_required");
  const response = await fetch(`${BASE_URL}${pathname}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(2500) });
  const body = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(body.error || `http_${response.status}`);
  return body as T;
}

export const api = {
  counters: () => request<{ counters: Array<{ id: string; label: string; count: number; unit: string }> }>("/api/automation/v1/counters"),
  counterCommand: (settings: Required<Pick<CounterSettings, "counterId" | "operation">> & CounterSettings) => request<{ state: { counters: Array<{ id: string; label: string; count: number; unit: string }> } }>(`/api/automation/v1/counters/${encodeURIComponent(settings.counterId)}/command`, { method: "POST", body: JSON.stringify({ operation: settings.operation, ...(settings.operation === "set" ? { value: settings.amount ?? 0 } : settings.operation === "reset" ? { confirm: true } : { delta: settings.amount ?? 1 }) }) }),
  effects: () => request<{ buttons: Array<{ buttonId: string; label: string; effectId: string; order: number }> }>("/api/automation/v1/effects"),
  triggerEffect: (buttonId: string) => request(`/api/automation/v1/effects/${encodeURIComponent(buttonId)}/trigger`, { method: "POST" }),
};
