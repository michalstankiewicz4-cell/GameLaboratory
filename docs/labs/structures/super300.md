# Jack-up drilling rig, Super 300 class — research sheet

Model: `js/models/structures/offshore/super300.js` · lab: `labs/structures.html` · built at real scale (1 unit = 1 m).

## What it is

A self-elevating (jack-up) mobile offshore drilling unit of the Marathon LeTourneau **Super 300** design. A buoyant
hull is towed to the site with its three legs raised; the legs are then jacked down until their spud cans stand on
the seabed, the hull is preloaded and jacked up out of the water to an **air gap** above the waves. The drill floor and
derrick sit on a **cantilever** that skids out over the stern so the rig can drill over a fixed platform. LeTourneau
rigs jack with electric **rack and pinion** units in jack houses around each leg (about 90 ft per hour).

The modelled unit is the one whose specification sheet is public (built 1983, upgraded 2015, operated as "Baltic"):
it is a convenient, fully documented member of the class — no operator name or livery is used in the model.

## Figures used (from the specification sheet)

| Item | Value | In the model |
|---|---|---|
| Hull | 270 × 268 × 28 ft | 82.3 × 81.7 × 8.5 m |
| Legs | 3 × 515 ft, square | 157 m (151 m truss + 6.5 m spud can) |
| Spud cans | 55 ft diameter | 16.8 m |
| Maximum water depth | 375 ft | 114 m (depth slider limit) |
| Cantilever envelope | 60 × 24 ft | skids up to 18.3 m aft |
| Derrick | 160 × 30 × 30 ft | 48.8 m high, 9.1 m square base |
| Cranes | 3 × PCM-220: 2 × 140 ft booms, 1 × 100 ft | 42.7 m and 30.5 m lattice booms |
| Quarters | 120 persons | four-tier block forward |
| Bulk storage | 4 mud + 4 cement silos | 2 × 4 silos |
| Main power | 5 × 1,855 hp diesels | engine module with two exhaust stacks |

## Reconstructed (assumptions)

- **Hull plan**: triangular — a broad square stern with chamfered corners, sides converging to a blunt bow, as on
  LeTourneau three-leg designs; corner chamfers 4 m, bow 15 m wide.
- **Leg positions**: one leg forward on the centreline, two aft; spacing scaled from the published Class 84 figures
  (129 ft longitudinal × 142 ft transverse on a 248 × 227 ft hull) to the Super 300 hull: 43.5 m × 51.2 m.
- **Leg truss**: square, 10.4 m between chord centres, 1.0 m chords with rack plates on the outer faces, X-bracing in
  5.2 m bays, cross-bracing every fourth bay. The real chord section and bracing pattern are not published.
- **Spud cans**: 6.5 m high (height not published; the Class 84 cans are 24 ft on 46 ft diameter).
- **Draught afloat**: 4.0 m (not published for this unit).
- **Jack houses**: open yellow frames 14 m high with three pinion units per chord — an approximation of the
  LeTourneau electric jacking units.
- **Layout**: quarters and helideck forward (helideck 22.2 m D-value, S-61/S-92 class, cantilevered to port);
  three enclosed lifeboats beside the quarters; cranes port and starboard amidships and aft starboard; silos to
  starboard, pipe deck to port, engine and mud modules aft; burner booms at the stern corners for well testing.
- **Colours**: grey hull, yellow legs, jack houses and cranes, white quarters and derrick, red burner booms, orange
  lifeboats, green helideck with standard markings; marine growth below the splash zone.

## Sources

- Shelf Drilling, "Baltic" specification sheet, Sep 2023 — <https://www.shelfdrilling.com/wp-content/uploads/2013/11/Shelf-Drilling_Baltic_Spec-Sheet-Sep-2023.pdf>
- Shelf Drilling, "Baltic" specification sheet, May 2015 — <https://www.shelfdrilling.com/wp-content/uploads/2015/06/Shelf-Drilling_Baltic_Spec-Sheet-May-2015.pdf>
- Horizon Offshore, Marathon LeTourneau Class 84 presentation (leg spacing, spud cans, helideck, survival craft) — <https://horizonoffshoreservices.com/wp-content/uploads/2023/06/Jack-up-Presentation.pdf>
- Wikipedia, Jackup rig — <https://en.wikipedia.org/wiki/Jackup_rig>
- ORLEN Petrobaltic, platforms in the Baltic (air gap and leg length of a Baltic jack-up for comparison) — <https://petrobaltic.orlen.pl/en/oil-and-gas/platforms>

## Not modelled yet

Leg racks' teeth (plates only), the jacking units' interior, the BOP handling and the mud system in detail, the
cantilever's skid rails and the drill pipe set-back in the derrick, deck lighting, the well-test flame, a towing
spread for the afloat state.
