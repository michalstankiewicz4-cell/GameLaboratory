# Waterside Structures Lab — and StructKit

`labs/structures.html` (`js/labs/structures.js`), kit `js/structkit/`. Static structures in and on the water, built
from code at real scale like the ships: offshore platforms first, then everything built that touches the water —
quays, piers and jetties, breakwaters, harbours, lighthouses (owner's decision, 2026-10-21).

## StructKit

| File | What it does |
|---|---|
| `js/structkit/index.js` | `STRUCTURES` registry, `buildStructure(id, { detail })`, `structureInfo(id)` |
| `js/structkit/materials.js` | PBR set for offshore steel and paint; the leg material colours itself by world height (marine growth below the splash zone, a rust band, then the paint) so it stays right while the legs move |
| `js/structkit/parts.js` | Building blocks: square truss leg with rack plates, spud can, jack house with pinion units, tapered lattice tower (derrick), lattice boom, pedestal crane (slewing, luffing), enclosed lifeboat on davits, helideck markings (canvas texture), railings, stairs, window rows |
| `js/structkit/structures/super300.js` | Jack-up drilling rig, Super 300 class: `info` (specifications, sources), `DIM`, `build()` → group, parts, legs, cranes, cantilever, `pose({ depth, air, legsDown })`. Research sheet: `docs/structures/super300.md` |

Geometry is merged per material with ShipKit's `Part` (the rig is ~156k triangles and ~170 draw calls at detail 1).

## The lab

- **Jacking**: *Afloat (under tow)* lowers the hull to its 4 m draught and raises the legs; *Jack up* lowers the legs to
  the seabed and lifts the hull to the air gap — at the LeTourneau rate (≈ 90 ft per hour) times the *Jacking speed*.
  *Water depth* (12–114 m) and *Air gap* (6–30 m); the status line says how far the legs stand above the deck.
  Afloat, the hull heaves on the waves.
- **Drilling**: *Cantilever out* skids the drill floor and derrick up to 18.3 m over the stern; *Cranes working*
  slews and luffs the three cranes.
- **Camera**: Overview, Helideck, Drill floor, Leg and jack house, From the sea, Underwater (below the surface the view
  turns into blue-green murk and the legs' marine growth shows), High.
- **Sea and light**: weather (SkyKit) and Day / Low sun / Dusk / Night — obstruction lights on the leg tops and the
  crown, green helideck perimeter lights.
- **Info**: name, specifications, reconstruction note, sources; **Parts** toggles every part.

## Check

`py tools/lab-check.py` builds the rig, floats it and jacks it up again (legs on the seabed, hull at the air gap),
skids the cantilever, goes through the cameras and screenshots `tools/out/lab-structures.png`.
