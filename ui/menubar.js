/* =======================================================================
   LABKIT · MENU BAR — the labs' and tools' common menu (OPTIONS,
   TOOLS, HELP), always visible at the top of every lab and tool page
   =======================================================================
   A classic script with no dependencies, the first thing in <body>:
     <script src="../ui/menubar.js"></script>        (a lab)
     <script src="../ui/menubar.js"></script>     (tools/)
   It finds the site's root from its own address, adds the bar (fixed, at
   the top, MENU_H high — --menuH in ui/tokens.css) and loads its sheet,
   ui/menubar.css, which also moves each page's top panels down by that
   much (a new lab with a panel at the top adds its own there). The labs
   live in labs/, the tools in tools/; the start screen is index.html.
   ======================================================================= */
(function () {
"use strict";
// VERSIONS — the program's and every lab's own: ui/versions.js (one place).
// A change to a lab bumps that lab's version; a change to the start page or the
// shared layers bumps the program's; each with an entry in CHANGELOG.md
// (CLAUDE.md, "Wersjonowanie"). Shown on the bar, the start page, HELP → About.
const V = window.GameLabVersions || { app: "?", labs: {} };   // ui/versions.js (loaded before this script)
const APP_VERSION = V.app;
const MENU_H = 32;
const ROOT = (document.currentScript && document.currentScript.src || "").replace(/ui\/menubar\.js.*$/, "");
const PARTS = location.pathname.split("/"), HERE = PARTS.pop() || "index.html", DIR = PARTS.pop() || "";
const PAGE = (DIR === "labs" || DIR === "tools" ? DIR + "/" : "") + HERE;   // e.g. "labs/ship.html"
const START = PAGE === "index.html";
const REPO = "https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/";
const DOCS = "https://github.com/michalstankiewicz4-cell/GameLaboratory/tree/main/docs";   // HELP → Documentation

// LANGUAGE — English or Polish. Chosen in OPTIONS → Language (kept in this browser, gamelab.lang:
// "auto" | "en" | "pl"); ?lang=pl / ?lang=en in the address wins (links for search engines);
// "auto" = the browser's languages, and English when none of them is supported.
const LANGS = { en: "English", pl: "Polski" };
const LANG_KEY = "gamelab.lang";
function storedLang() { try { return localStorage.getItem(LANG_KEY) || "auto"; } catch (e) { return "auto"; } }
function browserLang() {
  for (const l of navigator.languages || [navigator.language || ""]) { const c = String(l).slice(0, 2).toLowerCase(); if (LANGS[c]) return c; }
  return "en";
}
const URL_LANG = (new URLSearchParams(location.search).get("lang") || "").toLowerCase();
const LANG_CHOICE = storedLang();
const LANG = LANGS[URL_LANG] ? URL_LANG : LANGS[LANG_CHOICE] ? LANG_CHOICE : browserLang();
// the start page is translated whole; a lab keeps its own language (its panels: <html lang>) and the bar gets LANG
if (START) document.documentElement.lang = LANG;
const PL = LANG === "pl";
const t = (en, pl) => (PL ? pl : en);   // the bar's own words

// The labs and tools: ui/catalog.js (loaded before this script), shared with the start screen (window.LabMenu.ITEMS).
// The names follow the language; nameEn keeps the English one.
const CAT = window.GameLabCatalog || { labs: [], tools: [], start: {} };
const item = (c) => Object.assign({}, c, { nameEn: c.name, name: PL ? c.namePl || c.name : c.name });
const LABS = CAT.labs.map(item), TOOLS = CAT.tools.map(item);
// Settings saved under the old games' names (Battle: steelSalvo.*, Space: roj-*) move once to gameLab.* (0.13.0).
const RENAMED = [["steelSalvo.pixelStudio.", "gameLab.pixel."], ["steelSalvo.zombieGen.", "gameLab.zombies."], ["steelSalvo.lookLab.", "gameLab.look."],
  ["steelSalvo.waterLab.", "gameLab.water."], ["steelSalvo.landLab.", "gameLab.land."], ["steelSalvo.plantsLab.", "gameLab.plants."],
  ["steelSalvo.structuresLab.", "gameLab.structures."], ["roj-skinlab", "gameLab.skins"], ["roj-bases", "gameLab.bases"]];
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i), r = k && RENAMED.find(([o]) => k.startsWith(o));
    if (!r) continue;
    const nk = r[1] + k.slice(r[0].length);
    if (localStorage.getItem(nk) === null) localStorage.setItem(nk, localStorage.getItem(k));
    localStorage.removeItem(k);
  }
} catch (e) { /* storage blocked */ }
// what each page keeps in this browser (OPTIONS → Reset saved settings)
const SAVED = { "index.html": (CAT.start && CAT.start.saved) || [] };
for (const c of CAT.labs.concat(CAT.tools)) if (c.saved) SAVED[c.file] = c.saved;
const all = LABS.concat(TOOLS);
const isTool = DIR === "tools";
const me = all.find((x) => x.file === PAGE) || null;

