# Rocks Lab — boulders, blocks, slabs, spires and pebbles

`labs/rocks.html` (`js/labs/rocks/rocks.js`). Rocks built from code at real scale (RockKit,
`js/models/rocks/rockkit.js`) on a patch of ground under the SkyKit sky: one rock, or a boulder field with scree.
Settings are kept in the browser (`gameLab.rocks.v1`).

## Kinds (`ROCK_KINDS`)

| Kind | Density | Shape | Surface (MatKit preset) |
|---|---|---|---|
| Granite | 2 700 kg/m³ | rounded boulders weathered along their joints, few fracture faces | `granite`: speckled grey, grains |
| Limestone | 2 600 kg/m³ | blocky, sharp edges, small pits dissolved by rain, faint beds | `limestone`: pale, cracked |
| Sandstone | 2 300 kg/m³ | rounded by wind, the beds show as ridges | `sandstone`: warm, soft |
| Basalt | 3 000 kg/m³ | angular, many flat fracture faces | `basalt`: dark, fine grains |

## Shapes (`ROCK_SHAPES`)

Boulder, block, slab (flat), spire (tall) and pebble (smooth, small). The shape stretches the rock along its axes;
**Size** is its largest dimension (10 cm … 8 m).

## How a rock is made (`rockGeometry`)

- An icosphere (`sub` from **Detail**: 1 620 triangles at 1, more for large rocks), its corners merged so the surface
  stays closed.
- Low-frequency lumps, then finer roughness (less on rounded kinds); beds as ridges (sandstone, a little limestone);
  pits (limestone).
- **Fracture planes** cut the rock flat where it reaches past them — few on granite, many on basalt; one near the top
  gives flat-topped blocks.
- Stretched to the shape and size, the bottom flattened and buried (15 % of the height; slabs 25 %, spires 10 %):
  a rock lies in the ground, it does not balance on it.
- **Moss** on the faces that look up (patchy, not on the buried foot) and **lichen** in pale and orange spots — vertex
  colours over the surface.
- The surface: MatKit maps (albedo, normal, roughness and AO) projected **triplanar** in object space — no UV seams on
  any shape, the pattern stays on the rock when it is turned or instanced. One material per kind, shared.

The lab shows the size, volume (from the closed mesh), mass (× the kind's density), the buried depth and the
triangles.

## Boulder field

*Field*: up to ~140 boulders on an 80 m disc, their sizes from a power law (many small, few large — **Largest** sets
the top), and scree in drifts around and below them (**Scree**: up to ~1 800 stones of 5–35 cm). Eight variants of each
shape, drawn instanced (one draw call per variant), and no two stones alike: each is stretched along its own axes
(±25 %), leans a little and has its own shade (instance colour, ±12 %, a little warmer or cooler). The kind, moss and
lichen come from the Rock window.

## Saved under a name — a rock for the scene

Window *Rock* → *Save*: kind, shape, seed, size, detail, moss and lichen as the named asset `rock`
(`js/scene/assets.js`). In the scene editor the family **Rocks** has a model per kind (`rocks/granite`, …); its
Object window picks a saved rock (field `asset`), or through the API (`add` / `set` with `asset`). The model has a far
version (half the detail).

For AI: `RocksApi.make(spec)`, `field({ density, max, scree, seed })`, `info()`, `get()`, `kinds`, `shapes`,
`save(name)`, `load(name)`, `saved()`.

## Rocks on a scene's terrain (1.1.0)

*Field* → *Rocks for the scene editor*: boulders, largest, scree, moss, lichen and the seed as the named asset `rocks`.
In the scene editor, Environment → Rocks (on a land terrain from the land lab) scatters them with the rules in
`js/models/rocks/rockfield.js` (`scatterRocks`):

- **Kind by biome**: granite in the north (some limestone), limestone and granite on the plains, sandstone in the
  desert with basalt on its steep ground.
- **Place by the ground**: more boulders on slopes and high ground, few on flat lowland meadows (half on the plains),
  very steep faces shed them; scree under steep ground and pebbles on beaches; nothing in the water.
- Each stone lies along the slope (half of it), with its own proportions and shade; six variants per kind and shape,
  instanced. Tiles of 128 m within 600 m of the camera; scree only within ~220 m.

For AI: `RocksApi.saveField(name)`, `loadField(name)`, `fields()`; in the scene `{ "cmd": "env", "rocks": name }`.
