// Przełącznik środowiska — wspólny dla laboratoriów rodzin modeli (CLAUDE.md: zawsze 3 pozycje,
// kosmos · woda · ląd; pozycje bez zachowania są wyszarzone). Montowany w znaczniku:
//   <div class="envSwitch" data-current="space" data-space="vehicles-space.html" data-water="vehicles-water.html" data-land=""></div>
// Pusty adres = brak zachowania w tym środowisku (pozycja wyszarzona). Style: ui/shell/envswitch.css.
// Tu też przełącznik grupy — laboratoria, które należą do siebie ("group" w ui/data/catalog.js, np. ciała niebieskie ·
// układy · skala): <div class="envSwitch groupSwitch" data-group="space"></div>; pozycje i ich nazwy (tab / tabPl) bierze
// z katalogu, bieżącą stronę rozpoznaje sam.
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
  function mountGroup(box) {
    if (box.dataset.ready) return;
    const cat = window.GameLabCatalog, menu = window.LabMenu || {};
    if (!cat) return;
    box.dataset.ready = "1";
    box.setAttribute("role", "group"); box.setAttribute("aria-label", "Labs of this group");
    const pl = menu.LANG === "pl", root = menu.ROOT || "../", here = location.pathname.split("/").pop() || "index.html";
    for (const l of cat.labs.filter((x) => x.group === box.dataset.group)) {
      const cur = l.file.split("/").pop() === here, el = document.createElement(cur ? "span" : "a");
      el.className = "envOpt" + (cur ? " on" : "");
      el.textContent = (pl ? l.tabPl : l.tab) || l.name;
      if (cur) el.setAttribute("aria-current", "true"); else el.href = root + l.file;
      box.appendChild(el);
    }
  }
  const all = () => { document.querySelectorAll(".envSwitch:not(.groupSwitch)").forEach(mount); document.querySelectorAll(".groupSwitch").forEach(mountGroup); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", all); else all();
  window.EnvSwitch = { mount, mountGroup, ENVS };
})();
