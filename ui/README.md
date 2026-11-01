# ui/ — the whole user interface of GameLaboratory

One look for every lab, tool and the start page: the labs from Battle (dark glass, a thin line,
gold headings and controls). Font: Space Grotesk; numbers: IBM Plex Mono.

## Files

| File | What it is |
|---|---|
| `tokens.css` | colours, fonts, radii, the menu bar's height (`--menuH`) — every other file uses these |
| `fonts.css` | the self-hosted fonts (`fonts/`, latin + latin-ext) |
| `base.css` | thin scroll bars without arrow buttons, everywhere |
| `controls.css` | what is inside a window (`.labWin`) or any `.labUi`: buttons (`.tBtn`, `.btn`, `.btns button`), the model arrows (`.navArrow`), sliders (gold up to `--fill`), check boxes, radio buttons, drop-downs, fields, headings |
| `windows.css` + `windows.js` | floating windows with a lab's options (OPTIONS → Windows) |
| `envswitch.css` + `envswitch.js` | the environment switch: space · water · land |
| `loader.css` | the loading card: a ring, a plain sentence, an optional step, a bar |
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

A plain sentence, not capitals. The bar runs back and forth; give its `<i>` a width to show progress,
and the step (`.labLoadStep`) a text to say what is being done.