// styles: ui/menubar.css, as a <link> (pages with a strict CSP, the labs from Battle, allow style-src 'self').
// The bar stays hidden until its sheet has loaded, so it never flashes unstyled.
const sheet = document.createElement("link");
sheet.rel = "stylesheet"; sheet.href = ROOT + "ui/menubar.css";
document.head.appendChild(sheet);
if (!START) document.body.classList.add("lmLab");
if (isTool) document.body.classList.add("lmTool");

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const link = (label, href, opts = {}) => {
  const a = el("a", "lmItem"); a.href = href;
  const c = el("span", "lmChk", opts.on ? "●" : ""); a.append(c, document.createTextNode(label));
  if (opts.blank) { a.target = "_blank"; a.rel = "noopener"; }
  return a;
};
const action = (label, fn, opts = {}) => {
  const b = el("button", "lmItem"); b.type = "button";
  b.append(el("span", "lmChk", opts.on ? "✓" : ""), document.createTextNode(label));
  if (opts.disabled) b.setAttribute("aria-disabled", "true");
  b.addEventListener("click", () => { if (!opts.disabled) { closeAll(); fn(b); } });
  return b;
};

// ---------- the dialog (shortcuts, about) ----------
const dlg = el("div"); dlg.id = "lmDialog"; dlg.lang = LANG;
const box = el("div", "lmBox"); dlg.appendChild(box);
dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.classList.remove("open"); });
function dialog(title, rows, note) {
  box.textContent = "";
  box.appendChild(el("h3", null, title));
  if (rows && rows.length) {
    const t = el("table");
    rows.forEach(([k, v]) => { const tr = el("tr"); tr.append(el("td", null, k), el("td", null, v)); t.appendChild(tr); });
    box.appendChild(t);
  }
  if (note) box.appendChild(el("p", null, note));
  const ok = el("button", null, t("Close", "Zamknij")); ok.addEventListener("click", () => dlg.classList.remove("open"));
  box.appendChild(ok);
  dlg.classList.add("open");
}

// ---------- the menus ----------
function options() {
  const keys = (SAVED[PAGE] || []).concat(START ? [] : ["gamelab.windows:" + PAGE]);
  return [
    action(t("Full screen", "Pełny ekran"), () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); },
      { on: !!document.fullscreenElement }),
    action(t("Reload this page", "Odśwież stronę"), () => location.reload()),
    // this page's windows (ui/windows.js): its options, each in a window you open and close here
    ...windowItems(),
    el("div", "lmSep"),
    el("div", "lmLabel", t("Language", "Język")),
    ...[["auto", t("Automatic (browser)", "Automatycznie (przeglądarka)")], ["en", "English"], ["pl", "Polski"]].map(([k, label]) =>
      action(label, () => {
        try { if (k === "auto") localStorage.removeItem(LANG_KEY); else localStorage.setItem(LANG_KEY, k); } catch (e) { /* storage blocked */ }
        const u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.href;
      }, { on: LANG_CHOICE === k && !LANGS[URL_LANG] })),
    el("div", "lmSep"),
    action(t("Reset saved settings…", "Wyczyść zapisane ustawienia…"), () => {
      const what = START ? t("the start screen's order, pin and visit counts", "kolejność, przypięcie i licznik odwiedzin strony startowej")
        : t("this page's settings and where its windows stand", "ustawienia tej strony i układ jej okien");
      if (!confirm(t("Forget ", "Zapomnieć ") + what + t(" in this browser and reload?", " w tej przeglądarce i odświeżyć?"))) return;
      try { Object.keys(localStorage).forEach((k) => { if (keys.some((p) => k.startsWith(p))) localStorage.removeItem(k); }); } catch (e) { /* storage blocked */ }
      location.reload();
    }),
  ];
}
function windowItems() {
  const W = window.LabWindows; if (!W || !W.list().length) return [];
  return [el("div", "lmSep"), el("div", "lmLabel", t("Windows", "Okna")),
    ...W.list().map((w) => action(w.title(), () => W.toggle(w.id), { on: w.open }))];
}
// the labs and the tools, all here (the start screen: the GameLaboratory mark on the left)
function tools() {
  const d = [el("div", "lmLabel", t("Labs", "Laboratoria"))];
  LABS.filter((l) => !l.page).forEach((l) => d.push(link(l.name, ROOT + l.file, { on: me === l || (l.file === "labs/ship.html" && me && me.page) })));
  d.push(el("div", "lmSep"), el("div", "lmLabel", t("Tools", "Narzędzia")));
  TOOLS.forEach((t) => d.push(link(t.name, ROOT + t.file, { on: me === t })));
  return d;
}
function help() {
  return [
    link(t("Documentation", "Dokumentacja"), DOCS, { blank: true }),
    link(t("What's new", "Co nowego"), REPO + "CHANGELOG.md", { blank: true }),
    el("div", "lmSep"),
    action(t("About the labs", "O laboratoriach"), () => dialog("GameLaboratory", [[t("What", "Co to"), t("an engine for AI in the browser: laboratories of models and worlds — space, land and water", "silnik dla AI w przeglądarce: laboratoria modeli i światów — kosmos, ląd i woda")],
      [t("Program", "Program"), "v" + APP_VERSION], ...(me && V.labs[me.file] ? [[isTool ? t("This tool", "To narzędzie") : t("This lab", "To laboratorium"), "v" + V.labs[me.file]]] : []), [t("Code", "Kod"), "MIT, github.com/michalstankiewicz4-cell/GameLaboratory"]],
      t("Every lab has its own version; the program has one too.", "Każde laboratorium ma własną wersję; program też ma swoją."))),
  ];
}

