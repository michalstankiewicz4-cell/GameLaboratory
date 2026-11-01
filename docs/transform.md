# Transformer (`js/models/ships-sea/transform.js`, `labs/transform.html`)

Turns a ShipKit lab ship into a game-ready one: levels of detail that keep a fleet cheap, and many hitboxes for
procedural destruction, with the damage drawn by the materials (no extra draw calls).

## Levels of detail (a `THREE.LOD`)

| Level | From | What | ORP Błyskawica |
|---|---|---|---|
| LOD0 | 0 m | full detail, all static pieces merged per material; mounts and guns as their own groups | 33,551 triangles · 65 draw calls · 14 materials |
| LOD1 | 170 m | detail ½ (fewer segments), no rails/rigging/pieces under 0.5 m, 9 materials, AA and tubes merged into the hull (they do not visibly train at that range) | 12,238 · 31 · 9 |
| LOD2 | 650 m | primitives: low hull and deck, every larger piece as a box, 3 materials, only the main battery still trains (guns merged into their mounts) | 2,695 · 7 · 3 |

The lab model itself: 33,575 triangles, 99 draw calls. Fleet test (24 ships spread from 100 m to 2 km): **144 draw calls
and 57k triangles** with the transformer against **1,741 and 625k** with lab models (headless, both counted with shadows).

`T.aim(i, yaw, elev)` trains mount *i* and elevates its guns on every level at once. Distances are set on
`T.lod.levels[k].distance`; in the game (1 unit ≈ 10 m) they scale with the ship.

## Hitboxes (458 for Błyskawica)

| Kind | How | Count |
|---|---|---|
| hull | compartments: 4 m along the length × port/starboard × bottom (keel to −1.2 m) / belt (±1.2 m) / upper side (to the deck) | 166 |
| superstructure, funnel, mast, platform, fitting | the pieces clipped into a 3 × 2.5 × 3 m grid, one box per part and cell | 139 · 32 · 34 · 18 · 48 |
| mount | one per mount, swept around its training axis | 12 |
| gun | one per gun, in the gun's own space (follows training and elevation) | 9 |

Each hitbox: `id`, `kind`, `box` (Box3), `node` (`ship` or `gun:i:j`), `volume`, `hp` (volume × a per-kind factor),
`removable` (superstructure, funnel, mast, platform, fitting), `neighbours` (boxes within 0.3 m — for spreading fire,
flooding or collapse), hull boxes also `layer` and `side`. `T.raycast(worldRay)` returns the nearest box hit and the
point, for the current pose of the ship and its guns.

## Damage in the shader

Every vertex of every level carries the id of its hitbox (`aHit`). `T.damage.set(id, 0…1)` / `add` / `reset` write a
small float texture (one texel per box: damage, half height, centre, kind) that the patched materials read:
scorching from the first hit, dented plating on the hull, buckling and then collapse of removable boxes, embers in
wrecked superstructure. Rigging and rails sit on an extra inert texel, so they are never torn between boxes. This is
the hook for procedural destruction in the game: what breaks, how damage spreads and what falls off is game logic on
top of the hitboxes and the texture.

## Lab

`labs/transform.html`: level table (lab model vs LOD0–2), show a level or let the distance decide, LOD distances,
fleet test (1–24 ships, transformed vs lab models, draw calls, triangles, frame time), hitboxes overlay by kind,
click to hit (the box under the cursor takes the hit, its neighbours 30 %), salvo, repair, mount training and
elevation. The model doctor examines LOD0–2 too (`lod/blyskawica/0…2`, budgets 40k/70, 15k/35, 3k/10) with the geometry checks (nan, inverted, facing, see-through, flicker, floating, hidden, specks, budget); gun arcs and slivers are checked on the unmerged pieces, since merged meshes no longer know a rail from a bulkhead. The first run found the forecastle-break step open on LOD2 (the bulkhead box had been left out); it is kept now.

## Next

- Use it in the game for Błyskawica (scale, mounts mapped to the game's turrets and tubes, hitboxes to the damage model).
- Instancing for repeated fittings on LOD0 (portholes, bollards, rail stanchions) and merging the mounts' materials
  would cut LOD0 to about 30 draw calls.
- Debris: detach destroyed removable boxes as physics pieces; smoke and fire emitters on damaged boxes.
