/* The console window: what ui/shell/menubar.js logs (window.LabLog) — errors, warnings, the console's messages, the loading
   card's steps and times — newest at the top, each with its date and time and the page it came from (the log is kept
   for the tab until it is closed), filtered by kind and by text.
   A button on the right of the lab's bar (body > .bar) opens and closes it; the window floats over the lab, is
   dragged by its title and closed with ×. Where it stands and whether it is open are kept in this browser
   (gamelab.console). Loaded by ui/shell/menubar.js on every lab and tool page; its look: ui/shell/console.css. */
(function () {
"use strict";
const LOG = window.LabLog;
if (!LOG || document.querySelector(".labConsole")) return;
const PL = window.LabMenu && window.LabMenu.LANG === "pl";
const t = (en, pl) => (PL ? pl : en);
const KEY = "gamelab.console";
let st = { open: false, x: null, y: null, kind: "all", q: "" };
try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const KINDS = [["all", t("All", "Wszystko")], ["error", t("Errors", "Błędy")], ["warn", t("Warnings", "Ostrzeżenia")],
  ["load", t("Loading", "Ładowanie")], ["info", t("Info", "Informacje")], ["log", t("Messages", "Komunikaty")]];
const LABEL = { error: t("error", "błąd"), warn: t("warning", "uwaga"), load: t("loading", "ładowanie"), info: "info", log: "log" };
const p2 = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

function build() {
  // the window
  const win = el("div", "labWin labConsole"); win.hidden = !st.open;
  const head = el("div", "labWinHead"), title = el("div", "labWinTitle", t("Console", "Konsola")), close = el("button", "labWinClose", "✕");
  close.type = "button"; close.title = t("Close", "Zamknij");
  const pin = el("button", "labWinPin", "⤓"); pin.type = "button";
  head.append(title, pin, close);
  const tools = el("div", "lcTools");
  const kind = el("select"); KINDS.forEach(([v, l]) => kind.add(new Option(l, v))); kind.value = st.kind; kind.setAttribute("aria-label", t("Kind", "Rodzaj"));
  const q = el("input"); q.type = "search"; q.placeholder = t("Filter…", "Filtr…"); q.value = st.q; q.setAttribute("aria-label", t("Filter", "Filtr"));
  const clear = el("button", "btn", t("Clear", "Wyczyść")); clear.type = "button";
  tools.append(kind, q, clear);
  const list = el("div", "lcList"), count = el("div", "lcCount");
  const body = el("div", "lcBody"); body.append(tools, list, count);
  win.append(head, body);
  document.body.append(win);

  // the button, on the right of the bar
  const bar = document.querySelector("body > .bar");
  const btn = el("button", "lcBtn", t("Console", "Konsola")); btn.type = "button"; btn.title = t("The page's log: errors, warnings, loading", "Dziennik strony: błędy, ostrzeżenia, ładowanie");
  if (bar) bar.append(btn);

  // the entries, newest first
  const match = (e) => (st.kind === "all" || e.level === st.kind) && (!st.q || (e.msg + " " + e.level + " " + (e.page || "")).toLowerCase().includes(st.q.toLowerCase()));
  const row = (e) => {
    const r = el("div", "lcRow lc-" + e.level);
    r.append(el("span", "lcTime", stamp(e.time)), el("span", "lcKind", LABEL[e.level] || e.level), el("span", "lcPage", e.page || ""), el("span", "lcMsg", e.msg));
    return r;
  };
  function render() {
    const shown = LOG.entries.filter(match).reverse().slice(0, 400);
    list.replaceChildren(...shown.map(row));
    count.textContent = `${shown.length} / ${LOG.entries.length}`;
  }
  LOG.on((e) => {
    if (win.hidden || !match(e)) { if (!win.hidden) count.textContent = count.textContent.replace(/\/ \d+$/, "/ " + LOG.entries.length); return; }
    list.prepend(row(e)); while (list.childElementCount > 400) list.lastChild.remove();
    count.textContent = `${list.childElementCount} / ${LOG.entries.length}`;
  });
  kind.onchange = () => { st.kind = kind.value; save(); render(); };
  q.oninput = () => { st.q = q.value; save(); render(); };
  clear.onclick = () => { LOG.clear(); render(); };   // also forgets the log kept for this tab

  // open, close, place
  const place = () => {
    if (st.x == null) { win.style.right = "12px"; win.style.left = "auto"; win.style.top = "calc(var(--menuH) + var(--barH) + 8px)"; return; }
    const x = Math.min(Math.max(st.x, 8 - 300), innerWidth - 80), y = Math.min(Math.max(st.y, 36), innerHeight - 40);
    win.style.left = x + "px"; win.style.top = y + "px"; win.style.right = "auto";
  };
  const show = (on) => { st.open = on; win.hidden = !on; btn.classList.toggle("on", on); save(); if (on) { place(); render(); } if (window.LabView) window.LabView.update(); };
  // window or panel: docked at the bottom between the side panels, or floating. Its own pin (st.dock: true / false);
  // without a choice it follows the toolbar switch Windows | Panels (ui/shell/windows.js, body.lmPanels); a click on that
  // switch (event "labwindows:layout") clears the choice
  const docked = () => (st.dock == null ? document.body.classList.contains("lmPanels") : st.dock);
  addEventListener("labwindows:layout", () => { st.dock = null; save(); dockState(); });
  const dockState = () => {
    const d = docked(); win.classList.toggle("lcDocked", d);
    pin.textContent = d ? "⤒" : "⤓";
    pin.title = d ? t("Undock: a floating window", "Odepnij: okno pływające") : t("Dock at the bottom, between the panels", "Przypnij na dole, między panelami");
    if (!d) place();
    if (window.LabView) window.LabView.update();
  };
  pin.onclick = () => { st.dock = !docked(); save(); dockState(); };
  new MutationObserver(dockState).observe(document.body, { attributes: true, attributeFilter: ["class"] }); dockState();
  if (window.ResizeObserver) new ResizeObserver(() => { if (window.LabView) window.LabView.update(); }).observe(win);   // dragging its top edge
  btn.onclick = () => show(win.hidden);
  close.onclick = () => show(false);
  show(st.open);
  head.addEventListener("pointerdown", (e) => {
    if (e.target === close || e.target === pin || win.classList.contains("lcDocked")) return;
    const r = win.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top;
    head.setPointerCapture(e.pointerId); win.classList.add("dragging");
    const move = (ev) => { st.x = ev.clientX - dx; st.y = ev.clientY - dy; place(); };
    const up = () => { head.removeEventListener("pointermove", move); head.removeEventListener("pointerup", up); win.classList.remove("dragging"); save(); };
    head.addEventListener("pointermove", move); head.addEventListener("pointerup", up);
  });
  addEventListener("resize", () => { if (!win.hidden) place(); });
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
