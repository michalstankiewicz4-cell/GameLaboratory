# Vehicle lab · water (`labs/vehicles-water.html`)

The water page of the vehicle lab (space: [`vehicles-space.md`](vehicles-space.md), land:
[`vehicles-land.md`](vehicles-land.md); the environment switch on the bar). Script: `js/labs/vehicles-water/vehicles-water.js`.
How to use it, step by step: [`../guides/using-the-labs.md`](../guides/using-the-labs.md), "Vehicle lab, water".

## What is on the list

| Vessel | Model | Document |
|---|---|---|
| ORP Błyskawica (1937), ORP Orzeł (1939) — warships at real scale | `js/models/ships-sea/` (`buildShip`, `shipInfo`, `shipView`) | [../models/ships-sea/blyskawica.md](../models/ships-sea/blyskawica.md), [../models/ships-sea/orzel.md](../models/ships-sea/orzel.md) |
| skimmer, barge, diver — robot vessels | MarineKit `js/models/marine/marinekit.js` | [../models/marine.md](../models/marine.md) |

The amphibian (MarineKit too) is on the land page: it drives on the ground and floats where there is water.

## Windows

- **Vessel**, **Now**, **Specifications**, **Reconstruction**, **Sources** — the vessel's data from its model (`info`).
- **Controls**: *Drive* (the robot vessels: Auto or W/A/S/D, speed, the diver's depth with Q/E; Night, Wake, Work — the
  vessel's work part), *View* (sea or dry dock, the water: plain or the water lab's sea on the shared base stage
  `js/labs/shared/stage.js`, dimensions, 10 m grid, wireframe), *Parts* (switch the ship's parts), *Armament* (train,
  elevation, action stations / stow), *Signal lamp* (a message in Morse with the searchlight), *Diving* (Orzeł:
  periscopes, the 40 mm gun out of its well, bow hydroplanes, fast dive), *Model* (detail, auto-rotate, exposure).
- The standard windows: Description, Camera (presets per ship), Light and weather, Performance.

## Movement

The robot vessels move by forces with the behaviour *small craft on water* (`js/behaviors/water/craft.js`); the warships
use *ship on water* (`js/behaviors/water/ship.js`) in the scene editor ([`../behaviors/README.md`](../behaviors/README.md)).
