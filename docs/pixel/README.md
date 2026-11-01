# Pixel Studio — `labs/pixel.html`

A separate project inside this repository: a studio for **pixel art**. It is **not part of the game** and not linked
from it (the game stays realistic only); it is published with the site at
<https://michalstankiewicz4-cell.github.io/GameLaboratory/labs/pixel.html>.

Every result has a **transparent background**, any size from 4 to 256 pixels each way (presets 16–128), and exports as a
**PNG** (one frame or a sprite sheet, 1–16× nearest-neighbour) or an animated **GIF** (looping, transparent).

## Four ways of making pixels

| Mode | What it does | Code |
|---|---|---|
| **3D model** | A model built from code is rendered small with an orthographic camera and lit in hard steps (toon light computed per pixel from albedo and normals; shadows shift cooler, lights warmer), at the target size × *supersample*. It is reduced to the palette, then every pixel takes the colour **most of its sub-pixels** have (majority, not average — no blur, no new colours). Jumps in depth become **inner lines**; then outline and clean-up. Subjects: crate, barrel, chest (opens), sword, mushroom, house, rock, adventurer (walk cycle, idle), a **PlantKit tree** (any species, in the wind) and a **ShipKit ship** (rolling on a swell). Animations render every frame from the same fitted camera, so the sprite does not jump. | `js/render/pixel/render3d.js` |
| **Generate** | Sprites drawn directly in pixels by rules — a rotating planet with clouds and a rim, a gem with a glint, a potion with bubbles, a spinning coin, a swaying tree, a rock, rising fire, a bouncing slime (squash and stretch) — and **seamless tiles** (grass, sand, cobblestone, animated water and lava). Light from the top-left, shades from a hue-shifted ramp, dithering only along the edge between two shades. | `js/render/pixel/generators.js` |
| **Draw** | A pixel editor: pencil, eraser (or right button), fill, line (Bresenham, pixel-perfect), rectangle, picker, mirror left–right, frames (new, duplicate, delete), onion skin, undo/redo (Ctrl+Z / Ctrl+Shift+Z), samples drawn by hand, and **sprites as text** in and out. The drawing is kept in the browser. | `js/labs/pixel/app.js`, `js/render/pixel/sprites.js` |
| **Hybrid** | *Edit in Draw* takes the current 3D or generated result (all frames, its colours added to the swatches) into the editor for retouching by hand. | `js/labs/pixel/app.js` |

## The shared pipeline (right panel)

1. **Palette**: *Auto* (median cut in OKLab, 2–32 colours), fixed palettes (Steel 16, Moss 12, Desert 10, Ember 8,
   Night 8, Sea 12, Green 4, Mono 4, 1-bit) or *Free* (no reduction). Nearest colour is measured in OKLab.
2. **Dither**: none or ordered Bayer 2×2 / 4×4 with an amount (never error diffusion — it crawls in animation).
3. **Outline**: dark, or **selective** (selout: each edge pixel becomes a darker, cooler shade of the colour it borders);
   corners optional.
4. **Clean-up**: remove lone pixels (orphans), pixel-perfect lines (drop the L-corner pixel that makes a 1-px line look
   doubled, on the outline colour).

## Settings

*Copy settings* puts every slider (mode, size, palette, subject, camera, light, generator…) as JSON in the box and on the
clipboard; *Apply pasted settings* loads such JSON and redraws exactly the same picture; *Reset* returns to the defaults.
The drawing itself is not part of it — share that with *Drawing → text*.

## Pixel Doctor

The rules of pixel art as checks on the frame shown, with a score (100 minus 18 per severe and 8 per minor finding),
**Show** (marks the pixels) and **Fix** where it can be fixed automatically (`js/render/pixel/doctor.js`):

- too many colours for the size (12 / 20 / 32) — fix: auto palette;
- half-transparent pixels — fix: opaque or empty;
- lone pixels unlike all neighbours — fix: remove;
- doubled corners in the outline — fix: pixel-perfect;
- **pillow shading** (lightness follows the distance from the edge more than the light direction);
- banding (steps of different colours running side by side with the same length);
- low contrast (OKLab lightness range under 0.35);
- noise (over 22 % of pixels unlike most neighbours; sprites over 100 pixels);
- silhouette with stray specks or pinholes.

## Sprite text format

```json
{ "w": 16, "h": 16, "palette": { "o": "#2a0e14", "r": "#c8283a" }, "frames": [["..oo....", "..."]] }
```

One character per pixel, `.` is empty, `palette` maps characters to colours, `frames` is a list of row lists. *Drawing →
text* writes it, *Text → drawing* reads it — sprites can be written, read and corrected as text.

## Files

- `labs/pixel.html`, `ui/pages/pixel.css` — the page (strict CSP like the labs; checkerboard behind the transparent pixels).
- `js/render/pixel/core.js` — `PixelImage`, OKLab, palettes, median cut, quantize + Bayer, outline/selout, orphans,
  pixel-perfect, majority downsampling, canvas helpers, sprite sheet.
- `js/render/pixel/gif.js` — GIF89a encoder (LZW, global table with index 0 transparent, disposal 2, NETSCAPE loop).
- `js/render/pixel/render3d.js`, `generators.js`, `doctor.js`, `sprites.js`, `app.js` — as above.
- `tools/pixel-check.py` — headless check: every subject, generator, palette and sample at several sizes (opaque
  pixels, no half-transparent ones, colour count, a Doctor report), GIF/PNG signatures and downloads, a pencil stroke,
  undo, the text round trip, Doctor fixes; screenshots `tools/out/pixel-*.png`.

## Zombie Generator

`pixel/zombies.html` — original zombies as Unity sprite sheets, realistic or pixel art: see `docs/pixel/zombies.md`.

## Known limits / next

- Trees from PlantKit read dark (foliage normals are per card); a canopy-sphere normal would light them like a volume.
- Ships are long: zoom in (Zoom up to 2×) or use a wide size such as 96×48.
- Ideas: palette editor and palette import (.hex), layers, selection and move, per-frame timing, tiles previewed 3×3,
  more 3D subjects, a Doctor check for jaggies on curves.
