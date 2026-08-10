"use strict";

(() => {
  const params = new URLSearchParams(location.search);
  const mode = params.get("vctMode") === "sync" ? "sync" : "standalone";
  const storageKey = "vct.user-gadget-sample.count.v1";
  const channel = mode === "sync" && "BroadcastChannel" in window
    ? new BroadcastChannel("vct.user-gadget-sample.v1")
    : null;
  const countNodes = [...document.querySelectorAll("[data-count]")];
  let count = Number.parseInt(localStorage.getItem(storageKey) || "0", 10);
  if (!Number.isFinite(count)) count = 0;

  document.querySelectorAll("[data-mode]").forEach((node) => { node.textContent = mode; });
  const render = () => countNodes.forEach((node) => { node.textContent = String(count); });
  const receive = (value) => {
    if (!Number.isInteger(value)) return;
    count = value;
    localStorage.setItem(storageKey, String(count));
    render();
  };
  const update = (value) => {
    receive(value);
    channel?.postMessage({ type: "count", value: count });
  };

  document.querySelector('[data-action="increment"]')?.addEventListener("click", () => update(count + 1));
  document.querySelector('[data-action="decrement"]')?.addEventListener("click", () => update(count - 1));
  document.querySelector('[data-action="reset"]')?.addEventListener("click", () => update(0));
  channel?.addEventListener("message", (event) => {
    if (event.data?.type === "count") receive(event.data.value);
  });
  render();
})();
