/* =======================================================================
   LABKIT · WINDOWS — a lab's options in floating windows, opened and
   closed from the menu bar (OPTIONS → Windows; ui/shell/menubar.js)
   =======================================================================
   A classic script, after the lab's panels in the page:
     a <script> of ../ui/shell/windows.js   + ui/ui.css
   Every element with data-window="id" becomes a window: a title bar
   (data-title, Polish data-title-pl; without them the panel's first section
   heading, read as the lab fills it; dragged to move it), ✕ to close,
   the element itself as the body. A click brings a window to the front.
   Which windows are open and where they stand is kept in this browser
   (gamelab.windows:<page>); the first visit opens them where the panels
   stood (data-side="left" | "right"). Styles: ui/shell/windows.css and
   ui/style/controls.css (sliders fill gold up to their value: --fill, set here). No inline style attributes — only the CSSOM,
   so pages with a strict CSP work.
   Window or panel: the pin on a title bar docks that window in the panel on its side (a column between the bars,
   one window under another, scrolled), and back; the toolbar switch Windows | Panels does it for all of them.
   Docked or not is kept with the window's place. Panels (all docked): real panels flush with the edges, the console
   (ui/shell/console.js) docked at the bottom between them, body.lmPanels; the free middle is published as --viewL,
   --viewR, --viewB on <html> and through window.LabView (a page with body.viewFits puts its #view there and sizes its
   renderer from it — the scene editor; other pages keep the view full size, under the panels).
   ======================================================================= */
(function () {
"use strict";
const MENU_H = 32, TOP = MENU_H + 52, KEY = "gamelab.windows:" + location.pathname.replace(/^.*\/(labs|tools)\//, "$1/");
const lang = () => (window.LabMenu && window.LabMenu.LANG) || "en";
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { return {}; } };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage blocked: lasts this visit */ } };
const state = load(), wins = [];
let zTop = 20;
const PL = () => lang() === "pl";
// the two panels windows dock into (created on the first docking)
const docks = {};
function dock(side) {
  if (!docks[side]) { const d = document.createElement("div"); d.className = "labDock " + side; document.body.appendChild(d); docks[side] = d; }
  return docks[side];
}

function clamp(w) {
  const r = w.el.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const x = Math.min(Math.max(r.left, 8 - r.width + 80), W - 80), y = Math.min(Math.max(r.top, MENU_H + 4), H - 36);
  place(w, x, y);
}
function place(w, x, y) { w.el.style.left = x + "px"; w.el.style.top = y + "px"; w.el.style.right = "auto"; }
function front(w) { w.el.style.zIndex = ++zTop; }
function show(w, open) {
  w.open = open; w.el.hidden = !open;
  if (open && !w.docked) { front(w); requestAnimationFrame(() => clamp(w)); }
  (state[w.id] = state[w.id] || {}).open = open; save();
}

