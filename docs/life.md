# Life lab (labs/life.html) and LifeKit

> **Humans moved to their own lab** — `labs/human.html`, models in `js/models/human/`; see `docs/human.md`. This lab keeps the other life forms (animals) and LifeKit itself; the creature editor is `labs/creator.html`.


Life forms, built from blocks the way ShipKit builds ships. Started
2026-10-05 (labs 1.9.0), the user's plan: creatures as background to
discover (the Wiki's "Life forms"), reacting to the player later; from a
virus to a dinosaur, and in space a huge being or a nanobot swarm. Not in
the game yet. The plan and its reasons: IDEAS.md, "Life forms".

## Files

| File | What it is |
|---|---|
| `js/lifekit/lifekit.js` | The core (`window.LifeKit`): the registry (`CREATURES`, `register`, `MOVES`, `registerMove`), `build(id, params, opts)`, and `util` — `skeleton`, `sweep`, `merge`, `materials`, `skinned`, `rigid`, `rng`. |
| `js/lifekit/move/quad.js` | Four legs on land: walk and trot, feet planted by IK; graze, alert, look. |
| `js/lifekit/creatures/strider.js` | The plains strider, an invented grazer — the first land animal. |
| `js/lifekit/design.js` + `js/lifekit/move/legs.js` | The creature editor's builder (a creature from a design, JSON) and its walker (any number of legs). |
| `labs/creator.html` + `js/labs/creator.js` | The creature editor. |
| `labs/life.html` + `js/labs/life.js` | The lab: the creatures, MOVEMENT (gait, speed, in place / around), VIEW (skeleton, wireframe, scale bar), BODY (the creature's own parameters, generated from `params`), MODEL and PERFORMANCE. |

Load order on a page: THREE → `lifekit.js` → the `move/` files → `parts/` →
the creature files. The lab also loads ShipKit's core (`makeEnvironment`,
`modelStats`).

## How a body is built

- **The skeleton** (`util.skeleton`): bones with rest positions in the
  creature's space and **no rest rotation** — every bone's axes are the
  creature's (X left, Y up, Z forward), so `rotation.x` swings any limb
  forward (−) or back (+) the same way. Rest: standing, arms a little out
  (an A-pose).
- **Swept parts** (`util.sweep`): a tube along a smooth line (a
  centripetal Catmull-Rom curve) through *sections*; each section an
  ellipse — `rx` across, `f` to the front, `b` to the back, `n` its
  squareness (a superellipse) — with bone weights. Radii ease between
  sections, weights blend linearly, the four strongest bones per ring go
  into `skinIndex` / `skinWeight`. Round ends (`capStart`, `capEnd`).
  The torso, the neck, the arms and the legs are swept and **skinned**, so
  they bend at the joints instead of breaking apart.
- **Rigid parts** (`util.rigid`): meshes hung on a bone — the head, the
  eyes and lids, the ears, the hands, the feet. Merged per material.
- **Materials** (`util.materials()`, one cache per creature, disposed with
  it): skin (a warm mottled map, a pore bump), cloth (a weave), rubber,
  metal, hair (strands), eyes (the iris and pupil around the front pole);
  colours converted to linear like everywhere else. r128 needs
  `skinning: true` on a skinned mesh's material — the cache keeps skinned
  and rigid copies apart.

Gotcha (cost an hour): THREE's Catmull-Rom curve through **two** points
gives a tangent pointing *backwards* at the start, so a two-section ring
(a belt) came out twisted into an X. `sweep` takes the tangent as a
central difference and keeps it pointing the same way ring to ring.

## Four legs: the plains strider (labs 1.16.0)

The user's brief (2026-10-06): a land animal, any technique, real or
stylised but **not fairy-tale, cartoonish or comic**; its own sliders, so
its own group. It's an invented grazer, built to be believable.

- **Groups**: a creature's `group` is a heading in the lab (HUMANOIDS,
  LAND ANIMALS); the lab builds each creature's gait buttons and layer
  sliders from its move file (`GAITS`, `LAYERS`) — no T-pose on four
  legs, RUN is a trot.
- **The body** (`creatures/strider.js`): 25 bones (root, spine, chest,
  two neck bones, head, three tail bones, four legs of four bones: hip,
  knee, hock / carpus, fetlock). One sweep runs from the rump through the
  chest and the neck to the muzzle; one per leg (its top tucked into the
  body, shaped like a shoulder blade or a haunch, closed); one for the
  tail. Rigid: hooves, horns (a swept, curling sweep), ridge plates or
  spines, ears (cupped, an inner face), eyes with a lid ring, nostrils.
