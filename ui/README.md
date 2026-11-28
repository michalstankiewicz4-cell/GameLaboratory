# ui/ — the whole user interface of GameLaboratory

One look for every lab, tool and the start page, in two themes (OPTIONS → Look, or the sun / moon at the right end
of the menu bar; automatic: the system's light / dark setting): **Day** — the light canvas (warm paper `#F5F0E9`,
panels `#FFF9F2`, an orange accent `#F47D50`, navy text `#273247`, soft shadows); **Night** — the dark canvas
(deep navy glass, a thin line, the same orange accent, warm white titles). Rounded corners (`--r` 14 px, `--r2` 9 px), thin borders.
Font: Space Grotesk; numbers: IBM Plex Mono. Colours only from the tokens — a colour written in a sheet stays the
same in both themes.

| Folder | What is in it |
|---|---|
| `ui.css` | every sheet a page needs, in one link (the styles and all the shell's sheets, the menu bar's and the console's too, so the menu bar is drawn with the page) |
| `style/` | how things look: tokens, fonts, base, controls, the two page themes |
| `shell/` | what every page has around the lab: menu bar, the two bars, windows, standard windows, performance, console, log, loading card, environment switch |
| `data/` | the catalog of labs and tools, the versions |
| `pages/` | one page's own rules |

## style/

| File | What it is |
|---|---|
| `tokens.css` | colours (also the category colours `--cat-<id>`) for both themes (night on `:root`, day on `:root[data-theme="day"]`; also `--accentSoft`, `--onAccent`, `--info`, `--off`, `--chip`, `--overlay`, `--shadow`, `--shadowHi`, `--shadowBig`, `--shadowSoft`), fonts, radii, the heights of the menu bar and the two bars (`--menuH`, `--barH`, `--footH`) — every other file uses these; in a cascade layer, so a page with its own theme keeps its values, while the menu bar, its dialog and the two bars always get these |
| `fonts.css` | the self-hosted fonts (`fonts/`, latin + latin-ext) |
| `base.css` | thin scroll bars without arrow buttons, everywhere |
| `controls.css` | what is inside a window (`.labWin`) or any `.labUi`: buttons (`.tBtn`, `.btn`, `.btns button`), sliders (the accent up to `--fill`), check boxes, radio buttons, drop-downs, fields, headings |
| `space.css` | the page and panels of the labs from Space (`#hud`, `#opt`, `.hudPanel`, rows, sliders' labels) |
| `sea.css` | the page and panels of the labs from Battle (`.panel`, rows, the doctor's lists) |

## shell/

| File | What it is |
|---|---|
| `log.js` | the page's log (`window.LabLog`): errors (also uncaught ones and files that failed to load), warnings, the console's messages, loading steps and times; kept for the tab until it is closed (`sessionStorage`). The first script on every page |
| `menubar.css` + `menubar.js` | the menu bar: GameLaboratory · Options · Tools · Scenes, the lab's name, the versions and at the right end — on every page, as on the start page and in this order — round icon buttons with tooltips: Help (opens the Help menu), the look (three modes, one click each: automatic → day → night; its icon shows the mode) and the language (a globe with an AUTO / PL / EN chip: automatic → Polski → English); languages; the theme (`<html data-theme="day|night">`, set before the page draws, kept in `gamelab.theme`: auto / day / night; a page drawing its own colours listens to the `gamelab-theme` event); SCENES — the scene editor and its ready scenes (catalog `scenes`, `editor/index.html?scene=<id>`); on the start page (no bars there) it is only those three icons at the top right, larger (no Options, no console) (`#labMenu.lmStart`); a narrow screen (up to 640 px): the logo without the name, the lab's name cut short (…), the versions at the top of Help (`.lmVerNarrow`), the menus open across the screen; OPTIONS → Console → Show the console; OPTIONS → Bars, Windows, Look, Reset saved settings (everything the site keeps in this browser: local and session storage, IndexedDB, caches, service workers, cookies); HELP → Keyboard shortcuts (this page's keys from `ui/data/keys.js`, loaded when the window opens). HELP → License (MIT) — the `LICENSE` file in the repository. The script loads the console's script |
| `bars.css` + `bars.js` | the two bars on every page: the toolbar under the menu bar (drop-downs, buttons, the environment switch, a status, the console's button) and the info bar at the bottom (frames per second, scale); fixed heights, opaque, everything in them defined here only. `<body class="pageFlow">`: a page that scrolls as a document starts under the bars |
| `windows.css` + `windows.js` | floating windows with a lab's options (`data-window`), opened and closed from OPTIONS → Windows; dragged by the title, kept per page; windows without a remembered place stack on their side, and a full column continues in the next one. Window or panel: the pin on the title bar docks a window in the panel on its side (`.labDock`, a scrolled column between the bars) and back; the toolbar switch Windows \| Panels does it for all; by default every window is docked (Panels) until it is undocked. Panels: real panels flush with the edges (`body.lmPanels`), the console docked at the bottom between them; the free middle: `--viewL`, `--viewR`, `--viewB` and `window.LabView`; `body.viewFits` puts the page's `#view` there, between the bars, and adds the switch Middle \| Full (the free middle or the whole space between the toolbar and the info bar, `body.vfFull`); `LabView.size()` gives the view's box `{ w, h, x, y }` and a change of the view's size sends the page a `resize` event, so a lab sizes its renderer and its pointer coordinates from it; an overlay over the view (labels, dimension lines) gets class `viewLayer` and the same box. The scene editor and every 3D lab with windows use it. The grip on a panel's inner edge resizes it (240 px up to 45 % of the window; double-click — the default), the same widths on every page (`--dockL`, `--dockR`, kept in `gamelab.dockw`). A window grows in when it opens, a panel slides in from its edge. When every window of a panel is hidden (H — `.hidden-panel`), the panel goes away (`.labDock.noWins`) and the view takes its place. A narrow screen (a phone upright, up to 640 px; `body.lmNarrow`): the view on top across the whole width, every window in one drawer at the bottom (`.labDrawer`) — a row of tabs, one window at a time, and ▴ / ▾ sliding it up to about half the screen and down to the tabs; the drawer's height is in `--viewB` and `--drawerH` (the docked console sits on it); the panels, their grips and the switches Windows \| Panels and Middle \| Full are hidden there, the windows' docking and places stay for wider screens |
| `labwin.css` + `labwin.js` | the standard windows (`data-std`): **Description** (left, first), **Camera**, **Light and weather**, **Performance** (right, in this order) — the same titles (EN/PL), sides and order on every lab |
| `perf.js` | `LabPerf`: the Performance window's numbers — frames per second, frame time, CPU per frame, triangles and draw calls, resolution, the graph, the model (`LabPerf.model(group, ms)` or `modelRows`); also the info bar's frames per second. `begin(renderer)` / `end(renderer)` once a frame |
| `nav.js` | back · home · forward: three joined buttons first on every toolbar — the browser's history and the start page; greyed out when there is nowhere to go. Loaded by the menu bar |
| `console.css` + `console.js` (window or panel: its own pin docks it at the bottom between the panels or lets it float; the Windows \| Panels switch resets that) | the console window: the log, newest first, date and time, the page, the kinds as tabs with icons and counts (All, Errors, Warnings, Loading, Info, Messages; a kind with no entries has no tab) and the same icon on every entry, Clear at the end of the tabs' row, a text filter (its row hidden from OPTIONS → Console → Text filter); window | panel and close at the right end of its title bar; docked, its top edge is a grip — drag to change its height (90 px up to 75 % of the window, double-click: 30 %; `--conH`, kept in `gamelab.console`); a button on the right of the toolbar. Tabs: the log first, then the page's own (`window.LabConsole.addTab({ id, title, titlePl, el })`, or queued in `window.LabConsoleTabs` before the console loads) |
| `loader.css` + `loader.js` | the loading card: a ring, a plain sentence, the step being done, a bar with a percentage (see below) |
| `envswitch.css` + `envswitch.js` | the environment switch: space · water · land, in the toolbar; a greyed-out position has no page |

## data/

| File | What it is |
|---|---|
| `versions.js` | the program's and every lab's version (`app`, `labs`); fills every `data-lab-version` |
| `keys.js` | keyboard shortcuts of every page (sections of `[key, EN, PL]`; the scene editor's player keys from the player's settings, `js/core/settings.js`); HELP → Keyboard shortcuts — a new shortcut in a page's code is an entry here |
| `catalog.js` | every lab and tool: names (EN/PL), docs, descriptions, phrases, saved settings, tile pictures, group (`group`: labs that belong together — one glow, one switch) and category (`cat`, names in `cats`: a coloured dot and heading in the Tools menu, a coloured edge, chip, tooltip and highlight on the tile); the labs stand in category order; read by the menu bar, the start page and `tools/sitemap.py` |

## A page

```html
<link rel="stylesheet" href="../ui/ui.css">
<link rel="stylesheet" href="../ui/style/space.css">   <!-- or sea.css -->
<link rel="stylesheet" href="../ui/pages/<lab>.css">   <!-- if the lab has its own rules -->
…
<body>
<script src="../ui/shell/log.js"></script>             <!-- first: the log -->
<script src="../ui/data/versions.js"></script>
<script src="../ui/data/catalog.js"></script>
<script src="../ui/shell/menubar.js"></script>
<div class="bar">…<span class="sp"></span></div>
<div class="foot"><span id="fps" data-auto></span><span class="sp"></span><span>GameLaboratory</span></div>
<script src="../ui/shell/bars.js"></script>
…  the lab's windows: <aside data-std="info">, <aside data-window="…">, <aside data-std="camera|light|perf">
<script src="../ui/shell/perf.js"></script>
<script src="../ui/shell/labwin.js"></script>
<script src="../ui/shell/windows.js"></script>
```

No `<style>` blocks and no `style=""` attributes in the pages: the labs from Battle run under a
strict CSP (`style-src 'self'`), and the rest follow the same rule. Scripts set styles through the
CSSOM (`el.style.x = …`), which the CSP allows.

## Loading

```html
<div id="loading" class="labLoad"><div class="labLoadCard"><i class="labSpin"></i><b>Generating the hull…</b>
  <span class="labLoadStep"></span><span class="labLoadBar"><i></i></span></div></div>
<script src="../ui/shell/loader.js"></script>
```

A plain sentence, not capitals. `loader.js` (right after the card) fills the step, the bar and the percentage: the
page's own progress (its scripts, building the scene, the first frame) until the lab reports its steps with
`LabLoad.step(name, fraction)`; `LabLoad.done()` ends it (a card marked `data-auto` fades by itself). For something
long later on: `LabLoad.run(title, async (step) => { await step('Heightmap', 0.1); … })`. Without steps the bar runs
back and forth.
