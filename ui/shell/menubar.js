/* =======================================================================
   LABKIT · MENU BAR — the labs' and tools' common menu (OPTIONS,
   TOOLS, SCENES, HELP), always visible at the top of every lab and tool page
   =======================================================================
   A classic script with no dependencies, at the top of <body> right after ui/shell/log.js:
     a <script> of ../ui/shell/menubar.js   (a lab or a tool; the start page: ui/shell/menubar.js)
   It finds the site's root from its own address, adds the bar (fixed, at
   the top, MENU_H high — --menuH in ui/style/tokens.css); its sheet,
   ui/shell/menubar.css (in ui/ui.css),  also moves each page's top panels down by that
   much (a new lab with a panel at the top adds its own there). The labs
   live in labs/, the tools in tools/; the start screen is index.html.
   ======================================================================= */
(function () {
"use strict";
// VERSIONS — the program's and every lab's own: ui/data/versions.js (one place).
// A change to a lab bumps that lab's version; a change to the start page or the
// shared layers bumps the program's; each with an entry in CHANGELOG.md
// (CLAUDE.md, "Wersjonowanie"). Shown on the bar, the start page, HELP → About.
const V = window.GameLabVersions || { app: "?", labs: {} };   // ui/data/versions.js (loaded before this script)
const APP_VERSION = V.app;
const MENU_H = 32;
const ROOT = (document.currentScript && document.currentScript.src || "").replace(/ui\/shell\/menubar\.js.*$/, "");
const PARTS = location.pathname.split("/"), HERE = PARTS.pop() || "index.html", DIR = PARTS.pop() || "";
const PAGE = (DIR === "labs" || DIR === "tools" || DIR === "editor" ? DIR + "/" : "") + HERE;   // e.g. "labs/vehicles-space.html", "editor/index.html"
const START = PAGE === "index.html";
const REPO = "https://github.com/michalstankiewicz4-cell/GameLaboratory/blob/main/";
const DOCS = "https://github.com/michalstankiewicz4-cell/GameLaboratory/tree/main/docs";   // HELP → Documentation

// LANGUAGE — English or Polish. Chosen in OPTIONS → Language (kept in this browser, gamelab.lang:
// "auto" | "en" | "pl"); ?lang=pl / ?lang=en in the address wins (links for search engines);
// "auto" = the browser's languages, and English when none of them is supported — unless the page names its own
// default (<html data-lang-default="en">: the scene editor starts in English until Polish is chosen).
const LANGS = { en: "English", pl: "Polski" };
const LANG_KEY = "gamelab.lang";
function storedLang() { try { return localStorage.getItem(LANG_KEY) || "auto"; } catch (e) { return "auto"; } }
function browserLang() {
  for (const l of navigator.languages || [navigator.language || ""]) { const c = String(l).slice(0, 2).toLowerCase(); if (LANGS[c]) return c; }
  return "en";
}
const URL_LANG = (new URLSearchParams(location.search).get("lang") || "").toLowerCase();
const LANG_CHOICE = storedLang();
const PAGE_DEFAULT = (document.documentElement.dataset.langDefault || "").toLowerCase();
const LANG = LANGS[URL_LANG] ? URL_LANG : LANGS[LANG_CHOICE] ? LANG_CHOICE : LANGS[PAGE_DEFAULT] ? PAGE_DEFAULT : browserLang();
// the start page is translated whole; a lab keeps its own language (its panels: <html lang>) and the bar gets LANG
if (START) document.documentElement.lang = LANG;
const PL = LANG === "pl";
const t = (en, pl) => (PL ? pl : en);   // the bar's own words

// THEME — day (the light canvas) or night (dark glass): ui/style/tokens.css, <html data-theme="day|night">. Chosen in
// OPTIONS → Look or with the sun / moon on the bar (kept in this browser, gamelab.theme: "auto" | "day" | "night");
// "auto" follows the system's light / dark setting, live. Set here, before the page draws. A page that draws its
// own colours (a canvas) listens to the "gamelab-theme" event on window (detail: "day" | "night").
const THEME_KEY = "gamelab.theme";
let themeBtn = null;   // the sun / moon on the bar (below)
const themeChoice = () => { try { const v = localStorage.getItem(THEME_KEY); return v === "day" || v === "night" ? v : "auto"; } catch (e) { return "auto"; } };
const sysLight = window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;
const themeNow = () => { const c = themeChoice(); return c !== "auto" ? c : sysLight && sysLight.matches ? "day" : "night"; };
function applyTheme() {
  const th = themeNow(); if (document.documentElement.dataset.theme === th) return;
  document.documentElement.dataset.theme = th;
  window.dispatchEvent(new CustomEvent("gamelab-theme", { detail: th }));
}
function setTheme(v) {
  try { if (v === "auto") localStorage.removeItem(THEME_KEY); else localStorage.setItem(THEME_KEY, v); } catch (e) { /* storage blocked: this page only */ }
  applyTheme(); if (themeBtn) themeIcon();
}
applyTheme();
if (sysLight && sysLight.addEventListener) sysLight.addEventListener("change", () => { if (themeChoice() === "auto") { applyTheme(); if (themeBtn) themeIcon(); } });
window.addEventListener("storage", (e) => { if (e.key === THEME_KEY) { applyTheme(); if (themeBtn) themeIcon(); } });   // another tab chose

// The labs and tools: ui/data/catalog.js (loaded before this script), shared with the start screen (window.LabMenu.ITEMS).
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
const all = LABS.concat(TOOLS);
const isTool = DIR === "tools";
const me = all.find((x) => x.file === PAGE) || null;

// styles: ui/shell/menubar.css and ui/shell/console.css come with the page (ui/ui.css; the start page links them), so the
// bar is drawn at once with everything else — a sheet added from here arrived late and the bar showed after the page's bars.
// the console window and its button on the bar (ui/shell/console.js, its sheet ui/shell/console.css), on every page
{
  const cj = document.createElement("script"); cj.src = ROOT + "ui/shell/console.js"; document.head.appendChild(cj);
  // back / forward at the start of the toolbar (ui/shell/nav.js), on every page
  const nj = document.createElement("script"); nj.src = ROOT + "ui/shell/nav.js"; document.head.appendChild(nj);
}
if (!START) document.body.classList.add("lmLab");
// the lab's two bars (ui/shell/bars.css), shown or hidden for every page (OPTIONS → Bars); both on by default
const BARS = [["bar", "gamelab.bars.tool", "lmNoBar"], ["foot", "gamelab.bars.info", "lmNoFoot"]];
const barOn = (key) => { try { return localStorage.getItem(key) !== "off"; } catch (e) { return true; } };
BARS.forEach(([, key, cls]) => document.body.classList.toggle(cls, !barOn(key)));

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const link = (label, href, opts = {}) => {
  const a = el("a", "lmItem"); a.href = href;
  const c = el("span", "lmChk", opts.on ? "●" : ""); a.append(c, document.createTextNode(label));
  if (opts.blank) { a.target = "_blank"; a.rel = "noopener"; }
  if (opts.group) { a.classList.add("lmGlow"); a.dataset.group = opts.group; }
  if (opts.cat) a.insertBefore(catDot(opts.cat), c.nextSibling);   // the category's dot (catalog "cat"), after the tick
  return a;
};
// categories of labs (catalog "cats"): a coloured dot (--cat-<id>), its name in a tooltip
const CATS = CAT.cats || {};
const catName = (id) => (CATS[id] ? (PL ? CATS[id].namePl : CATS[id].name) : "");
const catDot = (id) => { const d = el("span", "lmDot"); d.dataset.cat = id; d.title = catName(id); return d; };
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
  box.textContent = ""; box.classList.remove("lmWide", "lmKeys");
  box.appendChild(el("h3", null, title));
  if (rows && rows.length) {
    const t = el("table");
    rows.forEach(([k, v]) => { const tr = el("tr"), td = el("td"); if (v instanceof Node) td.appendChild(v); else td.textContent = v; tr.append(el("td", null, k), td); t.appendChild(tr); });   // wartość: tekst albo węzeł (logo)
    box.appendChild(t);
  }
  if (note) box.appendChild(el("p", null, note));
  const ok = el("button", null, t("Close", "Zamknij")); ok.addEventListener("click", () => dlg.classList.remove("open"));
  box.appendChild(ok);
  dlg.classList.add("open");
}

// HELP → Keyboard shortcuts: this page's keys from ui/data/keys.js (a module, loaded when the window opens; the player's
// keys in the scene editor as the player set them)
function keysDialog() {
  import(ROOT + "ui/data/keys.js").then((m) => {
    const secs = m.keysFor(PAGE, LANG);
    box.textContent = ""; box.classList.remove("lmWide"); box.classList.add("lmKeys");
    box.appendChild(el("h3", null, t("Keyboard shortcuts", "Klawiszologia")));
    if (!secs.length) box.appendChild(el("p", null, t("This page has no keyboard shortcuts.", "Ta strona nie ma skrótów klawiszowych.")));
    secs.forEach((s) => {
      box.appendChild(el("h4", null, s.title));
      const tb = el("table");
      s.rows.forEach(([k, v]) => { const tr = el("tr"); tr.append(el("td", null, k), el("td", null, v)); tb.appendChild(tr); });
      box.appendChild(tb);
    });
    const ok = el("button", null, t("Close", "Zamknij")); ok.addEventListener("click", () => dlg.classList.remove("open"));
    box.appendChild(ok);
    dlg.classList.add("open");
  }).catch((e) => console.error("keyboard shortcuts: " + e.message));   // the log (ui/shell/log.js) picks it up
}

// the engine's diagram (docs/guides/engine-architecture.md, "Zasada: scena w środku") drawn with boxes; every block shows
// whether it works today (solid) or is planned (dashed) — the state of the full connection of the labs: TODO.md
function engineMap() {
  box.textContent = ""; box.classList.remove("lmKeys"); box.classList.add("lmWide");
  box.appendChild(el("h3", null, t("How the engine is built", "Schemat silnika")));
  const m = el("div", "emMap");
  // st: "on" — works, "part" — partly, "plan" — planned
  const node = (cls, name, note, st = "on") => {
    const n = el("div", "emNode " + (cls || "") + " st-" + st); n.appendChild(el("b", null, name)); if (note) n.appendChild(el("span", null, note));
    if (st !== "on") n.appendChild(el("i", "emSt", st === "plan" ? t("planned", "w planie") : t("partly", "częściowo")));
    return n;
  };
  const arrow = (txt, cls) => el("div", "emArrow " + (cls || ""), txt);
  // the labs: editors of the engine's parts
  const labs = el("div", "emLabs");
  labs.appendChild(el("div", "emTitle", t("LABS: editors of the engine's parts", "LABORATORIA: edytory części silnika")));
  const lrow = el("div", "emLabRow");
  lrow.append(
    node("emLab", t("Models ▶ prefabs", "Modele ▶ prefabrykaty"), t("vehicles (space, water, land), celestial bodies, base, structures, city buildings, buildings of parts, streets, junkyard (machines, items), machine elements and the engine layout, plants, rocks, caves, creatures, humans, weapons; far versions (LOD)", "pojazdy (kosmos, woda, ląd), ciała niebieskie, baza, budowle, budynki miasta, budynki z części, ulice, złomowisko (maszyny, przedmioty), elementy maszyn i układ silnika, rośliny, skały, jaskinie, stwory, ludzie, broń; wersje dalekie (LOD)")),
    node("emLab", t("Settings ▶ named assets", "Ustawienia ▶ zasoby z nazwą"), t("sea (water), land, weather and light (look), camera look (filters), space sky (bodies), game UI, cave, plant, blocks, building (city), effect, sound effect, ambience, voice, tech tree, picture (art)", "morze (woda), ląd, pogoda i światło (wygląd), wygląd kamery (filtry), niebo kosmosu (ciała niebieskie), UI gry, jaskinia, roślina, bryła z bloków, budynek (miasto), efekt, efekt dźwiękowy, tło dźwiękowe, głos, drzewko, obraz (sztuka)")),
    node("emLab", t("Materials (MatKit)", "Materiały (MatKit)"), t("saved as assets; the junkyard's and the blocks' textures and the city's walls use them, other models not yet", "zapisywane jako zasoby; korzystają z nich tekstury złomowiska i bloków oraz mury budynków miasta, inne modele jeszcze nie"), "part"),
    node("emLab", t("Not connected yet", "Jeszcze niepołączone"), t("systems, skins, surface, gear, creature editor, transformer, SDF and pixel art, scale", "układy, skórki, powierzchnia, przedmioty bohatera, edytor stworów, transformator, SDF i pixel art, skala"), "plan"));
  labs.appendChild(lrow);
  m.appendChild(labs);
  m.appendChild(el("div", "emDown", t("▼ prefabs and assets go into the scene", "▼ prefabrykaty i zasoby trafiają do sceny")));
  // input → the engine
  const top = el("div", "emTop");
  top.append(node("emInput", t("Input", "Wejście"), t("actions, not keys: keyboard (keys set in the game's Controls), mouse sensitivity (pad, touch: planned)", "czynności, nie klawisze: klawiatura (klawisze z menu Sterowanie gry), czułość myszy (pad, dotyk: w planie)"), "part"), arrow(t("events ▶", "zdarzenia ▶")));
  const eng = el("div", "emEngine");
  eng.appendChild(el("div", "emTitle", t("ENGINE: loop, time, life cycle", "ENGINE: pętla, czas, cykl życia")));
  const pipe = el("div", "emPipe");
  [["Rules", t("game rules", "reguły gry"), "plan"], [t("Behaviours", "Zachowania"), t("drive, sail, fly, thrust, orbit, land, build, grapple loader, junkyard machines, destruction of buildings (the weather's tornado), the engine layout (drive, physics, circuit; mouse on the models)", "jazda, pływanie, lot, ciąg, orbita, lądowanie, budowa, przeładowarka, maszyny złomowiska, zniszczenie budynków (tornado z pogody), układ silnika (napęd, fizyka, obwód; mysz na modelach)")],
    [t("Physics", "Fizyka"), t("of the environment: vacuum, water, land; rail; rigid bodies on land (items: tumbling, rolling, stacking; debris of buildings); sheet-metal deformation; machine physics (backlash, elasticity, belt slip) and electric circuits", "środowiska: próżnia, woda, ląd; szyny; bryły sztywne na lądzie (przedmioty: przewracanie, toczenie, stosy; odłamki budynków); deformacja blachy; fizyka maszyn (luz, sprężystość, poślizg pasa) i obwody elektryczne"), "part"], [t("Animation", "Animacje"), t("idle; bending in a shader", "postój; wyginanie w shaderze"), "part"],
    ["Render", t("Three.js r186 · quality level (LOD, textures, effects, water, range, shadows) · baked facades with parallax", "Three.js r186 · poziom jakości (LOD, tekstury, efekty, woda, zasięg, cienie) · wypalone fasady z paralaksą")], [t("Camera look", "Wygląd kamery"), t("tone, glow, lens, space effects", "ton, poświata, obiektyw, efekty kosmosu")], [t("screen", "ekran")]]
    .forEach(([a, b, st], i, all) => { if (i) pipe.appendChild(arrow("▶")); pipe.appendChild(node(i === all.length - 1 ? "emScreen" : "", a, b, st)); });
  eng.appendChild(pipe);
  const over = el("div", "emOver");
  over.append(node("emUi", t("Game UI", "UI gry"), t("menu, HUD, windows, dialogue, tech trees, Options: graphics, controls and sound — over the screen, from the game state and events", "menu, HUD, okna, dialogi, drzewka, Opcje: grafika, sterowanie i dźwięk — nad ekranem, ze stanu gry i zdarzeń")),
    node("", "Audio", t("mixer: music, ambience, effects, speech buses with the player's volumes, 3D sound; music, effects and voices made live (labs) — sound sources in the scene: planned", "mikser: szyny muzyki, otoczenia, efektów i mowy z głośnościami gracza, dźwięk przestrzenny; muzyka, efekty i głosy tworzone na żywo (laboratoria) — źródła dźwięku w scenie: w planie"), "part"));
  eng.appendChild(over);
  eng.appendChild(el("div", "emFlow", t("▼ behaviours and physics change the scene · render draws it ▲", "▼ zachowania i fizyka zmieniają scenę · render ją rysuje ▲")));
  const scene = node("emScene", t("SCENE (data, JSON)", "SCENA (dane, JSON)"));
  scene.append(el("span", null, t("objects: prefab, position, behaviour (collision, particles, sound source: planned)", "obiekty: prefabrykat, położenie, zachowanie (kolizja, cząsteczki, źródło dźwięku: w planie)")),
    el("span", null, t("environment: surface, sky, sea, land, light and weather, camera look, game UI", "środowisko: powierzchnia, niebo, morze, ląd, światło i pogoda, wygląd kamery, UI gry")));
  eng.appendChild(scene);
  top.appendChild(eng);
  m.appendChild(top);
  // the modules around the scene
  m.appendChild(el("div", "emBus"));
  const mods = el("div", "emMods");
  [["Assets", t("kits, prefabs, named assets, materials, loading progress", "kity, prefabrykaty, zasoby z nazwą, materiały, postęp ładowania")],
    ["Events", t("one bus: actions of ships, the game UI", "jedna szyna: akcje statków, UI gry")],
    ["Network", t("scene state, events (WebRTC, Supabase…)", "stan sceny, zdarzenia (WebRTC, Supabase…)"), "plan"],
    ["Save/Load", t("scene as JSON: file and the browser; player's settings (graphics, controls); game state: planned", "scena jako JSON: plik i przeglądarka; ustawienia gracza (grafika, sterowanie); stan gry: w planie"), "part"],
    ["Jobs/Workers", t("physics in its own thread: debris of buildings, sheet-metal deformation; AI and terrain generation: planned", "fizyka we własnym wątku: odłamki budynków, deformacja blachy; AI i generowanie terenu: w planie"), "part"],
    [t("Editor + API for AI", "Edytor + API dla AI"), t("hierarchy, properties, ▶ Play, console, ready scenes (Harbour, Tornado and the town, Engine layout); AI builds and plays the scene through the API", "hierarchia, właściwości, ▶ Graj, konsola, gotowe sceny (Port, Tornado z miastem, Układ silnika); AI buduje i gra scenę przez API")],
    [t("Doctors", "Lekarze"), t("model doctor (one model), scene doctor (the whole scene)", "doktor modeli (jeden model), lekarz sceny (cała scena)")]]
    .forEach(([a, b, st]) => mods.appendChild(node("emMod", a, b, st)));
  m.appendChild(mods);
  // legend
  const leg = el("div", "emLegend");
  leg.append(node("st-on emKey", t("works", "działa")), node("st-part emKey", t("partly", "częściowo")), node("st-plan emKey", t("planned", "w planie")));
  m.appendChild(leg);
  box.appendChild(m);
  box.appendChild(el("p", null, t("The scene is the middle of the engine: every module works on the same scene. What is left to connect: TODO.md, “Full connection of the labs”.",
    "Scena jest środkiem silnika: wszystkie moduły pracują na tej samej scenie. Co zostało do połączenia: TODO.md, „Pełne połączenie laboratoriów”.")));
  const ok = el("button", null, t("Close", "Zamknij")); ok.addEventListener("click", () => dlg.classList.remove("open"));
  box.appendChild(ok);
  dlg.classList.add("open");
}

// ---------- the menus ----------
// OPTIONS → Reset saved settings: everything this site keeps in this browser — local and session storage (settings of
// every page, window layouts, named assets, scenes, the language), IndexedDB, Cache Storage, service workers, cookies
async function wipeBrowser() {
  try { localStorage.clear(); } catch (e) { /* storage blocked */ }
  if (window.LabLog) window.LabLog.clear();   // the log saves itself on pagehide: empty first
  try { sessionStorage.clear(); } catch (e) { /* storage blocked */ }
  try { if (indexedDB.databases) for (const d of await indexedDB.databases()) if (d.name) indexedDB.deleteDatabase(d.name); } catch (e) { /* none or blocked */ }
  try { if (window.caches) for (const k of await caches.keys()) await caches.delete(k); } catch (e) { /* none or blocked */ }
  try { if (navigator.serviceWorker) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); } catch (e) { /* none */ }
  try { for (const c of document.cookie.split(";")) { const n = c.split("=")[0].trim(); if (n) document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"; } } catch (e) { /* none */ }
}
function options() {
  return [
    action(t("Full screen", "Pełny ekran"), () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); },
      { on: !!document.fullscreenElement }),
    action(t("Reload this page", "Odśwież stronę"), () => location.reload()),
    ...barItems(),
    ...consoleItems(),
    // this page's windows (ui/shell/windows.js): its options, each in a window you open and close here
    ...windowItems(),
    el("div", "lmSep"),
    el("div", "lmLabel", t("Language", "Język")),
    ...[["auto", t("Automatic (browser)", "Automatycznie (przeglądarka)")], ["en", "English"], ["pl", "Polski"]].map(([k, label]) =>
      action(label, () => {
        try { if (k === "auto") localStorage.removeItem(LANG_KEY); else localStorage.setItem(LANG_KEY, k); } catch (e) { /* storage blocked */ }
        const u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.href;
      }, { on: LANG_CHOICE === k && !LANGS[URL_LANG] })),
    el("div", "lmSep"),
    el("div", "lmLabel", t("Look", "Wygląd")),
    ...[["auto", t("Automatic (system)", "Automatycznie (system)")], ["day", t("Day (light)", "Dzień (jasny)")], ["night", t("Night (dark)", "Noc (ciemny)")]].map(([k, label]) =>
      action(label, () => setTheme(k), { on: themeChoice() === k })),
    el("div", "lmSep"),
    action(t("Reset saved settings…", "Wyczyść zapisane ustawienia…"), () => {
      if (!confirm(t("Forget everything GameLaboratory keeps in this browser — the settings of every lab and tool, window layouts, the bars, the language, assets saved under a name, scenes, the start screen's order — and reload? This cannot be undone.",
        "Zapomnieć wszystko, co GameLaboratory trzyma w tej przeglądarce — ustawienia wszystkich laboratoriów i narzędzi, układ okien, paski, język, zasoby zapisane pod nazwą, sceny, kolejność na stronie startowej — i odświeżyć? Tego nie da się cofnąć."))) return;
      wipeBrowser().finally(() => location.reload());
    }),
  ];
}
function barItems() {
  const names = { bar: t("Toolbar", "Pasek narzędzi"), foot: t("Info bar", "Pasek informacyjny") };
  // on every page, the start page too: the choice holds for all the labs
  return [el("div", "lmSep"), el("div", "lmLabel", t("Bars", "Paski")),
    ...BARS.map(([c, key, cls]) => action(names[c], () => {
      const on = !barOn(key);
      try { if (on) localStorage.removeItem(key); else localStorage.setItem(key, "off"); } catch (e) { /* storage blocked */ }
      document.body.classList.toggle(cls, !on);
    }, { on: barOn(key) }))];
}
// the console (ui/shell/console.js): its text filter's row shown or hidden, for every page
function consoleItems() {
  const C = window.LabConsole; if (!C || !C.filterOn) return [];
  return [el("div", "lmSep"), el("div", "lmLabel", t("Console", "Konsola")),
    action(t("Show the console", "Pokaż konsolę"), () => C.toggle(), { on: C.isOpen() }),
    action(t("Text filter", "Filtr tekstu"), () => C.setFilter(!C.filterOn()), { on: C.filterOn() })];
}
function windowItems() {
  const W = window.LabWindows; if (!W || !W.list().length) return [];
  return [el("div", "lmSep"), el("div", "lmLabel", t("Windows", "Okna")),
    ...W.list().map((w) => action(w.title(), () => W.toggle(w.id), { on: w.open }))];
}
// the labs and the tools, all here (the start screen: the GameLaboratory mark on the left)
// in the list under "Labs" the word "lab" / "Laboratorium" is left out: "Ship lab" → "Ship", "Vehicle lab · water" → "Vehicle · water", "Laboratorium statków" → "Statków"
const short = (name) => { const s = name.replace(/^Laboratorium\s+/, "").replace(/\s+lab(?=\s*·|$)/i, ""); return s.charAt(0).toUpperCase() + s.slice(1); };
function tools() {
  const d = [el("div", "lmLabel", t("Labs", "Laboratoria"))];
  // two kinds of grouping: the category (catalog "cat", in its order) — a heading and a coloured dot at each lab;
  // labs that belong together (catalog "group": the vehicles, the space labs) — their text glows in the group's colour
  let cat = null;
  LABS.filter((l) => !l.page || l.art).forEach((l) => {
    if (l.cat && l.cat !== cat) { cat = l.cat; const h = el("div", "lmCat"); h.append(catDot(cat), document.createTextNode(catName(cat))); d.push(h); }
    d.push(link(short(l.name), ROOT + l.file, { on: me === l || (!!me && !me.art && me.page === l.file), group: l.group, cat: l.cat }));
  });
  // an item of a group under the pointer lights up the whole group, with a dot at each
  const light = (g, on) => d.forEach((x) => { if (x.dataset && x.dataset.group === g) x.classList.toggle("lmGrpOn", on); });
  d.forEach((x) => { if (x.dataset && x.dataset.group) { x.addEventListener("mouseenter", () => light(x.dataset.group, true)); x.addEventListener("mouseleave", () => light(x.dataset.group, false)); } });
  d.push(el("div", "lmSep"), el("div", "lmLabel", t("Tools", "Narzędzia")));
  TOOLS.forEach((t) => d.push(link(t.name, ROOT + t.file, { on: me === t, cat: t.cat })));
  return d;
}
// SCENES: the scene editor's ready scenes (catalog "scenes" — the same ids as editor/js/scenes/scenes.js); each opens
// the editor with that scene (editor/index.html?scene=<id>); the first item opens it with the last scene
function scenes() {
  const ed = ROOT + "editor/index.html";
  return [link(t("Scene editor (your last scene)", "Edytor sceny (ostatnia scena)"), ed, { on: PAGE === "editor/index.html" }),
    el("div", "lmSep"), el("div", "lmLabel", t("Ready scenes", "Gotowe sceny")),
    ...(CAT.scenes || []).map((sc) => link(PL ? sc.namePl || sc.name : sc.name, ed + "?scene=" + encodeURIComponent(sc.id)))];
}
// podziękowania dla forum 4Programmers.net: logo (assets/4programmers.png, bez czarnego tła) i tekst
function thanks4p() {
  const s = el("span", "lmThanks"), img = el("img"); img.src = ROOT + "assets/4programmers.png"; img.alt = ""; img.width = 20; img.height = 22;
  s.append(img, document.createTextNode(t("to the whole team of the 4Programmers.net programming forum", "dla całej ekipy forum programistycznego 4Programmers.net")));
  return s;
}
function help() {
  return [
    link(t("Documentation", "Dokumentacja"), DOCS, { blank: true }),
    link(t("What's new", "Co nowego"), REPO + "CHANGELOG.md", { blank: true }),
    link(t("Repository (GitHub)", "Repozytorium (GitHub)"), "https://github.com/michalstankiewicz4-cell/GameLaboratory", { blank: true }),
    link(t("License (MIT)", "Licencja (MIT)"), REPO + "LICENSE", { blank: true }),
    el("div", "lmSep"),
    action(t("Keyboard shortcuts", "Klawiszologia"), keysDialog),
    action(t("Engine diagram", "Schemat silnika"), engineMap),
    action(t("About the labs", "O laboratoriach"), () => dialog("GameLaboratory", [[t("What", "Co to"), t("an engine for AI in the browser: laboratories of models and worlds — space, land and water", "silnik dla AI w przeglądarce: laboratoria modeli i światów — kosmos, ląd i woda")],
      [t("Program", "Program"), "v" + APP_VERSION], ...(me && V.labs[me.file] ? [[isTool ? t("This tool", "To narzędzie") : t("This lab", "To laboratorium"), "v" + V.labs[me.file]]] : []), [t("Code", "Kod"), "MIT, github.com/michalstankiewicz4-cell/GameLaboratory"],
      [t("Made by", "Autorzy"), t("created entirely with vibe coding by Michał Stankiewicz and Claude Opus 5.5", "aplikacja stworzona w całości przy pomocy vibe codingu przez Michała Stankiewicza i Claude Opus 5.5")],
      [t("Contact", "Kontakt"), "+48 797 486 355"],
      [t("Thanks", "Podziękowania"), thanks4p()]],
      t("Every lab has its own version; the program has one too.", "Każde laboratorium ma własną wersję; program też ma swoją."))),
  ];
}

