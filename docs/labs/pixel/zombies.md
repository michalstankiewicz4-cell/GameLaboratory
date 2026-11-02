# Zombie Generator — `pixel/zombies.html`

Part of Pixel Studio (not part of the game). Original zombies made from a seed, animated, exported as sprite sheets
that drop straight into a Unity project. Live: <https://michalstankiewicz4-cell.github.io/GameLaboratory/labs/zombies.html>.
Made as a gift for the author of a zombie game whose sprites use this sheet layout; nothing of that game is in here —
every zombie is generated from code.

## The sheet

| | Default |
|---|---|
| Frame | 512 × 512 px (256 and 1024 too) |
| Grid | 12 frames, 6 columns × 2 rows (3072 × 1024), frame 0 top-left, left to right |
| Background | transparent, hard edge (alpha 0 or 255) |
| Pivot | centre, 9 px above the bottom edge (the feet) — `(0.5, 0.017578)` |
| Pixels per unit | 100 |
| Names | `<direction>deg_Zombie_<seed>_<animation>.png`, direction 0 = facing the camera, then clockwise seen from above |

Each sheet comes with a JSON file (size, grid, pivot, pixels per unit, filter, and every sprite's rect with Unity's
bottom-left origin) and `ZombieSheetSlicer.cs`, an editor script: select the PNGs, *Tools > Slice Zombie Sheets*, and
each becomes a Multiple sprite with the rects, pivot, pixels per unit and filter from its JSON.
*All 8 directions (ZIP)* renders every direction (optionally every animation) and packs the sheets, JSON, the script
and a README into one ZIP (`js/render/pixel/zip.js`, stored).

## The zombie (`js/models/human/zombie/zombie.js`)

- **Body**: a signed distance field — round cones and ellipsoids on a 20-joint skeleton, smoothly joined (deltoids,
  biceps, calves, belly by build, clawed fingers and thumbs, a skull with jaw, nose, ears, eye sockets and an open
  mouth). Height 1.5–2 m, build thin to heavy, hunch, head tilt, limp, jaw, one forearm lost.
- **Skin**: decay (mottling, bruises, veins, wounds), sunken eyes, blood around the mouth; eyes milky, yellow or
  glowing red; hair bald, short, patchy or long.
- **Outfits**: hazmat suit (baggy, folds, hood, gloves, boots), office shirt and tie, work overalls, T-shirt and
  jeans, hospital gown, rags — shells over the body, torn by noise (skin shows through), dirt rising from the feet,
  blood stains (dried, nearly black-brown; wet, dark red).
- **Animations** (12 frames, looped, in place — the feet stay on the pivot line): shamble, lurch (dragging a leg),
  lunge (attack), idle (sway), crawl. Forward kinematics on a three.js bone hierarchy; the lowest point is put on the
  ground every frame.
- **Render**: per frame the field becomes a mesh in JS — surface nets on a grid of ~1.6 px, sampled only in a narrow
  band round the surface (a coarse pass first) — with normals from the field's gradient plus a little bump, colours
  and occlusion per vertex; drawn with three.js standard materials (orthographic, the same camera for every frame):
  key light with soft shadows, sky and ground fill, rim light, ACES; glowing red eyes are small unlit spheres;
  2× supersampled, then cut out with a hard edge. (v0.25–0.26 ray-marched the field in one fragment shader: fine in
  Chrome on Linux, but Direct3D on Windows did not finish compiling it after minutes — the reason for the mesh.) The light turns with the camera, so every direction is lit the same way (as sprites
  in a 2D game are).
- **Renderer** (top bar): *GPU* (default) evaluates the field on the graphics card, batch by batch, with one small
  shader (the first compile on Windows takes about 20 s, then it is cached by the browser); *CPU* does it all in
  JavaScript. The mesh, colours and drawing are the same either way.
- **Start render**: nothing renders by itself; after a change the preview says the frames are out of date.
  **Reset to default** forgets the saved settings and zombie and starts the page afresh.
- **Waiting**: frames render one at a time (`renderZombieAsync`) with a loader over the preview (spinner, frame count,
  progress bar; for the ZIP also the sheet, animation and direction); changing anything cancels the render in progress.
- **Pixel art** style: rendered at the pixel size × 4, auto palette, majority downsampling, selective outline, lone
  pixels removed, then scaled up (nearest) to the frame size with the feet on the same line.

## Check

`py tools/pixel-check.py` renders a zombie both ways at 256 px (hard alpha, feet on the line), checks the sheet
layout against Unity's rects and the ZIP signature.

## Known limits / next

Bodies are smooth and a little mannequin-like next to hand-sculpted models (no cloth simulation, no skin pores);
more outfits (police, soldier, firefighter), props (a pipe, a bag), heads (hats, helmets), a run and a death animation,
normal-map export for 2D lights.
