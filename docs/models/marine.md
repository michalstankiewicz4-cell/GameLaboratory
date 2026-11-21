# MarineKit: the robot vessels

The robot vessels that sail the sea and go under it: the skimmer, the barge, the diver and the amphibian. Started
2026-10-03 as a lab of its own (the sea lab); since 2026-11-02 they are in the **vehicle lab** (the environment switch):
the skimmer, the barge and the diver on the water page next to the warships, the amphibian on the land page. The water
is the water lab's sea from Battle; MarineKit's own sea was removed on 2026-11-06 (its history: git, CHANGELOG).

## Files

| File | What it is |
|---|---|
| `js/models/marine/marinekit.js` | **MarineKit** (`window.MarineKit`), an ES module like the other kits: the vessels (and their data: `foils`, `azimuth`, `wheels`, `sounds.engine`) and the wake. It needs THREE, ShipKit and VehicleKit (the amphibian's wheels: `VehicleKit.parts`). In the scene editor: the family "Sea robots". |
| `labs/vehicles-water.html`, `js/labs/vehicles-water/vehicles-water.js` | The vehicle lab's water page: the skimmer, the barge and the diver — AUTO (wandering, turning back toward the middle) or WASD + Q/E to dive, NIGHT, WAKE, WORK. |
| `labs/vehicles-land.html`, `js/labs/vehicles-land/vehicles-land.js` | The land page: the amphibian, with the rovers' DRIVE and GROUND. |

## The vessels

Every vessel is a robot: sensor bands and lamps, no bridges or cabins.

| id | Name | What for | Notes | Work |
|---|---|---|---|---|
| `skimmer` | SKIMMER | fast scout | twin hulls; rises onto its foils above about 8 m/s | the sensor head looks round |
| `barge` | BARGE | materials by sea | 20 m, containers, azimuth thrusters, radar | lowers the bow ramp for vehicles |
| `diver` | DIVER | works under water | four vectored thrusters, a dome eye, lamps that come on below 6 m | the arm reaches out and grabs; a sonar ping |
| `amphibian` | AMPHIBIAN | sea and land | six wheels (VehicleKit's), two shrouded propellers | the sensor head looks round |

**Hulls** come from `hullGeometry(L, W, D, F, sharp)`:
- sections from the stern to the bow;
- a U that flattens at the keel;
- the bow narrowing, `sharp` from 1 (a knife) to 0 (blunt).

Each hull is two meshes: white plating above, and a slightly bigger red
antifouling copy whose "deck" sits at the waterline.

**Motion** (`update`):
- **Floating.** A plane is fitted through the hull's float points on the
  waves (heave, pitch, roll) on springs. Long hulls are on slower springs,
  and the bow lifts under way.
- **The diver** springs to `opts.dive`, stays 1.6 m off the bottom, and
  blends the waves out over about 1.5 m of depth. It pitches with its
  vertical speed.
- **The amphibian** rests on whichever is higher: the water's plane or
  the ground's plane under its wheels plus the wheel radius. So it drives
  out of the sea and back in.
- **Propellers**, wheels, lamps (one SpotLight per vessel) and the beacon
  are animated too.

**The others stop at the shallows**: the lab blocks them, the barge at
2.5 m of depth and the others at 1.6 m.

**The wake** (`makeWake`) has two kinds of points, 1200 in all:
- **foam** emitted at the stern, riding the waves and spreading out, gone
  in 5 s;
- **spray** thrown up at the bow at speed, falling back.

## Movement by forces (2026-11-06)

The vessels move and float with the behaviour `js/behaviors/water/craft.js` (docs/behaviors/README.md): thrust, drag,
rudder, buoyancy, the skimmer's foils, the diver's vertical thrusters, the amphibian's wheels. `update(t, dt, { pose })`
takes its pose (`y`, `pitch`, `roll`, `lift`, `depth`, `onLand`, `vd`) and only shows it; without `pose` the vessel stands
level at its waterline. The kit's own sea (`makeSea`, `WAVES`, `waveHeight`, `makeSnow`) and its floating springs were
removed (2026-11-06). The data for the behaviour sit in the definitions: `foils` (the
skimmer), `azimuth` (the barge), `wheels` (the amphibian). Used by both vehicle labs and the scene editor (family
"Sea robots", loaded with the Space kits).

## Next

- Detail and look, later (the user's call).
- The barge carries vehicles (the ramp).
- Vehicles and vessels as part of a base's logistics.
