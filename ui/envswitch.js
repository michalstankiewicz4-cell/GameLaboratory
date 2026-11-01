// Przełącznik środowiska — wspólny dla laboratoriów rodzin modeli (CLAUDE.md: zawsze 3 pozycje,
// kosmos · woda · ląd; pozycje bez zachowania są wyszarzone). Montowany w znaczniku:
//   <div class="envSwitch" data-current="space" data-space="ship.html" data-water="warship.html" data-land=""></div>
// Pusty adres = brak zachowania w tym środowisku (pozycja wyszarzona). Style: ui/envswitch.css.
// Klasyczny skrypt bez zależności — działa na stronach ze skryptami klasycznymi i z modułami (także pod CSP 'self').
(function () {
  "use strict";
  const ENVS = [["space", "Space"], ["water", "Water"], ["land", "Land"]];
  function mount(box) {
    if (box.dataset.ready) return;
    box.dataset.ready = "1";
    box.setAttribute("role", "group"); box.setAttribute("aria-label", "Environment");
    const cur = box.dataset.current;
    for (const [env, label] of ENVS) {
      const href = box.dataset[env] || "";
      const el = document.createElement(href && env !== cur ? "a" : "span");
      el.className = "envOpt" + (env === cur ? " on" : "") + (href ? "" : " off");
      el.textContent = label;
      if (env === cur) el.setAttribute("aria-current", "true");
      if (href && env !== cur) el.href = href;
      if (!href) el.title = "No behaviour of this family in this environment yet";
      box.appendChild(el);
    }
  }
  const all = () => document.querySelectorAll(".envSwitch").forEach(mount);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
  window.EnvSwitch = { mount, ENVS };
})();
