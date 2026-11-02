/* Back / forward on every page: two joined buttons at the start of the toolbar (body > .bar), the browser's own history
   (history.back / history.forward) — a way back to the lab or the start page you came from. Loaded by
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
