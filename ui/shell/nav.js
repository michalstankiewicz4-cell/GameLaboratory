/* Back · home · forward on every page: three joined buttons at the start of the toolbar (body > .bar) — back and forward
   are the browser's own history (history.back / history.forward), the house in between opens the start page. Loaded by
   ui/shell/menubar.js on every page, like the console. Greyed out when there is nowhere to go (the Navigation API, where
   the browser has it; otherwise back is greyed out only on the first page of the tab). Styles: ui/shell/bars.css (.navSeg). */
(function () {
"use strict";
const t = (en, pl) => (window.LabMenu && window.LabMenu.LANG === "pl" ? pl : en);
function mount() {
  const bar = document.querySelector("body > .bar");
  if (!bar || bar.querySelector(".navSeg")) return;
  const seg = document.createElement("div"); seg.className = "navSeg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", t("Navigation", "Nawigacja"));
  const mk = (txt, title, go) => { const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.title = title; b.setAttribute("aria-label", title); b.addEventListener("click", go); seg.appendChild(b); return b; };
  const back = mk("←", t("Back", "Cofnij"), () => history.back());
  const home = mk("", t("Start page", "Strona startowa"), () => { location.href = ((window.LabMenu && window.LabMenu.ROOT) || "") + "index.html"; });
  home.classList.add("navHome");
  const NS = "http://www.w3.org/2000/svg", svg = document.createElementNS(NS, "svg"), path = document.createElementNS(NS, "path");
  svg.setAttribute("viewBox", "0 0 16 16"); svg.setAttribute("aria-hidden", "true");
  path.setAttribute("d", "M2.5 7.5 8 3l5.5 4.5M4 6.5V13h3V9.5h2V13h3V6.5"); path.setAttribute("fill", "none"); path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5"); path.setAttribute("stroke-linejoin", "round"); path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path); home.appendChild(svg);
  if (window.LabMenu && !document.body.classList.contains("lmLab")) home.disabled = true;   // already on the start page (ui/shell/menubar.js marks the others lmLab)
  const fwd = mk("→", t("Forward", "Ponów"), () => history.forward());
  const nav = window.navigation;
  const state = () => {
    if (nav && "canGoBack" in nav) { back.disabled = !nav.canGoBack; fwd.disabled = !nav.canGoForward; }
    else back.disabled = history.length <= 1;
  };
  state();
  if (nav && nav.addEventListener) nav.addEventListener("currententrychange", state);
  addEventListener("pageshow", state);
  bar.prepend(seg);
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount); else mount();
})();
