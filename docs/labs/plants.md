# Plants Lab — trees, palms, shrubs, ferns, cacti and grass

`labs/plants.html` (`js/labs/plants/plants.js`), kits `js/models/plants/plantkit.js` (single plants) and `js/models/plants/forestkit.js` (many
plants: impostors, forests, grass). Everything is grown from code — no image files: bark and foliage are drawn on
canvases, the shapes follow each species' habit at real scale (metres). Settings are kept in the browser
(`gameLab.plants.v1`). Rocks as objects get their own lab; the terrain's ground colours (grass, heather, sand)
stay in LandKit.

## Species (`SPECIES`)

| Species | Height | Biomes | Habit modelled |
|---|---|---|---|
| Norway spruce *Picea abies* | 18–32 m | northern | conical crown; whorls of 4–5 branches every ~0.55 m, drooping with upturned tips, sprays hanging from them; branch length shrinks to the top |
| Scots pine *Pinus sylvestris* | 15–28 m | northern, plains | bare trunk with a few kinks and dead stubs, grey-brown below and **orange above ~45 %**; 6–9 ascending limbs in the top 40 % ending in needle tufts — the irregular, flat-topped crown |
| Silver birch *Betula pendula* | 14–24 m | northern, plains | slender, slightly curved white trunk with black lenticels, dark at the base; ascending branches with **hanging twigs** (curtains of small leaves); turns yellow in autumn |
| Pedunculate oak *Quercus robur* | 16–28 m | plains, northern | short massive trunk splitting at a quarter of its height into 3–5 heavy limbs that branch twice more; broad open crown of lobed-leaf clusters; deeply furrowed bark; russet in autumn |
| Date palm *Phoenix dactylifera* | 12–22 m (+ crown) | desert | single trunk patterned by old leaf bases, slight lean; 24–32 pinnate fronds 4–5.5 m long arching from upright to drooping, folded in a shallow V, and a skirt of ~10 dry fronds below |
| Umbrella thorn acacia *Vachellia tortilis* | 5–11 m | desert | short trunk splitting into 3–5 ascending limbs; a wide, flat crown (as wide as the tree is tall or wider) of tiny leaflets, about 1.5 m thick |
| Common juniper *Juniperus communis* | 1.5–4 m | northern, plains | shrub of 4–8 stems, columnar to spreading, prickly blue-green foliage; on heaths and dry slopes |
| Desert saltbush *Atriplex* sp. | 0.6–1.4 m | desert | low rounded grey-green mound of small fleshy leaves |

Shrubs, dwarf shrubs, a fern, a hummock grass and cacti (1.8.0):

| Species | Height | Biomes | Habit modelled |
|---|---|---|---|
| Common hazel *Corylus avellana* | 3–6 m | northern, plains | 7–14 straight stems from one base fanning out and arching; smooth grey-brown bark with pale lenticels; round, doubly toothed leaves; yellow in autumn. Forest edges, understorey |
| Common hawthorn *Crataegus monogyna* | 3–7 m | plains, northern | short trunk and a dense rounded crown of crooked twigs; small deeply lobed leaves, dark red haws; russet in autumn. Hedges, copse edges |
| Blackthorn *Prunus spinosa* | 1.5–4 m | plains, northern | a low thicket of dark spiny stems from the ground; small oval leaves, blue-black sloes with a pale bloom |
| Bilberry *Vaccinium myrtillus* | 0.2–0.5 m | northern | a low mound of bright oval leaves with dark berries; carpets conifer forests; red in autumn |
| Common heather *Calluna vulgaris* | 0.25–0.6 m | northern | a cushion of fine scale-leaved shoots with pale purple flower spikes; heaths, pine woods, above the tree line |
| Bracken *Pteridium aquilinum* | 0.6–1.6 m | northern, plains | 6–12 bipinnate fronds rising from the ground and bending out almost level; rust-brown in autumn |
| Mountain pine *Pinus mugo* | 1.5–4 m | northern (high) | creeping stems along the ground turning up at the ends with pine needle tufts; a thicket 2–5 m wide in the subalpine belt above the forest |
| Creosote bush *Larrea tridentata* | 1–3 m | desert | an open vase of 12–22 slender grey stems from the base; tiny dark olive leaflets and small yellow flowers |
| Desert thorn *Lycium* sp. | 0.8–2 m | desert | a tangle of zigzag grey spiny stems with sparse small fleshy leaves |
| Spinifex *Triodia* sp. | 0.4–1 m | desert | a hummock of spiky rolled blades, crossed fans densest towards a ring |
| Saguaro *Carnegiea gigantea* | 4–12 m | desert | a ribbed column (16 ribs in the geometry, areoles on the crests in the bark), up to 5 arms from ~5.5 m tall (the first arms come after 75–100 years) that grow out and turn up; white flowers at the tips |
| Prickly pear *Opuntia* sp. | 0.8–2.2 m | desert | flat oval pads, each from the rim of another, in a loose fan up to 4 levels; areoles with spines, red fruit on the rims |

