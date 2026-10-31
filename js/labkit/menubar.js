/* =======================================================================
   LABKIT · MENU BAR — the labs' and tools' common menu (FILES, OPTIONS,
   TOOLS, HELP), always visible at the top of every lab and tool page
   =======================================================================
   A classic script with no dependencies, the first thing in <body>:
     <script src="../js/labkit/menubar.js"></script>        (a lab)
     <script src="../js/labkit/menubar.js"></script>     (tools/)
   It finds the site's root from its own address, adds the bar (fixed, at
   the top, MENU_H high) and moves each page's top panels down by that much
   (the selectors in OFFSETS — a new lab with a panel at the top adds its
   own there). The labs live in labs/, the tools in tools/; the start
   screen is index.html in the root.
   ======================================================================= */
(function () {
"use strict";
// VERSIONS — the program's and every lab's own: js/labkit/versions.js (one place).
// A change to a lab bumps that lab's version; a change to the start page or the
// shared layers bumps the program's; each with an entry in CHANGELOG.md
// (CLAUDE.md, "Wersjonowanie"). Shown on the bar, the start page, HELP → About.
const V = window.GameLabVersions || { app: "?", labs: {} };   // js/labkit/versions.js (loaded before this script)
const APP_VERSION = V.app;
const MENU_H = 32;
const ROOT = (document.currentScript && document.currentScript.src || "").replace(/js\/labkit\/menubar\.js.*$/, "");
const PARTS = location.pathname.split("/"), HERE = PARTS.pop() || "index.html", DIR = PARTS.pop() || "";
const PAGE = (DIR === "labs" || DIR === "tools" ? DIR + "/" : "") + HERE;   // e.g. "labs/ship.html"
const START = PAGE === "index.html";
const REPO = "https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/";

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
document.documentElement.lang = LANG;
const PL = LANG === "pl";
const t = (en, pl) => (PL ? pl : en);   // the bar's own words

// The labs and tools, shared with the start screen (window.LabMenu.ITEMS).
const LABS = [
  { file: "labs/ship.html", name: "Ship lab", doc: "docs/ship.md", keys: [["C", "change view: only the ticked blocks"], ["Double-click the name", "rename the ship"], ["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/bodies.html", name: "Body lab", doc: "docs/bodies.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/systems.html", name: "System lab", doc: "docs/systems.md", keys: [["Drag / wheel", "turn and zoom the camera"], ["Gold diamond on the ruler", "drag: an orbit's distance"],
    ["Teal point (FROM ABOVE)", "drag out / in: stretch along / across; around: turn the axis"], ["Violet point (FROM THE SIDE)", "drag up / down: the tilt"], ["An orbit's number", "select it: its sliders"]] },
  { file: "labs/scale.html", name: "Scale lab", doc: "docs/scale.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/skins.html", name: "Skin lab", doc: "docs/skins.md", keys: [] },
  { file: "labs/surface.html", name: "Surface lab", doc: "docs/surface.md", keys: [["W / S, A / D", "drive, turn"], ["Shift", "boost"], ["Right-drag / wheel", "camera"], ["B", "build the first module"], ["R / Esc / Delete", "turn / cancel / remove a module"]] },
  { file: "labs/buildings.html", name: "Building lab", doc: "docs/surface.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/vehicles.html", name: "Vehicle lab", doc: "docs/vehicles.md", keys: [["W / S, A / D", "drive, steer"], ["Drag / wheel", "camera"]] },
  { file: "labs/sound.html", name: "Sound lab", doc: "docs/sound.md", keys: [["Space", "play / stop"], ["MOODS", "a whole mood at once"], ["SEED", "the same seed plays the same piece"]] },
  { file: "labs/marine.html", name: "Sea lab", doc: "docs/marine.md", keys: [["W / S, A / D", "drive, steer"], ["Drag / wheel", "camera"]] },
  { file: "labs/creator.html", name: "Creature editor", doc: "docs/life.md", keys: [["Drag a gold point", "shape the spine"], ["Drag a teal point", "slide a pair of legs along it"], ["Wheel on a point", "thicker / thinner"], ["EDIT / PLAY", "handles, or watch it walk"]] },
  { file: "labs/life.html", name: "Life lab", doc: "docs/life.md", keys: [["Drag / wheel", "turn and zoom the camera"], ["STAND / WALK / RUN / T-POSE", "the gaits"], ["🎲 by Face", "another face"], ["FACE", "expressions, LIVELY, TALK, CLOSE-UP"], ["LAYERS", "sneak, sad, angry, nod, shake, wave, look — on top of any gait"]] },
  { file: "labs/structures.html", name: "Structures lab", doc: "docs/structures.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/water.html", name: "Water lab", doc: "docs/water.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/land.html", name: "Land lab", doc: "docs/land.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/plants.html", name: "Plants lab", doc: "docs/plants.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/look.html", name: "Look lab", doc: "docs/look.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "labs/filters.html", name: "Filters lab", doc: "docs/filters.md", keys: [["Drag / right-drag / wheel", "orbit, pan, zoom"]] },
  { file: "labs/pixel.html", name: "Pixel Studio", doc: "docs/pixel/README.md", keys: [["Ctrl+Z / Ctrl+Shift+Z", "undo / redo (Draw)"], ["Right button", "erase (Draw)"]] },
  { file: "labs/zombies.html", name: "Zombie Generator", doc: "docs/pixel/zombies.md", keys: [] },
];
const TOOLS = [
  { file: "tools/doctor.html", name: "Model doctor", doc: "docs/doctor/README.md", keys: [["Click a model, then a finding", "its parts light up red"], ["Drag / wheel", "turn and zoom the view"]] },
  { file: "labs/transform.html", name: "Transformer", doc: "docs/transform.md", keys: [["Drag / wheel", "turn and zoom the camera"]] },
  { file: "tools/kitcheck.html", name: "Kit check", doc: "CLAUDE.md", keys: [] },
  { file: "tools/grainTexture.html", name: "Grain texture", doc: "README.md", keys: [] },
];
// what each lab keeps in this browser (OPTIONS → Reset saved settings)
// (not the surface lab's roj-bases: the game shows those bases too)
const SAVED = { "labs/ship.html": ["shipLab."], "labs/skins.html": ["roj-skinlab"] };
// the pages' own top panels, moved down under the bar
const OFFSETS = `
  #hud, #opt { top: ${16 + MENU_H}px !important; max-height: calc((100vh - ${32 + MENU_H}px) / var(--ui, 1)) !important; }
  #btnView { top: ${14 + MENU_H}px !important; }
  #compass { top: ${16 + MENU_H}px !important; }
  #toast { top: ${70 + MENU_H}px !important; }
  body > #bar { top: ${MENU_H}px !important; }
  body.lab > .bar { top: ${MENU_H}px !important; }
  body.lmTool { padding-top: ${MENU_H + 16}px !important; }
  body.lmTool #app { height: calc(100% - ${MENU_H}px) !important; margin-top: ${MENU_H}px; }
`;
// Polish names and keys (the English ones above stay the source)
const PL_ITEMS = {
  "labs/ship.html": ["Laboratorium statków", [["C", "zmień widok: tylko zaznaczone bloki"], ["Dwuklik na nazwie", "zmień nazwę statku"], ["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/bodies.html": ["Laboratorium ciał niebieskich", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/systems.html": ["Laboratorium układów", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"], ["Złoty romb na linijce", "przeciągnij: odległość orbity"],
    ["Turkusowy punkt (Z GÓRY)", "na zewnątrz / do środka: rozciągnij wzdłuż / w poprzek; dookoła: obróć oś"], ["Fioletowy punkt (Z BOKU)", "w górę / w dół: nachylenie"], ["Numer orbity", "wybierz ją: jej suwaki"]]],
  "labs/scale.html": ["Laboratorium skali", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/skins.html": ["Laboratorium skórek", []],
  "labs/surface.html": ["Laboratorium powierzchni", [["W / S, A / D", "jazda, skręt"], ["Shift", "przyspieszenie"], ["Prawy przycisk / kółko", "kamera"], ["B", "zbuduj pierwszy moduł"], ["R / Esc / Delete", "obróć / anuluj / usuń moduł"]]],
  "labs/buildings.html": ["Laboratorium budynków", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/vehicles.html": ["Laboratorium pojazdów", [["W / S, A / D", "jazda, skręt"], ["Przeciągnij / kółko", "kamera"]]],
  "labs/sound.html": ["Laboratorium dźwięku", [["Spacja", "graj / stop"], ["MOODS", "cały nastrój naraz"], ["SEED", "to samo ziarno gra ten sam utwór"]]],
  "labs/marine.html": ["Laboratorium morza", [["W / S, A / D", "jazda, skręt"], ["Przeciągnij / kółko", "kamera"]]],
  "labs/creator.html": ["Edytor stworów", [["Przeciągnij złoty punkt", "kształt kręgosłupa"], ["Przeciągnij turkusowy punkt", "przesuń parę nóg"], ["Kółko na punkcie", "grubszy / cieńszy"], ["EDIT / PLAY", "uchwyty albo patrz, jak chodzi"]]],
  "labs/life.html": ["Laboratorium życia", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"], ["STAND / WALK / RUN / T-POSE", "chody"], ["🎲 przy twarzy", "inna twarz"], ["FACE", "miny, LIVELY, TALK, CLOSE-UP"], ["LAYERS", "skradanie, smutek, złość, kiwanie, kręcenie głową, machanie, spojrzenie — na każdym chodzie"]]],
  "labs/structures.html": ["Laboratorium budowli", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/water.html": ["Laboratorium wody", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/land.html": ["Laboratorium lądu", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/plants.html": ["Laboratorium roślin", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/look.html": ["Laboratorium wyglądu", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "labs/filters.html": ["Laboratorium filtrów", [["Przeciągnij / prawy / kółko", "obrót, przesuw, przybliżenie"]]],
  "labs/pixel.html": ["Pixel Studio", [["Ctrl+Z / Ctrl+Shift+Z", "cofnij / ponów (Draw)"], ["Prawy przycisk", "gumka (Draw)"]]],
  "labs/zombies.html": ["Generator zombie", []],
  "tools/doctor.html": ["Doktor modeli", [["Kliknij model, potem znalezisko", "jego części świecą na czerwono"], ["Przeciągnij / kółko", "obrót i przybliżenie widoku"]]],
  "labs/transform.html": ["Transformator", [["Przeciągnij / kółko", "obrót i przybliżenie kamery"]]],
  "tools/kitcheck.html": ["Kontrola kitów", []],
  "tools/grainTexture.html": ["Tekstura ziarna", []],
};
if (PL) for (const it of LABS.concat(TOOLS)) { const p = PL_ITEMS[it.file]; if (p) { it.nameEn = it.name; it.name = p[0]; it.keys = p[1]; } }
const all = LABS.concat(TOOLS);
const isTool = DIR === "tools";
const me = all.find((x) => x.file === PAGE) || null;

const CSS = `
#labMenu { position: fixed; left: 0; right: 0; top: 0; height: ${MENU_H}px; z-index: 1000; display: flex; align-items: center; gap: 2px;
  padding: 0 10px; box-sizing: border-box; background: rgba(17, 19, 24, 0.94); backdrop-filter: blur(8px);
  border-bottom: 1px solid #262a33; font: 500 13px/1 "Space Grotesk", system-ui, sans-serif; color: #c9ced8; user-select: none; }
#labMenu .lmHome { display: flex; align-items: center; gap: 8px; margin-right: 10px; padding: 0 8px 0 2px; height: 24px; border-radius: 6px;
  color: #eef1f6; text-decoration: none; font-weight: 600; letter-spacing: .2px; }
#labMenu .lmHome:hover { background: #22262f; }
#labMenu .lmMark { width: 16px; height: 16px; border-radius: 4px; background: conic-gradient(from 210deg, #5b8cff, #36d6b5, #f2b84b, #5b8cff); }
#labMenu .lmTop { position: relative; }
#labMenu .lmTop > button { height: 24px; padding: 0 10px; border: 0; border-radius: 6px; background: none; color: inherit; font: inherit; cursor: pointer; }
#labMenu .lmTop > button:hover, #labMenu .lmTop.open > button { background: #262a33; color: #fff; }
#labMenu .lmDrop { position: absolute; left: 0; top: 28px; min-width: 240px; padding: 6px; border-radius: 10px; background: #1a1d24;
  border: 1px solid #2c313c; box-shadow: 0 12px 32px rgba(0, 0, 0, .45); display: none; }
#labMenu .lmTop.open .lmDrop { display: block; }
#labMenu .lmItem { display: flex; align-items: center; gap: 10px; width: 100%; height: 28px; padding: 0 10px; box-sizing: border-box; border: 0;
  border-radius: 6px; background: none; color: #d7dbe4; font: inherit; font-weight: 400; text-align: left; text-decoration: none; cursor: pointer; }
#labMenu .lmItem:hover { background: #2b3a63; color: #fff; }
#labMenu .lmItem .lmChk { width: 12px; color: #36d6b5; }
#labMenu .lmItem .lmKey { margin-left: auto; color: #7d8494; font-size: 12px; }
#labMenu .lmItem[aria-disabled="true"] { color: #5d6370; cursor: default; background: none; }
#labMenu .lmSep { height: 1px; margin: 5px 6px; background: #2a2f3a; }
#labMenu .lmLabel { padding: 6px 10px 3px; color: #7d8494; font-size: 11px; letter-spacing: .8px; text-transform: uppercase; }
#labMenu .lmWhere { margin-left: auto; color: #8a91a1; font-weight: 400; }
#labMenu .lmWhere b { color: #eef1f6; font-weight: 600; }
#labMenu .lmVer { margin-left: 14px; padding: 2px 8px; border: 1px solid #2c313c; border-radius: 999px; color: #8a91a1; font-size: 11.5px;
  text-decoration: none; font-weight: 500; }
#labMenu .lmVer:hover { color: #eef1f6; border-color: #3a4152; }
#labMenu .lmWhere + .lmVer { margin-left: 12px; }
#labMenu .lmTop:last-of-type + .lmVer { margin-left: auto; }
#lmDialog { position: fixed; inset: 0; z-index: 1001; display: none; align-items: center; justify-content: center; background: rgba(5, 6, 9, .55); }
#lmDialog.open { display: flex; }
#lmDialog .lmBox { width: min(460px, calc(100vw - 32px)); padding: 20px 22px; border-radius: 14px; background: #1a1d24; border: 1px solid #2c313c;
  box-shadow: 0 20px 60px rgba(0, 0, 0, .5); font: 14px/1.5 "Space Grotesk", system-ui, sans-serif; color: #c9ced8; }
#lmDialog h3 { margin: 0 0 12px; font-size: 17px; color: #eef1f6; }
#lmDialog table { width: 100%; border-collapse: collapse; }
#lmDialog td { padding: 5px 0; border-bottom: 1px solid #262a33; vertical-align: top; }
#lmDialog td:first-child { width: 45%; color: #eef1f6; font-family: "IBM Plex Mono", ui-monospace, monospace; font-size: 12.5px; }
#lmDialog button { margin-top: 14px; height: 30px; padding: 0 16px; border: 1px solid #3a4152; border-radius: 8px; background: #22262f; color: #eef1f6;
  font: inherit; cursor: pointer; }
#lmDialog button:hover { background: #2b3a63; }
`;
const FONT = `@font-face{ font-family:"Space Grotesk"; font-weight:300 700; src:url(${ROOT}fonts/space-grotesk-var-latin-ext.woff2) format("woff2"); unicode-range:U+0100-024F; }
@font-face{ font-family:"Space Grotesk"; font-weight:300 700; src:url(${ROOT}fonts/space-grotesk-var-latin.woff2) format("woff2"); }`;

// styles through the CSSOM (a constructed sheet): pages with a strict CSP (style-src 'self', the labs from
// Battle) refuse a <style> element but allow this; older browsers get the <style> element
const SHEET = FONT + CSS + (START ? "" : OFFSETS);
try {
  const sh = new CSSStyleSheet(); sh.replaceSync(SHEET);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh];
} catch (e) { const style = document.createElement("style"); style.textContent = SHEET; document.head.appendChild(style); }
if (isTool) document.body.classList.add("lmTool");

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const link = (label, href, opts = {}) => {
  const a = el("a", "lmItem"); a.href = href;
  const c = el("span", "lmChk", opts.on ? "●" : ""); a.append(c, document.createTextNode(label));
  if (opts.key) a.appendChild(el("span", "lmKey", opts.key));
  if (opts.blank) { a.target = "_blank"; a.rel = "noopener"; }
  return a;
};
const action = (label, fn, opts = {}) => {
  const b = el("button", "lmItem"); b.type = "button";
  b.append(el("span", "lmChk", opts.on ? "✓" : ""), document.createTextNode(label));
  if (opts.key) b.appendChild(el("span", "lmKey", opts.key));
  if (opts.disabled) b.setAttribute("aria-disabled", "true");
  b.addEventListener("click", () => { if (!opts.disabled) { closeAll(); fn(b); } });
  return b;
};

// ---------- the dialog (shortcuts, about) ----------
const dlg = el("div"); dlg.id = "lmDialog";
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
function files() {
  return [link(t("Start screen", "Strona startowa"), ROOT + "index.html", { on: START })];
}
function options() {
  const keys = SAVED[PAGE] || [];
  return [
    action(t("Full screen", "Pełny ekran"), () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); },
      { key: "F11", on: !!document.fullscreenElement }),
    action(t("Reload this page", "Odśwież stronę"), () => location.reload(), { key: "F5" }),
    // this page's windows (js/labkit/windows.js): its options, each in a window you open and close here
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
      if (!confirm(t("Forget what this lab keeps in this browser (", "Zapomnieć, co to laboratorium trzyma w tej przeglądarce (") + keys.join(", ") + t(") and reload?", ") i odświeżyć?"))) return;
      try { Object.keys(localStorage).forEach((k) => { if (keys.some((p) => k.startsWith(p))) localStorage.removeItem(k); }); } catch (e) { /* storage blocked */ }
      location.reload();
    }, { disabled: !keys.length }),
  ];
}
function windowItems() {
  const W = window.LabWindows; if (!W || !W.list().length) return [];
  return [el("div", "lmSep"), el("div", "lmLabel", t("Windows", "Okna")),
    ...W.list().map((w) => action(w.title(), () => W.toggle(w.id), { on: w.open }))];
}
// the labs and the tools, all here (FILES keeps only the start screen and the game)
function tools() {
  const d = [el("div", "lmLabel", t("Labs", "Laboratoria"))];
  LABS.forEach((l) => d.push(link(l.name, ROOT + l.file, { on: me === l })));
  d.push(el("div", "lmSep"), el("div", "lmLabel", t("Tools", "Narzędzia")));
  TOOLS.forEach((t) => d.push(link(t.name, ROOT + t.file, { on: me === t })));
  return d;
}
function help() {
  return [
    action(t("Keyboard and mouse", "Klawiatura i mysz"), () => dialog((me ? me.name : t("Labs", "Laboratoria")) + t(": keys and mouse", ": klawisze i mysz"), me && me.keys.length ? me.keys : [["—", t("nothing special here", "nic szczególnego")]])),
    link(t("This page's notes", "Notatki tej strony"), REPO + (me ? me.doc : "README.md"), { blank: true }),
    link(t("All the docs", "Cała dokumentacja"), REPO + "README.md", { blank: true }),
    link(t("What's new", "Co nowego"), REPO + "CHANGELOG.md", { blank: true }),
    el("div", "lmSep"),
    action(t("About the labs", "O laboratoriach"), () => dialog("GameLaboratory", [[t("What", "Co to"), t("an engine for AI in the browser: laboratories of models and worlds — space, land and water", "silnik dla AI w przeglądarce: laboratoria modeli i światów — kosmos, ląd i woda")],
      [t("Program", "Program"), "v" + APP_VERSION], ...(me && V.labs[me.file] ? [[isTool ? t("This tool", "To narzędzie") : t("This lab", "To laboratorium"), "v" + V.labs[me.file]]] : []), [t("Code", "Kod"), "MIT, github.com/michalstankiewicz4-cell/GameLaboratory"]],
      t("Every lab has its own version; the program has one too.", "Każde laboratorium ma własną wersję; program też ma swoją."))),
  ];
}

const bar = el("div"); bar.id = "labMenu";
const home = el("a", "lmHome"); home.href = ROOT + "index.html"; home.title = t("Start screen", "Strona startowa");
home.append(el("span", "lmMark"), document.createTextNode("GameLaboratory"));
bar.appendChild(home);
const menus = [[t("Files", "Pliki"), files], [t("Options", "Opcje"), options], [t("Tools", "Narzędzia"), tools], [t("Help", "Pomoc"), help]];
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
window.LabMenu = { ITEMS: { LABS, TOOLS }, ROOT, MENU_H, APP_VERSION, VERSIONS: V, version: null, LANG, t };
})();
