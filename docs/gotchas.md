# Known gotchas — full stories

Lessons carried over from Space (the parts about the game itself — Supabase, its cache-busting — stayed in
that repository). The ones below are long enough to warrant the full investigation narrative.

## GitHub Pages deploys that look "errored" after a push burst

**A burst of several pushes in quick succession can leave GitHub Pages
stuck "errored" for several minutes — not a Jekyll/content problem,
despite first appearances.** Hit this directly: `gh api
repos/.../pages/builds/latest` reported `status: "errored"` /
`"Page build failed."` (no further detail) for two commits in a row
right after adding `IDEAS.md`, which looked exactly like that new file
had broken something. The real story, found via `gh run list` (the
underlying `pages-build-deployment` Action, which has actual job logs,
unlike the legacy Pages Builds API): those two runs were **cancelled**,
not failed — each push had triggered a new deployment run before the
previous one finished, and GitHub's concurrency group for this workflow
cancels an in-flight run when a newer one starts. The legacy API just
reports a cancelled run as a generic "errored," indistinguishable from
an actual build failure without checking `gh run list` too. Once pushes
stopped for a few minutes, the next run completed on its own (took
3m44s that time, vs. the usual well under a minute — some queue
backlog from the cancelled runs, presumably) and everything deployed
fine. **If a deploy ever looks stuck/errored, check `gh run list
--repo michalstankiewicz4-cell/Space` for the real job status before
assuming content broke the build** — and if several runs show
`cancelled`, the fix is just to stop pushing for a bit, not to go
hunting for what's "wrong" with the latest file.

Repo root also has an empty `.nojekyll` file (added while chasing the
above, before the real cause was found) — turned out not to be what
fixed it, but harmless to keep either way, since this project was never
meant to go through Jekyll processing in the first place (no
`_config.yml`, explicit "no build step" design).

## SVG gradients on straight lines

Found 2026-09-28 in the game's Research window (its tech tree):
the copper traces were stroked with a `linearGradient` in the default
`gradientUnits="objectBoundingBox"`. A perfectly vertical or horizontal
path has a bounding box of zero width or height, and the browser then
paints **nothing** for that gradient — the traces to the nodes straight
above/beside their parent showed only their thin edge and core. Use a
flat colour, or `gradientUnits="userSpaceOnUse"` with coordinates.

## Post-processing and shading lessons (v2.23–v2.25)

Found while building the image effects (`js/render/postkit/postkit.js`, and the game's
eclipse lighting):

- **Bloom works on the tone-mapped LDR picture.** The Sun and a sunlit
  ice planet both reach ~0.95–1.0 there, so a low threshold turns bright
  planets into white blobs. Kept: threshold 0.93 with a narrow 0.06 ramp
  (`smoothWidth`); proper selective bloom would need HDR targets or a
  bloom layer.
- **Screen-space lensing must not warp the black hole itself.** Warping
  BodyKit's disk and photon ring (already drawn lensed) made a bullseye;
  the hole is hidden for the scene pass and drawn over the warp.
- **Darkening only direct light does nothing to ShipKit models**: they
  get most of their light from the environment map
  (`envMapIntensity` 2). The eclipse also scales indirect light (to 30 %).
- **`onBeforeCompile` needs a matching `customProgramCacheKey`.** r128's
  default key is the hook's source text — a shared wrapper around
  different original hooks would make materials share a wrong program;
  the wrapper keeps the original key plus a suffix.
- **Several render passes per frame zero `renderer.info`** each time
  (autoReset): the labs set `autoReset = false` and reset it once per
  frame, or the triangle/draw-call counters show the last quad only.
- **Counting frames right after start or a change lies**: shader
  compiles stall the first seconds. Every automatic step-down (auto
  resolution, AUTO preset, the labs' AUTO) waits ~6 s first.
- **Changing the number of lights recompiles every lit material** — why
  presets never touch the ship glow lights (a mid-game hitch).

## Lab-building lessons (2026-10: surface, vehicles, sea, ship shaping)

**Three.js r128 API traps**
- **`THREE.Color` has no `addScaledVector`.** That's a Vector3 method; on
  a colour it throws (it broke the ship lab once). Blend colours with
  `lerp`, `add` or `multiplyScalar`.
- **`LatheGeometry` spreads its UV `v` over the whole profile**, one equal
  step per profile point, caps included. A lathe standing in for a
  cylinder squeezes the texture painted along the side: the engine
  housings' bands merged. Set v by height yourself (ShipKit
  `roundedCylinderGeometry`).
- **Moving a geometry's vertices doesn't move its texture.** The rounded
  box pulls vertices toward the edges, so its UVs are recomputed from the
  new positions.

**Shapes, normals and depth**
- **Vertex normals are ambiguous where a box's faces meet**: three faces
  have a vertex at the same corner. Normals for joints come from the
  shape's own geometry (ShipKit `solidNormalOf`). Vertex normals turned
  fillets into flaps.
- **`ExtrudeGeometry`'s bevel makes the mesh bigger than its shape**: the
  outline grows by `bevelSize` all along the depth, plus `bevelThickness`
  beyond each cap. Anything measured from the shape alone sits inside the
  visible part.
- **A long edge can cross a surface with both ends on the same side.**
  Testing only an edge's ends misses that; test it in pieces.
- **An open lathe is a shell, not a solid.** Treating an engine bell as
  solid gave huge skirts around the nozzles. ShipKit seals a lathe only
  if it closes on its axis.
- **Depth precision far out.** With the near plane at 1 m, depth steps at
  45 km are about 120 m, and a planet's cloud shell z-fights its surface.
  The surface lab keeps sky bodies at 20 km, between an air layer at
  15 km and the star dome at 30 km.
- **Transparent objects draw after all the opaque ones**, whatever their
  `renderOrder`. A transparent "air over the sky" layer with
  `depthTest: false` covered the ground. Keep it depth-tested, and put it
  nearer than what it should cover.

**Grids, tiles and scoped tricks**
- **Equal-angle cube-sphere tiles are narrower toward a face's edges**
  than the `tileAngle` at its middle. Stepping a whole tile to find the
  neighbours skipped one, and the ground right next to the player
  "wasn't loaded". SurfaceKit steps a third of a tile.
- **Swapping `THREE.BoxGeometry` / `THREE.CylinderGeometry` for a build**
  (ShipKit `withRounding`) works because the build is synchronous. Always
  restore in `finally`. Classes that extend them (`ConeGeometry`) bound
  the originals at definition and aren't affected.
