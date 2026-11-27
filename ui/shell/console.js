/* The console window: what ui/shell/menubar.js logs (window.LabLog) — errors, warnings, the console's messages, the loading
   card's steps and times — newest at the top, each with its date and time and the page it came from (the log is kept
   for the tab until it is closed), filtered by kind (tabs: all, errors, warnings, loading, info, messages — each with how many) and by text.
   A button on the right of the lab's bar (body > .bar) opens and closes it; the window floats over the lab, is
   dragged by its title and closed with ×. Where it stands and whether it is open are kept in this browser
   (gamelab.console). Loaded by ui/shell/menubar.js on every lab and tool page; its look: ui/shell/console.css.
   Tabs: the log is the first; a page adds its own with window.LabConsole.addTab({ id, title, titlePl, el, onShow })
   (e.g. the scene editor's API tab), callable before the console is built — or, before this script has loaded, pushed to window.LabConsoleTabs;
   LabConsole.open(id) opens one. */
(function () {
"use strict";
const LOG = window.LabLog;
if (!LOG || document.querySelector(".labConsole")) return;
// tabs added by the page: kept until the console is built, then shown at once
const extra = (window.LabConsoleTabs || []).slice();   // tabs a page queued before this script ran
let addPane = null, openTab = null;
window.LabConsole = {
  addTab(spec) { extra.push(spec); if (addPane) addPane(spec); },
  open(id) { if (openTab) openTab(id); },
};
const PL = window.LabMenu && window.LabMenu.LANG === "pl";
const t = (en, pl) => (PL ? pl : en);
const KEY = "gamelab.console";
let st = { open: false, x: null, y: null, kind: "all", q: "", tab: "log" };
try { st = Object.assign(st, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) { /* storage blocked */ }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* storage blocked */ } };
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const KINDS = [["all", t("All", "Wszystko")], ["error", t("Errors", "Błędy")], ["warn", t("Warnings", "Ostrzeżenia")],
  ["load", t("Loading", "Ładowanie")], ["info", t("Info", "Informacje")], ["log", t("Messages", "Komunikaty")]];
// the kinds' icons: a shape in the kind's colour (currentColor, ui/shell/console.css) with a light sign on it (.g)
const IC = (shape, sign) => `<svg viewBox="0 0 16 16" aria-hidden="true">${shape}<path class="g" d="${sign}"/></svg>`;
const DISC = '<circle cx="8" cy="8" r="7" fill="currentColor"/>';
const ICON = {
  all: IC(DISC, "M5 5.5h6M5 8h6M5 10.5h6"),
  error: IC(DISC, "M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8"),
  warn: IC('<path d="M8 1.3 15.2 14H.8Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>', "M8 6v3.6M8 11.6v.1"),
  load: IC(DISC, "M10.9 6.3A3.2 3.2 0 1 0 11 9M11.3 4.4v2.2H9.1"),
  info: IC(DISC, "M8 7.4V11.4M8 4.8v.1"),
  log: IC('<path d="M2 3.5A2 2 0 0 1 4 1.5h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7l-3.2 2.8V11.5H4a2 2 0 0 1-2-2Z" fill="currentColor"/>', "M5 5.3h6M5 7.8h4"),
};
const LABEL = { error: t("error", "błąd"), warn: t("warning", "uwaga"), load: t("loading", "ładowanie"), info: "info", log: "log" };
const p2 = (n) => String(n).padStart(2, "0");
const stamp = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}`;

function build() {
  // the window
  const win = el("div", "labWin labConsole"); win.hidden = !st.open;
  const head = el("div", "labWinHead"), title = el("div", "labWinTitle", t("Console", "Konsola")), close = el("button", "labWinClose", "✕");
  close.type = "button"; close.title = t("Close", "Zamknij");
  const pin = el("button", "labWinPin", "⤓"); pin.type = "button";
  const tabs = el("div", "lcTabs"); tabs.setAttribute("role", "tablist");
  head.append(title, tabs, pin, close);
  const tools = el("div", "lcTools");
  // the kinds as tabs (an icon in the kind's colour, the name, how many): one at a time
  const kinds = el("div", "lcKinds"); kinds.setAttribute("role", "tablist"); kinds.setAttribute("aria-label", t("Kind", "Rodzaj"));
  if (!KINDS.some(([v]) => v === st.kind)) st.kind = "all";
  const kindBtn = {};
  KINDS.forEach(([v, l]) => {
    const b = el("button", "lcKt lk-" + v); b.type = "button"; b.setAttribute("role", "tab"); b.dataset.kind = v;
    const n = el("b"), ic = el("span", "lcIco"); ic.innerHTML = ICON[v]; b.append(ic, document.createTextNode(l), n); kindBtn[v] = { b, n };
    b.onclick = () => { st.kind = v; save(); syncKinds(); render(); };
    kinds.append(b);
  });
  function syncKinds() {
    const c = { all: LOG.entries.length }; for (const e of LOG.entries) c[e.level] = (c[e.level] || 0) + 1;
    for (const [v, k] of Object.entries(kindBtn)) {
      const on = v === st.kind; k.b.classList.toggle("on", on); k.b.setAttribute("aria-selected", on ? "true" : "false");
      k.n.textContent = c[v] || 0; k.b.classList.toggle("none", !c[v] && v !== "all");
    }
  }
  const q = el("input"); q.type = "search"; q.placeholder = t("Filter…", "Filtr…"); q.value = st.q; q.setAttribute("aria-label", t("Filter", "Filtr"));
  const clear = el("button", "btn", t("Clear", "Wyczyść")); clear.type = "button";
  tools.append(q, clear);
  const list = el("div", "lcList"), count = el("div", "lcCount");
  const body = el("div", "lcBody"); body.append(kinds, tools, list, count);
  win.append(head, body);
  // docked at the bottom: its top edge is a grip — drag to change the height (90 px up to 75 % of the window; double-click:
  // the default 30 %), kept with the console's settings, the same on every page (--conH on <html>)
  const grip = el("div", "lcGrip"); grip.title = t("Drag to resize the console (double-click: default)", "Przeciągnij, by zmienić wysokość konsoli (dwuklik: domyślna)");
  win.append(grip);
  const setH = (h) => {
    if (h == null) { delete st.h; document.documentElement.style.removeProperty("--conH"); }
    else { st.h = Math.round(Math.min(innerHeight * 0.75, Math.max(90, h))); document.documentElement.style.setProperty("--conH", st.h + "px"); }
    if (window.LabView) window.LabView.update();
  };
  if (st.h > 0) setH(st.h);
  grip.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    e.preventDefault(); grip.setPointerCapture(e.pointerId); grip.classList.add("on"); document.body.classList.add("lmResizingV");
    const bottom = win.getBoundingClientRect().bottom;
    const move = (ev) => setH(bottom - ev.clientY);
    const end = () => {
      grip.classList.remove("on"); document.body.classList.remove("lmResizingV"); save();
      grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", end); grip.removeEventListener("pointercancel", end);
    };
    grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", end); grip.addEventListener("pointercancel", end);
  });
  grip.addEventListener("dblclick", () => { setH(null); save(); });
  document.body.append(win);

  // tabs: the log, then the page's own (only shown when there is more than one)
  const panes = { log: body }, onShow = {};
  const tabBtn = (id, label) => {
    const b = el("button", "lcTab", label); b.type = "button"; b.dataset.tab = id; b.setAttribute("role", "tab");
    b.onclick = () => showTab(id); tabs.append(b);
  };
  tabBtn("log", t("Log", "Dziennik"));
  function showTab(id) {
    if (!panes[id]) id = "log";
    st.tab = id; save();
    Object.entries(panes).forEach(([k, p]) => { p.hidden = k !== id; });
    [...tabs.children].forEach((b) => b.classList.toggle("on", b.dataset.tab === id));
    tabs.hidden = tabs.childElementCount < 2;
    if (id === "log") render(); else if (onShow[id]) onShow[id]();
  }
  addPane = (spec) => {
    const pane = el("div", "lcBody lcPane"); pane.append(spec.el); pane.hidden = true; win.append(pane);
    panes[spec.id] = pane; onShow[spec.id] = spec.onShow;
    tabBtn(spec.id, (PL && spec.titlePl) || spec.title);
    showTab(st.tab);
  };
  openTab = (id) => { show(true); showTab(id); };

  // the button, on the right of the bar
  const bar = document.querySelector("body > .bar");
  const btn = el("button", "lcBtn", t("Console", "Konsola")); btn.type = "button"; btn.title = t("The page's log: errors, warnings, loading", "Dziennik strony: błędy, ostrzeżenia, ładowanie");
  if (bar) bar.append(btn);

  // the entries, newest first
  const match = (e) => (st.kind === "all" || e.level === st.kind) && (!st.q || (e.msg + " " + e.level + " " + (e.page || "")).toLowerCase().includes(st.q.toLowerCase()));
  const row = (e) => {
    const r = el("div", "lcRow lc-" + e.level);
    // the kind as its icon (the same as on its tab); its name in the tooltip
    const k = el("span", "lcIco lk-" + e.level); k.innerHTML = ICON[e.level] || ICON.log; k.title = LABEL[e.level] || e.level;
    r.append(k, el("span", "lcTime", stamp(e.time)), el("span", "lcPage", e.page || ""), el("span", "lcMsg", e.msg));
    return r;
  };
  function render() {
    const shown = LOG.entries.filter(match).reverse().slice(0, 400);
    list.replaceChildren(...shown.map(row));
    count.textContent = `${shown.length} / ${LOG.entries.length}`;
    syncKinds();
  }
  LOG.on((e) => {
    if (!win.hidden) syncKinds();
    if (win.hidden || !match(e)) { if (!win.hidden) count.textContent = count.textContent.replace(/\/ \d+$/, "/ " + LOG.entries.length); return; }
    list.prepend(row(e)); while (list.childElementCount > 400) list.lastChild.remove();
    count.textContent = `${list.childElementCount} / ${LOG.entries.length}`;
  });
  q.oninput = () => { st.q = q.value; save(); render(); };
  clear.onclick = () => { LOG.clear(); render(); };   // render() also resets the counts on the tabs   // also forgets the log kept for this tab

  // open, close, place
  const place = () => {
    if (st.x == null) { win.style.right = "12px"; win.style.left = "auto"; win.style.top = "calc(var(--menuH) + var(--barH) + 8px)"; return; }
    const x = Math.min(Math.max(st.x, 8 - 300), innerWidth - 80), y = Math.min(Math.max(st.y, 36), innerHeight - 40);
    win.style.left = x + "px"; win.style.top = y + "px"; win.style.right = "auto";
  };
  const show = (on) => { st.open = on; win.hidden = !on; btn.classList.toggle("on", on); save(); if (on) { place(); if (st.tab === "log") render(); else if (onShow[st.tab]) onShow[st.tab](); } if (window.LabView) window.LabView.update(); };
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
  extra.forEach(addPane); showTab(st.tab);
  show(st.open);
  head.addEventListener("pointerdown", (e) => {
    if (e.target === close || e.target === pin || e.target.closest(".lcTabs") || win.classList.contains("lcDocked")) return;
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
