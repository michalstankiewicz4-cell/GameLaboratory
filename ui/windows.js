/* =======================================================================
   LABKIT · WINDOWS — a lab's options in floating windows, opened and
   closed from the menu bar (OPTIONS → Windows; ui/menubar.js)
   =======================================================================
   A classic script, after the lab's panels in the page:
     <script src="../ui/windows.js"></script>   + ui/ui.css
   Every element with data-window="id" becomes a window: a title bar
   (data-title, Polish data-title-pl; without them the panel's first section
   heading, read as the lab fills it; dragged to move it), ✕ to close,
   the element itself as the body. A click brings a window to the front.
   Which windows are open and where they stand is kept in this browser
   (gamelab.windows:<page>); the first visit opens them where the panels
   stood (data-side="left" | "right"). Styles: ui/windows.css and
   ui/controls.css (sliders fill gold up to their value: --fill, set here). No inline style attributes — only the CSSOM,
   so pages with a strict CSP work.
   ======================================================================= */
(function () {
"use strict";
const MENU_H = 32, TOP = MENU_H + 44, KEY = "gamelab.windows:" + location.pathname.replace(/^.*\/(labs|tools)\//, "$1/");
const lang = () => (window.LabMenu && window.LabMenu.LANG) || "en";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: lasts this visit */ } };
const state = load(), wins = [];
let zTop = 20;

function clamp(w) {
  const r = w.el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const x = Math.min(Math.max(r.left, 8 - r.width + 80), W - 80), y = Math.min(Math.max(r.top, MENU_H + 4), H - 36);
  place(w, x, y);
}
function place(w, x, y) { w.el.style.left = x + "px"; w.el.style.top = y + "px"; w.el.style.right = "auto"; }
function front(w) { w.el.style.zIndex = ++zTop; }
function show(w, open) {
  w.open = open; w.el.hidden = !open;
  if (open) { front(w); requestAnimationFrame(() => clamp(w)); }
  (state[w.id] = state[w.id] || {}).open = open; save();
}

function make(body) {
  const id = body.dataset.window, side = body.dataset.side || (body.classList.contains("right") ? "right" : "left");
  const el = document.createElement("section"); el.className = "labWin " + side;
  const head = document.createElement("header"); head.className = "labWinHead";
  const title = document.createElement("span"); title.className = "labWinTitle";
  const close = document.createElement("button"); close.type = "button"; close.className = "labWinClose"; close.textContent = "✕";
  head.append(title, close);
  body.classList.add("labWinBody");
  body.parentNode.insertBefore(el, body);
  el.append(head, body);
  const heading = () => { const h = body.querySelector("h3, .secHd"); return h && h.textContent.trim(); };
  const w = { id, el, body, open: true, title: () => (lang() === "pl" && body.dataset.titlePl) || body.dataset.title || heading() || id };
  title.textContent = w.title();
  close.title = lang() === "pl" ? "Zamknij (OPCJE → Okna otwiera je znowu)" : "Close (OPTIONS → Windows opens it again)";
  close.addEventListener("click", () => show(w, false));
  el.addEventListener("pointerdown", () => front(w));
  // drag by the title bar
  head.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target === close) return;
    const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId); el.classList.add("dragging");
    const move = (ev) => place(w, ev.clientX - dx, Math.max(MENU_H + 4, ev.clientY - dy));
    const up = () => {
      head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); head.removeEventListener("pointercancel", up);
      el.classList.remove("dragging"); clamp(w);
      w.fresh = null; const b = el.getBoundingClientRect(); Object.assign(state[id] = state[id] || {}, { x: Math.round(b.left), y: Math.round(b.top) }); save();
    };
    head.addEventListener("pointermove", move); head.addEventListener("pointerup", up); head.addEventListener("pointercancel", up);
    e.preventDefault();
  });
  // where it stands: remembered, or where the panel stood
  const s = state[id] || {};
  if (s.x != null) place(w, s.x, s.y);
  else { w.fresh = side; el.style.top = TOP + "px"; if (side === "right") { el.style.right = "12px"; el.style.left = "auto"; } else el.style.left = "12px"; }
  w.open = s.open !== false; el.hidden = !w.open;
  wins.push(w);
  return w;
}

// windows with no remembered place: one under another on their side (the page's order); when a side is full,
// the next ones cascade from its top
function stack() {
  for (const side of ["left", "right"]) {
    let y = TOP, k = 0;
    for (const w of wins) {
      if (w.fresh !== side || !w.open) continue;
      const h = w.el.getBoundingClientRect().height;
      if (y > TOP && y + Math.min(h, 160) > innerHeight - 12) { k++; y = TOP + 28 * k; }
      w.el.style.top = y + "px";
      if (k) w.el.style[side] = 12 + 28 * k + "px";
      y += h + 10;
    }
  }
}
// a slider's gold fill up to its value (ui/controls.css reads --fill)
const fill = (s) => { const lo = +s.min || 0, hi = s.max === "" ? 100 : +s.max; if (hi > lo) s.style.setProperty("--fill", ((s.value - lo) / (hi - lo) * 100) + "%"); };
const fillAll = () => document.querySelectorAll(".labWin input[type=range], .labUi input[type=range]").forEach(fill);
function init() {
  document.querySelectorAll("[data-window]").forEach(make);
  document.addEventListener("input", (e) => { if (e.target.matches && e.target.matches("input[type=range]")) fill(e.target); }, true);
  requestAnimationFrame(stack); setTimeout(stack, 1200);   // again once the labs have filled their panels
  // titles from a heading: the labs fill their panels after loading
  // the heading that became the title is not repeated right under it
  const sync = () => wins.forEach((w) => {
    const t = w.title(), e = w.el.querySelector(".labWinTitle"); if (e.textContent !== t) e.textContent = t;
    if (w.body.dataset.title) return;
    const h = w.body.querySelector("h3, .secHd");
    w.body.querySelectorAll(".labWinDup").forEach((x) => { if (x !== h) x.classList.remove("labWinDup"); });
    if (h) h.classList.add("labWinDup");
  });
  sync(); fillAll(); setInterval(() => { sync(); fillAll(); }, 1500);
  addEventListener("resize", () => wins.forEach((w) => { if (w.open) clamp(w); }));
}
window.LabWindows = {
  list: () => wins.map((w) => ({ id: w.id, title: w.title, open: w.open })),
  toggle: (id) => { const w = wins.find((x) => x.id === id); if (w) show(w, !w.open); },
  show: (id, open = true) => { const w = wins.find((x) => x.id === id); if (w) show(w, open); },
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
