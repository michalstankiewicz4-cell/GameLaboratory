# Cave lab (`labs/caves.html`) and CaveKit

Caves generated from a seed, the rock they are cut in and how it answers light. The owner's call (2026-11-01): a lab
of its own for caves, rocks and their materials and how they react to light; lakes in the caves are generic — their
style is chosen in the water lab. The hero's light sources and ways of seeing have their own lab
([`gear.md`](gear.md)); rocks as objects on the surface are still a separate idea (`TODO.md`).

## Files

| File | What it is |
|---|---|
| `js/models/caves/cavekit.js` | **CaveKit**: `buildCave(opts)`, `setRock(cave, rock, { wet, relief })`, `ROCKS`, `rockMaterial()`, `lakeMaterial()`, `CAVE_DEFAULTS` |
| `labs/caves.html`, `js/labs/caves.js` | The lab: windows *Cave* (shape) and *Rock and light*; views *Inside* and *Overview* in the top bar |
| `js/labkit/freecam.js` | The free camera inside (shared with the gear lab) |

## How a cave is made

1. **Skeleton**: a random walk (`length`, `width`, `winding`) with `branches` (thinner side passages) and `chambers`
   (spheres at some of its nodes; the first chamber is the entrance and the camera's start).
2. **Field**: a signed distance — negative in the air, positive in the rock — from the passages (capsules, a little
   wider than tall) and chambers joined with a smooth minimum, roughened by 3D noise (`rough`).
3. **Wall**: surface nets on a grid of `cell` metres (the cell grows when the cave is big: at most ~2.4 M samples);
   normals from the field's gradient, pointing into the air, so the wall is seen from inside.
4. **Formations**: stalactites where the wall faces down, stalagmites where it faces up (`drips`); loose stones on the
   floor (`rubble`), closed shapes pushed by noise.
5. **Lakes** (`lakes`: the chance per chamber, never the first): a flat surface a little above the chamber's floor,
   kept only where the field says air, so it ends at the walls. `lava`: the chance that a lake is lava — a dark crust
   with cracks of glowing melt (`lavaMaterial`), and a warm light over it (`cave.lavaLights`, at most three) that lights
   the chamber. Both materials are plain placeholders: the water lab chooses how water and lava look.

## Rock and light

- **Rocks**: limestone (pale, thin beds, calcite veins), granite (grains, no beds), sandstone (rust bands), basalt
  (almost black). The colour is painted per vertex from the position (beds, speckles, veins); fine relief comes from
  a generated normal map on box-projected UVs (`relief`).
- **Wet**: a thin film of water — a glossy clear coat over the same rough stone, and darker rock, more on the floor.
- **Light**: a flashlight held a little right of and below the eye (so its shadows show), a warm lantern, the ambient
  light, the exposure of the camera look (`js/render/sea/look.js`). *Overview* lights the cave from outside and shows
  both sides of the wall.

## Numbers (default cave, seed 7)

About 55–65 k triangles, ~200 drip stones and stones, built in ~1.7 s in a software-rendered test browser (faster on
a real machine) — the page shows the loading card while it builds.