const bar = el("div"); bar.id = "labMenu"; bar.lang = LANG;
bar.style.visibility = "hidden";
sheet.addEventListener("load", () => { bar.style.visibility = ""; });
sheet.addEventListener("error", () => { bar.style.visibility = ""; });
const home = el("a", "lmHome"); home.href = ROOT + "index.html"; home.title = t("Start screen", "Strona startowa");
home.append(el("span", "lmMark"), document.createTextNode("GameLaboratory"));
bar.appendChild(home);
const menus = [[t("Options", "Opcje"), options], [t("Tools", "Narzędzia"), tools], [t("Help", "Pomoc"), help]];
menus.forEach(([name, make]) => {
  const top = el("div", "lmTop"), btn = el("button", null, name); btn.type = "button";
  const drop = el("div", "lmDrop");
  top.append(btn, drop);
  let hoverOpened = 0;
  const open = () => { closeAll(); drop.textContent = ""; make().forEach((x) => drop.appendChild(x)); top.classList.add("open"); };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    // a click right after the pointer opened it (below) keeps it open
    if (top.classList.contains("open") && performance.now() - hoverOpened > 400) closeAll(); else open();
  });
  // moving across the bar while one is open opens the next, like a desktop menu
  btn.addEventListener("pointerenter", () => {
    if (bar.querySelector(".lmTop.open") && !top.classList.contains("open")) { open(); hoverOpened = performance.now(); }
  });
  bar.appendChild(top);
});
const where = el("div", "lmWhere");
where.append(document.createTextNode(isTool ? t("Tool · ", "Narzędzie · ") : t("Lab · ", "Laboratorium · ")), el("b", null, me ? me.name : t("Start screen", "Strona startowa")));
if (me) bar.appendChild(where);
// the labs' version, linked to what changed
const ver = el("a", "lmVer", "v" + APP_VERSION + (me && V.labs[me.file] ? " · " + (isTool ? t("tool", "narzędzie") : t("lab", "lab.")) + " v" + V.labs[me.file] : "")); ver.href = REPO + "CHANGELOG.md"; ver.target = "_blank"; ver.rel = "noopener";
ver.title = t("Program version · this page's version — what's new", "Wersja programu · wersja tej strony — co nowego");
bar.appendChild(ver);
function closeAll() { bar.querySelectorAll(".lmTop.open").forEach((t) => t.classList.remove("open")); }
document.addEventListener("pointerdown", (e) => { if (!bar.contains(e.target)) closeAll(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeAll(); dlg.classList.remove("open"); } });

document.body.prepend(bar);

// the start screen's QUICK ACCESS row: every visit to a lab or tool is counted
// here, in this browser (labsHub.visits: { file: count }, labsHub.recent:
// the newest first)
if (me) {
  try {
    const visits = JSON.parse(localStorage.getItem("labsHub.visits") || "{}") || {};
    visits[me.file] = (visits[me.file] || 0) + 1;
    localStorage.setItem("labsHub.visits", JSON.stringify(visits));
    const recent = (JSON.parse(localStorage.getItem("labsHub.recent") || "[]") || []).filter((f) => f !== me.file);
    recent.unshift(me.file);
    localStorage.setItem("labsHub.recent", JSON.stringify(recent.slice(0, 8)));
  } catch (e) { /* storage blocked: no counting */ }
}
document.body.appendChild(dlg);

// the game's version, for "About"
window.LabMenu = { ITEMS: { LABS, TOOLS }, CATALOG: CAT, ROOT, MENU_H, APP_VERSION, VERSIONS: V, version: null, LANG, t };
})();
