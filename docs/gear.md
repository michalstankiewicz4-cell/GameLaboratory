# Hero's gear lab (`labs/gear.html`), GearKit and vision

The hero's items that give light, held in first person, and the ways of seeing. The owner's call (2026-11-01): the
flashlight as an unusual item, the hero's light sources and those of his other things, vision — night vision,
binoculars. The test place is a dark cave from CaveKit ([`caves.md`](caves.md)).

## Files

| File | What it is |
|---|---|
| `js/models/gear/gearkit.js` | **GearKit**: `ITEMS`, `makeItem(id, { power, angle, kelvin, charge })`, `kelvinColor(T)` |
| `js/render/vision.js` | **VisionPass**: the eye, night vision, binoculars — one full-screen pass after the camera look |
| `labs/gear.html`, `js/labs/gear.js` | The lab: windows *Item* and *Vision*; the way of seeing in the top bar |

## Items

The set was chosen for the lab (to change as the game needs): flashlight, lantern, glow stick, lighter, phone screen.
Each has a small model held in the hand (in the camera's space) and its light:

| Item | Light | Colour | Flicker | Lasts |
|---|---|---|---|---|
| Flashlight | a narrow hot spot inside a wide, faint spill; casts shadows | 5600 K | weak battery (below 15 %) | 1.5 h |
| Lantern | all around, from a flame behind glass; casts shadows | 1900 K | flame | 4 h |
| Glow stick | close, all around | green | — | 8 h |
| Lighter | a small flame | 1700 K | flame | 30 min |
| Phone screen | a soft, wide cone in front | 7000 K | — | 6 h |

- **Colour temperature** → light colour: `kelvinColor` (a black-body fit).
- **Charge**: a battery holds its light and falls off steeply only at the end; a chemical glow fades evenly.
  *Runs down with time* speeds it up (a minute is an hour) without speeding the flicker.

## Ways of seeing

The picture: scene → camera look (`js/render/sea/look.js`, into a render target — `look.render(scene, camera, target)`)
→ `VisionPass` → screen.

- **Night vision**: the gain is the look's exposure (light amplified before the tube), then the picture becomes the light
  of a phosphor screen (green, or white like newer tubes) with the tube's noise, a halo around bright points, faint
  lines and the round field of the eyepiece. The **infrared illuminator** is a wide light switched on only while looking
  through the device — the eye does not see infrared.
- **Binoculars**: the zoom narrows the camera's field of view; two overlapping round fields with soft dark edges and an
  optional range scale; the item is hidden (both hands on the binoculars).
