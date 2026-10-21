# Look Lab — ageing, weather and camera look

`labs/look.html` (`js/labs/look.js`). ORP Błyskawica on the WaterKit sea under a procedural cloudy sky, with procedural
ageing on every material and a single-pass camera-look post process. Every effect is switchable, the clean and the
graded image can be compared side by side, and the cost of each effect can be measured. Settings are kept in the
browser (`localStorage`, key `steelSalvo.lookLab.v1`) and can be copied as JSON.

## Kits

| File | What it does |
|---|---|
| `js/shipkit/ageing.js` | Procedural ageing. `bakeWear(group)` voxelises the ship (0.35 m), casts 7 short rays per voxel for occlusion and tests 4 directions for edge exposure, and writes one `aWear` vertex attribute (occlusion, edge) — ~80k vertices in ~0.3 s, geometry untouched. `ageMaterials(mats, u)` patches the ShipKit materials by material key (`AGE_KIND`): painted steel, hull paint, deck, bare metal, wood, canvas, brass, rope. |
| `js/labs/skykit.js` | Procedural sky with a cloud layer (fbm), `WEATHER` presets (clear, fair, broken, overcast, rain, sea fog, storm), rain curtains and fog in the sky (`uSkyFog`), `fogDensity(km)`, `applySky()` returns the sun, ambient and fog that match, `skyEnvironment()` makes the PMREM environment from the same GLSL, so ship, sea reflections and sky agree. WaterKit takes the sky GLSL via `waterMaterial(u, { sky })`. |
| `js/labs/rainkit.js` | Falling rain in one draw call: line segments (each drop's motion blur) in a box that follows the camera and wraps; wind slants it, distance fades it, `setRain(0..1)` sets how many drops are drawn (up to 24k). |
| `js/render/look.js` | `LookPipeline`: half-float target with mipmaps (MSAA optional, render scale) and one post shader: exposure (manual or automatic from the smallest mip), tone mapping ACES / AgX / Hable, contrast, saturation, temperature, tint, bloom from mips, vignette, grain, chromatic aberration, barrel distortion, droplets and dirt on the lens, sun glare/ghost, sharpen. `set(params, 'A'|'B')` and `split` draw two parameter sets side by side. `AutoResolution` lowers/raises the render scale to keep ~60 fps (with hysteresis). `LOOK_PRESETS`: Game clean, Cinematic, Bodycam. |

## Ageing rules (by surface)

| Surface (material key) | Effect |
|---|---|
| painted steel (`paint`, `white`, `red`) | dull chalky paint, grime in corners (baked occlusion), chipped paint on exposed edges, rust spots, rust streaks running down vertical faces |
| hull (`hull`) | the above + plating seams, salt and growth band above the waterline |
| deck (`deck`) | worn paint along walkways, dirt in corners |
| bare metal (`metal`, `dark`) | darker and oily, rust bloom |
| wood (`wood`, `wooddeck`) | planks grey out, darker seams |
| canvas | faded and stained |
| brass and bronze | green-brown patina, polished on edges |
| rope | darker |

One **Wear** slider scales everything; each effect has its own slider. The game can age a ship over a campaign by
moving `uAge` (and later from the transformer's damage).

## Weather

Seven weathers (clear, fair, broken, overcast, rain, sea fog, storm) or custom: cloud cover, density, wind, haze, rain,
visibility and the sun's height/bearing. With "Wind sets the sea" the wind picks the sea state
(significant height ≈ 0.0246 U², peak length ≈ 0.83 U²) and the water look (Atlantic, Baltic grey under thick cloud,
storm). Overcast skies dim the sun and the environment light.

**Rain** (0 … downpour): falling streaks around the camera (RainKit), rings from drops on the sea near the camera, a
rougher sea with a duller glitter, wet ship (darker paint, glossy upward faces, water running down vertical faces, dry in
sheltered spots — the baked occlusion decides), dark rain curtains on the horizon in the sky and in its reflections,
the sun's disc hidden. **Squalls** make the rain come and go; **Rain on the lens** adds droplets to the look.

**Visibility / fog**: one number in km, the distance at which a dark ship fades to 5 % (exponential-squared fog,
density 1.73 / visibility). The thicker of fog, haze and rain wins; the same density fogs the ship (three.js
`FogExp2`), the sea and the sky (path through a 260 m fog layer, so the zenith stays lighter and the sun shows as a
pale disc). Fog and rain take the sun's light down and its glitter faster still (the glitter needs a sharp sun).

## Cameras

From the escort, Bow wave, Rusty side, Deck aft, High, **Bodycam** (wide lens, hand-held shake, bodycam preset). The
lens effects (distortion, droplets, dirt, shake) are meant mainly for first-person views in the game; the clean preset
stays the default.

## Check

`py tools/lab-check.py` loads the page, goes through every weather (rain and fog included), every look preset, the split compare and every
camera, and screenshots `tools/out/lab-look.png`. Performance on a real GPU has not been measured yet ("Measure the
cost of each effect" in the lab does it on the user's machine).
