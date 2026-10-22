# Land Lab — procedural land and sea

`labs/land.html` (`js/labs/land.js`), kit `js/env/landkit.js`. Land and sea from one seed, from 0 % to 100 % land, on a
map that wraps around (a torus) or is bounded by a barrier, under the SkyKit sky, with the WaterKit sea (shallows,
surf, waves dying on the shore) and the transformer's ORP Błyskawica to sail through it. Settings are kept in the
browser (`steelSalvo.landLab.v1`) and copied as JSON; the same seed and settings always give the same map.

## Generator (`generateTerrain`)

1. **Periodic noise**: gradient noise whose lattice repeats across the map at every octave, warped by more periodic
   noise for wandering coastlines. Because every term repeats, the map's left edge continues into its right edge and
   the top into the bottom — no seam, no mirroring. The same noise serves bounded maps.
2. **Shape**: Islands (4 cells), Archipelago (9 cells, many small islands), Coast (a periodic continent term: land on
   one side, open sea on the other), Fjords (ridged noise: sharp crests and deep, narrow inlets), Highlands (ridged,
   high relief).
3. **Erosion**: water droplets (0.35 × erosion × res² of them) run downhill, pick up material where they speed up and
   drop it where they slow down — valleys, gullies and fans at the foot of slopes. Wrap-aware on a torus.
4. **Sea level at the quantile**: the land share is exact (the requested fraction of texels ends above 0). 100 % land
   is allowed (no ship then: the camera flies).
5. **Heights in metres**: land rises from low beaches to the highest peaks (relief); the sea floor has a shallow shelf
   near the coast, then drops to the sea depth.
6. **Bounded map with a mountain barrier**: a range raised along the edge.

Map size 4–32 km, heightmap 256²–1024² (512² over 8 km: 15.6 m texels, about 0.9 s to generate).

## Water bodies by region (`js/env/regionkit.js`)

One world, several kinds of water. A **region map** (two RGBA8 textures over the map) holds, for every texel, the weight
of each water body — ocean, fjord, lake, river, harbour water, ice — and the flow (x, z, up to 2.5 m/s). The sea shader
blends the bodies' looks and behaviour by those weights (see `docs/water.md`), so there are no seams between them; the
ship reads the same blend in JS (`regionAt`): sheltered water gives it smaller waves, the current carries it, and the
status line says what water it is in.

| Layout | What it shows |
|---|---|
| One water body everywhere | The generator's terrain (shapes above) with one body (e.g. a whole map of lake water or pack ice) |
| River mouth | A river winds down to the coast (current 1.7 m/s upstream), widens into an estuary (0.5 m/s) and pushes a brackish, silty plume out to sea; the channel runs on past the coast and fades into the sea floor |
| Lake with a canal | A dark, peaty inland lake (25 m) reaches the sea down a dredged canal (90 m wide, 7.5 m, steep banks, 0.35 m/s); the canal water turns from lake to sea along its length |
| Fjord entrance | Open sea and skerries, a sill at the mouth (~38 m) and the deep basin (≥160 m) between walls of 500 m and more; the water turns from ocean to fjord over the sill |
| Sheltered bay | A bay dredged to 11 m behind a low sandy spit with dunes; calm, murky harbour water with oil inside, the entrance at the west end of the spit |
| Ice edge | Open sea to the south, loose floes that thicken into pack ice to the north, open leads (polynyas), islands |
| Mixed from the seed | The generator's terrain classified: the largest water is the open sea, other enclosed waters are lakes, narrow water (< ~1 km) between high ground (> ~150–400 m within 700 m) becomes fjord; *Rivers* (0–6) run from the hills down the distance-to-the-sea field with a meander, are carved into the land (width 28→118 m, depth 3→6 m, a valley blended into the ground) and carry a current that slows towards the mouth; *Ice from the north* adds an ice edge |

