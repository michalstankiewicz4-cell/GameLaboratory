# Rendering notes: ShipKit and BodyKit models, the sky

From the game Space (its `docs/rendering.md`, split out of
[`architecture.md`](https://github.com/michalstankiewicz4-cell/Space/blob/main/docs/architecture.md)):
how the ShipKit and BodyKit models are lit and drawn, and the sky backdrop. The parts
about the game's own screens (Setup → Graphics, the ship cam, the game against the labs)
stayed in Space. The kits' APIs are in [`ship.md`](ship.md) and [`bodies.md`](bodies.md);
how the labs draw today (Three.js r186, the graphics of the labs from Battle): CLAUDE.md,
"Grafika", and [`look.md`](look.md).

## Rendering and ShipKit models

- **The game renders like the ship/body labs (v2.8.0)**: sRGB output,
  ACES filmic tone mapping (exposure 1.1) and
  `scene.environment = ShipKit.makeEnvironment(renderer)` — a PMREM of
  the labs' own generated space sky (`ShipKit.makeSpaceSky()`), so metal
  reflects and ShipKit models look as they do in `ship.html`. Planets and
  the station pick up the reflections too. The skybox and the scene
  lights weren't retuned for it yet (the user's plan: later).
- **Color management (`scene/colorManagement.js`)**: with sRGB output a
  material color is linear light, while every game color was picked for
  the old plain output — left alone, everything washed out (the teal
  ships came out nearly white). `manageSceneColors(scene)` runs every
  frame and converts each *new* material's `color`/`emissive`, each
  light's color and the fog color sRGB -> linear once (a WeakSet
  remembers what's done), so later spawns are covered too. It skips
  anything under `userData.shipkit` (ShipKit models and their effects are
  authored for this pipeline, like in the labs). Vertex colors are
  converted where written (particles
  copy already-converted material colors). Every game-made canvas texture
  goes through `core/utils.js#sRGBTexture()` (all are color textures).
  Custom `ShaderMaterial`s write their color untouched and need nothing.
  **A new material color set at runtime** (not at creation) would bypass
  the one-time conversion — convert it yourself.
- **Every body is BodyKit's (v2.11.0)**: the Sun (SOL: granulation,
  sunspots, corona billboard; keeps the game's PointLight for standard
  materials), the meteoroid (FERRUM, a GPU-displaced rock), every comet
  (COMET via `BodyKit.GAME_KINDS`: rock nucleus, coma, ion + dust tails
  pointing away from the Sun by themselves; `look.opts.velocity` bends
  the dust tail, `look.opts.activity = cometActivity(distance)` grows them
  near the Sun) and the black hole (ABYSS: horizon, Doppler-beamed disk,
  photon ring; `materializeBlackHole` adds an invisible 2.5 × radius pick
  sphere, `bh.pickMesh`, used by `scene/picking.js`). `bodyLookRef(slot,
  kind)` picks the lab body. Removed with it: the crack overlay, sun halo
  sprite and 3D rays, crossed-plane comet tail, sprite/ring black hole and
  their canvas textures (`world/textures.js` keeps only
  `makeRockGeometry` for debris and `generateDustTexture`),
  `bodyMeshParts.js` kept only the selection bracket (and was removed in
  v2.15, see "Selection frames" below).
- **Ship glow lights reach the bodies (v2.11.1)**: BodyKit shaders ignore
  THREE lights, so the setting looked like it did nothing (the light also
  sat inside the hull). Now it's behind the engines (`SHIP_LIGHT_*` in
  config.js, intensity × eased engine power), and `world/bodyVisual.js`
  passes the nearest visible ship lights to each body (`opts.lights`,
  max 4, BodyKit's `pointLightAt()`). Toggling it still recompiles the
  game's standard-material shaders once (a light count change). **Since
  v2.17.1 the two parts differ**: the scene PointLight is short and weak
  (`SHIP_LIGHT_INTENSITY` 0.8, `SHIP_LIGHT_RANGE` 2.2 — after the units
  shrank, the old 1.5 / 7 bathed the whole smaller station in teal), the
  body light keeps `SHIP_BODY_LIGHT_INTENSITY` 1.5 / `SHIP_BODY_LIGHT_RANGE`
  7 (scaled by the same eased engine power).

## Sky backdrop (nebulae, stars, pulsars)

- **Since v2.12.0 the sky is BodyKit's** (`js/models/bodies/bodykit.js`, the SKY
  group, kind `"sky"`; in the game Space a skybox module builds and updates it; the
  body lab's SKY tab edits it and the lab shows it behind every body). It
  replaces the old canvas nebula sphere, the `THREE.Points` starfield in
  `scene/setup.js` and the sprite pulsars (`scene/pulsars.js`, deleted).
- **Baked, not drawn live**: black space, a Milky Way band (clumps, dust
  lanes) and the nebulae (regions of domain-warped noise: glowing gas,
  wisps, hot cores, two colors, dark dust dimming only the gas) are a
  heavy full-screen shader, so BodyKit renders it once into a cube map
  (`CubeCamera`, 1024² per face at detail 1) and draws a sphere that just
  samples it (`textureCube` by direction — verified pixel-identical to the
  live shader, no face flips). It re-bakes only after a change (a slider,
  `setOctaves`), ~40–100 ms; the first bake + compile ~1.2 s is lost in
  the start-of-game shader compile (measured: the game's first-frame stall
  is the same ~1.15 s with or without the sky).
- **Stars and pulsars are points** (one `THREE.Points`, 14 000 max stars,
  `stars` picks how many via the draw range): colors from their
  temperature (`blackbody`), mostly faint, 40% crowding toward the Milky
  Way's plane, ~12% twinkling (`twinkle`); the first 6 vertices are
  pulsars (`pulsars` shows 0–6) with a period each, a bright core and
  cross-shaped beams drawn in the point sprite. Positions come from a
  seeded RNG (`seededRandom`), so a sky is the same for everyone.
- **Infinitely far**: `updateSkybox(dt)` (main loop) passes the camera
  position (`opts.center`) — the sky group follows the camera — and the
  renderer (`opts.renderer`, for the bake and the pixel ratio). Radius
  9000, inside the camera's far plane (12000). The display sphere draws
  first (`renderOrder -1000`, no depth write), the points are additive.
  BodyKit shaders don't use fog, so the old `fog:false` trap doesn't
  apply. The reflections (`scene.environment`) still come from ShipKit's
  lab sky (brighter than this black sky, which keeps the metal ships
  readable).

