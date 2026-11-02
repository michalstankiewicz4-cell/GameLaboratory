# ui/ — the whole user interface of GameLaboratory

One look for every lab, tool and the start page: the labs from Battle (dark glass, a thin line,
gold headings and controls). Font: Space Grotesk; numbers: IBM Plex Mono. Colours only from the tokens.

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
| `tokens.css` | colours, fonts, radii, the heights of the menu bar and the two bars (`--menuH`, `--barH`, `--footH`) — every other file uses these; in a cascade layer, so a page with its own theme keeps its values, while the menu bar, its dialog and the two bars always get these |
| `fonts.css` | the self-hosted fonts (`fonts/`, latin + latin-ext) |
| `base.css` | thin scroll bars without arrow buttons, everywhere |
| `controls.css` | what is inside a window (`.labWin`) or any `.labUi`: buttons (`.tBtn`, `.btn`, `.btns button`), sliders (gold up to `--fill`), check boxes, radio buttons, drop-downs, fields, headings |
| `space.css` | the page and panels of the labs from Space (`#hud`, `#opt`, `.hudPanel`, rows, sliders' labels) |
| `sea.css` | the page and panels of the labs from Battle (`.panel`, rows, the doctor's lists) |

## shell/

| File | What it is |
|---|---|
| `log.js` | the page's log (`window.LabLog`): errors (also uncaught ones and files that failed to load), warnings, the console's messages, loading steps and times; kept for the tab until it is closed (`sessionStorage`). The first script on every page |
| `menubar.css` + `menubar.js` | the menu bar: GameLaboratory · Options · Tools · Help, the lab's name and the versions; languages; OPTIONS → Bars, Windows, Language, Reset saved settings. The script loads the console's script |
| `bars.css` + `bars.js` | the two bars on every page: the toolbar under the menu bar (drop-downs, buttons, the environment switch, a status, the console's button) and the info bar at the bottom (frames per second, scale); fixed heights, opaque, everything in them defined here only. `<body class="pageFlow">`: a page that scrolls as a document starts under the bars |
| `windows.css` + `windows.js` | floating windows with a lab's options (`data-window`), opened and closed from OPTIONS → Windows; dragged by the title, kept per page; windows without a remembered place stack on their side, and a full column continues in the next one |
| `labwin.css` + `labwin.js` | the standard windows (`data-std`): **Description** (left, first), **Camera**, **Light and weather**, **Performance** (right, in this order) — the same titles (EN/PL), sides and order on every lab |
| `perf.js` | `LabPerf`: the Performance window's numbers — frames per second, frame time, CPU per frame, triangles and draw calls, resolution, the graph, the model (`LabPerf.model(group, ms)` or `modelRows`); also the info bar's frames per second. `begin(renderer)` / `end(renderer)` once a frame |
| `nav.js` | back / forward: two joined buttons first on every toolbar, the browser's history; greyed out when there is nowhere to go. Loaded by the menu bar |
| `console.css` + `console.js` | the console window: the log, newest first, date and time, the page, a filter by kind and text, Clear; a button on the right of the toolbar |
| `loader.css` + `loader.js` | the loading card: a ring, a plain sentence, the step being done, a bar with a percentage (see below) |
| `envswitch.css` + `envswitch.js` | the environment switch: space · water · land, in the toolbar; a greyed-out position has no page |

## data/

| File | What it is |
|---|---|
| `versions.js` | the program's and every lab's version (`app`, `labs`); fills every `data-lab-version` |
| `catalog.js` | every lab and tool: names (EN/PL), docs, descriptions, phrases, saved settings, tile pictures; read by the menu bar, the start page and `tools/sitemap.py` |

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
