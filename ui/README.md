# ui/ — the whole user interface of GameLaboratory

One look for every lab, tool and the start page: the labs from Battle (dark glass, a thin line,
gold headings and controls). Font: Space Grotesk; numbers: IBM Plex Mono.

## Files

| File | What it is |
|---|---|
| `tokens.css` | colours, fonts, radii, the menu bar's height (`--menuH`) — every other file uses these |
| `fonts.css` | the self-hosted fonts (`fonts/`, latin + latin-ext) |
| `base.css` | thin scroll bars without arrow buttons, everywhere |
| `controls.css` | what is inside a window (`.labWin`) or any `.labUi`: buttons (`.tBtn`, `.btn`, `.btns button`), sliders (gold up to `--fill`), check boxes, radio buttons, drop-downs, fields, headings |
| `windows.css` + `windows.js` | floating windows with a lab's options (OPTIONS → Windows) |
| `bars.css` + `bars.js` | the lab's two bars: under the menu bar (drop-downs, buttons, the environment switch, a status) and at the bottom (frames per second, scale); fixed heights, opaque, everything in them defined here only; OPTIONS → Bars hides either |
| `envswitch.css` + `envswitch.js` | the environment switch: space · water · land (28 px, in the bar) |
| `loader.css` + `loader.js` | the loading card: a ring, a plain sentence, the step being done, a bar with a percentage. At the start it shows the page's own progress (its scripts, building the scene, the first frame); `LabLoad.step(name, fraction)` — the lab's own steps; `LabLoad.run(title, async step => …)` — the card over a running lab for something long; `LabLoad.done()`; a card marked `data-auto` fades by itself |
| `console.css` + `console.js` | the console window: the page's log (`window.LabLog`, started in `menubar.js`: errors, warnings, console messages, loading steps and times), newest first, date and time, the page, a filter by kind and text; kept for the tab until it is closed (`sessionStorage`); a button on the right of the bar, on every page (the start page has both bars too); loaded by `menubar.js` |
| `ui.css` | all of the above in one link |
| `menubar.css` + `menubar.js` | the menu bar; the script loads its own sheet |
| `versions.js` | the program's and every lab's version |
| `catalog.js` | every lab and tool: names (EN/PL), docs, descriptions, phrases, saved settings, tile pictures |
| `space.css` | the page and panels of the labs from Space (`#hud`, `#opt`, `.hudPanel`) |
| `sea.css` | the page and panels of the labs from Battle (`.bar`, `.panel`, the doctor's lists) |
| `pages/<lab>.css` | one lab's or tool's own rules (`start.css` — the start page) |

## A page

```html
<link rel="stylesheet" href="../ui/ui.css">
<link rel="stylesheet" href="../ui/space.css">        <!-- or sea.css -->
<link rel="stylesheet" href="../ui/pages/<lab>.css">  <!-- if the lab has its own rules -->
…
<script src="../ui/versions.js"></script>
<script src="../ui/catalog.js"></script>
<script src="../ui/menubar.js"></script>              <!-- first thing in <body> -->
…
<script src="../ui/windows.js"></script>              <!-- after the panels -->
```

No `<style>` blocks and no `style=""` attributes in the pages: the labs from Battle run under a
strict CSP (`style-src 'self'`), and the rest follow the same rule. Scripts set styles through the
CSSOM (`el.style.x = …`), which the CSP allows.

## Loading

```html
<div id="loading" class="labLoad"><div class="labLoadCard"><i class="labSpin"></i><b>Generating the hull…</b>
  <span class="labLoadStep"></span><span class="labLoadBar"><i></i></span></div></div>
```

A plain sentence, not capitals. `ui/loader.js` (right after the card) fills the step and the bar: the page's own
progress until the lab reports its steps with `LabLoad.step(name, fraction)`; for something long later on,
`LabLoad.run(title, async (step) => { await step('Heightmap', 0.1); … })`. Without steps the bar runs back and forth.
