# Land Lab — procedural land and sea

`labs/land.html` (`js/labs/land.js`), kit `js/labs/landkit.js`. Land and sea from one seed, from 0 % to 100 % land, on a
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

`py tools/lab-check.py` checks the land lab: the wrap seam is no rougher than the inside of the map, the land share
matches the request (60 %), 100 % land leaves no ship, the mountain barrier stands at the edge of a bounded map, and
positions wrap; screenshot `tools/out/lab-land.png`.
