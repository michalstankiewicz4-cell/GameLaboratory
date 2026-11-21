# Look Lab — ageing, weather and camera look

`labs/look.html` (`js/labs/look/look.js`). ORP Błyskawica on the WaterKit sea under a procedural cloudy sky, with procedural
ageing on every material and a single-pass camera-look post process. Every effect is switchable, the clean and the
graded image can be compared side by side, and the cost of each effect can be measured. Settings are kept in the
browser (`localStorage`, key `gameLab.look.v1`) and can be copied as JSON.

## Kits

| File | What it does |
|---|---|
| `js/models/ships-sea/ageing.js` | Procedural ageing. `bakeWear(group)` voxelises the ship (0.35 m), casts 7 short rays per voxel for occlusion and tests 4 directions for edge exposure, and writes one `aWear` vertex attribute (occlusion, edge) — ~80k vertices in ~0.3 s, geometry untouched. `ageMaterials(mats, u)` patches the ShipKit materials by material key (`AGE_KIND`): painted steel, hull paint, deck, bare metal, wood, canvas, brass, rope. |
| `js/envs/sky/skykit.js` | Procedural sky with a cloud layer (fbm), `WEATHER` presets (clear, fair, broken, overcast, rain, sea fog, storm), rain curtains and fog in the sky (`uSkyFog`), `fogDensity(km)`, `sunAt(hour, lat, day)` (solar position), dawn/dusk glow, stars and the moon, `applySky()` returns the sun, ambient and fog that match, `skyEnvironment()` makes the PMREM environment from the same GLSL, so ship, sea reflections and sky agree. WaterKit takes the sky GLSL via `waterMaterial(u, { sky })`. |
| `js/envs/sky/rainkit.js` | Falling rain in one draw call: line segments (each drop's motion blur) in a box that follows the camera and wraps; wind slants it, distance fades it, `setRain(0..1)` sets how many drops are drawn (up to 24k). `lightning(scene)`: jagged bolts with branches 1.5–6 km away, a few return strokes, lighting the clouds (SkyKit `uSkyBolt`), the scene (one directional light) and the sea; optional thunder (Web Audio) after distance ÷ 343 m/s. |
| `js/models/ships-sea/lights.js` | Ship lights from the model's `anchors`: `navLights()` (masthead white, side lights green starboard / red port, stern white, each shining only over its arc), `gunFlashes()` (flash sprites at the main guns' muzzles, one point light kept from the start, the sea lit through WaterKit `uFlash`), `signalLamp()` (the searchlight's venetian shutters keying Morse, glow and beam ahead while open) and `morse(text)`. |
| `js/render/sea/look.js` | `LookPipeline`: half-float target with mipmaps (MSAA optional, render scale) and one post shader: exposure (manual or automatic from the smallest mip), tone mapping ACES / AgX / Hable, contrast, saturation, temperature, tint, bloom from mips, vignette, grain, chromatic aberration, barrel distortion, droplets and dirt on the lens, sun glare/ghost, sharpen. `set(params, 'A'|'B')` and `split` draw two parameter sets side by side. `AutoResolution` lowers/raises the render scale to keep ~60 fps (with hysteresis). `LOOK_PRESETS`: Game clean, Cinematic, Bodycam. |

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

## Waterspout and tornado (1.6.0)

**Waterspout and tornado** (Light and weather; `js/envs/sky/tornado.js`): a whirl from the cloud to the ground — over
water a waterspout (a pale, thin, bending funnel, white spray at its foot), over land a tornado (a dark, wider funnel
with dust and debris); **Kind** can force either. **Strength** sets everything at once: the top wind speed 18 m/s
(a weak waterspout) … 100 m/s (a violent tornado), the core radius 10 … 120 m, the funnel's width and height and the
amount of spray or dust. Above the funnel a turning wall cloud. It wanders over the map (6–15 m/s) and fades in and out
over a few seconds.

Its wind is real air for the physics (a Rankine vortex: solid-body spin inside the core, falling off as 1/r outside;
inflow at the ground, an updraft in the core weakening with height): `stage.windAt(x, y, z)`. In the scene editor's
▶ Play it pushes and heels ships, pushes small craft and vehicles (tyres hold up to their grip), drags aircraft and
picks up light items (air drag on each). Saved with the weather (`tornado` in the "weather" asset).

With the variable weather a storm can bring one: **Tornado in a storm** (the chance per storm) and **Its strength**
(from … to) in the Variable weather window; it fades when the storm ends.

## Cyclone (1.7.0)

A tropical cyclone is hundreds of kilometres across — too big for a model — so it is a **weather field**: the scene's
weather comes from where the scene is relative to the cyclone's centre (`js/envs/sky/cyclone.js`), and the sky shows
what cannot be drawn with the weather numbers alone (`js/envs/sky/cyclone-sky.js`). Window **Cyclone**:

- **Zones** (by the distance in eye radii, x = r / Rm): outer clouds (high cloud, rising wind, up to ~20 Rm), spiral
  **rain bands** (three logarithmic spirals, pitch 15°, from ~1.6 to ~12 Rm; a squall with a downpour, then a break
  between bands), the **eyewall** (the strongest wind, a storm, visibility near zero) and the **eye** (a light,
  variable wind of ~4–7 m/s, clear, the eyewall all around on the horizon like the stands of a stadium).
- **Wind**: the Holland (1980) profile V(r) = Vmax·√((Rm/r)^1.5·e^(1−(Rm/r)^1.5)), weaker still in the eye; Vmax from
  **Strength** (tropical storm 28 m/s, categories 1–5: 38 … 75 m/s); it turns counter-clockwise in the north
  (clockwise in the south, **Hemisphere**) with ~20° inflow, with gusts stronger in bands and the eyewall. The wind
  is real air for the physics, as with the tornado (`stage.windAt`), and the clouds drift with it.
- **The sea** (with *Sea from the wind*): the waves come from the wind that raised them (`seaWind`), so in the eye and
  just outside the eyewall the sea stays high; in the eye it is confused — waves from every side (`seaSpread` up to 90°).
- **Where the scene is**: **Distance** from the centre and **Direction** (where the scene lies from the centre),
  **Eye radius** (the radius of maximum wind, 10–60 km). **Moving**: the centre goes in **Track** at **Track speed**,
  so the scene passes through the zones (by default the cyclone comes over the scene: bands → eyewall → eye →
  eyewall with the wind reversed → bands). **Restart** goes back to the start.
- **Spouts in bands**: a waterspout or tornado can come with a strong band (from a 10-minute slot, repeatable).
- The map from above: the bands, the eyewall, the eye, the scene (a dot) and its track relative to the centre from 6 h
  ago to 12 h ahead; the line above it: the zone, the distance, the wind (from where), rain, a spout, when the eye
  comes. Preview ×1 / ×60 / ×600.
- The sky: a cloud layer at 1.8 km with the bands in real kilometres from the centre (they pass overhead as the
  cyclone moves and turns, once in ~4 h) and, from the eye, the eyewall — bright, sunlit, billowing cloud (puffs shaded
  from above, towers of different heights along the top) flaring outwards up to ~12 km like the stands of a stadium,
  drawn closer at the same angular size.
- For AI: `LookApi.cyclone` — `on(b)`, `set({ category, eye, dist, bearing, moving, trackDir, trackSpeed, hemisphere,
  spouts, t })`, `speed(k)`, `at` (zone, wind), `params`, `opts`, `categories`.

The cyclone and the variable weather exclude each other: switching one on switches the other off; choosing a weather
from the list or moving a weather slider switches the cyclone off. Saved with the weather (`cyclone` in the "weather"
asset); in the scene editor's ▶ Play the cyclone goes on from where it was saved (`js/scene/weather.js`).

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

## Variable weather (1.5.0)

**Variable weather** under the weather list (Light and weather) makes the weather change by itself
(`js/envs/sky/weather-cycle.js`, written anew after aTrain's "changing conditions"):

- **Transition table** — each weather has its own chances of turning into the others (from a storm most often into
  rain; fog only from calm weathers); 0 — never.
- **Fronts as in nature** — when it gets worse, clouds and wind come first and rain and lightning later; when it
  clears, the rain stops first and the clouds go last; fog thickens once the wind has dropped. Visibility changes on
  a log scale.
- **Seed** — the same seed gives the same weathers in the same order. How long a weather lasts and how long a change
  takes (ranges, s); a storm lasts half as long, fog a little shorter.
- The **Variable weather** window: the weather now and the change in progress, a bar and a list of the coming
  weathers, preview at ×1 / ×10 / ×60, **Change now** to a chosen weather, the settings and the table.
- Moving a weather slider or picking a weather from the list switches it off. Saved with the weather for the scene
  editor (`cycle` in the "weather" asset); the scene editor plays it in ▶ Play (editor 0.46.0, `js/scene/weather.js`).
- The same switch is in the Light and weather window of the city, land, plants, items and structures labs
  (`js/labs/shared/weather-cycle-ui.js`).
- For AI: `LookApi.weatherCycle` — `on(b)`, `set(settings)`, `force(id, s)`, `speed(k)`, `now`, `params`,
  `upcoming(n)`, `weathers`.

## Weather for the scene editor (1.4.0)

The Light and weather window's **Weather for the scene editor** saves the weather and the time of day (clouds, wind,
rain, visibility, haze, lightning, time, sun height and bearing, moon) under a name as a "weather" asset
(`js/scene/assets.js`); the scene editor offers it in Environment → Light, next to its four ready lights. The scene
editor shows the sky, the light and the fog; rain and lightning stay in this lab for now.

## Shared base stage (1.4.1)

The lab stands on the base stage of the scene editor (`js/labs/shared/stage.js`): sky, sun, ambient light, fog, the
sea and the sky environment come from it (`stage.setLight(weather)`, `stage.setSea`, `stage.setShip`), the lab adds
only its own — rain and lightning, the ship's lights and ageing, the sea from the wind, the camera shots. The clouds
drift with the wind (`stage.wind`). The picture is the same as before.
