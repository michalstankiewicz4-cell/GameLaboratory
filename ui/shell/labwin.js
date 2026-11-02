/* =======================================================================
   LABKIT · STANDARD WINDOWS — the windows every lab has, the same everywhere
   =======================================================================
   A classic script, after the lab's panels and before ui/shell/windows.js:
     a <script> of ../ui/shell/perf.js
     a <script> of ../ui/shell/labwin.js
     a <script> of ../ui/shell/windows.js
   An element with data-std="…" becomes one of the standard windows — the same title (English and Polish), the same
   side and the same place in the order on every page; the lab puts its own controls inside:
     info     Description · Opis           left, first      the model: .stdName, .stdSub, .stdText, table.specs, ol.src
     camera   Camera · Kamera              right, 1st       views, auto-rotate, the camera's look
     light    Light and weather · Światło i pogoda   right, 2nd
     perf     Performance · Wydajność      right, last      filled by ui/shell/perf.js; the lab's own settings go under it
   The lab's own windows (data-window) stand on the left, after Description; a second big one may stand on the right
   (data-side="right"), above Camera, Light and Performance.

   ui/shell/labwin.css: the look of what is inside these windows. */
(function () {
"use strict";
const PL = window.LabMenu && window.LabMenu.LANG === "pl";
const t = (en, pl) => (PL ? pl : en);
const STD = {
  info: { side: "left", en: "Description", pl: "Opis" },
  camera: { side: "right", en: "Camera", pl: "Kamera" },
  light: { side: "right", en: "Light and weather", pl: "Światło i pogoda" },
  perf: { side: "right", en: "Performance", pl: "Wydajność" },
};
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

// the standard windows: titles, sides, order (Description first on the left; Camera, Light, Performance on the right)
const found = {};
document.querySelectorAll("[data-std]").forEach((e) => {
  const k = e.dataset.std, s = STD[k]; if (!s) return;
  e.dataset.window = k; e.dataset.side = s.side; e.dataset.title = s.en; e.dataset.titlePl = s.pl;
  e.classList.add("stdWin"); found[k] = e;
});
const firstLeft = [...document.querySelectorAll("[data-window]")].find((e) => e !== found.info && (e.dataset.side || "left") === "left");
if (found.info && firstLeft) firstLeft.before(found.info);
const tail = [...document.querySelectorAll("[data-window]")].pop();
let after = tail;
for (const k of ["camera", "light", "perf"]) if (found[k]) { after.after(found[k]); after = found[k]; }

// the Performance window's numbers: ui/shell/perf.js (LabPerf), loaded before this script
if (found.perf && window.LabPerf) window.LabPerf.mount(found.perf);
})();
