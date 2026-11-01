# Plants Lab — trees, palms, shrubs and grass

`labs/plants.html` (`js/labs/plants.js`), kits `js/models/plants/plantkit.js` (single plants) and `js/models/plants/forestkit.js` (many
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

A jittered grid (~7 m between candidates at 100 %) over a 2.4 km RegionKit world with lakes; at each point the biome
(RegionKit weights) picks the mix and the ground decides:

- **Northern**: spruce forests in stands (noise clusters), pine taking over on higher ground and steep slopes, birch at
  the forest edges, scattered birch and juniper on open heath; no trees above the treeline (55 % of the relief) or on
  slopes steeper than ~29°.
- **Plains**: copses of oak, birch and pine; lone oaks in the open; birches by the water; a little juniper.
- **Desert**: date palm oases within ~110 m of water and below 8 m; acacias scattered sparsely on gentle ground;
  saltbush scrub.

## Sources

- Wikipedia: [Picea abies](https://en.wikipedia.org/wiki/Picea_abies), [Pinus sylvestris](https://en.wikipedia.org/wiki/Pinus_sylvestris),
  [Betula pendula](https://en.wikipedia.org/wiki/Betula_pendula), [Quercus robur](https://en.wikipedia.org/wiki/Quercus_robur),
  [Phoenix dactylifera](https://en.wikipedia.org/wiki/Date_palm), [Vachellia tortilis](https://en.wikipedia.org/wiki/Vachellia_tortilis),
  [Juniperus communis](https://en.wikipedia.org/wiki/Juniperus_communis), [Atriplex](https://en.wikipedia.org/wiki/Atriplex)
  — heights and habit; the branching rules are a simplification of those descriptions, not botanical growth models.

## Not yet

Flowers and undergrowth (ferns, heather as objects, reeds at the water), fallen trees and dead wood, a smooth
cross-fade between full models and impostors (now a hard switch at the distance), impostors with autumn colours
(they keep the summer bake), plants in the Land Lab and the game, rocks (their own lab).
