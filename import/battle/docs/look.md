# Look Lab — ageing, weather and camera look

`labs/look.html` (`js/labs/look.js`). ORP Błyskawica on the WaterKit sea under a procedural cloudy sky, with procedural
ageing on every material and a single-pass camera-look post process. Every effect is switchable, the clean and the
graded image can be compared side by side, and the cost of each effect can be measured. Settings are kept in the
browser (`localStorage`, key `steelSalvo.lookLab.v1`) and can be copied as JSON.

## Kits

| File | What it does |
|---|---|
| `js/shipkit/ageing.js` | Procedural ageing. `bakeWear(group)` voxelises the ship (0.35 m), casts 7 short rays per voxel for occlusion and tests 4 directions for edge exposure, and writes one `aWear` vertex attribute (occlusion, edge) — ~80k vertices in ~0.3 s, geometry untouched. `ageMaterials(mats, u)` patches the ShipKit materials by material key (`AGE_KIND`): painted steel, hull paint, deck, bare metal, wood, canvas, brass, rope. |
| `js/labs/skykit.js` | Procedural sky with a cloud layer (fbm), `WEATHER` presets (clear, fair, broken, overcast, rain, sea fog, storm), rain curtains and fog in the sky (`uSkyFog`), `fogDensity(km)`, `sunAt(hour, lat, day)` (solar position), dawn/dusk glow, stars and the moon, `applySky()` returns the sun, ambient and fog that match, `skyEnvironment()` makes the PMREM environment from the same GLSL, so ship, sea reflections and sky agree. WaterKit takes the sky GLSL via `waterMaterial(u, { sky })`. |
| `js/labs/rainkit.js` | Falling rain in one draw call: line segments (each drop's motion blur) in a box that follows the camera and wraps; wind slants it, distance fades it, `setRain(0..1)` sets how many drops are drawn (up to 24k). `lightning(scene)`: jagged bolts with branches 1.5–6 km away, a few return strokes, lighting the clouds (SkyKit `uSkyBolt`), the scene (one directional light) and the sea; optional thunder (Web Audio) after distance ÷ 343 m/s. |
| `js/shipkit/lights.js` | Ship lights from the model's `anchors`: `navLights()` (masthead white, side lights green starboard / red port, stern white, each shining only over its arc), `gunFlashes()` (flash sprites at the main guns' muzzles, one point light kept from the start, the sea lit through WaterKit `uFlash`), `signalLamp()` (the searchlight's venetian shutters keying Morse, glow and beam ahead while open) and `morse(text)`. |
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

## Time of day

A **Time** slider (local solar time at 55° N in late October — the North Atlantic convoy season) and buttons Dawn,
Morning, Noon, Afternoon, Dusk, Night set the sun's height and bearing (`sunAt()`); both can still be moved by hand
(the sun can go to −18°). Dusk and dawn: warm glow along the horizon under the sun, rose-lit clouds, a bluer zenith.
From nautical twilight (−6° … −14°) the stars come out (hidden by cloud and near the horizon, not reflected in the sea —
there they only sparkled as noise); the **Moon** slider (new … full) sets moonlight: the moon's disc and halo opposite
the sun at 35°, moonlit cloud edges, a moon path on the sea and a weak blue light that casts shadows. Water, foam and
fog darken with the daylight (`uLight` in WaterKit); the searchlights glow at night. With manual exposure the look
pipeline adapts like the eye (up to ×3.6 at night); automatic exposure does it by itself.

## Lights, guns and lightning

- **Navigation lights**: from sunset to sunrise (or on/off): white masthead light on the foremast, green starboard and
  red port side lights on the bridge-wing screens (112.5° arcs, so from ahead you see both, from the beam only one),
  white stern light (135° aft).
- **Fire a salvo (F)**: the 120 mm mounts train to the chosen side within their arcs and fire together; a flash and a
  burning-gas cone at every muzzle and a tenth of a second of orange light on the ship and the sea.
- **Signal SOS**: the searchlight behind the bridge keys · · · — — — · · · with its round venetian shutter (a ring on the
  lens rim, slats cut to the circle; they swing in ~60 ms, dot 0.22 s, dash three dots); glow and beam ahead only while open. In the Ship Lab the same lamp sends any
  short text (Morse A–Z, 0–9) and the camera moves in front of it.
- **Lightning** (0 … frequent; Storm has it): bolts lighting the clouds around the strike, flickering return strokes,
  the scene and the sea flashed blue-white; rain and fog hide the channel, not the flash; "Lightning strike now";
  **Thunder** (sound) arrives after distance ÷ 343 m/s.

## Colour

Saturation (0 grey … 1.6) and **Vibrance** (lifts muted colours, leaves strong ones alone; −1 … 1) in the look panel.
The game has its own **Colour saturation** in Options > Graphics (0 … 160 %, saved with the other settings).

## Cameras

From the escort, Bow wave, Rusty side, Deck aft, High, **Bodycam** (wide lens, hand-held shake, bodycam preset). The
lens effects (distortion, droplets, dirt, shake) are meant mainly for first-person views in the game; the clean preset
stays the default.

## Check

`py tools/lab-check.py` loads the page, goes through every weather (rain and fog included), every look preset, the split compare and every
camera, and screenshots `tools/out/lab-look.png`. Performance on a real GPU has not been measured yet ("Measure the
cost of each effect" in the lab does it on the user's machine).