- **The hide** (`hideCanvases`): painted per individual on a canvas whose
  u runs around the body (the belly at 0 and 1, the back at ½) and v
  along it — countershading, the pattern (stripes fading toward the
  belly, rosette-like spots, rings that show on the legs), mottling, a
  dark spine line; a bump of short hair along the body and soft folds.
  Horns: a dark tip and growth rings in the bump. `materials().own(key,
  skinned, make)` lets a creature make its own materials (disposed with
  it).
- **Four legs** (`move/quad.js`): a phase per foot (walk: LH 0, LF ¼,
  RH ½, RF ¾; trot: diagonal pairs), a duty factor (0.68 / 0.45); the
  offsets, the duty, the lift and the bob glide between the gaits; the
  speed eases at 4 m/s². In stance a foot moves back exactly at the body's
  speed (the stride is speed × duty × period); in the air it arcs forward.
  Each leg: the hoof's and the cannon's angles come from the phase (a fold
  in the swing), then the hip and knee are solved (2-bone IK, the law of
  cosines) from the hip — its position read from the skeleton each frame —
  to the hock, the knee bending forward on the hind legs, back on the
  front ones; the bones' local angles subtract their parents' pitch.
  Layers: graze (neck and head down), alert (up, ears forward), look.

## The creature editor (labs/creator.html, labs 1.17.0)

The user's idea (2026-10-06): an editor where creatures are built, not
picked — a spine dragged into shape, parts attached anywhere, and it
moves. Stage 1: the spine, the legs, the walk. (In the docs and the code
it's "the creature editor" — no game names.)

- **A design is data** (`LifeKit.design.clean` keeps it in range): the
  spine's points (height, along; a half-width and a height-to-width per
  point; tail tip first, the head's tip last), pairs of legs (where along
  the spine 0…1, length, thickness, spread — over 1 the hip moves out
  sideways, sprawling —, the knee's direction, the foot), the eyes, the
  skin (colour, pattern, seed). COPY / LOAD as JSON; autosaved in
  `creatorLab.design`.
- **The build** (`design.build`): a bone per spine point, in two chains
  out from the one nearest the middle (under a root); one sweep for the
  body through the points; per leg hip → knee → foot (0.48 / 0.44 of its
  length, a foot of 0.08), a sweep from inside the body and a rigid foot
  (a hoof; a padded paw; a paw with three claws). **The body finds its own
  height**: the design is lowered so its legs stand at ~90% of their
  length on average (no legs: it lies on its belly).
- **Any number of legs** (`move/legs.js`): pairs are ordered front to
  back; the steps run as a wave from the back pair to the front (left
  side), the right side half a cycle later; two pairs trot when running.
  Each foot is planted while down, arcs forward in the air; 2-bone IK
  from the hip (read from the skeleton) to the foot's target, the knee as
  designed, the foot level. The spine sways in a travelling wave (gently
  with legs, strongly without — a glider moves by it). Layers: look,
  low (crouch).
- **The editor**: handles in the side plane (x = 0): gold spine points
  (drag; the wheel: thickness), teal leg points (drag along the spine —
  the nearest point of the body's curve). Rebuilt at most every 60 ms
  while dragging. EDIT shows the rest pose with handles, PLAY the walk.
- **Next stages**: a library of parts (heads, jaws, horns, ears, tails,
  spikes, fins, wings), placed anywhere; arms that don't walk; painting
  the skin; the designs into the game as life forms.

## Limits (honest)

- **The face is better, not real.** Real lids and lips and moving
  expressions changed it most; up close it's still a sculpt (no skin
  shading beneath the surface, the hairline is a shell's edge, the jaw's
  edge at the cheeks is a little hard when it opens wide).
- The hands don't move their fingers; the feet have no toes bone.
- No inverse kinematics: on slopes the feet won't meet the ground.
- Not in the model doctor yet (its limbs overlap the torso by design).

## Next

- The user's look at the human; the face's next pass.
- More creatures per medium: `move/swim.js`, `fly.js`, `space.js`; the
  ENVIRONMENT switch (MarineKit's sea, SurfaceKit's ground and sky).
- Biomechanical forms (ShipKit's materials on a LifeKit skeleton).