const bar = el("div"); bar.id = "labMenu"; bar.lang = LANG;
const home = el("a", "lmHome"); home.href = ROOT + "index.html"; home.title = t("Start screen", "Strona startowa");
home.append(el("span", "lmMark"), document.createTextNode("GameLaboratory"));
bar.appendChild(home);
const menus = [["options", t("Options", "Opcje"), options], ["tools", t("Tools", "Narzędzia"), tools], ["scenes", t("Scenes", "Sceny"), scenes], ["help", t("Help", "Pomoc"), help]];
menus.forEach(([key, name, make]) => {
  const top = el("div", "lmTop"), btn = el("button", null, name); btn.type = "button"; top.dataset.menu = key;
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
// day / night at the right end of the bar: switches between the two (the automatic choice stays in OPTIONS → Look)
const SUN = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6 13 13M3 13l1.4-1.4M11.6 4.4 13 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const MOON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 10.2A5.8 5.8 0 0 1 5.8 2.5a5.8 5.8 0 1 0 7.7 7.7Z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
themeBtn = el("button", "lmTheme"); themeBtn.type = "button";
function themeIcon() {
  const day = themeNow() === "day";
  themeBtn.innerHTML = day ? MOON : SUN;
  themeBtn.title = day ? t("Night (dark look)", "Noc (ciemny wygląd)") : t("Day (light look)", "Dzień (jasny wygląd)");
  themeBtn.setAttribute("aria-label", themeBtn.title);
}
themeBtn.addEventListener("click", () => setTheme(themeNow() === "day" ? "night" : "day"));
themeIcon();
bar.appendChild(themeBtn);
// the start page has no bars (ui/pages/start.css): the menu bar is a small cluster at the top right — Options, the
// language, Help, day / night, the console (the logo, Tools, Scenes and the version are on the page itself)
if (START) {
  bar.classList.add("lmStart");
  const other = LANG === "pl" ? "en" : "pl";
  const lang = el("button", "lmLang", LANG.toUpperCase()); lang.type = "button";
  lang.title = t("Język: Polski", "Language: English");
  lang.addEventListener("click", () => {
    try { localStorage.setItem(LANG_KEY, other); } catch (e) { /* storage blocked */ }
    const u = new URL(location.href); u.searchParams.delete("lang"); location.href = u.href;
  });
  bar.insertBefore(lang, bar.querySelector('.lmTop[data-menu="help"]'));
  const con = el("button", "lmCon", t("Console", "Konsola")); con.type = "button";
  con.title = t("The page's log: errors, warnings, loading", "Dziennik strony: błędy, ostrzeżenia, ładowanie");
  con.addEventListener("click", () => { if (window.LabConsole && window.LabConsole.toggle) window.LabConsole.toggle(); });
  addEventListener("labconsole:show", (e) => con.classList.toggle("on", !!e.detail));
  bar.appendChild(con);
}
function closeAll() { bar.querySelectorAll(".lmTop.open").forEach((t) => t.classList.remove("open")); }
document.addEventListener("pointerdown", (e) => { if (!bar.contains(e.target)) closeAll(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeAll(); dlg.classList.remove("open"); } });

document.body.prepend(bar);
// a page whose ui/ui.css is still an older copy from the browser's cache (from before the menu bar's sheet went into
// it) gets the sheets here, so the bar never goes missing
if (getComputedStyle(bar).position !== "fixed") {
  for (const f of ["menubar.css", "console.css"]) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = ROOT + "ui/shell/" + f; document.head.appendChild(l); }
}

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
window.LabMenu = { ITEMS: { LABS, TOOLS }, CATALOG: CAT, ROOT, MENU_H, APP_VERSION, VERSIONS: V, version: null, LANG, t, theme: themeNow, setTheme };
})();