function make(body) {
  const id = body.dataset.window, side = body.dataset.side || (body.classList.contains("right") ? "right" : "left");
  const el = document.createElement("section"); el.className = "labWin " + side;
  const head = document.createElement("header"); head.className = "labWinHead";
  const title = document.createElement("span"); title.className = "labWinTitle";
  const close = document.createElement("button"); close.type = "button"; close.className = "labWinClose"; close.textContent = "✕";
  const pin = document.createElement("button"); pin.type = "button"; pin.className = "labWinPin"; pin.textContent = side === "right" ? "⇥" : "⇤";
  head.append(title, pin, close);
  body.classList.add("labWinBody");
  body.parentNode.insertBefore(el, body);
  el.append(head, body);
  const heading = () => { const h = body.querySelector("h3, .secHd"); return h && h.textContent.trim(); };
  const w = { id, el, body, side, pin, open: true, docked: false, title: () => (lang() === "pl" && body.dataset.titlePl) || body.dataset.title || heading() || id };
  title.textContent = w.title();
  close.title = lang() === "pl" ? "Zamknij (OPCJE → Okna otwiera je znowu)" : "Close (OPTIONS → Windows opens it again)";
  close.addEventListener("click", () => show(w, false));
  pin.addEventListener("click", () => { setDocked(w, !w.docked); syncSwitch(); });
  el.addEventListener("pointerdown", () => front(w));
  // drag by the title bar
  head.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target === close || e.target === pin || w.docked) return;
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
  w.home = { parent: el.parentNode, next: el.nextSibling };      // where it goes back when it floats again
  wins.push(w);
  if (s.docked) setDocked(w, true, true);
  pinTitle(w);
  return w;
}
function pinTitle(w) {
  w.pin.title = w.docked ? (PL() ? "Odepnij: okno pływające" : "Undock: a floating window")
    : (PL() ? (w.side === "right" ? "Przypnij do panelu po prawej" : "Przypnij do panelu po lewej") : (w.side === "right" ? "Dock in the right panel" : "Dock in the left panel"));
}
// into the side panel (in the page's order) or back to a floating window where it stood
function setDocked(w, on, quiet) {
  w.docked = on; w.el.classList.toggle("docked", on);
  if (on) {
    const d = dock(w.side), after = wins.slice(wins.indexOf(w) + 1).find((x) => x.docked && x.side === w.side && x.el.parentNode === d);
    d.insertBefore(w.el, after ? after.el : null);
    ["left", "right", "top", "maxHeight", "zIndex"].forEach((k) => { w.el.style[k] = ""; });
  } else {
    w.home.parent.insertBefore(w.el, w.home.next && w.home.next.parentNode === w.home.parent ? w.home.next : null);
    const s = state[w.id] || {};
    if (s.x != null) place(w, s.x, s.y); else { w.fresh = w.side; requestAnimationFrame(stack); }
    if (w.open) { front(w); requestAnimationFrame(() => clamp(w)); }
  }
  pinTitle(w);
  if (!quiet) { (state[w.id] = state[w.id] || {}).docked = on; save(); }
}
// the free middle between the panels (and the console under it): CSS variables and LabView for the pages that fit their view
const viewSubs = new Set();
let viewKey = "";
function layoutView() {
  const vis = (side) => { const d = docks[side]; return d && getComputedStyle(d).display !== "none" ? d.getBoundingClientRect().width : 0; };
  const con = document.querySelector(".labConsole.lcDocked:not([hidden])");
  const L = Math.round(vis("left")), R = Math.round(vis("right")), B = con ? Math.round(con.getBoundingClientRect().height) : 0;
  const root = document.documentElement.style;
  root.setProperty("--viewL", L + "px"); root.setProperty("--viewR", R + "px"); root.setProperty("--viewB", B + "px");
  const k = [L, R, B].join(","); if (k === viewKey) return; viewKey = k;
  viewSubs.forEach((f) => { try { f(); } catch (e) { /* a page's listener */ } });
}
window.LabView = {
  // the free middle in pixels: { left, right, bottom } taken by the panels and the console
  insets: () => ({ left: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--viewL")) || 0, right: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--viewR")) || 0, bottom: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--viewB")) || 0 }),
  onChange: (f) => { viewSubs.add(f); return () => viewSubs.delete(f); },
  update: () => { viewKey = ""; layoutView(); },
};
// the toolbar switch: Windows | Panels (all at once); neither lit when they are mixed
let sw = null;
function syncSwitch() {
  const n = wins.filter((w) => w.docked).length;
  document.body.classList.toggle("lmPanels", wins.length > 0 && n === wins.length);
  layoutView();
  if (!sw) return;
  sw.querySelector('[data-v="win"]').classList.toggle("on", n === 0);
  sw.querySelector('[data-v="dock"]').classList.toggle("on", n === wins.length);
}
function toolbarSwitch() {
  const bar = document.querySelector("body > .bar"); if (!bar || !wins.length || bar.querySelector(".winSeg")) return;
  sw = document.createElement("div"); sw.className = "seg winSeg"; sw.setAttribute("role", "group");
  sw.setAttribute("aria-label", PL() ? "Okna albo panele" : "Windows or panels");
  [["win", PL() ? "Okna" : "Windows", PL() ? "Wszystkie okna pływające" : "All windows floating"],
   ["dock", PL() ? "Panele" : "Panels", PL() ? "Wszystkie okna w panelach po bokach" : "All windows docked in the side panels"]].forEach(([v, label, tip]) => {
    const b = document.createElement("button"); b.type = "button"; b.dataset.v = v; b.textContent = label; b.title = tip;
    b.addEventListener("click", () => { wins.forEach((w) => { if (w.docked !== (v === "dock")) setDocked(w, v === "dock"); }); syncSwitch(); });
    sw.appendChild(b);
  });
  const sp = bar.querySelector(":scope > .sp"); bar.insertBefore(sw, sp ? sp.nextSibling : null);
  syncSwitch();
}

// windows with no remembered place: one under another on their side (the page's order); when a column is full, the
// next ones start a new column beside it (towards the middle), so they do not cover each other
function stack() {
  const bottom = innerHeight - 46;
  for (const side of ["left", "right"]) {
    let y = TOP, x = 12, colW = 0;
    for (const w of wins) {
      if (w.fresh !== side || !w.open || w.docked) continue;
      const r = w.el.getBoundingClientRect();
      if (y > TOP && y + Math.min(r.height, 200) > bottom) { x += colW + 10; y = TOP; colW = 0; }
      w.el.style.top = y + "px";
      w.el.style[side] = x + "px"; w.el.style[side === "left" ? "right" : "left"] = "auto";
      w.el.style.maxHeight = (bottom - y) + "px";
      colW = Math.max(colW, r.width);
      y += Math.min(r.height, bottom - y) + 10;
    }
  }
}
// a slider's gold fill up to its value (ui/style/controls.css reads --fill)
const fill = (s) => { const lo = +s.min || 0, hi = s.max === "" ? 100 : +s.max; if (hi > lo) s.style.setProperty("--fill", ((s.value - lo) / (hi - lo) * 100) + "%"); };
const fillAll = () => document.querySelectorAll(".labWin input[type=range], .labUi input[type=range]").forEach(fill);
function init() {
  document.querySelectorAll("[data-window]").forEach(make);
  toolbarSwitch();
  syncSwitch();
  addEventListener("resize", layoutView);
  new MutationObserver(() => layoutView()).observe(document.body, { attributes: true, attributeFilter: ["class", "hidden"], subtree: true });
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
  addEventListener("resize", () => wins.forEach((w) => { if (w.open && !w.docked) clamp(w); }));
}
window.LabWindows = {
  list: () => wins.map((w) => ({ id: w.id, title: w.title, open: w.open })),
  toggle: (id) => { const w = wins.find((x) => x.id === id); if (w) show(w, !w.open); },
  show: (id, open = true) => { const w = wins.find((x) => x.id === id); if (w) show(w, open); },
  dock: (id, on = true) => { const w = wins.find((x) => x.id === id); if (w) { setDocked(w, on); syncSwitch(); } },
};
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