**Where they grow** (`scatterArea`): in northern forests an understorey beside the trees (bilberry, bracken, heather
under pines) and hazel at the forest edges; above the tree line mountain pine, higher heather; open northern ground —
heather heaths, juniper, hazel near the forest. On the plains hedges of hawthorn, blackthorn and hazel at the copses'
edges, bracken under the trees. In the desert creosote, saltbush, spinifex, desert thorn and prickly pear on the flats,
saguaros on stony slopes.


Each plant is grown from a seed (the same seed gives the same plant); *Size* scales a mature height inside the species'
range. Triangles per plant at detail 1: roughly 0.2k (saltbush) … 10k (spruce).

## How a plant is made (`growPlant`)

- **Wood**: tapered tubes along polylines (parallel-transport frames, so they do not twist), bark textures tiled around
  and along them (spruce scales, pine and oak furrows, birch with lenticels and dark patches, palm leaf-base diamonds,
  juniper shreds), with a bump map.
- **Foliage**: cut-out cards drawn on canvases (needle sprays, needle tufts, small ovate birch leaves, lobed oak leaves,
  feathery acacia leaflets, juniper prickles, saltbush leaves, pinnate palm fronds live and dry), with an irregular
  rounded outline so no card edge shows; clusters of three crossed cards (tufts) read as a volume from any side; the
  shading normal points out of the crown (soft, round crowns instead of flat cards). Palm fronds are ribbons along an
  arching rachis.
- **Distance**: the cut-out keeps its coverage as the texture gets smaller (mip-level-aware alpha), so far crowns do not
  thin out into dots.
