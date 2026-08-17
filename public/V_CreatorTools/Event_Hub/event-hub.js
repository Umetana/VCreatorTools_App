(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  let state = null;
  let catalog = { fields: [], counters: [], effects: [] };
  let runtimeStatus = { commentProcessingMode: "normalized" };
  const api = async (url, options = {}) => { const response = await fetch(url, { ...options, headers: { "content-type": "application/json", ...(options.headers || {}) } }); const body = await response.json(); if (!response.ok) { const error = new Error(body.error || `http_${response.status}`); error.state = body.state; throw error; } return body; };
  const id = () => `rule_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  function defaultRule() { const field = catalog.fields[0] || { id: "comment.text", eventType: "comment", operators: ["contains"], type: "string" }; return { id: id(), label: "新しいRule", enabled: false, event: { type: field.eventType, field: field.id }, condition: { operator: field.operators[0], value: field.type === "number" ? 0 : field.type === "boolean" ? true : "keyword" }, action: { type: "counter.command", counterId: catalog.counters[0]?.id || "counter", operation: "increment", delta: 1 } }; }
  function notice(text, kind = "") { $("notice").textContent = text; $("notice").className = kind; }
  function option(value, label = value) { const node = document.createElement("option"); node.value = value; node.textContent = label; return node; }
  function operatorLabel(value) { return ({ equals: "完全一致", contains: "含む", containsAny: "いずれかを含む", eq: "==", gte: ">=", lte: "<=", gt: ">", lt: "<" })[value] || value; }
  function selectValue(select, value) { select.value = value; if (select.value !== String(value) && select.options.length) select.selectedIndex = 0; }

  function sampleEvent(field, value) {
    const sentAt = new Date().toISOString();
    if (field.eventType === "comment") {
      const parsed = field.type === "boolean" ? value === "true" : value;
      const comment = { id: `dry-run-${Date.now()}`, message: { text: field.id === "comment.text" ? parsed : "sample" }, user: { traits: { firstTime: field.id === "comment.firstComment" ? parsed : false } } };
      const raw = { data: { id: comment.id, comment: comment.message.text, firstComment: comment.user.traits.firstTime } };
      return { schema: "msbridge.event.v1", eventType: "comment", sentAt, source: { app: "event-hub-dry-run" }, payload: runtimeStatus.commentProcessingMode === "raw" ? { raw } : { normalized: comment } };
    }
    const key = ({ "meta.viewerCount": "viewerCount", "meta.likeCount": "likeCount", "meta.subscriberCount": "subscriberCount", "meta.platform": "platform" })[field.id];
    return { schema: "msbridge.event.v1", eventType: "meta", sentAt, source: { app: "event-hub-dry-run" }, payload: { normalized: { [key]: field.type === "number" ? Number(value) : value } } };
  }

  async function testRule(node) {
    const button = node.querySelector(".test-rule"); const output = node.querySelector(".test-result"); const field = catalog.fields.find(item => item.id === node.querySelector(".field").value); const value = node.querySelector(".test-value").value;
    button.disabled = true; output.className = "test-result"; output.textContent = "判定中…";
    try {
      const result = await api("/api/event-hub/v1/test", { method: "POST", body: JSON.stringify({ rule: { ...readRule(node), enabled: true }, event: sampleEvent(field, value) }) });
      const interpreted = result.normalized?.values?.[field.id];
      output.className = `test-result ${result.matched ? "matched" : "unmatched"}`;
      output.textContent = `${result.matched ? "一致" : "不一致"} / Server解釈値: ${interpreted === null ? "null" : JSON.stringify(interpreted)} / Actionは実行していません`;
    } catch (error) { output.className = "test-result error"; output.textContent = `テストエラー: ${error.message}`; }
    finally { button.disabled = false; }
  }

  function render() {
    const root = $("rules"); root.replaceChildren();
    if (!state.rules.length) { const empty = document.createElement("div"); empty.className = "empty"; empty.textContent = "Ruleはまだありません。最初のRuleを追加してください。"; root.append(empty); return; }
    state.rules.forEach((rule) => root.append(renderRule(rule)));
  }

  function renderRule(rule) {
    const node = $("rule-template").content.firstElementChild.cloneNode(true);
    const get = (name) => node.querySelector(`.${name}`);
    get("label").value = rule.label; get("enabled").checked = rule.enabled; get("rule-id").textContent = rule.id;
    catalog.fields.forEach(field => get("field").append(option(field.id, field.id)));
    selectValue(get("field"), rule.event.field);
    const updateValueHelp = () => { const multiple = get("operator").value === "containsAny"; get("value-help").textContent = multiple ? "改行・カンマ・読点区切り（最大50語）" : ""; get("value").rows = multiple ? 3 : 1; };
    const rebuildOperators = () => { const field = catalog.fields.find(item => item.id === get("field").value); get("operator").replaceChildren(...field.operators.map(item => option(item, operatorLabel(item)))); selectValue(get("operator"), rule.condition.operator); updateValueHelp(); };
    rebuildOperators(); get("value").value = Array.isArray(rule.condition.value) ? rule.condition.value.join("\n") : String(rule.condition.value);
    selectValue(get("action-type"), rule.action.type); selectValue(get("operation"), rule.action.operation || "increment"); get("amount").value = rule.action.operation === "set" ? rule.action.value : rule.action.delta ?? 1;
    const rebuildTarget = () => { const effects = get("action-type").value === "effect.button.trigger"; const items = effects ? catalog.effects.map(item => [item.buttonId, item.label]) : catalog.counters.map(item => [item.id, item.label]); get("target").replaceChildren(...items.map(([value, label]) => option(value, `${label} (${value})`))); selectValue(get("target"), effects ? rule.action.buttonId : rule.action.counterId); get("operation-wrap").hidden = effects; get("amount-wrap").hidden = effects || get("operation").value === "reset"; };
    rebuildTarget();
    get("field").addEventListener("change", () => { const field = catalog.fields.find(item => item.id === get("field").value); rule.event = { type: field.eventType, field: field.id }; rule.condition = { operator: field.operators[0], value: field.type === "number" ? 0 : field.type === "boolean" ? true : "keyword" }; render(); });
    get("operator").addEventListener("change", updateValueHelp); get("action-type").addEventListener("change", rebuildTarget); get("operation").addEventListener("change", rebuildTarget);
    get("test-rule").addEventListener("click", () => testRule(node));
    get("remove").addEventListener("click", () => { state.rules = state.rules.filter(item => item !== rule); render(); });
    get("duplicate").addEventListener("click", () => { state.rules.splice(state.rules.indexOf(rule) + 1, 0, { ...readRule(node), id: id(), label: `${get("label").value} copy` }); render(); });
    node.readRule = () => readRule(node); return node;
  }

  function readRule(node) {
    const get = (name) => node.querySelector(`.${name}`); const field = catalog.fields.find(item => item.id === get("field").value); const rawValue = get("value").value;
    const operator = get("operator").value;
    const value = operator === "containsAny" ? rawValue.split(/[\r\n,，、]+/).map(item => item.trim()).filter(Boolean) : field.type === "number" ? Number(rawValue) : field.type === "boolean" ? rawValue === "true" : rawValue;
    const type = get("action-type").value; let action;
    if (type === "effect.button.trigger") action = { type, buttonId: get("target").value };
    else { const operation = get("operation").value; action = { type, counterId: get("target").value, operation }; if (["increment", "decrement"].includes(operation)) action.delta = Number(get("amount").value); if (operation === "set") action.value = Number(get("amount").value); }
    return { id: get("rule-id").textContent, label: get("label").value, enabled: get("enabled").checked, event: { type: field.eventType, field: field.id }, condition: { operator, value }, action };
  }

  function collect() { return [...$("rules").querySelectorAll(".rule")].map(node => node.readRule()); }
  async function validatedDocument(document) { return (await api("/api/event-hub/v1/rules/validate", { method: "POST", body: JSON.stringify(document) })).document; }
  async function exportRules() {
    const button = $("export"); button.disabled = true;
    try {
      const document = await validatedDocument({ ...state, rules: collect() });
      const blob = new Blob([`${JSON.stringify(document, null, 2)}\n`], { type: "application/json" }); const link = documentElement("a"); link.href = URL.createObjectURL(blob); link.download = `vct-event-hub-rules-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); notice(`${document.rules.length} RulesをExportしました`, "ok");
    } catch (error) { notice(`Exportエラー: ${error.message}`, "error"); }
    finally { button.disabled = false; }
  }
  async function importRules(file) {
    if (!file) return; if (file.size > 1024 * 1024) { notice("Importエラー: ファイルは1MB以下にしてください", "error"); return; }
    try {
      const imported = await validatedDocument(JSON.parse(await file.text()));
      state = { ...state, rules: imported.rules }; render(); notice(`${imported.rules.length} Rulesを読み込みました。内容を確認して保存してください。`, "ok");
    } catch (error) { notice(`Importエラー: ${error.message}`, "error"); }
    finally { $("import-file").value = ""; }
  }
  function documentElement(tag) { return document.createElement(tag); }
  async function load() { notice("読込中…"); try { const [rules, nextCatalog, status] = await Promise.all([api("/api/event-hub/v1/rules"), api("/api/event-hub/v1/catalog"), api("/api/event-hub/v1/status")]); state = rules.state; catalog = nextCatalog; updateStatus(status); render(); notice(`revision ${state.revision} を読み込みました`, "ok"); } catch (error) { notice(`読込エラー: ${error.message}`, "error"); $("runtime-badge").textContent = "接続エラー"; $("runtime-badge").className = "badge error"; } }
  async function save() { const button = $("save"); button.disabled = true; try { const body = await api("/api/event-hub/v1/rules", { method: "PUT", body: JSON.stringify({ ...state, rules: collect() }) }); state = body.state; render(); notice(`保存しました / revision ${state.revision}`, "ok"); await refreshStatus(); } catch (error) { if (error.state) state = error.state; notice(error.message === "revision_conflict" ? "別画面で更新されています。再読込してください。" : `保存エラー: ${error.message}`, "error"); } finally { button.disabled = false; } }
  function updateStatus(status) {
    runtimeStatus = status; const runtime = status.runtime || {};
    $("runtime-badge").textContent = status.running ? `Serverで稼働中 / ${status.commentProcessingMode === "raw" ? "RAW" : "Normalized"}` : "停止"; $("runtime-badge").className = `badge ${status.running ? "online" : "error"}`;
    $("rule-count").textContent = status.ruleCount; $("enabled-count").textContent = status.enabledRuleCount;
    $("last-action").textContent = runtime.lastResult ? `${runtime.lastResult.ok ? "成功" : "失敗"} / ${new Date(runtime.lastResult.at).toLocaleTimeString()}` : "—";
    $("accepted-events").textContent = runtime.acceptedEvents ?? 0; $("matched-rules").textContent = runtime.matchedRules ?? 0; $("executed-actions").textContent = runtime.executedActions ?? 0; $("failed-actions").textContent = runtime.failedActions ?? 0; $("duplicate-comments").textContent = runtime.duplicateComments ?? 0; $("last-event").textContent = runtime.lastEventAt ? new Date(runtime.lastEventAt).toLocaleTimeString() : "—";
  }
  async function refreshStatus() { try { updateStatus(await api("/api/event-hub/v1/status")); } catch {} }
  $("add").addEventListener("click", () => { state.rules.push(defaultRule()); render(); }); $("reload").addEventListener("click", load); $("save").addEventListener("click", save); $("export").addEventListener("click", exportRules); $("import").addEventListener("click", () => $("import-file").click()); $("import-file").addEventListener("change", event => importRules(event.target.files[0])); load(); setInterval(refreshStatus, 5000);
})();
