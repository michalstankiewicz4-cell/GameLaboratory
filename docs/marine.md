# MarineKit: the robot vessels (and a sea of its own)

The sea, and the vehicles that sail it and go under it. Started 2026-10-03 as a lab of its own (the sea lab,
`marine.html`), separate from the ground vehicles, because you'll be able to go under water.

The owner's call (2026-11-02): one **vehicle lab** with the environment switch — space (`ship.html`), water
(`warship.html`), land (`vehicles.html`). The sea lab is gone: the skimmer, the barge and the diver are on the water
page's list next to the warships (on its plain water: drive, dive, night, wake, work), the amphibian on the land page
(it drives on the ground; where there is water it floats). MarineKit's own sea (`makeSea`, the view under water,
marine snow) is used by no lab now; it stays in the kit — the water lab's sea from Battle is the one in use.

## Files

| File | What it is |
|---|---|
| `js/models/marine/marinekit.js` | **MarineKit** (`window.MarineKit`), a classic script like the other kits. It holds the sea (waves, the seabed and an island, the water's and the bed's shaders), the vessels, the wake and marine snow. It needs THREE, ShipKit and VehicleKit (the amphibian's wheels: `VehicleKit.parts`). Not in the game, nor in the surface lab, yet. |
| `labs/warship.html`, `js/labs/warship/warship.js` | The vehicle lab's water page: the skimmer, the barge and the diver — AUTO (wandering, turning back toward the middle) or WASD + Q/E to dive, NIGHT, WAKE, WORK. |
| `labs/vehicles.html`, `js/labs/vehicles/vehicles.js` | The land page: the amphibian, with the rovers' DRIVE and GROUND. |

## The sea

- **One wave function** lives in two places: JS (`waveHeight`, what floats
  rides it) and GLSL (the same sum, unrolled, which is what you see).
  - There are five directional swells, 8–60 m long.
  - Their speeds come from deep water: ω = √(g·k).
  - The "Waves" slider scales their height.
- **The seabed** is the same in JS and GLSL too (`floorAt`): a depth, gentle
  hills and an island (a Gaussian bump 6 m above the sea).
  - The water uses it to know where it's shallow: lighter turquoise, and
    foam rolling on the shore.
  - The amphibian uses it to know where it can drive.
- **The water's shader**, from above:
  - the water's colour, lighter in the shallows;
  - the sky reflected (fresnel) and the sun's glint;
  - per-pixel ripples;
  - foam on steep crests and on the shore.

  The ocean mesh is 700 m and follows the camera in 2 m steps, so the
  grid doesn't swim.
- **From below** (the back face):
  - the bright window of the sky straight up (Snell's window, about 48°);
  - outside it, a dark mirror;
  - fog in the water's colour.
- **Under water**:
  - FogExp2 at 0.035 in a teal that darkens with the camera's depth;
  - the sun dims with depth;
  - marine snow drifts around the camera.
- **The bed**:
  - colour: wet sand under water, a light beach, grass and rock on the
    island;
  - light fades with depth;
  - caustics dance on the bed under water.

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

## Next

- Detail and look, later (the user's call).
- Put the sea into the surface lab, where the planet's seas get this
  water and a floor.
- The barge carries vehicles (the ramp).
- Vehicles and vessels as part of a base's logistics.