**Transitions**: land texels take the weights of the nearest water (so the blur does not pull the sea's look up a river),
then the weights and the flow are blurred over *Transition* metres (60–1,600 m) and normalised. The chart tints the
water by body and names the waters. The hand-shaped layouts are bounded maps; *One body* and *Mixed* follow the map
settings (wrap-around or bounded).

**Not the final map generator.** This is the layer that mixes the waters and shows their transitions and joins; the
game's map generator (scale, spawn points, balance, objectives) comes later on top of it. The same layer is meant to
take **land biomes** (desert, tundra, tropical…: another set of weights driving the terrain's palette and vegetation)
and, further on, **other planets** (a bundle of sky, water and biome palettes).

## Biomes (land)

A second set of region weights — **temperate** (northern: grass, heather, rock, snow on real heights), **plains**,
**desert** — reshapes the land and picks the terrain's palette; *Zones* lays the three out by region (large noise
fields) with a *Zone transition* of 0.2–4 km. The heights blend by weight, so a desert slides into plains without a step.

| Biome | Shape | Ground |
|---|---|---|
| Northern | the generator's terrain as it is | muted grass, dry patches, heather, scrub, rock on steep faces, snow on high gentle slopes |
| Plains | relief pressed to a few tens of metres (≤ ~40 m), long low swells (~1.6 km) and small hummocks (~0.5 km), a beach only right at the water | lush meadow; farmland on the flat ground — long strips of wheat, stubble, ploughland and pasture, hedges and tracks between them (fades with distance) |
| Desert | stepped plateaus (mesas) with cliffs where the ground is high, dune fields where it is low: crests across a west-south-west wind, ~330 m apart, up to ~24 m, long windward slope and a short slip face, in dune seas with flat stony plains between | warm sand with wind ripples close up, desert varnish on flat stony plateaus, red-brown rock on cliffs |

Ground only: **plants and rocks as objects** (trees, bushes, grass blades, boulders, scree) get their own labs — the
terrain's colours stand in for them until then. Rivers carved in *Mixed* follow the reshaped land (a meander swings
the course from side to side down the distance-to-the-sea field).

## Map edge

| Topology | What happens at the edge |
|---|---|
| Wrap-around (torus) | The ship sails out of one edge and in at the opposite one. Land and sea continue (periodic heightmap, texture set to repeat); the waves continue too (every wave vector snapped to whole cycles over the map size). The chart shows the ship's position modulo the map. |
| Bounded — buoy line | A line of red buoys 60 m inside the edge (one instanced draw call); the ship stops at it. |
| Bounded — mountain range | Mountains along the edge; beyond it the terrain stays high. |
| Bounded — invisible wall | The ship stops 60 m inside the edge. |

## Drawing

- **Terrain** (`terrainMeshes`): two grids centred on the camera — a fine one (256² cells of one texel) and a coarse one
  (192² cells of four texels, out to the horizon, with a hole under the fine one) — snapped to their cells so the land
  never swims when the camera moves. The vertex shader reads the height texture (`GLSL_LAND`, wrap or clamp, outside
  height for bounded maps) and its normal; the fragment shader paints by height and slope: sea floor (sand to mud),
  wet and dry sand, muted grass with dry patches and heather, scrub, rock on steep faces, snow on high gentle slopes;
  detail noise fades with distance (no shimmer). Two draw calls for any map size.
- **Sea**: WaterKit with `opt.land` — over shallows the waves die down, the water turns green-blue and clear (the sea
  floor shows), surf foam runs along the shore; no water is drawn over dry land.
- **Fog** thins with the camera's height (the haze lies low), so the overview shows the whole map.

## Ship and cameras

Chase, Bridge, Overview, Free flight (W/A/S/D, Q/E, Shift). Sailing: W/S engine orders (astern … flank, 39 kn), A/D
rudder; the ship runs aground where the water is shallower than its draught (3.5 m) at the bow, stern or amidships,
and stops at a barrier. Click the chart to move the ship (if the water there is deep enough) or the camera.

## Check

`py tools/lab-check.py` checks the land lab: plains stay below 80 m and still roll, the desert keeps its plateaus, zones
hold all three biomes; every water-body layout builds with its body present, weights summing to 1
and changing by less than 0.12 per texel, the river carries a current with small waves, and the mixed map has rivers,
lakes and ice; then the wrap seam is no rougher than the inside of the map, the land share
matches the request (60 %), 100 % land leaves no ship, the mountain barrier stands at the edge of a bounded map, and
positions wrap; screenshot `tools/out/lab-land.png`.
