# Waterside Structures Lab — and StructKit

`labs/structures.html` (`js/labs/structures/structures.js`), kit `js/models/structures/`. Static structures in and on the water, built
from code at real scale like the ships: offshore platforms first, then everything built that touches the water —
quays, piers and jetties, breakwaters, harbours, lighthouses (owner's decision, 2026-10-21).

## StructKit

| File | What it does |
|---|---|
| `js/models/structures/index.js` | `STRUCTURES` registry, `buildStructure(id, { detail })`, `structureInfo(id)` |
| `js/models/structures/materials.js` | PBR set for offshore steel and paint; the leg material colours itself by world height (marine growth below the splash zone, a rust band, then the paint) so it stays right while the legs move |
| `js/models/structures/parts.js` | Building blocks: square truss leg with rack plates, spud can, jack house with pinion units, tapered lattice tower (derrick), lattice boom, pedestal crane (slewing, luffing), enclosed lifeboat on davits, helideck markings (canvas texture), railings, stairs, window rows |
| `js/models/structures/coastal.js` | Coastal works: tetrapod and quarry-rock geometry, `layUnits` (armour units on any parametric surface, two layers, random turns), `instanced`, bollards, cylindrical fenders, ladders, lighting masts, `sweepZ` (cross-sections) |
| `js/models/structures/coastal/quay.js` | Quay wall: gravity block wall, steel sheet-pile wall or open piled deck, with kerb, bollards, fenders, ladders, crane rails, masts, apron; `PARAMS` (construction, length, cope level), `heightAt` |
| `js/models/structures/coastal/breakwater.js` | Breakwater: rubble mound with rock or tetrapod armour, or caissons with a tetrapod berm; round head with a harbour light; `PARAMS` (type, length, crest, armour unit mass), `heightAt`. Research sheet for both: `docs/labs/structures/coastal.md` |
| `js/models/structures/offshore/super300.js` | Jack-up drilling rig, Super 300 class: `info` (specifications, sources), `DIM`, `build()` → group, parts, legs, cranes, cantilever, `pose({ depth, air, legsDown })`. Research sheet: `docs/labs/structures/super300.md` |

Geometry is merged per material with ShipKit's `Part` (the rig is ~156k triangles and ~170 draw calls at detail 1);
armour units are instanced. A structure may export `PARAMS` (its own settings: the lab builds sliders and selects from
them) and return `heightAt(x, z)` and `bounds` (the lab bakes the heights into a texture for the sea's shallows and surf).

## The lab

- **Structure** (top bar): jack-up rig, quay wall, breakwater; **Site**: water depth (each structure keeps its own);
  **Structure** window: the structure's own settings; for the quay, *ORP Błyskawica moored alongside*.

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

## The junkyard, on land (1.4.0 – 1.5.0)

The group *Junkyard (on land)* in the list: the junkyard game's machines (paper furnace, can crusher, metal crusher,
induction furnace, casting line) and surroundings (platform, fence with a gate, buyback point) — JunkKit
(`js/models/junkyard/`, [../models/junkyard.md](../models/junkyard.md)). The sea goes away and the seabed becomes dry
ground at y = 0; the model's top-level parts can be switched off; cameras from its size. `?structure=junk:<id>` opens one.

Since 1.5.0 the machines work — the game's machine behaviours (`js/behaviors/land/machines/`,
[../behaviors/README.md](../behaviors/README.md)) on the shared item world (`js/behaviors/land/items.js`), in the
*At work* section of the Structure window (`js/labs/structures/junk-work.js`):

- **buttons of the machine** — crushers: Start / Stop; induction furnace: Power, Tilt to pour (toggle) and Tilt to pour /
  Tilt back while held (also R / F); casting line: the diverter (large or small moulds);
- **feed** — JunkKit items drop into the hopper (cans), the press chamber (a drum, pots and tyres, boxes and papers),
  the furnace's burning zone (papers, boxes, a pot that does not burn), the crucible (cans — aluminium, pots — steel);
  Clear the items;
- **readouts** — the machine's state (crush steps, burning and burnt, power, tilt, the melt and its aluminium / steel,
  metal in the trough, ingots made, metal spilt) and the number of items.

The induction furnace and the casting line always stand together, as in the game (the line 0.62 m in front of the
furnace): the melt pours down the trough into the moulds and sets into ingots, which lie in the world as items.

## Check

`py tools/lab-check.py` builds every quay and breakwater type (units placed, heights baked, Błyskawica moored),
builds the rig, floats it and jacks it up again (legs on the seabed, hull at the air gap),
skids the cantilever, goes through the cameras and screenshots `tools/out/lab-structures.png`.
