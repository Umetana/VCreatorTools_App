import streamDeck from "@elgato/streamdeck";
const BASE_URL = "http://127.0.0.1:3000";
async function request(pathname, init = {}) {
    const settings = await streamDeck.settings.getGlobalSettings();
    const token = typeof settings.automationToken === "string" ? settings.automationToken.trim() : "";
    if (!token)
        throw new Error("automation_token_required");
    const response = await fetch(`${BASE_URL}${pathname}`, { ...init, headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(2500) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(body.error || `http_${response.status}`);
    return body;
}
export const api = {
    counters: () => request("/api/automation/v1/counters"),
    counterCommand: (settings) => request(`/api/automation/v1/counters/${encodeURIComponent(settings.counterId)}/command`, { method: "POST", body: JSON.stringify({ operation: settings.operation, ...(settings.operation === "set" ? { value: settings.amount ?? 0 } : settings.operation === "reset" ? { confirm: true } : { delta: settings.amount ?? 1 }) }) }),
    effects: () => request("/api/automation/v1/effects"),
    triggerEffect: (buttonId) => request(`/api/automation/v1/effects/${encodeURIComponent(buttonId)}/trigger`, { method: "POST" }),
};
//# sourceMappingURL=api.js.map