- **Wind** (`windUniforms`: strength, direction, time; `aWind` per vertex): the trunk and limbs bend downwind with height
  (up to ~3.5 % of the tree's height at full wind), gusts travel across the land, leaves flutter; the shadow pass moves
  with them. **Season**: birch turns yellow and oak russet, cluster by cluster.

## Many plants (`forestkit.js`)

- **Impostors** (`bakeImpostors`): three variants of each species rendered from 8 sides into two atlases (colour with
  the cut-out, and the object-space normal). A far plant is one camera-facing quad that blends the two nearest views
  and is lit by the sun and sky from the right side with the baked normals, in the same fog.
- **Forest**: full models (instanced per species, variant and part, with shadows and wind) within *Full models to*
  (30–400 m), impostors beyond; re-sorted four times a second. Switching impostors off draws full models only (capped)
  to compare the cost.
- **Grass**: tufts of 6 curved blades on a tile that follows the camera and wraps (it never runs out), standing on
  LandKit's height texture; thinned by biome (dense on the plains, sparse dry tufts in the desert), slope, height and
  water; gusts roll across it as travelling waves; it fades out at its radius (15–90 m); light passes through the blades.

## Where plants grow (the lab's scatter)

The rules live in `js/models/plants/vegetation.js` (`scatterArea`) — the same on a scene's land terrain.

A jittered grid (~7 m between candidates at 100 %) over a 2.4 km RegionKit world with lakes; at each point the biome
(RegionKit weights) picks the mix and the ground decides:

- **Northern**: spruce forests in stands (noise clusters), pine taking over on higher ground and steep slopes, birch at
  the forest edges, scattered birch and juniper on open heath; no trees above the treeline (55 % of the relief) or on
  slopes steeper than ~29°.
- **Plains**: copses of oak, birch and pine; lone oaks in the open; birches by the water; a little juniper.
- **Desert**: date palm oases within ~110 m of water and below 8 m; acacias scattered sparsely on gentle ground;
  saltbush scrub.

**Forest litter (1.7.0)**: the same rules give the forest cover over the whole map (`forestCover` / `forestTexture`:
cover and the conifer share, 256 × 256): the terrain lays litter under the forests — needles under conifers, leaves
under broadleaf trees (more colour as the season turns to autumn), moss in patches, ragged edges — and the grass thins
out on it (LandKit `terrain.setForest`, ForestKit `grassField({ forest })`). Here and on a scene's terrain alike.

The forest field has one seed for the whole map (`forestSeed`): on a scene's terrain each 256 m tile used its own seed
for it, so forests broke off at the tiles' edges.

## Saved under a name — a plant for the scene

Window *Plants* → *Specimen* → *Save*: the species, seed, size, detail and season as the named asset `plant`
(`js/scene/assets.js`); the list loads one back. In the scene editor a Plants model picks it in the Object window
(field `asset`; the saved species is built, whatever the model's own species), or through the API (`add` / `set` with
`asset`). For AI: `PlantApi.save(name)`, `load(name)`, `saved()`, `get()`.

## Vegetation for the scene (1.6.0)

*Landscape* → *Vegetation for the scene editor*: the plants' density, grass, grass radius, full-model distance,
impostors, season and seed as the named asset `vegetation`. In the scene editor, Environment → Vegetation (on a land
terrain from the land lab) grows forests, copses and grass on the scene's terrain by its biomes, with the same rules as
here (`js/models/plants/vegetation.js`): tiles of 256 m within 1.2 km of the camera, full models near, impostors
beyond, grass around the camera; light, fog and wind from the scene. For AI: `PlantApi.saveVegetation(name)`,
`loadVegetation(name)`, `vegetation()`, `getVegetation()`; in the scene `{ "cmd": "env", "vegetation": name }`.

## Sources

- Wikipedia: [Picea abies](https://en.wikipedia.org/wiki/Picea_abies), [Pinus sylvestris](https://en.wikipedia.org/wiki/Pinus_sylvestris),
  [Betula pendula](https://en.wikipedia.org/wiki/Betula_pendula), [Quercus robur](https://en.wikipedia.org/wiki/Quercus_robur),
  [Phoenix dactylifera](https://en.wikipedia.org/wiki/Date_palm), [Vachellia tortilis](https://en.wikipedia.org/wiki/Vachellia_tortilis),
  [Juniperus communis](https://en.wikipedia.org/wiki/Juniperus_communis), [Atriplex](https://en.wikipedia.org/wiki/Atriplex)
  — heights and habit; the branching rules are a simplification of those descriptions, not botanical growth models.
- 1.8.0: [Corylus avellana](https://en.wikipedia.org/wiki/Corylus_avellana), [Crataegus monogyna](https://en.wikipedia.org/wiki/Crataegus_monogyna),
  [Prunus spinosa](https://en.wikipedia.org/wiki/Prunus_spinosa), [Vaccinium myrtillus](https://en.wikipedia.org/wiki/Vaccinium_myrtillus),
  [Calluna vulgaris](https://en.wikipedia.org/wiki/Calluna), [Pteridium aquilinum](https://en.wikipedia.org/wiki/Pteridium_aquilinum),
  [Pinus mugo](https://en.wikipedia.org/wiki/Pinus_mugo), [Larrea tridentata](https://en.wikipedia.org/wiki/Larrea_tridentata),
  [Lycium](https://en.wikipedia.org/wiki/Lycium), [Triodia](https://en.wikipedia.org/wiki/Triodia_(plant)),
  [Carnegiea gigantea](https://en.wikipedia.org/wiki/Saguaro), [Opuntia](https://en.wikipedia.org/wiki/Opuntia).

## Not yet

Flowers and more undergrowth (reeds at the water), fallen trees and dead wood, a smooth
cross-fade between full models and impostors (now a hard switch at the distance), impostors with autumn colours
(they keep the summer bake), plants in the Land Lab and the game, rocks (their own lab).
