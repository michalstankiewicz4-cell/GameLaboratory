# Labs — map

The labs are the workshop behind the game (`labs.html`). They are grouped in five areas; each area has its labs (pages
under `labs/`) and its kit (code under `js/` that the game will use once a lab's result is chosen).

| Area | Lab | Status | Kit (code) | Docs |
|---|---|---|---|---|
| **Models** | Ship Lab — ORP Błyskawica 1937 (`labs/ship.html`) | in progress | `js/shipkit/` | `docs/ships/blyskawica.md` |
| | Light cruiser, submarine, aircraft and shore | soon | `js/shipkit/ships/` | |
| **Environment** | Water and weather — sea and ship (`labs/water.html`) | in progress | `js/labs/waterkit.js` | `docs/water.md` |
| | Sky and clouds | in progress (with the weather) | sky in WaterKit → `envkit` | |
| | Weather: wind, rain, fog, squalls, storm | in progress | `envkit` | |
| | Time of day, land and coast, night sky and space | soon | `envkit` | |
| **Graphics and filters** | Look Lab: procedural ageing by surface type (see below), baked shading, tone and colour, exposure, lens (distortion, droplets, flare, grain, vignette), bodycam look, automatic resolution | next | `js/render/` (post pipeline) + ShipKit materials | |
| **Special effects** | fire and explosions, water effects, smoke, destruction | soon | `fxkit`, transformer hitboxes | |
| **Tools** | Transformer (`labs/transform.html`), Model Doctor (`labs/doctor.html`) | done, growing | `js/shipkit/transform.js`, `js/labs/modeldoctor.js` | `docs/transform.md`, `docs/doctor.md` |

## How they fit together

- **Environment = what is in the world**: the sea, the sky that lights it, the weather that drives both, the time of
  day, land. One environment lab grows out of the water lab: weather and sky become panels next to the sea, because
  they set each other (wind → sea state, clouds → light and reflections, sun → glitter).
- **Graphics and filters = how it is drawn**: materials, light response, the post-process and the camera's lens. It
  uses the environment as its test scene, but its settings belong to the renderer, so it is a lab of its own.
- **Special effects** sit on top of both (fire lit by the scene, splashes on the sea, destruction on the transformer's
  hitboxes).
- **Models** go through the **tools** before the game: the doctor checks them, the transformer makes them game-ready.
- Every lab compares variants side by side and measures the cost of each effect; what the owner picks moves into the
  game's settings (High / Light presets and options), never as a separate visual style.

## Procedural ageing (Look Lab, proposed 2026-10-21)

One **age / wear** slider (0 new from the yard … 1 after a hard war winter) per ship, plus per-surface rules, all in the
shader from the material key ShipKit already assigns (no texture files):

| Surface | What ageing does |
|---|---|
| painted steel (hull, superstructure) | dulled and chalky paint, rust streaks running down from portholes, scuppers, hawse pipes and seams, chipped paint on edges and corners, salt crust near the waterline, darker grime in corners |
| boot-top and anti-fouling | faded, scraped, weed and growth at the waterline |
| bare metal (barrels, rails, fittings) | darker, oily, rust bloom where water lies |
| wooden decks | planks grey out in the sun, darker wet seams, worn paths along the walkways |
| canvas (blast bags, covers) | faded, stained, darker when wet |
| brass and bronze (propellers, fittings) | green-brown patina, polished where hands touch |
| rope and rigging | darker and frayed |

Where things age comes from the geometry: height above the waterline, which way a face looks (streaks only on vertical
faces, salt below sun-facing decks), distance to openings (rust streaks), edges and corners (chips, from the baked
shading pass), and the transformer's hitboxes (damaged boxes age faster and burn). The game can then age a ship over
a campaign.

## Current focus (2026-10-21)

Water and weather, graphics and filters, and the Błyskawica model. Everything else is shown as "soon" on the labs page.
